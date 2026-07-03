import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import {
  bulkApplyGuestGroupMembership,
  createGuestGroup,
  deleteGuestGroup,
  toggleGuestGroupMember,
  updateGuestGroupMetadata,
  type GuestGroup,
} from '@/services/guestGroups';
import {
  bulkUpdateGuestFlags,
  createGuestsBulk,
  setGuestGender,
  setGuestWeddingParty,
  type Gender,
  type GuestRow,
} from '@/services/wedding';
import {
  buildGuestGroupsCsv,
  buildGuestListTemplateCsv,
  computeImportDiff,
  type AttendeeDiff,
  type ImportDiff,
} from '@/utils/guestGroupsCsv';

// The guest-groups admin screen is a spreadsheet: attendees down the
// rows, groups across the columns. Cells are checkboxes. See the
// October 2026 design notes for the full column family layout — this
// version adds a sticky first column, a search filter, and CSV
// export/import.

const NAME_COLUMN_WIDTH = 180;
const CELL_WIDTH = 56;
const ROW_HEIGHT = 48;
const HEADER_HEIGHT = 96;

// Reserved header names — user-created groups can't collide with any
// of these. Wedding Party is the backfilled group (migration 043)
// surfaced as the default column; gender labels are virtual columns.
const DEFAULT_COLUMN_NAMES = new Set(
  ['wedding party', 'female', 'male', 'unknown', 'unknown gender', 'name', 'guest', 'attendee', 'gender'].map((s) => s.toLowerCase()),
);
const WEDDING_PARTY_GROUP_NAME = 'Wedding Party';

interface Attendee {
  canonicalName: string;
  isWeddingParty: boolean;
  gender: Gender | null;
}

// ─── Small components ─────────────────────────────────────────────────

interface CellProps {
  on: boolean;
  tint: string;
  onPress: () => void;
}

function Cell({ on, tint, onPress }: CellProps) {
  return (
    <Pressable
      onPress={() => {
        haptic.selection();
        onPress();
      }}
      style={({ pressed }) => [
        styles.cell,
        { width: CELL_WIDTH, height: ROW_HEIGHT },
        pressed && styles.cellPressed,
      ]}
      hitSlop={2}
    >
      <View
        style={[
          styles.checkbox,
          on && { backgroundColor: tint, borderColor: tint },
        ]}
      >
        {on ? <Ionicons name="checkmark" size={14} color={Colors.white} /> : null}
      </View>
    </Pressable>
  );
}

interface ColumnHeaderProps {
  label: string;
  sublabel?: string;
  count?: number;
  onEdit?: () => void;
  onDelete?: () => void;
}

function ColumnHeader({ label, sublabel, count, onEdit, onDelete }: ColumnHeaderProps) {
  return (
    <View style={[styles.headerCell, { width: CELL_WIDTH, height: HEADER_HEIGHT }]}>
      <Text style={styles.headerLabel} numberOfLines={2}>
        {label}
      </Text>
      {sublabel ? <Text style={styles.headerSublabel}>{sublabel}</Text> : null}
      {count !== undefined ? (
        <Text style={styles.headerCount}>{count}</Text>
      ) : null}
      {onEdit || onDelete ? (
        <View style={styles.headerActionRow}>
          {onEdit ? (
            <TouchableOpacity onPress={onEdit} hitSlop={6} style={styles.headerAction}>
              <Ionicons name="create-outline" size={12} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
          {onDelete ? (
            <TouchableOpacity onPress={onDelete} hitSlop={6} style={styles.headerAction}>
              <Ionicons name="close-circle-outline" size={13} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

interface GroupNameModalProps {
  visible: boolean;
  title: string;
  initialValue: string;
  submitLabel: string;
  saving: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
  collisionCheck: (value: string) => boolean;
}

function GroupNameModal({
  visible,
  title,
  initialValue,
  submitLabel,
  saving,
  onSubmit,
  onClose,
  collisionCheck,
}: GroupNameModalProps) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => {
    if (visible) setValue(initialValue);
  }, [visible, initialValue]);

  const trimmed = value.trim();
  const collision = trimmed.length > 0 && collisionCheck(trimmed);
  const canSubmit = trimmed.length > 0 && !collision && !saving;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{title}</Text>
          <TextInput
            style={styles.modalInput}
            value={value}
            onChangeText={setValue}
            placeholder="e.g. Bridesmaids"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            autoFocus
            maxLength={60}
            returnKeyType="done"
            onSubmitEditing={() => canSubmit && onSubmit(trimmed)}
          />
          {collision ? (
            <Text style={styles.modalError}>Another column already has this name.</Text>
          ) : null}
          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onClose}
              disabled={saving}
              style={[styles.modalBtn, styles.modalBtnCancel]}
            >
              <Text style={styles.modalBtnCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => canSubmit && onSubmit(trimmed)}
              disabled={!canSubmit}
              style={[
                styles.modalBtn,
                styles.modalBtnConfirm,
                !canSubmit && styles.modalBtnConfirmDisabled,
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.modalBtnConfirmText}>{submitLabel}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface ImportPreviewModalProps {
  visible: boolean;
  diff: ImportDiff | null;
  applying: boolean;
  addUnknown: boolean;
  onToggleAddUnknown: (next: boolean) => void;
  onCancel: () => void;
  onApply: () => void;
}

function ImportPreviewModal({
  visible,
  diff,
  applying,
  addUnknown,
  onToggleAddUnknown,
  onCancel,
  onApply,
}: ImportPreviewModalProps) {
  const insets = useSafeAreaInsets();
  if (!diff) return null;
  const changeCount = diff.attendeeDiffs.length;
  const willAdd = addUnknown ? diff.unknownAttendees.length : 0;
  const canApply = (changeCount > 0 || willAdd > 0) && diff.errors.length === 0 && !applying;
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel}>
      <View style={[styles.importRoot, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.importHeader}>
          <TouchableOpacity onPress={onCancel} disabled={applying} hitSlop={8}>
            <Text style={[styles.editorCancel, applying && styles.editorCancelDisabled]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={styles.editorTitle}>Import preview</Text>
          <TouchableOpacity onPress={onApply} disabled={!canApply} hitSlop={8}>
            {applying ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={[styles.editorSave, !canApply && styles.editorSaveDisabled]}>
                Apply
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.importScroll}
          contentContainerStyle={styles.importContent}
        >
          {diff.errors.length > 0 ? (
            <View style={[styles.importCard, styles.importCardError]}>
              <Text style={styles.importCardTitle}>Can't apply this file</Text>
              {diff.errors.map((e, i) => (
                <Text key={i} style={styles.importErrorLine}>• {e}</Text>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.importSummaryRow}>
                <View style={styles.importStatTile}>
                  <Text style={styles.importStatValue}>{changeCount}</Text>
                  <Text style={styles.importStatLabel}>
                    attendee{changeCount === 1 ? '' : 's'} to update
                  </Text>
                </View>
                <View style={styles.importStatTile}>
                  <Text style={styles.importStatValue}>{willAdd}</Text>
                  <Text style={styles.importStatLabel}>
                    to add
                  </Text>
                </View>
                <View style={styles.importStatTile}>
                  <Text style={styles.importStatValue}>{diff.csvRowCount}</Text>
                  <Text style={styles.importStatLabel}>
                    row{diff.csvRowCount === 1 ? '' : 's'} in file
                  </Text>
                </View>
              </View>

              {diff.unknownAttendees.length > 0 ? (
                <View style={[styles.importCard, styles.importCardWarn]}>
                  <Text style={styles.importCardTitle}>
                    Names not on the guest list ({diff.unknownAttendees.length})
                  </Text>
                  <Text style={styles.importCardBody}>
                    Toggle the switch below to add all of them as new attendees.
                    Leave it off to ignore these rows (safer if the file was meant
                    as an update to existing guests).
                  </Text>

                  <TouchableOpacity
                    style={styles.addUnknownRow}
                    onPress={() => onToggleAddUnknown(!addUnknown)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.addUnknownText}>
                      <Text style={styles.addUnknownLabel}>
                        Add these {diff.unknownAttendees.length} as new attendees
                      </Text>
                      <Text style={styles.addUnknownHint}>
                        Creates new guest rows with the file's Wedding Party and Gender values.
                      </Text>
                    </View>
                    <View style={[styles.toggleTrack, addUnknown && styles.toggleTrackActive]}>
                      <View style={[styles.toggleThumb, addUnknown && styles.toggleThumbActive]} />
                    </View>
                  </TouchableOpacity>

                  {diff.unknownAttendees.slice(0, 10).map((u) => (
                    <Text key={u.name} style={styles.importListItem}>• {u.name}</Text>
                  ))}
                  {diff.unknownAttendees.length > 10 ? (
                    <Text style={styles.importListItem}>
                      … and {diff.unknownAttendees.length - 10} more
                    </Text>
                  ) : null}
                </View>
              ) : null}

              {diff.unknownColumns.length > 0 ? (
                <View style={[styles.importCard, styles.importCardWarn]}>
                  <Text style={styles.importCardTitle}>
                    Unknown columns ({diff.unknownColumns.length})
                  </Text>
                  <Text style={styles.importCardBody}>
                    These columns won't be applied. Create a group with that name first, then re-upload.
                  </Text>
                  {diff.unknownColumns.map((c) => (
                    <Text key={c} style={styles.importListItem}>• {c}</Text>
                  ))}
                </View>
              ) : null}

              {changeCount === 0 && willAdd === 0 ? (
                <View style={styles.importCard}>
                  <Text style={styles.importCardTitle}>Nothing to change</Text>
                  <Text style={styles.importCardBody}>
                    {diff.unknownAttendees.length > 0
                      ? 'Toggle "Add these as new attendees" above to seed them, or cancel if the names are typos.'
                      : 'Every attendee in the file already matches the current spreadsheet.'}
                  </Text>
                </View>
              ) : null}

              {changeCount > 0 ? (
                <View style={styles.importCard}>
                  <Text style={styles.importCardTitle}>Changes to apply</Text>
                  {diff.attendeeDiffs.slice(0, 40).map((d) => (
                    <View key={d.canonicalName} style={styles.importDiffRow}>
                      <Text style={styles.importDiffName}>{d.canonicalName}</Text>
                      <Text style={styles.importDiffBody}>{summarizeDiff(d)}</Text>
                    </View>
                  ))}
                  {diff.attendeeDiffs.length > 40 ? (
                    <Text style={styles.importListItem}>
                      … and {diff.attendeeDiffs.length - 40} more
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function summarizeDiff(d: AttendeeDiff): string {
  const parts: string[] = [];
  if (d.weddingParty) {
    parts.push(`Wedding Party ${d.weddingParty.from ? 'Yes' : 'No'} → ${d.weddingParty.to ? 'Yes' : 'No'}`);
  }
  if (d.gender) {
    parts.push(
      `Gender ${genderLabel(d.gender.from)} → ${genderLabel(d.gender.to)}`,
    );
  }
  for (const g of d.addedTo) parts.push(`+ ${g.groupName}`);
  for (const g of d.removedFrom) parts.push(`− ${g.groupName}`);
  return parts.join(' · ');
}

function genderLabel(g: Gender | null): string {
  if (g === 'female') return 'Female';
  if (g === 'male') return 'Male';
  return 'Unknown';
}

// ─── Main screen ─────────────────────────────────────────────────────

export default function AdminGuestGroupsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const {
    weddingId,
    isAdmin,
    attendees,
    guestGroups,
    patchAttendeeFlag,
    patchGuestGroupMembership,
    patchGuestGroups,
    appendAttendees,
  } = useWedding();

  const [search, setSearch] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [emailingTemplate, setEmailingTemplate] = useState(false);
  const [applyingImport, setApplyingImport] = useState(false);
  const [importDiff, setImportDiff] = useState<ImportDiff | null>(null);
  // When true, the preview modal will insert unknownAttendees as fresh
  // guests before applying the rest of the diff. Off by default so a
  // stray typo in an existing-guest sheet doesn't accidentally seed a
  // rogue row; opting in surfaces the confirmation.
  const [addUnknownAttendees, setAddUnknownAttendees] = useState(false);

  // ScrollView refs for the two horizontally-scrollable strips —
  // header row (column labels) and body rows (cells). One vertical
  // scroll wraps the entire body (name column + cells side by side)
  // so vertical sync isn't needed; only the horizontal scrolls
  // between header and body have to stay locked to each other. The
  // programmatic flag suppresses the responding scroll's onScroll
  // callback while we drive it, breaking the sync feedback loop.
  const headerHorizontalRef = useRef<ScrollView>(null);
  const cellsHorizontalRef = useRef<ScrollView>(null);
  const isProgrammaticHorizontal = useRef(false);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const sortedAttendees: Attendee[] = useMemo(
    () =>
      [...attendees]
        .filter((a) => !a.is_couple)
        .sort((a, b) => a.canonical_name.localeCompare(b.canonical_name))
        .map((a) => ({
          canonicalName: a.canonical_name,
          isWeddingParty: a.is_wedding_party,
          gender: a.gender,
        })),
    [attendees],
  );

  const filteredAttendees = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sortedAttendees;
    return sortedAttendees.filter((a) =>
      a.canonicalName.toLowerCase().includes(q),
    );
  }, [sortedAttendees, search]);

  const weddingPartyGroup = useMemo(
    () => guestGroups.find((g) => g.name === WEDDING_PARTY_GROUP_NAME) ?? null,
    [guestGroups],
  );

  const userColumns = useMemo(
    () =>
      guestGroups
        .filter((g) => g.name !== WEDDING_PARTY_GROUP_NAME)
        .sort((a, b) => a.sort_order - b.sort_order),
    [guestGroups],
  );

  // Width of the horizontally-scrollable region: 4 default columns
  // (Wedding Party + Female/Male/Unknown) + one column per user group +
  // the "New group" affordance at the far right. Applied to the body's
  // inner vertical ScrollView so its rows aren't clipped to the outer
  // horizontal ScrollView's viewport width — RN's default nested-
  // ScrollView behavior does exactly that, which shows up visually as
  // the body columns not extending as far as the header row.
  const NEW_GROUP_HEADER_WIDTH = 80;
  const totalCellsWidth =
    (4 + userColumns.length) * CELL_WIDTH + NEW_GROUP_HEADER_WIDTH;

  // Column counts are computed off the full unfiltered attendee list so
  // the badges reflect wedding-wide totals regardless of what the
  // search box is currently filtered to.
  const weddingPartyCount = sortedAttendees.filter((a) => a.isWeddingParty).length;
  const femaleCount = sortedAttendees.filter((a) => a.gender === 'female').length;
  const maleCount = sortedAttendees.filter((a) => a.gender === 'male').length;
  const unknownCount = sortedAttendees.filter((a) => a.gender === null).length;

  // ─── Cell writes ────────────────────────────────────────────────────
  // Every cell write follows the same optimistic-then-rollback pattern:
  // patch the in-memory state first so the checkbox flips instantly,
  // then persist, and on failure reverse the patch and surface an alert
  // so the admin can retry.

  const handleToggleWeddingParty = async (canonicalName: string, next: boolean) => {
    patchAttendeeFlag(canonicalName, { is_wedding_party: next });
    const groupId = weddingPartyGroup?.id;
    if (groupId) patchGuestGroupMembership(groupId, canonicalName, next);
    try {
      await setGuestWeddingParty(weddingId, canonicalName, next);
      if (groupId) {
        await toggleGuestGroupMember(weddingId, groupId, canonicalName, next);
      }
    } catch (e) {
      patchAttendeeFlag(canonicalName, { is_wedding_party: !next });
      if (groupId) patchGuestGroupMembership(groupId, canonicalName, !next);
      Alert.alert('Could not update Wedding Party', errorMessage(e));
    }
  };

  const handleSetGender = async (canonicalName: string, next: Gender | null) => {
    const prev = sortedAttendees.find((a) => a.canonicalName === canonicalName)?.gender ?? null;
    if (prev === next) return;
    patchAttendeeFlag(canonicalName, { gender: next });
    try {
      await setGuestGender(weddingId, canonicalName, next);
    } catch (e) {
      patchAttendeeFlag(canonicalName, { gender: prev });
      Alert.alert('Could not update gender', errorMessage(e));
    }
  };

  const handleToggleGroup = async (
    groupId: string,
    canonicalName: string,
    next: boolean,
  ) => {
    patchGuestGroupMembership(groupId, canonicalName, next);
    try {
      await toggleGuestGroupMember(weddingId, groupId, canonicalName, next);
    } catch (e) {
      patchGuestGroupMembership(groupId, canonicalName, !next);
      Alert.alert('Could not update group', errorMessage(e));
    }
  };

  // ─── Column-level actions ──────────────────────────────────────────

  const handleCreateGroup = async (name: string) => {
    setCreating(true);
    try {
      const created = await createGuestGroup(weddingId, {
        name,
        description: null,
        icon: null,
        members: [],
      });
      patchGuestGroups({ type: 'add', group: created });
      setCreatingGroup(false);
    } catch (e) {
      Alert.alert('Could not create group', errorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleRenameGroup = async (groupId: string, name: string) => {
    const group = guestGroups.find((g) => g.id === groupId);
    if (!group) return;
    setRenaming(true);
    patchGuestGroups({ type: 'rename', groupId, name });
    try {
      await updateGuestGroupMetadata(groupId, {
        name,
        description: group.description,
        icon: group.icon,
      });
      setRenamingGroupId(null);
    } catch (e) {
      patchGuestGroups({ type: 'rename', groupId, name: group.name });
      Alert.alert('Could not rename group', errorMessage(e));
    } finally {
      setRenaming(false);
    }
  };

  const handleDeleteGroup = (group: GuestGroup) => {
    Alert.alert(
      `Delete "${group.name}"?`,
      `This removes the column and its ${group.members.length} membership${group.members.length === 1 ? '' : 's'}. Guests themselves are not affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptic.warning();
            patchGuestGroups({ type: 'remove', groupId: group.id });
            try {
              await deleteGuestGroup(group.id);
            } catch (e) {
              patchGuestGroups({ type: 'add', group });
              Alert.alert('Could not delete group', errorMessage(e));
            }
          },
        },
      ],
    );
  };

  const collisionCheck = (excludingId: string | null) => (candidate: string) => {
    const lower = candidate.toLowerCase();
    if (DEFAULT_COLUMN_NAMES.has(lower)) return true;
    return guestGroups.some(
      (g) => g.name.toLowerCase() === lower && g.id !== excludingId,
    );
  };

  const renamingGroup = renamingGroupId
    ? guestGroups.find((g) => g.id === renamingGroupId) ?? null
    : null;

  // ─── CSV export + template ──────────────────────────────────────────
  // Mirrors the accommodations export path: build CSV, open mail
  // composer with the file attached, fall back to a mailto link so
  // guests without a configured mail app can still get the data out.
  // The template variant emails a blank sheet with example rows so
  // couples doing an initial upload don't have to guess the format.

  const emailCsv = async (
    csv: string,
    subject: string,
    body: string,
    filename: string,
  ) => {
    const canMail = await MailComposer.isAvailableAsync().catch(() => false);
    if (canMail) {
      const fileUri = `${FileSystem.cacheDirectory ?? ''}${filename}`;
      await FileSystem.writeAsStringAsync(fileUri, csv, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const result = await MailComposer.composeAsync({
        subject,
        body,
        attachments: [fileUri],
      });
      if (result.status === MailComposer.MailComposerStatus.SENT) {
        Alert.alert('Sent', 'Email sent.');
      }
      return;
    }
    const inlineLimit = 1800;
    const inlineCsv = csv.length > inlineLimit
      ? `${csv.slice(0, inlineLimit)}\n…(truncated)`
      : csv;
    const url =
      `mailto:?subject=${encodeURIComponent(subject)}` +
      `&body=${encodeURIComponent(`${body}\n${inlineCsv}`)}`;
    const supported = await Linking.canOpenURL(url).catch(() => false);
    if (!supported) {
      Alert.alert('Email not available', 'No email app is configured on this device.');
      return;
    }
    await Linking.openURL(url);
  };

  const handleEmailTemplate = async () => {
    setEmailingTemplate(true);
    try {
      const csv = buildGuestListTemplateCsv();
      const subject = 'Guest list template';
      const body =
        'Fill out this template with your full guest list, then upload it via ' +
        '"Import" on the Guest Groups & Access screen.\n\n' +
        'Columns:\n' +
        '  • Name — full name (e.g. "Ada Lovelace")\n' +
        '  • Wedding Party — "Yes" for wedding-party members, blank otherwise\n' +
        '  • Gender — "Female", "Male", or blank\n\n' +
        'The example rows can be replaced or deleted.\n';
      await emailCsv(csv, subject, body, `guest-list-template-${todayIso()}.csv`);
    } catch (e) {
      Alert.alert('Could not email template', errorMessage(e));
    } finally {
      setEmailingTemplate(false);
    }
  };

  const handleExport = async () => {
    if (sortedAttendees.length === 0) {
      Alert.alert('Nothing to export', 'This wedding has no attendees on the guest list.');
      return;
    }
    setExporting(true);
    try {
      const csv = buildGuestGroupsCsv(sortedAttendees, userColumns);
      const stamp = todayIso();
      const subject = `Guest groups — ${stamp}`;
      const body =
        `${sortedAttendees.length} attendee${sortedAttendees.length === 1 ? '' : 's'} attached as CSV.\n\n` +
        `Columns: Name, Wedding Party, Gender${userColumns.length ? `, ${userColumns.map((g) => g.name).join(', ')}` : ''}\n`;
      await emailCsv(csv, subject, body, `guest-groups-${stamp}.csv`);
    } catch (e) {
      Alert.alert('Export failed', errorMessage(e));
    } finally {
      setExporting(false);
    }
  };

  // ─── CSV import ─────────────────────────────────────────────────────
  // Pick file → read → compute diff → show preview → apply on confirm.
  // Applying batches by attendee (one flags write) and by group (one
  // bulk membership rewrite), so a 100-row / 5-group import is at most
  // ~200 network calls rather than one per changed cell.

  const handleImportPick = async () => {
    setImporting(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const csvText = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      const diff = computeImportDiff(
        csvText,
        sortedAttendees.map((a) => ({
          canonicalName: a.canonicalName,
          isWeddingParty: a.isWeddingParty,
          gender: a.gender,
        })),
        userColumns,
      );
      // Default the add-unknown checkbox to ON when the CSV looks
      // like a first-time upload — nothing on the guest list yet AND
      // the file has new names to add. Anything else keeps it off so
      // typos in an update sheet don't silently create attendees.
      setAddUnknownAttendees(
        sortedAttendees.length === 0 && diff.unknownAttendees.length > 0,
      );
      setImportDiff(diff);
    } catch (e) {
      Alert.alert('Import failed', errorMessage(e));
    } finally {
      setImporting(false);
    }
  };

  const handleApplyImport = async () => {
    if (!importDiff) return;
    setApplyingImport(true);
    const weddingPartyGroupId = weddingPartyGroup?.id ?? null;
    // Whether to also insert unknown-name rows as fresh guests.
    // Anchored on the sheet-level flag so the checkbox in the preview
    // toggles it in real time.
    const includeUnknown = addUnknownAttendees && importDiff.unknownAttendees.length > 0;

    // Bucket group membership changes so we can apply them per group
    // in one bulkApplyGuestGroupMembership call each — cleaner and
    // cheaper than one write per (guest × group) cell.
    const groupAdditions = new Map<string, string[]>();
    const groupRemovals = new Map<string, string[]>();
    const weddingPartyAdds: string[] = [];
    const weddingPartyRemoves: string[] = [];
    for (const d of importDiff.attendeeDiffs) {
      if (d.weddingParty && weddingPartyGroupId) {
        if (d.weddingParty.to) weddingPartyAdds.push(d.canonicalName);
        else weddingPartyRemoves.push(d.canonicalName);
      }
      for (const g of d.addedTo) {
        const list = groupAdditions.get(g.groupId);
        if (list) list.push(d.canonicalName);
        else groupAdditions.set(g.groupId, [d.canonicalName]);
      }
      for (const g of d.removedFrom) {
        const list = groupRemovals.get(g.groupId);
        if (list) list.push(d.canonicalName);
        else groupRemovals.set(g.groupId, [d.canonicalName]);
      }
    }

    // Newly-inserted attendees also need their group memberships +
    // (if Wedding Party is on) the mirror-group entry seeded, folded
    // into the same buckets we're already building for the update
    // path so phases 2 + 3 pick them up in one sweep.
    if (includeUnknown) {
      for (const u of importDiff.unknownAttendees) {
        if (u.isWeddingParty && weddingPartyGroupId) {
          weddingPartyAdds.push(u.name);
        }
        for (const g of u.groups) {
          const list = groupAdditions.get(g.groupId);
          if (list) list.push(u.name);
          else groupAdditions.set(g.groupId, [u.name]);
        }
      }
    }

    try {
      // Phase 0: create fresh guests if the admin opted in. Done
      // before Phase 1 so any downstream membership writes hit rows
      // that already exist (the composite FK on guest_group_members
      // requires the guests row).
      let insertedRows: GuestRow[] = [];
      if (includeUnknown) {
        insertedRows = await createGuestsBulk(
          weddingId,
          importDiff.unknownAttendees.map((u) => ({
            canonicalName: u.name,
            isWeddingParty: u.isWeddingParty,
            gender: u.gender,
          })),
        );
      }

      // Phase 1: flags on existing guests. One PATCH per attendee
      // (postgrest doesn't have a friendly bulk-update-by-list path
      // without a custom RPC). Runs concurrently — the guests table
      // is per-row and there's no cross-row constraint being touched.
      await Promise.all(
        importDiff.attendeeDiffs.map((d) => {
          const patch: { is_wedding_party?: boolean; gender?: Gender | null } = {};
          if (d.weddingParty) patch.is_wedding_party = d.weddingParty.to;
          if (d.gender) patch.gender = d.gender.to;
          if (Object.keys(patch).length === 0) return Promise.resolve();
          return bulkUpdateGuestFlags(weddingId, d.canonicalName, patch);
        }),
      );

      // Phase 2: group memberships. One bulk call per group (delete +
      // upsert of the add/remove lists we accumulated above).
      const groupIds = new Set([
        ...groupAdditions.keys(),
        ...groupRemovals.keys(),
      ]);
      await Promise.all(
        [...groupIds].map((gid) =>
          bulkApplyGuestGroupMembership(
            weddingId,
            gid,
            groupAdditions.get(gid) ?? [],
            groupRemovals.get(gid) ?? [],
          ),
        ),
      );

      // Phase 3: sync the mirror Wedding Party group when the flag moved
      // (or when a new wedding-party attendee was created above).
      if (weddingPartyGroupId && (weddingPartyAdds.length || weddingPartyRemoves.length)) {
        await bulkApplyGuestGroupMembership(
          weddingId,
          weddingPartyGroupId,
          weddingPartyAdds,
          weddingPartyRemoves,
        );
      }

      // Success — sync the in-memory context so the sheet reflects
      // everything without waiting on a refetch.
      if (insertedRows.length > 0) {
        appendAttendees(insertedRows);
        // Also register each new attendee's group memberships in the
        // in-memory guestGroups roster so the sheet column counts +
        // cell states stay accurate without a refetch.
        for (const u of importDiff.unknownAttendees) {
          for (const g of u.groups) {
            patchGuestGroupMembership(g.groupId, u.name, true);
          }
          if (u.isWeddingParty && weddingPartyGroupId) {
            patchGuestGroupMembership(weddingPartyGroupId, u.name, true);
          }
        }
      }
      for (const d of importDiff.attendeeDiffs) {
        if (d.weddingParty || d.gender) {
          patchAttendeeFlag(d.canonicalName, {
            ...(d.weddingParty ? { is_wedding_party: d.weddingParty.to } : {}),
            ...(d.gender ? { gender: d.gender.to } : {}),
          });
        }
        for (const g of d.addedTo) patchGuestGroupMembership(g.groupId, d.canonicalName, true);
        for (const g of d.removedFrom) patchGuestGroupMembership(g.groupId, d.canonicalName, false);
        if (d.weddingParty && weddingPartyGroupId) {
          patchGuestGroupMembership(weddingPartyGroupId, d.canonicalName, d.weddingParty.to);
        }
      }
      setImportDiff(null);
      setAddUnknownAttendees(false);
      const updated = importDiff.attendeeDiffs.length;
      const inserted = insertedRows.length;
      const parts: string[] = [];
      if (inserted > 0) parts.push(`${inserted} attendee${inserted === 1 ? '' : 's'} added`);
      if (updated > 0) parts.push(`${updated} updated`);
      Alert.alert('Imported', parts.length ? parts.join(' · ') : 'Nothing changed.');
    } catch (e) {
      Alert.alert('Import failed', errorMessage(e));
    } finally {
      setApplyingImport(false);
    }
  };

  // ─── Scroll sync handlers ────────────────────────────────────────────
  // The sheet layout is:
  //   [ name header | header ScrollView (horizontal) ]         ← fixed
  //   [ name column | cells ScrollView (horizontal) ] inside a  ← scrolls
  //     single vertical ScrollView                                vertically
  //
  // The single vertical scroll around the body means the name column
  // stays stuck to the top-left and follows the cells vertically for
  // free — no vertical sync required. Horizontal sync between the
  // header row and the body's cells is the only mirror we still need.

  const onHorizontalScroll = (source: 'header' | 'cells') =>
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (isProgrammaticHorizontal.current) {
        isProgrammaticHorizontal.current = false;
        return;
      }
      const x = e.nativeEvent.contentOffset.x;
      const target = source === 'header' ? cellsHorizontalRef : headerHorizontalRef;
      isProgrammaticHorizontal.current = true;
      target.current?.scrollTo({ x, animated: false });
    };

  return (
    <View style={styles.root}>
      {/* Page header with padding above the sheet */}
      <View style={[styles.pageHeader, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Guest Groups & Access</Text>
        <Text style={styles.pageSubtitle}>
          Rows are attendees, columns are groups. Wedding Party + gender are built-in; add your own with New group.
        </Text>

        {/* Toolbar rows: search on top, action buttons below so the
            names of the actions have room to breathe and the search
            box has full width. */}
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search attendees"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={6}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.actionRow}
        >
          <TouchableOpacity
            onPress={handleEmailTemplate}
            disabled={emailingTemplate}
            style={[styles.toolbarBtn, emailingTemplate && styles.toolbarBtnDisabled]}
            activeOpacity={0.85}
          >
            {emailingTemplate ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={14} color={Colors.primary} />
                <Text style={styles.toolbarBtnText}>Email template</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleExport}
            disabled={exporting}
            style={[styles.toolbarBtn, exporting && styles.toolbarBtnDisabled]}
            activeOpacity={0.85}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="mail-outline" size={14} color={Colors.primary} />
                <Text style={styles.toolbarBtnText}>Export CSV</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleImportPick}
            disabled={importing}
            style={[styles.toolbarBtn, importing && styles.toolbarBtnDisabled]}
            activeOpacity={0.85}
          >
            {importing ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <>
                <Ionicons name="cloud-upload-outline" size={14} color={Colors.primary} />
                <Text style={styles.toolbarBtnText}>Import CSV</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        {search.trim() ? (
          <Text style={styles.filterHint}>
            Showing {filteredAttendees.length} of {sortedAttendees.length} attendees
          </Text>
        ) : null}
      </View>

      {/* Sheet */}
      <View style={styles.sheet}>
        {/* Header row: fixed name-column header + horizontally scrollable group headers */}
        <View style={[styles.headerRow, { height: HEADER_HEIGHT }]}>
          <View style={[styles.nameHeaderCell, { width: NAME_COLUMN_WIDTH, height: HEADER_HEIGHT }]}>
            <Text style={styles.nameHeaderText}>
              {sortedAttendees.length} attendee{sortedAttendees.length === 1 ? '' : 's'}
            </Text>
          </View>
          <ScrollView
            horizontal
            ref={headerHorizontalRef}
            onScroll={onHorizontalScroll('header')}
            scrollEventThrottle={16}
            showsHorizontalScrollIndicator={false}
            bounces={false}
            contentContainerStyle={{ width: totalCellsWidth }}
          >
            <ColumnHeader label="Wedding Party" sublabel="default" count={weddingPartyCount} />
            <ColumnHeader label="Female" sublabel="gender" count={femaleCount} />
            <ColumnHeader label="Male" sublabel="gender" count={maleCount} />
            <ColumnHeader label="Unknown" sublabel="gender" count={unknownCount} />
            {userColumns.map((group) => (
              <ColumnHeader
                key={group.id}
                label={group.name}
                count={group.members.length}
                onEdit={() => setRenamingGroupId(group.id)}
                onDelete={() => handleDeleteGroup(group)}
              />
            ))}
            <TouchableOpacity
              style={[styles.addColumnBtn, { height: HEADER_HEIGHT }]}
              onPress={() => {
                haptic.light();
                setCreatingGroup(true);
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={18} color={Colors.primary} />
              <Text style={styles.addColumnBtnText}>New group</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Body: one vertical ScrollView holding both the fixed name
            column and the horizontally-scrollable cells strip. Because
            they're siblings inside the same vertical scroll, the name
            column stays lined up with its row's cells for free — no
            vertical sync required. */}
        <ScrollView
          style={styles.bodyScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
          showsVerticalScrollIndicator
          bounces={false}
        >
          <View style={styles.bodyRow}>
            {/* Fixed left name column */}
            <View style={[styles.nameColumn, { width: NAME_COLUMN_WIDTH }]}>
              {filteredAttendees.length === 0 ? (
                <View style={[styles.nameCell, { width: NAME_COLUMN_WIDTH, minHeight: ROW_HEIGHT * 2, alignItems: 'flex-start' }]}>
                  <Text style={styles.emptyText}>
                    {search.trim() ? 'No matches' : 'No attendees yet'}
                  </Text>
                </View>
              ) : (
                filteredAttendees.map((a, idx) => (
                  <View
                    key={a.canonicalName}
                    style={[
                      styles.nameCell,
                      { width: NAME_COLUMN_WIDTH, height: ROW_HEIGHT },
                      idx % 2 === 1 && styles.rowAlt,
                    ]}
                  >
                    <Text style={styles.nameText} numberOfLines={1}>
                      {a.canonicalName}
                    </Text>
                  </View>
                ))
              )}
            </View>

            {/* Horizontally-scrollable cells strip. contentContainerStyle
                pins the inner content to totalCellsWidth so RN doesn't
                collapse it to the viewport (which was the bug that
                misaligned columns). */}
            <ScrollView
              horizontal
              ref={cellsHorizontalRef}
              onScroll={onHorizontalScroll('cells')}
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator
              bounces={false}
              contentContainerStyle={{ width: totalCellsWidth }}
            >
              <View style={{ width: totalCellsWidth }}>
                {filteredAttendees.length === 0 ? (
                  <View style={[styles.emptyCellRow, { minHeight: ROW_HEIGHT * 2, width: totalCellsWidth }]}>
                    {search.trim() ? (
                      <Text style={styles.emptyText}>Try a different name.</Text>
                    ) : (
                      <View style={{ padding: Spacing.md, maxWidth: 320 }}>
                        <Text style={styles.emptyText}>
                          Get started by emailing yourself a blank guest-list template. Fill it in, then import it here to populate the sheet.
                        </Text>
                        <TouchableOpacity
                          onPress={handleEmailTemplate}
                          disabled={emailingTemplate}
                          style={styles.emptyPrimaryBtn}
                          activeOpacity={0.85}
                        >
                          {emailingTemplate ? (
                            <ActivityIndicator color={Colors.white} size="small" />
                          ) : (
                            <>
                              <Ionicons name="document-text-outline" size={14} color={Colors.white} />
                              <Text style={styles.emptyPrimaryBtnText}>Email me a template</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ) : (
                  filteredAttendees.map((a, idx) => (
                    <View
                      key={a.canonicalName}
                      style={[styles.cellRow, { height: ROW_HEIGHT, width: totalCellsWidth }, idx % 2 === 1 && styles.rowAlt]}
                    >
                      <Cell
                        on={a.isWeddingParty}
                        tint={Colors.primary}
                        onPress={() =>
                          handleToggleWeddingParty(a.canonicalName, !a.isWeddingParty)
                        }
                      />
                      <Cell
                        on={a.gender === 'female'}
                        tint={Colors.accent}
                        onPress={() =>
                          handleSetGender(
                            a.canonicalName,
                            a.gender === 'female' ? null : 'female',
                          )
                        }
                      />
                      <Cell
                        on={a.gender === 'male'}
                        tint={Colors.accent}
                        onPress={() =>
                          handleSetGender(
                            a.canonicalName,
                            a.gender === 'male' ? null : 'male',
                          )
                        }
                      />
                      <Cell
                        on={a.gender === null}
                        tint={Colors.textMuted}
                        onPress={() =>
                          handleSetGender(
                            a.canonicalName,
                            a.gender === null ? 'female' : null,
                          )
                        }
                      />
                      {userColumns.map((group) => {
                        const inGroup = group.members.includes(a.canonicalName);
                        return (
                          <Cell
                            key={group.id}
                            on={inGroup}
                            tint={Colors.gold}
                            onPress={() =>
                              handleToggleGroup(group.id, a.canonicalName, !inGroup)
                            }
                          />
                        );
                      })}
                      {/* Spacer under the "New group" header column so the
                          cell area matches the header width. Empty view;
                          never interactive. */}
                      <View style={{ width: NEW_GROUP_HEADER_WIDTH }} />
                    </View>
                  ))
                )}
              </View>
            </ScrollView>
          </View>
        </ScrollView>
      </View>

      <GroupNameModal
        visible={creatingGroup}
        title="New group"
        initialValue=""
        submitLabel="Create"
        saving={creating}
        onSubmit={handleCreateGroup}
        onClose={() => (creating ? undefined : setCreatingGroup(false))}
        collisionCheck={collisionCheck(null)}
      />
      <GroupNameModal
        visible={!!renamingGroup}
        title="Rename group"
        initialValue={renamingGroup?.name ?? ''}
        submitLabel="Save"
        saving={renaming}
        onSubmit={(v) => renamingGroup && handleRenameGroup(renamingGroup.id, v)}
        onClose={() => (renaming ? undefined : setRenamingGroupId(null))}
        collisionCheck={collisionCheck(renamingGroupId)}
      />
      <ImportPreviewModal
        visible={!!importDiff}
        diff={importDiff}
        applying={applyingImport}
        addUnknown={addUnknownAttendees}
        onToggleAddUnknown={setAddUnknownAttendees}
        onCancel={() => {
          if (applyingImport) return;
          setImportDiff(null);
          setAddUnknownAttendees(false);
        }}
        onApply={handleApplyImport}
      />
    </View>
  );
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  guard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guardText: { fontFamily: Fonts.sans, color: Colors.textMuted },

  pageHeader: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
    borderBottomWidth: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  backText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  pageTitle: {
    fontSize: 26,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.md,
  },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingRight: Spacing.md,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  toolbarBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.white,
    minHeight: 36,
  },
  toolbarBtnDisabled: { opacity: 0.5 },
  toolbarBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.primary,
  },
  filterHint: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  sheet: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },

  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  nameHeaderCell: {
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
    backgroundColor: Colors.surfaceWarm,
  },
  nameHeaderText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  headerCell: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
  },
  headerLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 14,
  },
  headerSublabel: {
    fontFamily: Fonts.sans,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginTop: 2,
  },
  headerCount: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    color: Colors.primary,
    marginTop: 4,
  },
  headerActionRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  headerAction: { padding: 2 },

  addColumnBtn: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    paddingHorizontal: Spacing.sm,
    gap: 2,
    borderLeftWidth: 0.5,
    borderLeftColor: Colors.border,
  },
  addColumnBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 0.4,
    color: Colors.primary,
    textAlign: 'center',
  },

  bodyScroll: {
    flex: 1,
  },
  bodyRow: {
    flexDirection: 'row',
  },
  nameColumn: {
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
    backgroundColor: Colors.white,
  },
  nameCell: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  nameText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  cellRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  rowAlt: {
    backgroundColor: Colors.surfaceWarm,
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
  },
  cellPressed: { opacity: 0.5 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },

  emptyCellRow: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'left',
    lineHeight: 19,
  },
  emptyPrimaryBtn: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
    alignSelf: 'flex-start',
  },
  emptyPrimaryBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.white,
  },

  addUnknownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  addUnknownText: { flex: 1, marginRight: Spacing.md },
  addUnknownLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  addUnknownHint: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
    lineHeight: 15,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackActive: { backgroundColor: Colors.primary },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  toggleThumbActive: { transform: [{ translateX: 18 }] },

  // ─── Modals ───────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 24, 16, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  modalTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  modalError: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  modalBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: Radius.full,
    minWidth: 80,
    alignItems: 'center',
  },
  modalBtnCancel: { backgroundColor: 'transparent' },
  modalBtnCancelText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textMuted,
  },
  modalBtnConfirm: { backgroundColor: Colors.primary },
  modalBtnConfirmDisabled: { opacity: 0.45 },
  modalBtnConfirmText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.white,
  },

  // Import preview modal — full-screen slide-up so long change lists
  // are scrollable. Header row mirrors the group-editor modal from the
  // v1 UI so admins get a familiar cancel/confirm shape.
  importRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  importHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  editorCancel: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textMuted,
  },
  editorCancelDisabled: { opacity: 0.5 },
  editorTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  editorSave: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.primary,
  },
  editorSaveDisabled: { opacity: 0.45 },

  importScroll: { flex: 1 },
  importContent: {
    padding: Spacing.lg,
  },
  importSummaryRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  importStatTile: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadow.small,
  },
  importStatValue: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 30,
    color: Colors.primary,
  },
  importStatLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  importCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  importCardError: {
    borderColor: Colors.error,
    backgroundColor: '#FBE9E7',
  },
  importCardWarn: {
    borderColor: '#E8C36A',
    backgroundColor: '#FFF8E6',
  },
  importCardTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  importCardBody: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
    marginBottom: 6,
  },
  importErrorLine: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.error,
    lineHeight: 17,
  },
  importListItem: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  importDiffRow: {
    paddingVertical: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  importDiffName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  importDiffBody: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
