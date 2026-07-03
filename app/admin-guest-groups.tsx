import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  fetchGuestGroups,
  updateGuestGroupMembers,
  updateGuestGroupMetadata,
  type GuestGroup,
} from '@/services/guestGroups';

// Icon palette for the group picker. Keeping the list short + curated
// (rather than exposing the full Ionicons set) keeps the picker scannable
// and lets the admin see every option at once without scrolling. Adding
// new suggestions is a matter of appending here.
type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface IconOption { key: string; icon: IconName; label: string }
const ICON_OPTIONS: IconOption[] = [
  { key: 'people',   icon: 'people',            label: 'Group' },
  { key: 'heart',    icon: 'heart',             label: 'Wedding party' },
  { key: 'flower',   icon: 'flower',            label: 'Bridesmaids' },
  { key: 'shirt',    icon: 'shirt',             label: 'Groomsmen' },
  { key: 'home',     icon: 'home',              label: 'Family' },
  { key: 'school',   icon: 'school',            label: 'Friends' },
  { key: 'briefcase',icon: 'briefcase',         label: 'Work' },
  { key: 'star',     icon: 'star',              label: 'VIP' },
  { key: 'globe',    icon: 'globe-outline',     label: 'Travel' },
  { key: 'sparkles', icon: 'sparkles',          label: 'Special' },
];

const DEFAULT_ICON: IconName = 'people';

function iconFromKey(key: string | null): IconName {
  if (!key) return DEFAULT_ICON;
  const match = ICON_OPTIONS.find((o) => o.key === key);
  return match?.icon ?? DEFAULT_ICON;
}

// Draft state used by both "create" (starts empty) and "edit" (pre-filled
// from the group being edited). Kept as its own object so the modal open/
// close/reset logic doesn't have to touch four separate useStates.
interface GroupDraft {
  name: string;
  description: string;
  iconKey: string;
  members: Set<string>;
}

const EMPTY_DRAFT: GroupDraft = {
  name: '',
  description: '',
  iconKey: 'people',
  members: new Set(),
};

function draftFromGroup(group: GuestGroup): GroupDraft {
  return {
    name: group.name,
    description: group.description ?? '',
    iconKey: group.icon ?? 'people',
    members: new Set(group.members),
  };
}

export default function AdminGuestGroupsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, isAdmin, attendees } = useWedding();

  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const [editorOpen, setEditorOpen] = useState(false);
  // Non-null when editing an existing group; null when creating a new one.
  const [editingGroup, setEditingGroup] = useState<GuestGroup | null>(null);
  const [draft, setDraft] = useState<GroupDraft>(EMPTY_DRAFT);
  const [memberQuery, setMemberQuery] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    fetchGuestGroups(weddingId)
      .then((data) => { if (!cancelled) setGroups(data); })
      .catch((err) => {
        console.warn('[admin-guest-groups] load failed', err);
        if (!cancelled) setErrored(true);
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [weddingId]);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  // Guest picker — sorted alphabetically by canonical name and filtered by
  // the search box in the modal. Couples appear in the list too so groups
  // like "Family" that include the couple's parents can name the couple
  // themselves if the admin wants.
  const rosterSorted = useMemo(
    () => [...attendees].sort((a, b) => a.canonical_name.localeCompare(b.canonical_name)),
    [attendees],
  );

  const filteredRoster = useMemo(() => {
    const q = memberQuery.trim().toLowerCase();
    if (!q) return rosterSorted;
    return rosterSorted.filter((g) => g.canonical_name.toLowerCase().includes(q));
  }, [rosterSorted, memberQuery]);

  const openCreate = () => {
    haptic.light();
    setEditingGroup(null);
    setDraft(EMPTY_DRAFT);
    setMemberQuery('');
    setEditorOpen(true);
  };

  const openEdit = (group: GuestGroup) => {
    haptic.light();
    setEditingGroup(group);
    setDraft(draftFromGroup(group));
    setMemberQuery('');
    setEditorOpen(true);
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditingGroup(null);
    setDraft(EMPTY_DRAFT);
    setMemberQuery('');
  };

  const toggleMember = (canonicalName: string) => {
    haptic.selection();
    setDraft((prev) => {
      const next = new Set(prev.members);
      if (next.has(canonicalName)) next.delete(canonicalName);
      else next.add(canonicalName);
      return { ...prev, members: next };
    });
  };

  const setDraftField = <K extends keyof GroupDraft>(key: K, value: GroupDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const nameCollides = useMemo(() => {
    const trimmed = draft.name.trim().toLowerCase();
    if (!trimmed) return false;
    return groups.some(
      (g) =>
        g.name.toLowerCase() === trimmed &&
        (!editingGroup || g.id !== editingGroup.id),
    );
  }, [groups, draft.name, editingGroup]);

  const canSave = draft.name.trim().length > 0 && !nameCollides && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    haptic.medium();
    setSaving(true);
    const name = draft.name.trim();
    const description = draft.description.trim() || null;
    const icon = draft.iconKey || null;
    const members = Array.from(draft.members);
    try {
      if (editingGroup) {
        await Promise.all([
          updateGuestGroupMetadata(editingGroup.id, { name, description, icon }),
          updateGuestGroupMembers(editingGroup.id, weddingId, members),
        ]);
        setGroups((prev) =>
          prev.map((g) =>
            g.id === editingGroup.id
              ? {
                  ...g,
                  name,
                  description,
                  icon,
                  members: members.slice().sort((a, b) => a.localeCompare(b)),
                }
              : g,
          ),
        );
      } else {
        const created = await createGuestGroup(weddingId, {
          name,
          description,
          icon,
          members,
        });
        setGroups((prev) => [...prev, created]);
      }
      setEditorOpen(false);
      setEditingGroup(null);
      setDraft(EMPTY_DRAFT);
      setMemberQuery('');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Could not save group', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (group: GuestGroup) => {
    Alert.alert(
      `Delete "${group.name}"?`,
      'This removes the group and its member list. Guests themselves are not affected.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            haptic.warning();
            try {
              await deleteGuestGroup(group.id);
              setGroups((prev) => prev.filter((g) => g.id !== group.id));
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Unknown error';
              Alert.alert('Could not delete group', msg);
            }
          },
        },
      ],
    );
  };

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Guest Groups</Text>
          <Text style={styles.pageSubtitle}>
            Organize guests into groups like wedding party, family, or bridesmaids. Use them for event visibility and the packing list.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.newGroupButton}
          onPress={openCreate}
          activeOpacity={0.85}
        >
          <Ionicons name="add-circle" size={18} color={Colors.white} />
          <Text style={styles.newGroupButtonText}>New group</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : errored ? (
          <View style={styles.emptyCard}>
            <Ionicons name="cloud-offline-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>Couldn't load groups</Text>
            <Text style={styles.emptyBody}>Please try again in a moment.</Text>
          </View>
        ) : groups.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="people-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No groups yet</Text>
            <Text style={styles.emptyBody}>
              Create your first group to start organizing guests. Try "Bridesmaids" or "Family".
            </Text>
          </View>
        ) : (
          groups.map((group) => (
            <TouchableOpacity
              key={group.id}
              style={styles.groupCard}
              onPress={() => openEdit(group)}
              activeOpacity={0.85}
            >
              <View style={styles.groupHeader}>
                <View style={styles.groupIcon}>
                  <Ionicons
                    name={iconFromKey(group.icon)}
                    size={18}
                    color={Colors.primary}
                  />
                </View>
                <View style={styles.groupHeaderText}>
                  <Text style={styles.groupName}>{group.name}</Text>
                  <Text style={styles.groupMeta}>
                    {group.members.length} {group.members.length === 1 ? 'member' : 'members'}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => {
                    // Prevent the card's onPress (which opens the editor) so
                    // tapping delete never accidentally puts the admin into
                    // an edit modal for a group they meant to remove.
                    e.stopPropagation();
                    handleDelete(group);
                  }}
                  hitSlop={8}
                  style={styles.deleteButton}
                >
                  <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>

              {group.description ? (
                <Text style={styles.groupDescription}>{group.description}</Text>
              ) : null}

              {group.members.length > 0 ? (
                <View style={styles.memberChips}>
                  {group.members.slice(0, 8).map((name) => (
                    <View key={name} style={styles.memberChip}>
                      <Text style={styles.memberChipText}>{name}</Text>
                    </View>
                  ))}
                  {group.members.length > 8 ? (
                    <View style={[styles.memberChip, styles.memberChipMore]}>
                      <Text style={styles.memberChipText}>
                        +{group.members.length - 8} more
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <Text style={styles.groupEmpty}>No members yet — tap to add some.</Text>
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: insets.bottom + Spacing.xxl }} />
      </ScrollView>

      <GroupEditorModal
        visible={editorOpen}
        editingGroup={editingGroup}
        draft={draft}
        memberQuery={memberQuery}
        onMemberQueryChange={setMemberQuery}
        filteredRoster={filteredRoster}
        onSetField={setDraftField}
        onToggleMember={toggleMember}
        onClose={closeEditor}
        onSave={handleSave}
        canSave={canSave}
        saving={saving}
        nameCollides={nameCollides}
      />
    </View>
  );
}

interface EditorProps {
  visible: boolean;
  editingGroup: GuestGroup | null;
  draft: GroupDraft;
  memberQuery: string;
  onMemberQueryChange: (v: string) => void;
  filteredRoster: { canonical_name: string }[];
  onSetField: <K extends keyof GroupDraft>(key: K, value: GroupDraft[K]) => void;
  onToggleMember: (canonicalName: string) => void;
  onClose: () => void;
  onSave: () => void;
  canSave: boolean;
  saving: boolean;
  nameCollides: boolean;
}

function GroupEditorModal({
  visible,
  editingGroup,
  draft,
  memberQuery,
  onMemberQueryChange,
  filteredRoster,
  onSetField,
  onToggleMember,
  onClose,
  onSave,
  canSave,
  saving,
  nameCollides,
}: EditorProps) {
  const insets = useSafeAreaInsets();
  const memberCount = draft.members.size;

  return (
    <Modal
      visible={visible}
      transparent={false}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.editorRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.editorHeader, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity onPress={onClose} disabled={saving} hitSlop={8}>
            <Text style={[styles.editorCancel, saving && styles.editorCancelDisabled]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <Text style={styles.editorTitle}>
            {editingGroup ? 'Edit group' : 'New group'}
          </Text>
          <TouchableOpacity
            onPress={onSave}
            disabled={!canSave}
            hitSlop={8}
          >
            {saving ? (
              <ActivityIndicator color={Colors.primary} size="small" />
            ) : (
              <Text style={[styles.editorSave, !canSave && styles.editorSaveDisabled]}>
                Save
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Name */}
          <View style={styles.editorCard}>
            <Text style={styles.editorLabel}>Group name</Text>
            <TextInput
              style={styles.editorInput}
              value={draft.name}
              onChangeText={(t) => onSetField('name', t)}
              placeholder="e.g. Bridesmaids"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
              maxLength={60}
              returnKeyType="next"
            />
            {nameCollides ? (
              <Text style={styles.editorError}>
                Another group already has this name.
              </Text>
            ) : null}
          </View>

          {/* Description */}
          <View style={styles.editorCard}>
            <Text style={styles.editorLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.editorInput, styles.editorInputMulti]}
              value={draft.description}
              onChangeText={(t) => onSetField('description', t)}
              placeholder="What is this group for?"
              placeholderTextColor={Colors.textMuted}
              multiline
              maxLength={280}
              textAlignVertical="top"
            />
          </View>

          {/* Icon */}
          <View style={styles.editorCard}>
            <Text style={styles.editorLabel}>Icon</Text>
            <View style={styles.iconGrid}>
              {ICON_OPTIONS.map((opt) => {
                const active = draft.iconKey === opt.key;
                return (
                  <TouchableOpacity
                    key={opt.key}
                    style={[styles.iconOption, active && styles.iconOptionActive]}
                    onPress={() => {
                      haptic.selection();
                      onSetField('iconKey', opt.key);
                    }}
                    activeOpacity={0.85}
                  >
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={active ? Colors.white : Colors.primary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Members */}
          <View style={styles.editorCard}>
            <View style={styles.membersHeader}>
              <Text style={styles.editorLabel}>Members</Text>
              <Text style={styles.memberCount}>
                {memberCount} selected
              </Text>
            </View>

            <View style={styles.searchRow}>
              <Ionicons name="search" size={16} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                value={memberQuery}
                onChangeText={onMemberQueryChange}
                placeholder="Search guests"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>

            <View style={styles.rosterList}>
              {filteredRoster.length === 0 ? (
                <Text style={styles.rosterEmpty}>
                  {memberQuery
                    ? 'No guests match this search.'
                    : 'No guests in this wedding yet.'}
                </Text>
              ) : (
                filteredRoster.map((g) => {
                  const checked = draft.members.has(g.canonical_name);
                  return (
                    <TouchableOpacity
                      key={g.canonical_name}
                      style={styles.rosterRow}
                      onPress={() => onToggleMember(g.canonical_name)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
                        {checked ? (
                          <Ionicons name="checkmark" size={13} color={Colors.white} />
                        ) : null}
                      </View>
                      <Text style={styles.rosterName}>{g.canonical_name}</Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          </View>

          <View style={{ height: insets.bottom + Spacing.xxl }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

  guard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guardText: { fontFamily: Fonts.sans, color: Colors.textMuted },

  header: { marginBottom: Spacing.lg },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  newGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  newGroupButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.white,
    letterSpacing: 0.2,
  },

  loader: { marginTop: Spacing.xl },

  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadow.small,
  },
  emptyTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  groupCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  groupIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  groupHeaderText: { flex: 1 },
  groupName: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  groupMeta: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    padding: 6,
  },
  groupDescription: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.sm,
  },
  memberChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  memberChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  memberChipMore: {
    backgroundColor: Colors.accentLight,
  },
  memberChipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.1,
  },
  groupEmpty: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textMuted,
  },

  editorRoot: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  editorHeader: {
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
    letterSpacing: 0.2,
  },
  editorSave: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.primary,
  },
  editorSaveDisabled: { opacity: 0.45 },

  editorScroll: { flex: 1 },
  editorContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  editorCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  editorLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  editorInput: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editorInputMulti: {
    minHeight: 72,
    paddingTop: 10,
  },
  editorError: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.error,
    marginTop: Spacing.xs,
  },

  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  membersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  memberCount: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.primary,
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
    backgroundColor: Colors.background,
    marginBottom: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  rosterList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  rosterName: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  rosterEmpty: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
    fontStyle: 'italic',
    paddingVertical: Spacing.md,
    textAlign: 'center',
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
});
