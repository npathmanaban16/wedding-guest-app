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
import { SWITZERLAND_GUIDE, GuideSection, GuideSubsection, GuideItem, GuideLink } from '@/constants/weddingData';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

const PHOTO_STRIP_ITEMS = [
  { src: require('@/assets/images/promenade.png'), label: 'Montreux Promenade' },
  { src: require('@/assets/images/lauvaux.png'), label: 'Lavaux vineyards' },
  { src: require('@/assets/images/narcissus_hike.png'), label: 'Narcissus hike' },
  { src: require('@/assets/images/rochers_de_naye.png'), label: 'Rochers de Naye' },
  { src: require('@/assets/images/narcissus.png'), label: 'Narcissus fields in May' },
  { src: require('@/assets/images/boat.png'), label: 'Lake Geneva boat ride' },
];

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
}

function GuideItemCard({ item, expanded, onToggle, nested = false }: GuideItemCardProps) {
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);
  const fetchedRef = useRef(false);

  const isCurrency = item.id === 'currency';

  useEffect(() => {
    if (isCurrency && expanded && !fetchedRef.current) {
      fetchedRef.current = true;
      setRatesLoading(true);
      fetch('https://api.frankfurter.app/latest?from=CHF&to=USD,GBP,EUR')
        .then((r) => r.json())
        .then((data) => setRates(data.rates))
        .catch(() => {})
        .finally(() => setRatesLoading(false));
    }
  }, [isCurrency, expanded]);

  const description = isCurrency && rates
    ? `Switzerland uses Swiss Francs (CHF). 1 CHF = $${rates.USD.toFixed(2)} / €${rates.EUR.toFixed(2)} / £${rates.GBP.toFixed(2)}.`
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
}

function SubsectionBlock({ subsection, expanded, onToggle }: SubsectionBlockProps) {
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
}

function SectionBlock({ section, openFirstLevelId, onToggleFirstLevel }: SectionBlockProps) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {section.subsections
        ? section.subsections.map((sub) => (
            <SubsectionBlock
              key={sub.id}
              subsection={sub}
              expanded={openFirstLevelId === sub.id}
              onToggle={() => onToggleFirstLevel(sub.id)}
            />
          ))
        : section.items?.map((item) => (
            <GuideItemCard
              key={item.id}
              item={item}
              expanded={openFirstLevelId === item.id}
              onToggle={() => onToggleFirstLevel(item.id)}
            />
          ))}
    </View>
  );
}

function PhotoStrip() {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.photoStrip}
    >
      {PHOTO_STRIP_ITEMS.map((photo, i) => (
        <View key={i} style={styles.photoWrapper}>
          <Image source={photo.src} style={styles.photoItem} resizeMode="cover" />
          <Text style={styles.photoLabel}>{photo.label}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

export default function SwitzerlandScreen() {
  const insets = useSafeAreaInsets();
  const { wedding } = useWedding();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  // One open first-level row page-wide. Subsections own their own
  // "which inner item is open" state so opening a nested item doesn't
  // disturb this value.
  const [openFirstLevelId, setOpenFirstLevelId] = useState<string | null>(null);
  const toggleFirstLevel = (id: string) => {
    animateLayout();
    setOpenFirstLevelId((cur) => (cur === id ? null : id));
  };

  const filters = ['All', 'Transport', 'Sightseeing', 'Activity', 'Restaurant', 'Bar', 'Practical'];

  const filteredGuide =
    activeFilter && activeFilter !== 'All'
      ? SWITZERLAND_GUIDE.map((section) => {
          if (section.subsections) {
            const filteredSubs = section.subsections
              .map((sub) => ({
                ...sub,
                items: sub.items.filter((item) => item.category === activeFilter),
              }))
              .filter((sub) => sub.items.length > 0);
            return { ...section, subsections: filteredSubs, items: undefined };
          }
          return {
            ...section,
            items: section.items?.filter((item) => item.category === activeFilter) ?? [],
          };
        }).filter((section) =>
          section.subsections ? section.subsections.length > 0 : (section.items?.length ?? 0) > 0
        )
      : SWITZERLAND_GUIDE;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Switzerland Guide</Text>
        <Text style={styles.pageSubtitleTag}>{wedding.destination_city} & Beyond</Text>
        <Text style={styles.pageSubtitle}>
          Everything you need to know about {wedding.destination_city} and making the most of your trip
        </Text>
      </View>

      {/* Photo strip — manual horizontal swipe. */}
      <PhotoStrip />

      {/* Filter pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
      >
        {filters.map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterPill, (activeFilter === f || (!activeFilter && f === 'All')) && styles.filterPillActive]}
            onPress={() => setActiveFilter(f === 'All' ? null : f)}
          >
            <Text
              style={[
                styles.filterText,
                (activeFilter === f || (!activeFilter && f === 'All')) && styles.filterTextActive,
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
        />
      ))}

      {/* Quick facts */}
      <View style={styles.quickFacts}>
        <Text style={styles.quickFactsTitle}>Quick Facts</Text>
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Currency</Text>
          <Text style={styles.factValue}>Swiss Franc (CHF)</Text>
        </View>
        <View style={styles.factDivider} />
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Language</Text>
          <Text style={styles.factValue}>French (English widely spoken)</Text>
        </View>
        <View style={styles.factDivider} />
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Time zone</Text>
          <Text style={styles.factValue}>CEST (UTC+2)</Text>
        </View>
        <View style={styles.factDivider} />
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Plug type</Text>
          <Text style={styles.factValue}>Type J (bring universal adaptor!)</Text>
        </View>
        <View style={styles.factDivider} />
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Emergency</Text>
          <Text style={styles.factValue}>Police 117 · Ambulance 144</Text>
        </View>
      </View>
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
