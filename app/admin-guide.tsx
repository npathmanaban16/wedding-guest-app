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
  GuideItem,
  GuideLink,
  GuideSection,
  GuideSubsection,
  QuickFact,
  WeddingGuide,
} from '@/constants/weddingData';
import { updateWeddingGuideContent } from '@/services/guide';

// ─── Draft model ──────────────────────────────────────────────────────
// Mirrors the WeddingGuide shape plus per-node `expanded` for the
// accordion UI. Emoji is round-tripped through the draft (so existing
// values on sections/subsections survive save) but no editor input
// exposes it, matching the packing editor's decision.

interface DraftLink { label: string; url: string; }
interface DraftItem {
  id: string;
  name: string;
  description: string;
  category: string;
  tip: string;
  link: string;
  address: string;
  links: DraftLink[];
  expanded: boolean;
}
interface DraftSubsection {
  id: string;
  title: string;
  emoji: string;
  category: string;
  items: DraftItem[];
  expanded: boolean;
}
interface DraftSection {
  id: string;
  title: string;
  emoji: string;
  // A section holds EITHER items directly (like "Getting There") OR
  // subsections (like "Things to Do"). The Draft keeps both arrays but
  // the editor shows one or the other based on `mode`, so admins don't
  // accidentally build an invalid mixed section.
  mode: 'items' | 'subsections';
  items: DraftItem[];
  subsections: DraftSubsection[];
  expanded: boolean;
}
interface DraftQuickFact { key: string; value: string; }
interface Draft {
  pageTitle: string;
  pageSubtitleTag: string;
  pageSubtitle: string;
  currencyCode: string;
  filterPills: string[];
  quickFacts: DraftQuickFact[];
  sections: DraftSection[];
  pageCopyExpanded: boolean;
  filterPillsExpanded: boolean;
  quickFactsExpanded: boolean;
}

function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function itemToDraft(it: GuideItem): DraftItem {
  return {
    id: it.id,
    name: it.name,
    description: it.description,
    category: it.category,
    tip: it.tip ?? '',
    link: it.link ?? '',
    address: it.address ?? '',
    links: (it.links ?? []).map((l) => ({ label: l.label, url: l.url })),
    expanded: false,
  };
}
function subsectionToDraft(sub: GuideSubsection): DraftSubsection {
  return {
    id: sub.id,
    title: sub.title,
    emoji: sub.emoji,
    category: sub.category ?? '',
    items: sub.items.map(itemToDraft),
    expanded: false,
  };
}
function sectionToDraft(sec: GuideSection): DraftSection {
  const hasSubs = !!sec.subsections && sec.subsections.length > 0;
  return {
    id: sec.id,
    title: sec.title,
    emoji: sec.emoji,
    mode: hasSubs ? 'subsections' : 'items',
    items: (sec.items ?? []).map(itemToDraft),
    subsections: (sec.subsections ?? []).map(subsectionToDraft),
    expanded: false,
  };
}

function toDraft(guide: WeddingGuide): Draft {
  return {
    pageTitle: guide.pageTitle,
    pageSubtitleTag: guide.pageSubtitleTag ?? '',
    pageSubtitle: guide.pageSubtitle ?? '',
    currencyCode: guide.currencyCode ?? '',
    filterPills: [...guide.filterPills],
    quickFacts: guide.quickFacts.map((q) => ({ key: q.key, value: q.value })),
    sections: guide.sections.map(sectionToDraft),
    pageCopyExpanded: false,
    filterPillsExpanded: false,
    quickFactsExpanded: false,
  };
}

// Compact → save payload. Empty strings on optional text fields become
// undefined/omitted so the DB row stays a tidy diff of meaningful data.
function itemFromDraft(d: DraftItem): GuideItem {
  const out: GuideItem = {
    id: d.id,
    name: d.name.trim(),
    description: d.description.trim(),
    category: d.category.trim(),
  };
  const tip = d.tip.trim();
  if (tip) out.tip = tip;
  const link = d.link.trim();
  if (link) out.link = link;
  const address = d.address.trim();
  if (address) out.address = address;
  const links: GuideLink[] = d.links
    .map((l) => ({ label: l.label.trim(), url: l.url.trim() }))
    .filter((l) => l.label && l.url);
  if (links.length > 0) out.links = links;
  return out;
}
function subsectionFromDraft(d: DraftSubsection): GuideSubsection {
  const out: GuideSubsection = {
    id: d.id,
    title: d.title.trim(),
    emoji: d.emoji,
    items: d.items.map(itemFromDraft),
  };
  const cat = d.category.trim();
  if (cat) out.category = cat;
  return out;
}
function sectionFromDraft(d: DraftSection): GuideSection {
  const out: GuideSection = {
    id: d.id,
    title: d.title.trim(),
    emoji: d.emoji,
  };
  if (d.mode === 'subsections') {
    out.subsections = d.subsections.map(subsectionFromDraft);
  } else {
    out.items = d.items.map(itemFromDraft);
  }
  return out;
}

function draftToPayload(draft: Draft): {
  pageTitle: string;
  pageSubtitleTag: string | null;
  pageSubtitle: string | null;
  currencyCode: string | null;
  filterPills: string[];
  sections: GuideSection[];
  quickFacts: QuickFact[];
} {
  return {
    pageTitle: draft.pageTitle.trim() || 'Guide',
    pageSubtitleTag: draft.pageSubtitleTag.trim() || null,
    pageSubtitle: draft.pageSubtitle.trim() || null,
    currencyCode: draft.currencyCode.trim().toUpperCase() || null,
    filterPills: draft.filterPills.map((p) => p.trim()).filter(Boolean),
    sections: draft.sections.map(sectionFromDraft),
    quickFacts: draft.quickFacts
      .map((q) => ({ key: q.key.trim(), value: q.value.trim() }))
      .filter((q) => q.key || q.value),
  };
}

// Stringify without the UI-only expanded flags for cheap dirty detection.
function normalize(draft: Draft): string {
  return JSON.stringify({
    pageTitle: draft.pageTitle,
    pageSubtitleTag: draft.pageSubtitleTag,
    pageSubtitle: draft.pageSubtitle,
    currencyCode: draft.currencyCode,
    filterPills: draft.filterPills,
    quickFacts: draft.quickFacts,
    sections: draft.sections.map((s) => ({
      id: s.id,
      title: s.title,
      emoji: s.emoji,
      mode: s.mode,
      items: s.items.map(stripItem),
      subsections: s.subsections.map((sub) => ({
        id: sub.id,
        title: sub.title,
        emoji: sub.emoji,
        category: sub.category,
        items: sub.items.map(stripItem),
      })),
    })),
  });
}
function stripItem(it: DraftItem) {
  return {
    id: it.id,
    name: it.name,
    description: it.description,
    category: it.category,
    tip: it.tip,
    link: it.link,
    address: it.address,
    links: it.links,
  };
}

// ─── screen ───────────────────────────────────────────────────────────

export default function AdminGuideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, guide, isAdmin, hasEditableGuide, patchGuideContent } = useWedding();

  const initial = useMemo(() => toDraft(guide), [guide]);
  const [draft, setDraft] = useState<Draft>(initial);
  const [savedSig, setSavedSig] = useState<string>(normalize(initial));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(initial);
    setSavedSig(normalize(initial));
  }, [initial]);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const dirty = normalize(draft) !== savedSig;

  // ── section-level ops ──────────────────────────────────────────────
  const patchSection = (idx: number, patch: Partial<DraftSection>) =>
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }));

  const moveSection = (idx: number, dir: -1 | 1) =>
    setDraft((prev) => {
      const target = idx + dir;
      if (target < 0 || target >= prev.sections.length) return prev;
      haptic.light();
      const next = [...prev.sections];
      const [s] = next.splice(idx, 1);
      next.splice(target, 0, s);
      return { ...prev, sections: next };
    });

  const removeSection = (idx: number) => {
    Alert.alert('Remove section?', 'This deletes the section and everything inside it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          haptic.medium();
          setDraft((prev) => ({
            ...prev,
            sections: prev.sections.filter((_, i) => i !== idx),
          }));
        },
      },
    ]);
  };

  const addSection = () => {
    haptic.light();
    setDraft((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: makeId('section'),
          title: '',
          emoji: '',
          mode: 'items',
          items: [],
          subsections: [],
          expanded: true,
        },
      ],
    }));
  };

  // ── item-level ops (inside a section or subsection) ────────────────
  const addItem = (secIdx: number, subIdx: number | null) => {
    haptic.light();
    const newItem: DraftItem = {
      id: makeId('item'),
      name: '',
      description: '',
      category: '',
      tip: '',
      link: '',
      address: '',
      links: [],
      expanded: true,
    };
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => {
        if (i !== secIdx) return s;
        if (subIdx === null) return { ...s, items: [...s.items, newItem] };
        return {
          ...s,
          subsections: s.subsections.map((sub, j) =>
            j === subIdx ? { ...sub, items: [...sub.items, newItem] } : sub,
          ),
        };
      }),
    }));
  };
  const patchItem = (secIdx: number, subIdx: number | null, itIdx: number, patch: Partial<DraftItem>) => {
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) => {
        if (i !== secIdx) return s;
        if (subIdx === null) {
          return { ...s, items: s.items.map((it, j) => (j === itIdx ? { ...it, ...patch } : it)) };
        }
        return {
          ...s,
          subsections: s.subsections.map((sub, j) =>
            j !== subIdx ? sub : { ...sub, items: sub.items.map((it, k) => (k === itIdx ? { ...it, ...patch } : it)) },
          ),
        };
      }),
    }));
  };
  const moveItem = (secIdx: number, subIdx: number | null, itIdx: number, dir: -1 | 1) => {
    setDraft((prev) => {
      const s = prev.sections[secIdx];
      if (!s) return prev;
      const arr = subIdx === null ? s.items : s.subsections[subIdx]?.items;
      if (!arr) return prev;
      const target = itIdx + dir;
      if (target < 0 || target >= arr.length) return prev;
      haptic.light();
      const next = [...arr];
      const [item] = next.splice(itIdx, 1);
      next.splice(target, 0, item);
      return {
        ...prev,
        sections: prev.sections.map((sec, i) => {
          if (i !== secIdx) return sec;
          if (subIdx === null) return { ...sec, items: next };
          return {
            ...sec,
            subsections: sec.subsections.map((sub, j) => (j === subIdx ? { ...sub, items: next } : sub)),
          };
        }),
      };
    });
  };
  const removeItem = (secIdx: number, subIdx: number | null, itIdx: number) => {
    Alert.alert('Remove item?', 'This deletes the item from the guide.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          haptic.medium();
          setDraft((prev) => ({
            ...prev,
            sections: prev.sections.map((s, i) => {
              if (i !== secIdx) return s;
              if (subIdx === null) return { ...s, items: s.items.filter((_, j) => j !== itIdx) };
              return {
                ...s,
                subsections: s.subsections.map((sub, j) =>
                  j !== subIdx ? sub : { ...sub, items: sub.items.filter((_, k) => k !== itIdx) },
                ),
              };
            }),
          }));
        },
      },
    ]);
  };

  // ── subsection-level ops ───────────────────────────────────────────
  const addSubsection = (secIdx: number) => {
    haptic.light();
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i !== secIdx
          ? s
          : {
              ...s,
              subsections: [
                ...s.subsections,
                {
                  id: makeId('sub'),
                  title: '',
                  emoji: '',
                  category: '',
                  items: [],
                  expanded: true,
                },
              ],
            },
      ),
    }));
  };
  const patchSubsection = (secIdx: number, subIdx: number, patch: Partial<DraftSubsection>) =>
    setDraft((prev) => ({
      ...prev,
      sections: prev.sections.map((s, i) =>
        i !== secIdx
          ? s
          : { ...s, subsections: s.subsections.map((sub, j) => (j === subIdx ? { ...sub, ...patch } : sub)) },
      ),
    }));
  const moveSubsection = (secIdx: number, subIdx: number, dir: -1 | 1) =>
    setDraft((prev) => {
      const s = prev.sections[secIdx];
      if (!s) return prev;
      const target = subIdx + dir;
      if (target < 0 || target >= s.subsections.length) return prev;
      haptic.light();
      const next = [...s.subsections];
      const [sub] = next.splice(subIdx, 1);
      next.splice(target, 0, sub);
      return {
        ...prev,
        sections: prev.sections.map((sec, i) => (i === secIdx ? { ...sec, subsections: next } : sec)),
      };
    });
  const removeSubsection = (secIdx: number, subIdx: number) => {
    Alert.alert('Remove subsection?', 'This deletes the subsection and its items.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          haptic.medium();
          setDraft((prev) => ({
            ...prev,
            sections: prev.sections.map((s, i) =>
              i !== secIdx ? s : { ...s, subsections: s.subsections.filter((_, j) => j !== subIdx) },
            ),
          }));
        },
      },
    ]);
  };

  // ── links per item ─────────────────────────────────────────────────
  const patchLinks = (secIdx: number, subIdx: number | null, itIdx: number, links: DraftLink[]) =>
    patchItem(secIdx, subIdx, itIdx, { links });

  // ── save ───────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!dirty || saving) return;
    haptic.medium();
    setSaving(true);
    try {
      const payload = draftToPayload(draft);
      await updateWeddingGuideContent(weddingId, payload);
      patchGuideContent(payload);
      // Re-normalize from the on-wire shape so trimmed strings don't
      // count as still-dirty.
      setSavedSig(
        normalize(
          toDraft({
            ...guide,
            pageTitle: payload.pageTitle,
            pageSubtitleTag: payload.pageSubtitleTag ?? undefined,
            pageSubtitle: payload.pageSubtitle ?? undefined,
            currencyCode: payload.currencyCode ?? undefined,
            filterPills: payload.filterPills,
            sections: payload.sections,
            quickFacts: payload.quickFacts,
          }),
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // Legacy fallback — same story as the photo editor.
  if (!hasEditableGuide) {
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
          <Text style={styles.pageTitle}>Travel Guide</Text>
        </View>
        <Text style={styles.readOnlyText}>
          This wedding still uses the bundled travel guide that can't be
          changed from the app. Contact the couple's developer to migrate
          it to the database before enabling in-app editing.
        </Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <Text style={styles.pageTitle}>Travel Guide</Text>
          <Text style={styles.pageSubtitle}>
            Edit page copy, filter pills, quick facts, and the sections tree.
            Photos are edited on the Travel Photos screen.
          </Text>
        </View>

        {/* Page copy */}
        <Collapsible
          title="Page copy"
          subtitle="Title, subtitle, currency code"
          expanded={draft.pageCopyExpanded}
          onToggle={() => setDraft((p) => ({ ...p, pageCopyExpanded: !p.pageCopyExpanded }))}
        >
          <LabeledInput
            label="Page title"
            value={draft.pageTitle}
            onChangeText={(v) => setDraft((p) => ({ ...p, pageTitle: v }))}
            placeholder="e.g. Laguna Niguel Guide"
          />
          <LabeledInput
            label="Subtitle tag"
            value={draft.pageSubtitleTag}
            onChangeText={(v) => setDraft((p) => ({ ...p, pageSubtitleTag: v }))}
            placeholder="e.g. Orange County & Beyond"
          />
          <LabeledInput
            label="Subtitle"
            value={draft.pageSubtitle}
            onChangeText={(v) => setDraft((p) => ({ ...p, pageSubtitle: v }))}
            placeholder="Descriptive sentence under the title"
            multiline
          />
          <LabeledInput
            label="Currency code"
            value={draft.currencyCode}
            onChangeText={(v) => setDraft((p) => ({ ...p, currencyCode: v }))}
            placeholder="ISO 4217 — e.g. CHF, USD, GBP. Leave blank for domestic weddings."
            autoCapitalize="characters"
          />
        </Collapsible>

        {/* Filter pills */}
        <Collapsible
          title="Filter pills"
          subtitle={`${draft.filterPills.length} pill${draft.filterPills.length === 1 ? '' : 's'} · first pill is the "show everything" reset`}
          expanded={draft.filterPillsExpanded}
          onToggle={() => setDraft((p) => ({ ...p, filterPillsExpanded: !p.filterPillsExpanded }))}
        >
          {draft.filterPills.map((pill, i) => (
            <View key={i} style={styles.pillRow}>
              <TextInput
                style={styles.input}
                value={pill}
                onChangeText={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    filterPills: prev.filterPills.map((p, j) => (j === i ? v : p)),
                  }))
                }
                placeholder={i === 0 ? 'All (reset pill)' : 'e.g. Sightseeing'}
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                onPress={() =>
                  setDraft((prev) => {
                    const next = [...prev.filterPills];
                    if (i > 0 && i < next.length) {
                      const [p] = next.splice(i, 1);
                      next.splice(i - 1, 0, p);
                    }
                    return { ...prev, filterPills: next };
                  })
                }
                disabled={i <= 1}
                style={[styles.reorderBtn, i <= 1 && styles.reorderBtnDisabled]}
                hitSlop={8}
              >
                <Ionicons name="arrow-up" size={14} color={i <= 1 ? Colors.textMuted : Colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setDraft((prev) => {
                    const next = [...prev.filterPills];
                    if (i >= 1 && i < next.length - 1) {
                      const [p] = next.splice(i, 1);
                      next.splice(i + 1, 0, p);
                    }
                    return { ...prev, filterPills: next };
                  })
                }
                disabled={i === 0 || i >= draft.filterPills.length - 1}
                style={[
                  styles.reorderBtn,
                  (i === 0 || i >= draft.filterPills.length - 1) && styles.reorderBtnDisabled,
                ]}
                hitSlop={8}
              >
                <Ionicons
                  name="arrow-down"
                  size={14}
                  color={
                    i === 0 || i >= draft.filterPills.length - 1 ? Colors.textMuted : Colors.textPrimary
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    filterPills: prev.filterPills.filter((_, j) => j !== i),
                  }))
                }
                style={styles.rowRemoveBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() =>
              setDraft((prev) => ({ ...prev, filterPills: [...prev.filterPills, ''] }))
            }
            style={styles.addRowBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.addRowBtnText}>Add filter pill</Text>
          </TouchableOpacity>
          <Text style={styles.helpText}>
            Item categories below should match one of these pills (case-sensitive).
          </Text>
        </Collapsible>

        {/* Quick facts */}
        <Collapsible
          title="Quick facts"
          subtitle={`${draft.quickFacts.length} fact${draft.quickFacts.length === 1 ? '' : 's'} — shown at the top of the Travel tab`}
          expanded={draft.quickFactsExpanded}
          onToggle={() => setDraft((p) => ({ ...p, quickFactsExpanded: !p.quickFactsExpanded }))}
        >
          {draft.quickFacts.map((f, i) => (
            <View key={i} style={styles.factRow}>
              <TextInput
                style={[styles.input, styles.factKeyInput]}
                value={f.key}
                onChangeText={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    quickFacts: prev.quickFacts.map((q, j) => (j === i ? { ...q, key: v } : q)),
                  }))
                }
                placeholder="Label"
                placeholderTextColor={Colors.textMuted}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={f.value}
                onChangeText={(v) =>
                  setDraft((prev) => ({
                    ...prev,
                    quickFacts: prev.quickFacts.map((q, j) => (j === i ? { ...q, value: v } : q)),
                  }))
                }
                placeholder="Value"
                placeholderTextColor={Colors.textMuted}
              />
              <TouchableOpacity
                onPress={() =>
                  setDraft((prev) => ({
                    ...prev,
                    quickFacts: prev.quickFacts.filter((_, j) => j !== i),
                  }))
                }
                style={styles.rowRemoveBtn}
                hitSlop={8}
              >
                <Ionicons name="close" size={16} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            onPress={() =>
              setDraft((prev) => ({ ...prev, quickFacts: [...prev.quickFacts, { key: '', value: '' }] }))
            }
            style={styles.addRowBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={14} color={Colors.primary} />
            <Text style={styles.addRowBtnText}>Add fact</Text>
          </TouchableOpacity>
        </Collapsible>

        {/* Sections */}
        {draft.sections.map((section, secIdx) => (
          <SectionCard
            key={section.id}
            section={section}
            isFirst={secIdx === 0}
            isLast={secIdx === draft.sections.length - 1}
            onToggle={() => patchSection(secIdx, { expanded: !section.expanded })}
            onPatch={(patch) => patchSection(secIdx, patch)}
            onMoveUp={() => moveSection(secIdx, -1)}
            onMoveDown={() => moveSection(secIdx, 1)}
            onRemove={() => removeSection(secIdx)}
            onAddItem={() => addItem(secIdx, null)}
            onAddSubsection={() => addSubsection(secIdx)}
            onPatchItem={(itIdx, p) => patchItem(secIdx, null, itIdx, p)}
            onMoveItemUp={(itIdx) => moveItem(secIdx, null, itIdx, -1)}
            onMoveItemDown={(itIdx) => moveItem(secIdx, null, itIdx, 1)}
            onRemoveItem={(itIdx) => removeItem(secIdx, null, itIdx)}
            onPatchLinks={(itIdx, links) => patchLinks(secIdx, null, itIdx, links)}
            onPatchSubsection={(subIdx, p) => patchSubsection(secIdx, subIdx, p)}
            onMoveSubsectionUp={(subIdx) => moveSubsection(secIdx, subIdx, -1)}
            onMoveSubsectionDown={(subIdx) => moveSubsection(secIdx, subIdx, 1)}
            onRemoveSubsection={(subIdx) => removeSubsection(secIdx, subIdx)}
            onAddSubItem={(subIdx) => addItem(secIdx, subIdx)}
            onPatchSubItem={(subIdx, itIdx, p) => patchItem(secIdx, subIdx, itIdx, p)}
            onMoveSubItemUp={(subIdx, itIdx) => moveItem(secIdx, subIdx, itIdx, -1)}
            onMoveSubItemDown={(subIdx, itIdx) => moveItem(secIdx, subIdx, itIdx, 1)}
            onRemoveSubItem={(subIdx, itIdx) => removeItem(secIdx, subIdx, itIdx)}
            onPatchSubLinks={(subIdx, itIdx, links) => patchLinks(secIdx, subIdx, itIdx, links)}
          />
        ))}

        <TouchableOpacity onPress={addSection} style={styles.addCategoryBtn} activeOpacity={0.85}>
          <Ionicons name="add" size={18} color={Colors.primary} />
          <Text style={styles.addCategoryBtnText}>Add section</Text>
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
          Changes apply to all guests on their next app open. Each item's
          "Category" should match one of your filter pills so guests can
          filter to it. Sections and subsections keep their icons when
          saved — the editor just doesn't expose them.
        </Text>

        <View style={{ height: insets.bottom + Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── section card ─────────────────────────────────────────────────────

interface SectionCardProps {
  section: DraftSection;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onPatch: (patch: Partial<DraftSection>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onAddItem: () => void;
  onAddSubsection: () => void;
  onPatchItem: (itIdx: number, p: Partial<DraftItem>) => void;
  onMoveItemUp: (itIdx: number) => void;
  onMoveItemDown: (itIdx: number) => void;
  onRemoveItem: (itIdx: number) => void;
  onPatchLinks: (itIdx: number, links: DraftLink[]) => void;
  onPatchSubsection: (subIdx: number, p: Partial<DraftSubsection>) => void;
  onMoveSubsectionUp: (subIdx: number) => void;
  onMoveSubsectionDown: (subIdx: number) => void;
  onRemoveSubsection: (subIdx: number) => void;
  onAddSubItem: (subIdx: number) => void;
  onPatchSubItem: (subIdx: number, itIdx: number, p: Partial<DraftItem>) => void;
  onMoveSubItemUp: (subIdx: number, itIdx: number) => void;
  onMoveSubItemDown: (subIdx: number, itIdx: number) => void;
  onRemoveSubItem: (subIdx: number, itIdx: number) => void;
  onPatchSubLinks: (subIdx: number, itIdx: number, links: DraftLink[]) => void;
}

function SectionCard(props: SectionCardProps) {
  const s = props.section;
  const count = s.mode === 'subsections' ? s.subsections.length : s.items.length;
  const label = s.mode === 'subsections' ? 'subsection' : 'item';
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={props.onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{s.title || 'Untitled section'}</Text>
          <Text style={styles.cardSub}>
            {count} {label}
            {count === 1 ? '' : 's'}
          </Text>
        </View>
        <Ionicons name={s.expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      {s.expanded && (
        <View style={styles.cardBody}>
          <LabeledInput
            label="Section title"
            value={s.title}
            onChangeText={(v) => props.onPatch({ title: v })}
            placeholder="e.g. Getting Around"
          />
          {s.items.length === 0 && s.subsections.length === 0 && (
            <View style={styles.modeChooser}>
              <Text style={styles.fieldLabel}>Structure</Text>
              <View style={styles.chipRow}>
                <TouchableOpacity
                  onPress={() => props.onPatch({ mode: 'items' })}
                  style={[styles.chip, s.mode === 'items' && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, s.mode === 'items' && styles.chipTextActive]}>
                    Items directly
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => props.onPatch({ mode: 'subsections' })}
                  style={[styles.chip, s.mode === 'subsections' && styles.chipActive]}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.chipText, s.mode === 'subsections' && styles.chipTextActive]}>
                    Grouped into subsections
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.helpText}>
                Choose once — the mode locks in when you add content.
              </Text>
            </View>
          )}

          {s.mode === 'items' && (
            <>
              {s.items.map((it, itIdx) => (
                <ItemEditor
                  key={it.id}
                  item={it}
                  isFirst={itIdx === 0}
                  isLast={itIdx === s.items.length - 1}
                  onToggle={() => props.onPatchItem(itIdx, { expanded: !it.expanded })}
                  onPatch={(p) => props.onPatchItem(itIdx, p)}
                  onMoveUp={() => props.onMoveItemUp(itIdx)}
                  onMoveDown={() => props.onMoveItemDown(itIdx)}
                  onRemove={() => props.onRemoveItem(itIdx)}
                  onPatchLinks={(links) => props.onPatchLinks(itIdx, links)}
                />
              ))}
              <TouchableOpacity onPress={props.onAddItem} style={styles.addItemBtn} activeOpacity={0.85}>
                <Ionicons name="add" size={16} color={Colors.primary} />
                <Text style={styles.addItemBtnText}>Add item</Text>
              </TouchableOpacity>
            </>
          )}

          {s.mode === 'subsections' && (
            <>
              {s.subsections.map((sub, subIdx) => (
                <SubsectionCard
                  key={sub.id}
                  sub={sub}
                  isFirst={subIdx === 0}
                  isLast={subIdx === s.subsections.length - 1}
                  onToggle={() => props.onPatchSubsection(subIdx, { expanded: !sub.expanded })}
                  onPatch={(p) => props.onPatchSubsection(subIdx, p)}
                  onMoveUp={() => props.onMoveSubsectionUp(subIdx)}
                  onMoveDown={() => props.onMoveSubsectionDown(subIdx)}
                  onRemove={() => props.onRemoveSubsection(subIdx)}
                  onAddItem={() => props.onAddSubItem(subIdx)}
                  onPatchItem={(itIdx, p) => props.onPatchSubItem(subIdx, itIdx, p)}
                  onMoveItemUp={(itIdx) => props.onMoveSubItemUp(subIdx, itIdx)}
                  onMoveItemDown={(itIdx) => props.onMoveSubItemDown(subIdx, itIdx)}
                  onRemoveItem={(itIdx) => props.onRemoveSubItem(subIdx, itIdx)}
                  onPatchLinks={(itIdx, links) => props.onPatchSubLinks(subIdx, itIdx, links)}
                />
              ))}
              <TouchableOpacity
                onPress={props.onAddSubsection}
                style={styles.addItemBtn}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={16} color={Colors.primary} />
                <Text style={styles.addItemBtnText}>Add subsection</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.categoryFooter}>
            <TouchableOpacity
              onPress={props.onMoveUp}
              disabled={props.isFirst}
              style={[styles.reorderBtn, props.isFirst && styles.reorderBtnDisabled]}
              hitSlop={8}
            >
              <Ionicons name="arrow-up" size={16} color={props.isFirst ? Colors.textMuted : Colors.textPrimary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onMoveDown}
              disabled={props.isLast}
              style={[styles.reorderBtn, props.isLast && styles.reorderBtnDisabled]}
              hitSlop={8}
            >
              <Ionicons name="arrow-down" size={16} color={props.isLast ? Colors.textMuted : Colors.textPrimary} />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={props.onRemove} style={styles.removeBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.removeBtnText}>Remove section</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── subsection card ──────────────────────────────────────────────────

interface SubsectionCardProps {
  sub: DraftSubsection;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<DraftSubsection>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onAddItem: () => void;
  onPatchItem: (itIdx: number, p: Partial<DraftItem>) => void;
  onMoveItemUp: (itIdx: number) => void;
  onMoveItemDown: (itIdx: number) => void;
  onRemoveItem: (itIdx: number) => void;
  onPatchLinks: (itIdx: number, links: DraftLink[]) => void;
}

function SubsectionCard(props: SubsectionCardProps) {
  const s = props.sub;
  return (
    <View style={styles.subCard}>
      <TouchableOpacity style={styles.itemHeader} onPress={props.onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemHeaderLabel}>{s.title || 'Untitled subsection'}</Text>
          <Text style={styles.itemHeaderSub}>
            {s.items.length} item{s.items.length === 1 ? '' : 's'}
          </Text>
        </View>
        <Ionicons name={s.expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>
      {s.expanded && (
        <View style={styles.itemBody}>
          <LabeledInput
            label="Subsection title"
            value={s.title}
            onChangeText={(v) => props.onPatch({ title: v })}
            placeholder="e.g. Walks & Hikes"
          />
          <LabeledInput
            label="Category (optional)"
            value={s.category}
            onChangeText={(v) => props.onPatch({ category: v })}
            placeholder="e.g. Sightseeing — matches a filter pill"
          />

          {s.items.map((it, itIdx) => (
            <ItemEditor
              key={it.id}
              item={it}
              isFirst={itIdx === 0}
              isLast={itIdx === s.items.length - 1}
              onToggle={() => props.onPatchItem(itIdx, { expanded: !it.expanded })}
              onPatch={(p) => props.onPatchItem(itIdx, p)}
              onMoveUp={() => props.onMoveItemUp(itIdx)}
              onMoveDown={() => props.onMoveItemDown(itIdx)}
              onRemove={() => props.onRemoveItem(itIdx)}
              onPatchLinks={(links) => props.onPatchLinks(itIdx, links)}
            />
          ))}
          <TouchableOpacity onPress={props.onAddItem} style={styles.addItemBtn} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color={Colors.primary} />
            <Text style={styles.addItemBtnText}>Add item</Text>
          </TouchableOpacity>

          <View style={styles.categoryFooter}>
            <TouchableOpacity
              onPress={props.onMoveUp}
              disabled={props.isFirst}
              style={[styles.reorderBtn, props.isFirst && styles.reorderBtnDisabled]}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={props.isFirst ? Colors.textMuted : Colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onMoveDown}
              disabled={props.isLast}
              style={[styles.reorderBtn, props.isLast && styles.reorderBtnDisabled]}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={props.isLast ? Colors.textMuted : Colors.textPrimary}
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={props.onRemove} style={styles.removeBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.removeBtnText}>Remove subsection</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── item editor ──────────────────────────────────────────────────────

interface ItemEditorProps {
  item: DraftItem;
  isFirst: boolean;
  isLast: boolean;
  onToggle: () => void;
  onPatch: (p: Partial<DraftItem>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onPatchLinks: (links: DraftLink[]) => void;
}

function ItemEditor(props: ItemEditorProps) {
  const it = props.item;
  return (
    <View style={styles.itemCard}>
      <TouchableOpacity style={styles.itemHeader} onPress={props.onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemHeaderLabel}>{it.name || 'New item'}</Text>
          {it.category ? <Text style={styles.itemHeaderSub}>{it.category}</Text> : null}
        </View>
        <Ionicons name={it.expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>
      {it.expanded && (
        <View style={styles.itemBody}>
          <LabeledInput
            label="Name"
            value={it.name}
            onChangeText={(v) => props.onPatch({ name: v })}
            placeholder="e.g. Château de Chillon"
          />
          <LabeledInput
            label="Description"
            value={it.description}
            onChangeText={(v) => props.onPatch({ description: v })}
            placeholder="Body text shown when the item is expanded"
            multiline
          />
          <LabeledInput
            label="Category"
            value={it.category}
            onChangeText={(v) => props.onPatch({ category: v })}
            placeholder="Match a filter pill — e.g. Sightseeing"
          />
          <LabeledInput
            label="Tip (optional)"
            value={it.tip}
            onChangeText={(v) => props.onPatch({ tip: v })}
            placeholder="One-liner hint shown in a highlighted bubble"
            multiline
          />
          <LabeledInput
            label="Address (optional)"
            value={it.address}
            onChangeText={(v) => props.onPatch({ address: v })}
            placeholder="e.g. Avenue de Chillon 21, 1820 Veytaux"
          />
          <LabeledInput
            label="Single link (optional)"
            value={it.link}
            onChangeText={(v) => props.onPatch({ link: v })}
            placeholder="Full URL — used for the item's default link"
            autoCapitalize="none"
          />
          <LinksEditor links={it.links} onChange={props.onPatchLinks} />

          <View style={styles.itemActionsRow}>
            <TouchableOpacity
              onPress={props.onMoveUp}
              disabled={props.isFirst}
              style={[styles.reorderBtn, props.isFirst && styles.reorderBtnDisabled]}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-up"
                size={16}
                color={props.isFirst ? Colors.textMuted : Colors.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={props.onMoveDown}
              disabled={props.isLast}
              style={[styles.reorderBtn, props.isLast && styles.reorderBtnDisabled]}
              hitSlop={8}
            >
              <Ionicons
                name="arrow-down"
                size={16}
                color={props.isLast ? Colors.textMuted : Colors.textPrimary}
              />
            </TouchableOpacity>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={props.onRemove} style={styles.removeBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.error} />
              <Text style={styles.removeBtnText}>Remove item</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

// ─── links editor (inside an item) ────────────────────────────────────

function LinksEditor({
  links,
  onChange,
}: {
  links: DraftLink[];
  onChange: (next: DraftLink[]) => void;
}) {
  return (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>Links (optional)</Text>
      {links.map((l, i) => (
        <View key={i} style={styles.linkRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={l.label}
            onChangeText={(v) =>
              onChange(links.map((x, j) => (j === i ? { ...x, label: v } : x)))
            }
            placeholder="Label"
            placeholderTextColor={Colors.textMuted}
          />
          <TextInput
            style={[styles.input, { flex: 2 }]}
            value={l.url}
            onChangeText={(v) =>
              onChange(links.map((x, j) => (j === i ? { ...x, url: v } : x)))
            }
            placeholder="https://…"
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => onChange(links.filter((_, j) => j !== i))}
            style={styles.rowRemoveBtn}
            hitSlop={8}
          >
            <Ionicons name="close" size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      ))}
      <TouchableOpacity
        onPress={() => onChange([...links, { label: '', url: '' }])}
        style={styles.addRowBtn}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={14} color={Colors.primary} />
        <Text style={styles.addRowBtnText}>Add link</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── small helpers ────────────────────────────────────────────────────

function LabeledInput({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: 'characters' | 'none' | 'sentences';
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
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

function Collapsible({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSub}>{subtitle}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>
      {expanded && <View style={styles.cardBody}>{children}</View>}
    </View>
  );
}

// ─── styles ───────────────────────────────────────────────────────────

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
  cardTitle: { fontFamily: Fonts.sansMedium, fontSize: 15, color: Colors.textPrimary },
  cardSub: { fontFamily: Fonts.sans, fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  cardBody: {
    padding: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },

  modeChooser: { marginBottom: Spacing.md },

  fieldRow: { marginBottom: Spacing.md },
  fieldLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 4,
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

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  chipText: { fontFamily: Fonts.sansMedium, fontSize: 12, color: Colors.textSecondary },
  chipTextActive: { color: Colors.white },

  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  factRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },
  factKeyInput: { width: 110 },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: Spacing.xs,
  },

  itemCard: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.background,
    overflow: 'hidden',
  },
  subCard: {
    borderWidth: 0.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surfaceWarm,
    overflow: 'hidden',
  },
  itemHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.sm },
  itemHeaderLabel: { fontFamily: Fonts.sansMedium, fontSize: 14, color: Colors.textPrimary },
  itemHeaderSub: { fontFamily: Fonts.sans, fontSize: 11, color: Colors.textMuted, marginTop: 2 },
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
  removeBtnText: { fontFamily: Fonts.sansMedium, fontSize: 12, color: Colors.error },
  rowRemoveBtn: { padding: 6 },

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
  addItemBtnText: { fontFamily: Fonts.sansMedium, fontSize: 13, color: Colors.primary },

  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
  },
  addRowBtnText: { fontFamily: Fonts.sansMedium, fontSize: 12, color: Colors.primary },

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
  addCategoryBtnText: { fontFamily: Fonts.sansMedium, fontSize: 14, color: Colors.primary },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: { fontFamily: Fonts.sansMedium, fontSize: 15, color: Colors.white, letterSpacing: 0.3 },

  footnote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    paddingHorizontal: Spacing.xs,
  },
});
