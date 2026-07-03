import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import type {
  PackingCategory,
  PackingItem,
  WeddingPackingList,
} from '@/constants/weddingData';
import { updateWeddingPackingList } from '@/services/packing';

// Local editing model for one item. Booleans stay expanded (rather than
// undefined) so React-driven controls are easier to reason about — we
// collapse back to undefined at save time so the DB stores the same
// compact jsonb the code fallback produces.
interface DraftItem {
  id: string;
  label: string;
  tip: string;
  weddingPartyOnly: boolean;
  bridalPartyOnly: boolean;
  excludeBridalParty: boolean;
  excludeWeddingParty: boolean;
  gender: 'male' | 'female' | null;
  // Track whether this row is expanded — the compact row shows label +
  // visibility chip; expanding reveals tip / flags / advanced controls.
  expanded: boolean;
}

interface DraftCategory {
  id: string;
  title: string;
  emoji: string;
  items: DraftItem[];
  expanded: boolean;
}

interface Draft {
  pageTitle: string;
  pageSubtitleTag: string;
  pageSubtitle: string;
  completionMessage: string;
  tipFooterTitle: string;
  tipFooterText: string;
  categories: DraftCategory[];
  // Advanced page-copy panel toggle — collapsed by default so admins
  // land on the categories, which is what they actually change most.
  pageCopyExpanded: boolean;
}

function toDraft(list: WeddingPackingList): Draft {
  return {
    pageTitle: list.pageTitle,
    pageSubtitleTag: list.pageSubtitleTag ?? '',
    pageSubtitle: list.pageSubtitle ?? '',
    completionMessage: list.completionMessage ?? '',
    tipFooterTitle: list.tipFooter?.title ?? '',
    tipFooterText: list.tipFooter?.text ?? '',
    categories: list.categories.map((c) => ({
      id: c.id,
      title: c.title,
      emoji: c.emoji,
      expanded: false,
      items: c.items.map((it) => ({
        id: it.id,
        label: it.label,
        tip: it.tip ?? '',
        weddingPartyOnly: !!it.weddingPartyOnly,
        bridalPartyOnly: !!it.bridalPartyOnly,
        excludeWeddingParty: !!it.excludeWeddingParty,
        excludeBridalParty: !!it.excludeBridalParty,
        gender: it.gender ?? null,
        expanded: false,
      })),
    })),
    pageCopyExpanded: false,
  };
}

// Reverse of toDraft — collapses back to the compact JSONB shape the
// packing service writes to wedding_packing_lists. Empty strings on
// optional text fields become null (or omitted flags on items) so the
// DB row stays a tidy diff of the meaningful data.
function fromDraft(draft: Draft): {
  pageTitle: string;
  pageSubtitleTag: string | null;
  pageSubtitle: string | null;
  completionMessage: string | null;
  categories: PackingCategory[];
  tipFooter: { title: string; text: string } | null;
} {
  const categories: PackingCategory[] = draft.categories.map((c) => ({
    id: c.id,
    title: c.title.trim(),
    emoji: c.emoji.trim(),
    items: c.items.map((it) => {
      const clean: PackingItem = {
        id: it.id,
        label: it.label.trim(),
      };
      const tip = it.tip.trim();
      if (tip) clean.tip = tip;
      if (it.weddingPartyOnly) clean.weddingPartyOnly = true;
      if (it.bridalPartyOnly) clean.bridalPartyOnly = true;
      if (it.excludeWeddingParty) clean.excludeWeddingParty = true;
      if (it.excludeBridalParty) clean.excludeBridalParty = true;
      if (it.gender) clean.gender = it.gender;
      return clean;
    }),
  }));

  const tipTitle = draft.tipFooterTitle.trim();
  const tipText = draft.tipFooterText.trim();
  const tipFooter = tipTitle || tipText ? { title: tipTitle, text: tipText } : null;

  return {
    pageTitle: draft.pageTitle.trim() || 'Packing Guide',
    pageSubtitleTag: draft.pageSubtitleTag.trim() || null,
    pageSubtitle: draft.pageSubtitle.trim() || null,
    completionMessage: draft.completionMessage.trim() || null,
    categories,
    tipFooter,
  };
}

// Cheap round-trip stringify for dirty detection. The draft has a few
// UI-only booleans (expanded) that shouldn't count as dirty — strip
// them before comparing.
function normalizeForDiff(draft: Draft): string {
  return JSON.stringify({
    pageTitle: draft.pageTitle,
    pageSubtitleTag: draft.pageSubtitleTag,
    pageSubtitle: draft.pageSubtitle,
    completionMessage: draft.completionMessage,
    tipFooterTitle: draft.tipFooterTitle,
    tipFooterText: draft.tipFooterText,
    categories: draft.categories.map((c) => ({
      id: c.id,
      title: c.title,
      emoji: c.emoji,
      items: c.items.map((it) => ({
        id: it.id,
        label: it.label,
        tip: it.tip,
        weddingPartyOnly: it.weddingPartyOnly,
        bridalPartyOnly: it.bridalPartyOnly,
        excludeWeddingParty: it.excludeWeddingParty,
        excludeBridalParty: it.excludeBridalParty,
        gender: it.gender,
      })),
    })),
  });
}

// Visibility chip options. Wedding-party-only and bridal-party-only
// are mutually exclusive with "everyone"; picking one flips the other
// two off. The exclude flags are edge-case and live under an "Advanced"
// toggle below.
type VisibilityMode = 'everyone' | 'wedding_party' | 'bridal_party';

function visibilityOf(item: DraftItem): VisibilityMode {
  if (item.bridalPartyOnly) return 'bridal_party';
  if (item.weddingPartyOnly) return 'wedding_party';
  return 'everyone';
}

type GenderMode = 'all' | 'female' | 'male';
function genderOf(item: DraftItem): GenderMode {
  if (item.gender === 'female') return 'female';
  if (item.gender === 'male') return 'male';
  return 'all';
}

export default function AdminPackingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, packingList, isAdmin, hasEditablePackingList, patchPackingList } =
    useWedding();

  const initial = useMemo(() => toDraft(packingList), [packingList]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [savedSig, setSavedSig] = useState<string>(normalizeForDiff(initial));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initial);
    setSavedSig(normalizeForDiff(initial));
  }, [initial]);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const dirty = normalizeForDiff(draft) !== savedSig;

  // ── mutation helpers ────────────────────────────────────────────────
  const patchCategory = (idx: number, patch: Partial<DraftCategory>) => {
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) => (i === idx ? { ...c, ...patch } : c)),
    }));
  };
  const patchItem = (cIdx: number, iIdx: number, patch: Partial<DraftItem>) => {
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i !== cIdx
          ? c
          : { ...c, items: c.items.map((it, j) => (j === iIdx ? { ...it, ...patch } : it)) },
      ),
    }));
  };

  const setVisibility = (cIdx: number, iIdx: number, mode: VisibilityMode) => {
    haptic.selection();
    patchItem(cIdx, iIdx, {
      weddingPartyOnly: mode === 'wedding_party',
      bridalPartyOnly: mode === 'bridal_party',
    });
  };
  const setGender = (cIdx: number, iIdx: number, mode: GenderMode) => {
    haptic.selection();
    patchItem(cIdx, iIdx, { gender: mode === 'all' ? null : mode });
  };

  const addItem = (cIdx: number) => {
    haptic.light();
    const id = `item-${Date.now().toString(36)}`;
    setDraft((prev) => ({
      ...prev,
      categories: prev.categories.map((c, i) =>
        i !== cIdx
          ? c
          : {
              ...c,
              items: [
                ...c.items,
                {
                  id,
                  label: '',
                  tip: '',
                  weddingPartyOnly: false,
                  bridalPartyOnly: false,
                  excludeBridalParty: false,
                  excludeWeddingParty: false,
                  gender: null,
                  expanded: true,
                },
              ],
            },
      ),
    }));
  };
  const removeItem = (cIdx: number, iIdx: number) => {
    Alert.alert('Remove item?', 'This will delete the item from the packing list.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          haptic.medium();
          setDraft((prev) => ({
            ...prev,
            categories: prev.categories.map((c, i) =>
              i !== cIdx ? c : { ...c, items: c.items.filter((_, j) => j !== iIdx) },
            ),
          }));
        },
      },
    ]);
  };
  const moveItem = (cIdx: number, iIdx: number, direction: -1 | 1) => {
    const target = iIdx + direction;
    setDraft((prev) => {
      const cat = prev.categories[cIdx];
      if (!cat || target < 0 || target >= cat.items.length) return prev;
      haptic.light();
      const items = [...cat.items];
      const [it] = items.splice(iIdx, 1);
      items.splice(target, 0, it);
      return {
        ...prev,
        categories: prev.categories.map((c, i) => (i === cIdx ? { ...c, items } : c)),
      };
    });
  };

  const addCategory = () => {
    haptic.light();
    const id = `cat-${Date.now().toString(36)}`;
    setDraft((prev) => ({
      ...prev,
      categories: [
        ...prev.categories,
        { id, title: '', emoji: '', items: [], expanded: true },
      ],
    }));
  };
  const removeCategory = (cIdx: number) => {
    Alert.alert(
      'Remove category?',
      'This deletes the category and all its items. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            haptic.medium();
            setDraft((prev) => ({
              ...prev,
              categories: prev.categories.filter((_, i) => i !== cIdx),
            }));
          },
        },
      ],
    );
  };
  const moveCategory = (cIdx: number, direction: -1 | 1) => {
    const target = cIdx + direction;
    setDraft((prev) => {
      if (target < 0 || target >= prev.categories.length) return prev;
      haptic.light();
      const cats = [...prev.categories];
      const [c] = cats.splice(cIdx, 1);
      cats.splice(target, 0, c);
      return { ...prev, categories: cats };
    });
  };

  // ── save ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!dirty || saving) return;
    // Re-slug category ids that are still empty from an inline add (id
    // was assigned a `cat-<timestamp>` above — leave those alone; the
    // ids are opaque and don't need to match the title).
    haptic.medium();
    setSaving(true);
    try {
      const payload = fromDraft(draft);
      await updateWeddingPackingList(weddingId, payload);
      const nextList: WeddingPackingList = {
        pageTitle: payload.pageTitle,
        pageSubtitleTag: payload.pageSubtitleTag ?? undefined,
        pageSubtitle: payload.pageSubtitle ?? undefined,
        completionMessage: payload.completionMessage ?? undefined,
        categories: payload.categories,
        tipFooter: payload.tipFooter ?? undefined,
      };
      patchPackingList(nextList);
      // Recompute signature from the on-wire shape so labels/tips that
      // were trimmed on save don't count as still-dirty.
      setSavedSig(normalizeForDiff(toDraft(nextList)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // Legacy fallback — bundled NN/DEMO_FULL_PACKING_LIST tenants can't be
  // edited here. Mirror the guide-photos read-only note.
  if (!hasEditablePackingList) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Packing List</Text>
        </View>
        <Text style={styles.readOnlyText}>
          This wedding still uses the bundled packing list that can't be
          changed from the app. Contact the couple's developer to migrate
          it to the database before enabling in-app editing.
        </Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Packing List</Text>
          <Text style={styles.pageSubtitle}>
            Edit categories and items. Tap a category to expand it, then tap
            an item to edit its label, tip, and visibility.
          </Text>
        </View>

        {/* Page copy — collapsed by default; expands on tap. */}
        <View style={styles.card}>
          <TouchableOpacity
            style={styles.cardHeader}
            onPress={() =>
              setDraft((prev) => ({ ...prev, pageCopyExpanded: !prev.pageCopyExpanded }))
            }
            activeOpacity={0.7}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Page copy</Text>
              <Text style={styles.cardSub}>Title, subtitle, completion message, tip footer.</Text>
            </View>
            <Ionicons
              name={draft.pageCopyExpanded ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
          {draft.pageCopyExpanded && (
            <View style={styles.cardBody}>
              <LabeledInput
                label="Page title"
                value={draft.pageTitle}
                onChangeText={(v) => setDraft((prev) => ({ ...prev, pageTitle: v }))}
                placeholder="Packing Guide"
              />
              <LabeledInput
                label="Subtitle tag"
                value={draft.pageSubtitleTag}
                onChangeText={(v) => setDraft((prev) => ({ ...prev, pageSubtitleTag: v }))}
                placeholder="e.g. What to Bring"
              />
              <LabeledInput
                label="Subtitle"
                value={draft.pageSubtitle}
                onChangeText={(v) => setDraft((prev) => ({ ...prev, pageSubtitle: v }))}
                placeholder="Descriptive sentence under the title"
                multiline
              />
              <LabeledInput
                label="Completion message"
                value={draft.completionMessage}
                onChangeText={(v) => setDraft((prev) => ({ ...prev, completionMessage: v }))}
                placeholder="Shown when every visible item is checked off"
                multiline
              />
              <LabeledInput
                label="Tip footer title"
                value={draft.tipFooterTitle}
                onChangeText={(v) => setDraft((prev) => ({ ...prev, tipFooterTitle: v }))}
                placeholder="e.g. Tip: Pack for sun by day…"
              />
              <LabeledInput
                label="Tip footer text"
                value={draft.tipFooterText}
                onChangeText={(v) => setDraft((prev) => ({ ...prev, tipFooterText: v }))}
                placeholder="Longer explanation of the tip"
                multiline
              />
              <Text style={styles.helpText}>
                Leave the tip footer blank to hide it.
              </Text>
            </View>
          )}
        </View>

        {/* Categories */}
        {draft.categories.map((cat, cIdx) => (
          <View key={cat.id} style={styles.card}>
            <TouchableOpacity
              style={styles.cardHeader}
              onPress={() =>
                patchCategory(cIdx, { expanded: !cat.expanded })
              }
              activeOpacity={0.7}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{cat.title || 'Untitled category'}</Text>
                <Text style={styles.cardSub}>
                  {cat.items.length} item{cat.items.length === 1 ? '' : 's'}
                </Text>
              </View>
              <Ionicons
                name={cat.expanded ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={Colors.textMuted}
              />
            </TouchableOpacity>

            {cat.expanded && (
              <View style={styles.cardBody}>
                <LabeledInput
                  label="Category title"
                  value={cat.title}
                  onChangeText={(v) => patchCategory(cIdx, { title: v })}
                  placeholder="e.g. Outfits"
                />

                {/* Items */}
                {cat.items.map((item, iIdx) => (
                  <View key={item.id} style={styles.itemCard}>
                    <TouchableOpacity
                      style={styles.itemHeader}
                      onPress={() => patchItem(cIdx, iIdx, { expanded: !item.expanded })}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.itemHeaderLabel}>
                          {item.label || 'New item'}
                        </Text>
                        <Text style={styles.itemHeaderSub}>
                          {describeItem(item)}
                        </Text>
                      </View>
                      <Ionicons
                        name={item.expanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>

                    {item.expanded && (
                      <View style={styles.itemBody}>
                        <LabeledInput
                          label="Label"
                          value={item.label}
                          onChangeText={(v) => patchItem(cIdx, iIdx, { label: v })}
                          placeholder="e.g. Sunglasses"
                        />
                        <LabeledInput
                          label="Tip (optional)"
                          value={item.tip}
                          onChangeText={(v) => patchItem(cIdx, iIdx, { tip: v })}
                          placeholder="Short hint shown when the guest taps ⓘ"
                          multiline
                        />

                        <ChipRow
                          label="Who sees this"
                          options={[
                            { value: 'everyone', label: 'Everyone' },
                            { value: 'wedding_party', label: 'Wedding party' },
                            { value: 'bridal_party', label: 'Bridal party' },
                          ]}
                          value={visibilityOf(item)}
                          onChange={(v) => setVisibility(cIdx, iIdx, v as VisibilityMode)}
                        />
                        <ChipRow
                          label="Gender"
                          options={[
                            { value: 'all', label: 'All' },
                            { value: 'female', label: 'Female only' },
                            { value: 'male', label: 'Male only' },
                          ]}
                          value={genderOf(item)}
                          onChange={(v) => setGender(cIdx, iIdx, v as GenderMode)}
                        />

                        {/* Exclude flags — advanced case, off unless needed */}
                        <Text style={styles.fieldLabel}>Advanced</Text>
                        <ToggleRow
                          label="Hide from wedding party"
                          hint="Use when a wedding-party-only variant of this item exists."
                          value={item.excludeWeddingParty}
                          onChange={(v) => patchItem(cIdx, iIdx, { excludeWeddingParty: v })}
                        />
                        <ToggleRow
                          label="Hide from bridal party"
                          hint="Use when a bridal-party-only variant of this item exists."
                          value={item.excludeBridalParty}
                          onChange={(v) => patchItem(cIdx, iIdx, { excludeBridalParty: v })}
                        />

                        <View style={styles.itemActionsRow}>
                          <TouchableOpacity
                            onPress={() => moveItem(cIdx, iIdx, -1)}
                            disabled={iIdx === 0}
                            style={[styles.reorderBtn, iIdx === 0 && styles.reorderBtnDisabled]}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="arrow-up"
                              size={16}
                              color={iIdx === 0 ? Colors.textMuted : Colors.textPrimary}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => moveItem(cIdx, iIdx, 1)}
                            disabled={iIdx === cat.items.length - 1}
                            style={[
                              styles.reorderBtn,
                              iIdx === cat.items.length - 1 && styles.reorderBtnDisabled,
                            ]}
                            hitSlop={8}
                          >
                            <Ionicons
                              name="arrow-down"
                              size={16}
                              color={
                                iIdx === cat.items.length - 1
                                  ? Colors.textMuted
                                  : Colors.textPrimary
                              }
                            />
                          </TouchableOpacity>
                          <View style={{ flex: 1 }} />
                          <TouchableOpacity
                            onPress={() => removeItem(cIdx, iIdx)}
                            style={styles.removeBtn}
                            hitSlop={8}
                          >
                            <Ionicons name="trash-outline" size={16} color={Colors.error} />
                            <Text style={styles.removeBtnText}>Remove item</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}

                <TouchableOpacity
                  onPress={() => addItem(cIdx)}
                  style={styles.addItemBtn}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add" size={16} color={Colors.primary} />
                  <Text style={styles.addItemBtnText}>Add item</Text>
                </TouchableOpacity>

                <View style={styles.categoryFooter}>
                  <TouchableOpacity
                    onPress={() => moveCategory(cIdx, -1)}
                    disabled={cIdx === 0}
                    style={[styles.reorderBtn, cIdx === 0 && styles.reorderBtnDisabled]}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="arrow-up"
                      size={16}
                      color={cIdx === 0 ? Colors.textMuted : Colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => moveCategory(cIdx, 1)}
                    disabled={cIdx === draft.categories.length - 1}
                    style={[
                      styles.reorderBtn,
                      cIdx === draft.categories.length - 1 && styles.reorderBtnDisabled,
                    ]}
                    hitSlop={8}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={
                        cIdx === draft.categories.length - 1
                          ? Colors.textMuted
                          : Colors.textPrimary
                      }
                    />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={() => removeCategory(cIdx)}
                    style={styles.removeBtn}
                    hitSlop={8}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    <Text style={styles.removeBtnText}>Remove category</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        ))}

        <TouchableOpacity onPress={addCategory} style={styles.addCategoryBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addCategoryBtnText}>Add category</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!dirty || saving}
          style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{dirty ? 'Save changes' : 'Saved'}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Changes apply to all guests on their next app open. Visibility
          filters run per-guest — e.g. "Bridal party" items only show for
          bridesmaids/bridesman, "Female only" items only for guests
          whose gender is set to female.
        </Text>

        <View style={{ height: insets.bottom + Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── small helper components ───────────────────────────────────────────

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );
}

function ChipRow({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.chipRow}>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <TouchableOpacity
              key={opt.value}
              onPress={() => onChange(opt.value)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <TouchableOpacity style={styles.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.8}>
      <View style={styles.toggleText}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleHint}>{hint}</Text>
      </View>
      <View style={[styles.toggleTrack, value && styles.toggleTrackActive]}>
        <View style={[styles.toggleThumb, value && styles.toggleThumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

// Human summary of an item's visibility flags for the collapsed row.
function describeItem(item: DraftItem): string {
  const parts: string[] = [];
  if (item.bridalPartyOnly) parts.push('Bridal party');
  else if (item.weddingPartyOnly) parts.push('Wedding party');
  else parts.push('Everyone');
  if (item.gender === 'female') parts.push('Female only');
  else if (item.gender === 'male') parts.push('Male only');
  if (item.excludeWeddingParty) parts.push('hide from WP');
  if (item.excludeBridalParty) parts.push('hide from bridal');
  return parts.join(' · ');
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

  guard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guardText: { fontFamily: Fonts.sans, color: Colors.textMuted },

  header: { marginBottom: Spacing.xl },
  backButton: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.lg },
  backText: { fontFamily: Fonts.sans, fontSize: 15, color: Colors.textMuted, marginLeft: 2 },
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

  readOnlyText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  cardTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  cardSub: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  cardBody: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },

  fieldRow: { marginBottom: Spacing.md },
  fieldLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 4,
    marginTop: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  inputMultiline: { minHeight: 60 },
  helpText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },

  itemCard: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  itemHeaderLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  itemHeaderSub: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  itemBody: {
    padding: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.white,
  },
  itemActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  chipTextActive: { color: Colors.white },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  toggleText: { flex: 1, marginRight: Spacing.md },
  toggleLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  toggleHint: { fontFamily: Fonts.sans, fontSize: 11, color: Colors.textMuted, lineHeight: 15 },
  toggleTrack: {
    width: 40,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.border,
    padding: 3,
    justifyContent: 'center',
  },
  toggleTrackActive: { backgroundColor: Colors.primary },
  toggleThumb: { width: 16, height: 16, borderRadius: 8, backgroundColor: Colors.white },
  toggleThumbActive: { transform: [{ translateX: 18 }] },

  reorderBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  reorderBtnDisabled: { opacity: 0.4 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  removeBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.error,
  },

  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
    marginTop: Spacing.xs,
  },
  addItemBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.primary,
  },

  categoryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },

  addCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.background,
    marginBottom: Spacing.md,
  },
  addCategoryBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.primary,
  },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  footnote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    paddingHorizontal: Spacing.xs,
  },
});
