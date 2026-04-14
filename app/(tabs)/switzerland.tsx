import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { SWITZERLAND_GUIDE, GuideSection, GuideSubsection, GuideItem, GuideLink } from '@/constants/weddingData';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function GuideItemCard({ item }: { item: GuideItem }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={toggle}
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
          <Text style={styles.itemDescription}>{item.description}</Text>
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
        </View>
      )}
    </TouchableOpacity>
  );
}

function SubsectionBlock({ subsection }: { subsection: GuideSubsection }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <View style={styles.subsectionBlock}>
      <TouchableOpacity style={styles.subsectionHeader} onPress={toggle} activeOpacity={0.7}>
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
      {expanded && subsection.items.map((item) => (
        <GuideItemCard key={item.id} item={item} />
      ))}
    </View>
  );
}

function SectionBlock({ section }: { section: GuideSection }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {section.subsections
        ? section.subsections.map((sub) => (
            <SubsectionBlock key={sub.id} subsection={sub} />
          ))
        : section.items?.map((item) => (
            <GuideItemCard key={item.id} item={item} />
          ))}
    </View>
  );
}

export default function SwitzerlandScreen() {
  const insets = useSafeAreaInsets();
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

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
        <Text style={styles.pageSubtitleTag}>Montreux & Beyond</Text>
        <Text style={styles.pageSubtitle}>
          Everything you need to know about Montreux and making the most of your trip
        </Text>
      </View>

      {/* Photo strip */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoStrip}
      >
        {[
          { src: require('@/assets/images/promenade.png'), label: 'Montreux promenade' },
          { src: require('@/assets/images/lauvaux.png'), label: 'Lavaux vineyards' },
          { src: require('@/assets/images/narcissus_hike.png'), label: 'Narcissus hike' },
          { src: require('@/assets/images/rochers_de_naye.png'), label: 'Rochers de Naye' },
          { src: require('@/assets/images/narcissus.png'), label: 'Narcissus fields in May' },
          { src: require('@/assets/images/boat.png'), label: 'Lake Geneva by boat' },
        ].map((photo, i) => (
          <View key={i} style={styles.photoItem}>
            <Image source={photo.src} style={styles.photoImage} resizeMode="contain" />
            <View style={styles.photoLabelRow}>
              <Text style={styles.photoLabel}>{photo.label}</Text>
            </View>
          </View>
        ))}
      </ScrollView>

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
        <SectionBlock key={section.id} section={section} />
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
          <Text style={styles.factValue}>CEST (UTC+2) in August</Text>
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
  photoItem: {
    width: 180,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  photoImage: {
    width: 180,
    height: 180,
  },
  photoLabelRow: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  photoLabel: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
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
