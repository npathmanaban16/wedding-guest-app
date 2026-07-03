import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import type { GuideSection, GuideSubsection, GuideItem, GuideLink } from '@/constants/weddingData';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// Pass `name` when a human-readable landmark exists (e.g. "Glacier 3000",
// "Rochers de Naye") so the maps app resolves to the actual destination
// rather than geocoding the mailing address — which for landmarks can be
// miles away from where the user actually wants to go.
function openMaps(address: string, name?: string) {
  const query = name ? `${name}, ${address}` : address;
  const encoded = encodeURIComponent(query);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
    default: `https://maps.google.com/maps?q=${encoded}`,
  });
  Linking.openURL(url);
}

type ExchangeRates = { USD: number; GBP: number; EUR: number };

interface GuideItemCardProps {
  item: GuideItem;
  expanded: boolean;
  onToggle: () => void;
  // Nested items render inside a 2-column grid in their SubsectionBlock
  // parent — collapsed cards take half the row, and the expanded card
  // takes the full row so there's room for its body content.
  nested?: boolean;
  // ISO 4217 code for the live-FX widget shown on the "currency" item.
  // Skipped entirely when undefined (e.g. domestic weddings).
  currencyCode?: string;
}

function GuideItemCard({ item, expanded, onToggle, nested = false, currencyCode }: GuideItemCardProps) {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const fetchedRef = useRef(false);

  // Only enable the live-FX widget when this guide includes a currency
  // code AND the item is the one explicitly tagged as the currency card.
  const isCurrency = !!currencyCode && item.id === 'currency';

  useEffect(() => {
    if (isCurrency && expanded && !fetchedRef.current) {
      fetchedRef.current = true;
      setRatesLoading(true);
      fetch(`https://api.frankfurter.app/latest?from=${currencyCode}&to=USD,GBP,EUR`)
        .then((r) => r.json())
        .then((data) => setRates(data.rates))
        .catch(() => {})
        .finally(() => setRatesLoading(false));
    }
  }, [isCurrency, expanded, currencyCode]);

  const description = isCurrency && rates
    ? `1 ${currencyCode} = $${rates.USD.toFixed(2)} / €${rates.EUR.toFixed(2)} / £${rates.GBP.toFixed(2)}. ${item.description}`
    : item.description;

  return (
    <TouchableOpacity
      style={[
        styles.itemCard,
        nested && (expanded ? styles.itemCardNestedFull : styles.itemCardNestedHalf),
      ]}
      onPress={onToggle}
      activeOpacity={0.9}
    >
      <View style={styles.itemHeader}>
        <View style={styles.itemHeaderText}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <Text style={styles.itemName}>{item.name}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </View>

      {expanded && (
        <View style={styles.itemBody}>
          <Text style={styles.itemDescription}>{description}</Text>
          {isCurrency && ratesLoading && (
            <ActivityIndicator size="small" color={Colors.primary} style={{ marginBottom: Spacing.sm }} />
          )}
          {isCurrency && rates && (
            <Text style={styles.ratesNote}>Live rates · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
          )}
          {item.tip && (
            <View style={styles.tipCard}>
              <Ionicons name="sparkles-outline" size={13} color={Colors.gold} style={{ marginRight: Spacing.xs, marginTop: 1 }} />
              <Text style={styles.tipText}>{item.tip}</Text>
            </View>
          )}
          {item.link && (
            <TouchableOpacity onPress={() => Linking.openURL(item.link!)} style={styles.linkButton}>
              <Text style={styles.linkText}>Open in browser</Text>
              <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
            </TouchableOpacity>
          )}
          {item.links && item.links.length > 0 && (
            <View style={styles.linksContainer}>
              {item.links.map((l: GuideLink) => (
                <TouchableOpacity key={l.url} onPress={() => Linking.openURL(l.url)} style={styles.linkButton}>
                  <Text style={styles.linkText}>{l.label}</Text>
                  <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
          {item.address && (
            <TouchableOpacity style={styles.directionsButton} onPress={() => { haptic.medium(); openMaps(item.address!, item.name); }} activeOpacity={0.8}>
              <Ionicons name="map-outline" size={14} color={Colors.gold} />
              <Text style={styles.directionsText}>Get Directions</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

interface SubsectionBlockProps {
  subsection: GuideSubsection;
  expanded: boolean;
  onToggle: () => void;
  currencyCode?: string;
}

function SubsectionBlock({ subsection, expanded, onToggle, currencyCode }: SubsectionBlockProps) {
  // Which child item is currently open inside this subsection. One-open-
  // at-a-time scoped to this subsection — opening a sibling item collapses
  // the previous one, but doesn't close the subsection itself.
  const [openItemId, setOpenItemId] = useState<string | null>(null);

  // Collapsing the subsection leaves no visible items, so reset the
  // remembered open item — next expansion starts clean.
  useEffect(() => {
    if (!expanded) setOpenItemId(null);
  }, [expanded]);

  const toggleItem = (id: string) => {
    animateLayout();
    setOpenItemId((cur) => (cur === id ? null : id));
  };

  return (
    <View style={styles.subsectionBlock}>
      <TouchableOpacity
        style={[styles.subsectionHeader, expanded && styles.subsectionHeaderExpanded]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={styles.itemHeaderText}>
          {subsection.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{subsection.category}</Text>
            </View>
          )}
          <Text style={styles.subsectionTitle}>{subsection.title}</Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={15}
          color={Colors.textMuted}
        />
      </TouchableOpacity>
      {expanded && (
        <View style={styles.subsectionItemsGrid}>
          {subsection.items.map((item) => (
            <GuideItemCard
              key={item.id}
              item={item}
              expanded={openItemId === item.id}
              onToggle={() => toggleItem(item.id)}
              nested
              currencyCode={currencyCode}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface SectionBlockProps {
  section: GuideSection;
  // Page-wide "which first-level accordion is open" state. Either the id
  // of a subsection (for subsection-bearing sections) or the id of a
  // top-level item (for items-only sections).
  openFirstLevelId: string | null;
  onToggleFirstLevel: (id: string) => void;
  currencyCode?: string;
}

function SectionBlock({ section, openFirstLevelId, onToggleFirstLevel, currencyCode }: SectionBlockProps) {
  // Items and subsections can coexist within a section. Items render
  // first (as top-level cards) and subsections after (as grouped
  // accordions). Either array may be empty.
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {section.items?.map((item) => (
        <GuideItemCard
          key={item.id}
          item={item}
          expanded={openFirstLevelId === item.id}
          onToggle={() => onToggleFirstLevel(item.id)}
          currencyCode={currencyCode}
        />
      ))}
      {section.subsections?.map((sub) => (
        <SubsectionBlock
          key={sub.id}
          subsection={sub}
          expanded={openFirstLevelId === sub.id}
          onToggle={() => onToggleFirstLevel(sub.id)}
          currencyCode={currencyCode}
        />
      ))}
    </View>
  );
}

interface PhotoStripProps {
  photos: { source: unknown; label: string }[];
}

function PhotoStrip({ photos }: PhotoStripProps) {
  if (photos.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoStrip}
    >
      {photos.map((photo, i) => (
        <View key={i} style={styles.photoWrapper}>
          {/* `source` is whichever shape <Image> accepts: a require()
              module id (bundled assets) or { uri }. */}
          <Image source={photo.source as never} style={styles.photoItem} resizeMode="cover" />
          <Text style={styles.photoLabel}>{photo.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function SwitzerlandScreen() {
  const insets = useSafeAreaInsets();
  const { guide } = useWedding();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  // One open first-level row page-wide. Subsections own their own
  // "which inner item is open" state so opening a nested item doesn't
  // disturb this value.
  const [openFirstLevelId, setOpenFirstLevelId] = useState<string | null>(null);
  const toggleFirstLevel = (id: string) => {
    animateLayout();
    setOpenFirstLevelId((cur) => (cur === id ? null : id));
  };

  // First pill is the "show everything" reset (typically "All").
  const resetPill = guide.filterPills[0] ?? 'All';

  // Filter items and subsections independently so a section that mixes
  // both still filters correctly. A section is kept if either its
  // top-level items OR any of its subsection items match the filter.
  const filteredGuide =
    activeFilter && activeFilter !== resetPill
      ? guide.sections
          .map((section) => {
            const filteredItems =
              section.items?.filter((item) => item.category === activeFilter) ?? undefined;
            const filteredSubs = section.subsections
              ?.map((sub) => ({
                ...sub,
                items: sub.items.filter((item) => item.category === activeFilter),
              }))
              .filter((sub) => sub.items.length > 0);
            return { ...section, items: filteredItems, subsections: filteredSubs };
          })
          .filter(
            (section) =>
              (section.items?.length ?? 0) > 0 ||
              (section.subsections?.length ?? 0) > 0,
          )
      : guide.sections;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>{guide.pageTitle}</Text>
        {guide.pageSubtitleTag && (
          <Text style={styles.pageSubtitleTag}>{guide.pageSubtitleTag}</Text>
        )}
        {guide.pageSubtitle && (
          <Text style={styles.pageSubtitle}>{guide.pageSubtitle}</Text>
        )}
      </View>

      {/* Photo strip — manual horizontal swipe. Hidden when no photos. */}
      <PhotoStrip photos={guide.photoStrip} />

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {guide.filterPills.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, (activeFilter === f || (!activeFilter && f === resetPill)) && styles.filterPillActive]}
            onPress={() => setActiveFilter(f === resetPill ? null : f)}
          >
            <Text
              style={[
                styles.filterText,
                (activeFilter === f || (!activeFilter && f === resetPill)) && styles.filterTextActive,
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Guide sections */}
      {filteredGuide.map((section) => (
        <SectionBlock
          key={section.id}
          section={section}
          openFirstLevelId={openFirstLevelId}
          onToggleFirstLevel={toggleFirstLevel}
          currencyCode={guide.currencyCode}
        />
      ))}

      {/* Quick facts. Hidden when the guide ships no rows. */}
      {guide.quickFacts.length > 0 && (
        <View style={styles.quickFacts}>
          <Text style={styles.quickFactsTitle}>Quick Facts</Text>
          {guide.quickFacts.map((fact, i) => (
            <React.Fragment key={fact.key}>
              {i > 0 && <View style={styles.factDivider} />}
              <View style={styles.factRow}>
                <Text style={styles.factKey}>{fact.key}</Text>
                <Text style={styles.factValue}>{fact.value}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },

  photoStrip: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  photoWrapper: {
    width: 220,
  },
  photoItem: {
    width: 220,
    height: 160,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  photoLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },

  pageHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  pageTitle: {
    fontSize: 34,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitleTag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: Spacing.sm,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  filters: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  filterPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
  },

  sectionBlock: { marginBottom: Spacing.xs, paddingHorizontal: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: 21,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  subsectionBlock: { marginBottom: Spacing.sm },
  subsectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  // When expanded, the header gets a warm tint to read as the active /
  // open row in a list of subsections — matches how other parent
  // accordions across the app signal their expanded state.
  subsectionHeaderExpanded: {
    backgroundColor: Colors.surfaceWarm,
    borderColor: Colors.primaryLight,
  },
  subsectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifMedium,
    color: Colors.textPrimary,
  },

  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  // Items rendered inside a SubsectionBlock live in a 2-column flex-wrap
  // grid so the nested-ness reads visually (smaller cards, two-per-row)
  // without needing a different background color from the parent row.
  // The expanded card breaks out to full width so its body has room.
  subsectionItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCardNestedHalf: {
    width: '48.5%',
  },
  itemCardNestedFull: {
    width: '100%',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemHeaderText: { flex: 1 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  categoryText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.accent,
  },
  itemName: {
    fontSize: 15,
    fontFamily: Fonts.serifMedium,
    color: Colors.textPrimary,
  },

  itemBody: { marginTop: Spacing.sm },
  ratesNote: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  itemDescription: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.divider,
  },
  tipText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  linksContainer: {
    gap: 8,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  linkText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },
  directionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceWarm,
    marginTop: Spacing.xs,
  },
  directionsText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textSecondary,
  },

  quickFacts: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  quickFactsTitle: {
    fontSize: 21,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 0.2,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  factKey: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    flex: 1,
  },
  factValue: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    flex: 2,
    textAlign: 'right',
  },
  factDivider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
