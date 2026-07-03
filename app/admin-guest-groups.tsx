import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import {
  createGuestGroup,
  deleteGuestGroup,
  toggleGuestGroupMember,
  updateGuestGroupMetadata,
  type GuestGroup,
} from '@/services/guestGroups';
import {
  setGuestGender,
  setGuestWeddingParty,
  type Gender,
} from '@/services/wedding';

// The guest-groups admin screen is a spreadsheet: attendees down the
// rows, groups across the columns. Cells are checkboxes. Three column
// families are shown in a fixed order:
//
//   1. Wedding Party (default, always present) — bound to
//      guests.is_wedding_party AND the "Wedding Party" guest_group if
//      one exists in the DB. Toggling writes to both so the flag and
//      the group stay in sync (packing + event visibility rely on the
//      group).
//   2. Gender (default, radio-style: Female / Male / Unknown) — bound
//      to guests.gender. Clicking a cell sets the value (or clears
//      when the already-selected cell is tapped again).
//   3. User-created groups (dynamic, ordered by sort_order) — bound
//      to guest_group_members. Column header has rename / delete.
//
// New weddings without any user groups still see the four default
// columns, which is what "everyone on the roster" gets to browse out
// of the box; admins add columns as they need them.

const NAME_COLUMN_WIDTH = 180;
const CELL_WIDTH = 56;
const ROW_HEIGHT = 48;

// Reserved names that a user-created group can't collide with. The
// Wedding Party group we backfilled for N&N shows up as the default
// column rather than a duplicate user column; the gender columns are
// virtual (backed by guests.gender) and shouldn't be recreated as
// groups either.
const DEFAULT_COLUMN_NAMES = new Set(
  ['wedding party', 'female', 'male', 'unknown', 'unknown gender'].map((s) => s.toLowerCase()),
);

// The special guest_group backfilled by migration 043 that mirrors
// is_wedding_party. Hidden from the user-columns list because it
// surfaces as the default Wedding Party column instead — but its ID
// is what the packing list + wedding_events reference, so cell toggles
// keep its membership in sync.
const WEDDING_PARTY_GROUP_NAME = 'Wedding Party';

// Cell states — used by both the row renderer and the column-level
// stats badge (X of Y selected).
type CellState = 'on' | 'off';

interface Attendee {
  canonicalName: string;
  isWeddingParty: boolean;
  gender: Gender | null;
}

interface AttendeeRowProps {
  attendee: Attendee;
  weddingPartyOn: boolean;
  gender: Gender | null;
  userGroups: GuestGroup[];
  onToggleWeddingParty: (name: string, next: boolean) => void;
  onSetGender: (name: string, next: Gender | null) => void;
  onToggleGroup: (groupId: string, name: string, next: boolean) => void;
  alt: boolean;
}

function AttendeeRow({
  attendee,
  weddingPartyOn,
  gender,
  userGroups,
  onToggleWeddingParty,
  onSetGender,
  onToggleGroup,
  alt,
}: AttendeeRowProps) {
  return (
    <View style={[styles.row, alt && styles.rowAlt, { height: ROW_HEIGHT }]}>
      <View style={[styles.nameCell, { width: NAME_COLUMN_WIDTH }]}>
        <Text style={styles.nameText} numberOfLines={1}>
          {attendee.canonicalName}
        </Text>
      </View>

      <Cell
        state={weddingPartyOn ? 'on' : 'off'}
        tint={Colors.primary}
        onPress={() => onToggleWeddingParty(attendee.canonicalName, !weddingPartyOn)}
      />
      <Cell
        state={gender === 'female' ? 'on' : 'off'}
        tint={Colors.accent}
        onPress={() =>
          onSetGender(attendee.canonicalName, gender === 'female' ? null : 'female')
        }
      />
      <Cell
        state={gender === 'male' ? 'on' : 'off'}
        tint={Colors.accent}
        onPress={() =>
          onSetGender(attendee.canonicalName, gender === 'male' ? null : 'male')
        }
      />
      <Cell
        state={gender === null ? 'on' : 'off'}
        tint={Colors.textMuted}
        onPress={() =>
          onSetGender(attendee.canonicalName, gender === null ? 'female' : null)
        }
      />

      {userGroups.map((group) => {
        const inGroup = group.members.includes(attendee.canonicalName);
        return (
          <Cell
            key={group.id}
            state={inGroup ? 'on' : 'off'}
            tint={Colors.gold}
            onPress={() => onToggleGroup(group.id, attendee.canonicalName, !inGroup)}
          />
        );
      })}
    </View>
  );
}

interface CellProps {
  state: CellState;
  tint: string;
  onPress: () => void;
}

function Cell({ state, tint, onPress }: CellProps) {
  const on = state === 'on';
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
    <View style={[styles.headerCell, { width: CELL_WIDTH }]}>
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

// Small modal for creating or renaming a user column. Reused for both
// so the create + rename flows share styling.
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
  } = useWedding();

  const [creatingGroup, setCreatingGroup] = useState(false);
  const [creating, setCreating] = useState(false);
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

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
        .filter((a) => !a.is_couple) // couples aren't guests to gate; leave them off the roster
        .sort((a, b) => a.canonical_name.localeCompare(b.canonical_name))
        .map((a) => ({
          canonicalName: a.canonical_name,
          isWeddingParty: a.is_wedding_party,
          gender: a.gender,
        })),
    [attendees],
  );

  // The Wedding Party guest_group (if the backfill migration ran)
  // isn't shown as its own user column — the default column above
  // covers it. But its ID is what wedding_events + wedding_packing_lists
  // reference, so cell toggles on the Wedding Party column keep its
  // membership in sync with is_wedding_party.
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

  const countBy = (predicate: (a: Attendee) => boolean): number =>
    sortedAttendees.reduce((sum, a) => sum + (predicate(a) ? 1 : 0), 0);

  const weddingPartyCount = countBy((a) => a.isWeddingParty);
  const femaleCount = countBy((a) => a.gender === 'female');
  const maleCount = countBy((a) => a.gender === 'male');
  const unknownCount = countBy((a) => a.gender === null);

  // ─── Write handlers ────────────────────────────────────────────────
  // Optimistic patch first for snappy UI, then write. On failure we roll
  // back the in-memory state and surface an alert so the admin can retry.

  const handleToggleWeddingParty = async (canonicalName: string, next: boolean) => {
    patchAttendeeFlag(canonicalName, { is_wedding_party: next });
    const groupId = weddingPartyGroup?.id;
    if (groupId) patchGuestGroupMembership(groupId, canonicalName, next);
    try {
      await setGuestWeddingParty(weddingId, canonicalName, next);
      // Sync the backfilled group's membership so downstream visibility
      // filters (which read via guest_group_members) match the flag.
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
    // Optimistic
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
            // Optimistic remove; put it back if the delete fails.
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

  // Collision check used by the name modal — excludes the current
  // group when renaming so a no-op rename doesn't collide with itself.
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

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.headerContent, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.pageHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Guest Groups</Text>
          <Text style={styles.pageSubtitle}>
            Rows are attendees, columns are groups. Tap a cell to add or remove that guest from the group.
            Wedding Party + gender columns are built-in; add your own by tapping New group.
          </Text>
        </View>
      </ScrollView>

      {/* Spreadsheet — two nested ScrollViews so the header + name column
          stay put while the cells scroll independently. */}
      <View style={styles.sheet}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          stickyHeaderIndices={undefined}
          contentContainerStyle={styles.sheetHorizontalContent}
          bounces={false}
        >
          <View>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={[styles.nameHeaderCell, { width: NAME_COLUMN_WIDTH }]}>
                <Text style={styles.nameHeaderText}>
                  {sortedAttendees.length} attendee{sortedAttendees.length === 1 ? '' : 's'}
                </Text>
              </View>

              <ColumnHeader
                label="Wedding Party"
                sublabel="default"
                count={weddingPartyCount}
              />
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
                style={styles.addColumnBtn}
                onPress={() => {
                  haptic.light();
                  setCreatingGroup(true);
                }}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color={Colors.primary} />
                <Text style={styles.addColumnBtnText}>New group</Text>
              </TouchableOpacity>
            </View>

            {/* Body rows */}
            <ScrollView
              style={styles.bodyScroll}
              contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xxl }}
              nestedScrollEnabled
            >
              {sortedAttendees.length === 0 ? (
                <View style={styles.emptyRow}>
                  <Text style={styles.emptyText}>
                    No attendees yet — add guests to this wedding first.
                  </Text>
                </View>
              ) : (
                sortedAttendees.map((a, idx) => (
                  <AttendeeRow
                    key={a.canonicalName}
                    attendee={a}
                    weddingPartyOn={a.isWeddingParty}
                    gender={a.gender}
                    userGroups={userColumns}
                    onToggleWeddingParty={handleToggleWeddingParty}
                    onSetGender={handleSetGender}
                    onToggleGroup={handleToggleGroup}
                    alt={idx % 2 === 1}
                  />
                ))
              )}
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
    </View>
  );
}

function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : 'Unknown error';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { maxHeight: 200 },
  headerContent: { paddingHorizontal: Spacing.lg },

  guard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guardText: { fontFamily: Fonts.sans, color: Colors.textMuted },

  pageHeader: { marginBottom: Spacing.md },
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
  },

  sheet: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
  },
  sheetHorizontalContent: { flexGrow: 1 },

  headerRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceWarm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    minHeight: 88,
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
  headerAction: {
    padding: 2,
  },

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

  bodyScroll: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  rowAlt: {
    backgroundColor: Colors.surfaceWarm,
  },
  nameCell: {
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderRightWidth: 0.5,
    borderRightColor: Colors.border,
  },
  nameText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
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

  emptyRow: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // ─── Modal ───────────────────────────────────────────────────────
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
});
