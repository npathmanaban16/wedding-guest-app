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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { SWITZERLAND_GUIDE, GuideSection, GuideItem } from '@/constants/weddingData';

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
      style={[styles.itemCard, Shadow.small]}
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
              <Text style={styles.tipEmoji}>✨</Text>
              <Text style={styles.tipText}>{item.tip}</Text>
            </View>
          )}
          {item.link && (
            <TouchableOpacity onPress={() => Linking.openURL(item.link!)}>
              <Text style={styles.linkText}>Open in browser →</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function SectionBlock({ section }: { section: GuideSection }) {
  return (
    <View style={styles.sectionBlock}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{section.emoji}</Text>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      {section.items.map((item) => (
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
      ? SWITZERLAND_GUIDE.map((section) => ({
          ...section,
          items: section.items.filter((item) => item.category === activeFilter),
        })).filter((section) => section.items.length > 0)
      : SWITZERLAND_GUIDE;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageEmoji}>🇨🇭</Text>
        <Text style={styles.pageTitle}>Switzerland Guide</Text>
        <Text style={styles.pageSubtitle}>
          Everything you need to know about Zermatt and making the most of your trip
        </Text>
      </View>

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
        <Text style={styles.quickFactsTitle}>🗺️ Quick Facts</Text>
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Currency</Text>
          <Text style={styles.factValue}>Swiss Franc (CHF)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Language</Text>
          <Text style={styles.factValue}>German (English widely spoken)</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Time zone</Text>
          <Text style={styles.factValue}>CEST (UTC+2) in August</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.factRow}>
          <Text style={styles.factKey}>Plug type</Text>
          <Text style={styles.factValue}>Type J (bring universal adaptor!)</Text>
        </View>
        <View style={styles.divider} />
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

  pageHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  pageEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  pageTitle: {
    fontSize: Typography.xxl,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    fontSize: Typography.sm,
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
    paddingVertical: Spacing.xs,
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
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
    fontWeight: '600',
  },

  sectionBlock: { marginBottom: Spacing.sm, paddingHorizontal: Spacing.lg },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionEmoji: { fontSize: 22, marginRight: Spacing.sm },
  sectionTitle: {
    fontSize: Typography.lg,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
  },

  itemCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemHeaderText: { flex: 1 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.sageLight,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  categoryText: {
    fontSize: Typography.xs,
    color: Colors.sageDark,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: Typography.base,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
  },

  itemBody: { marginTop: Spacing.sm },
  itemDescription: {
    fontSize: Typography.sm,
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
  },
  tipEmoji: { fontSize: 14, marginRight: Spacing.xs, marginTop: 1 },
  tipText: {
    flex: 1,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  linkText: {
    fontSize: Typography.sm,
    color: Colors.primary,
    fontWeight: '600',
  },

  quickFacts: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadow.small,
  },
  quickFactsTitle: {
    fontSize: Typography.md,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  factRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  factKey: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    flex: 1,
  },
  factValue: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
    flex: 2,
    textAlign: 'right',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },
});
