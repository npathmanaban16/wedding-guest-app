import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { PACKING_GUIDE, PackingCategory, PackingItem } from '@/constants/weddingData';
import { getCheckedItems, togglePackingItem } from '@/services/storage';
import { useAuth } from '@/context/AuthContext';
import { isWeddingParty } from '@/constants/guests';

function PackingItemRow({
  item,
  checked,
  onToggle,
}: {
  item: PackingItem;
  checked: boolean;
  onToggle: () => void;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <View style={styles.itemRow}>
      <TouchableOpacity
        style={styles.checkRow}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked]}>
          {checked && <Ionicons name="checkmark" size={13} color={Colors.white} />}
        </View>
        <Text style={[styles.itemLabel, checked && styles.itemLabelChecked]}>
          {item.label}
        </Text>
        {item.tip && (
          <TouchableOpacity
            onPress={() => setShowTip((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showTip ? 'information-circle' : 'information-circle-outline'}
              size={17}
              color={showTip ? Colors.primary : Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {item.tip && showTip && (
        <View style={styles.tipBubble}>
          <Text style={styles.tipText}>{item.tip}</Text>
        </View>
      )}
    </View>
  );
}

function CategorySection({
  category,
  checkedItems,
  onToggle,
}: {
  category: PackingCategory;
  checkedItems: string[];
  onToggle: (id: string) => void;
}) {
  const checkedCount = category.items.filter((i) => checkedItems.includes(i.id)).length;
  const total = category.items.length;
  const allDone = checkedCount === total;

  return (
    <View style={styles.categoryCard}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryHeaderText}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categoryProgress}>
            {checkedCount}/{total} packed
          </Text>
        </View>
        {allDone && (
          <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
        )}
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${(checkedCount / total) * 100}%` },
            allDone && styles.progressFillDone,
          ]}
        />
      </View>

      {/* Items */}
      <View style={styles.itemsList}>
        {category.items.map((item) => (
          <PackingItemRow
            key={item.id}
            item={item}
            checked={checkedItems.includes(item.id)}
            onToggle={() => onToggle(item.id)}
          />
        ))}
      </View>
    </View>
  );
}

export default function PackingScreen() {
  const insets = useSafeAreaInsets();
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const { guestName } = useAuth();
  const inWeddingParty = isWeddingParty(guestName ?? '');

  const filteredGuide = PACKING_GUIDE.map((cat) => ({
    ...cat,
    items: cat.items.filter((item) => !item.weddingPartyOnly || inWeddingParty),
  })).filter((cat) => cat.items.length > 0);

  useEffect(() => {
    getCheckedItems().then((items) => {
      setCheckedItems(items);
      setLoading(false);
    });
  }, []);

  const handleToggle = async (id: string) => {
    const updated = await togglePackingItem(id);
    setCheckedItems(updated);
  };

  const totalItems = filteredGuide.reduce((sum, cat) => sum + cat.items.length, 0);
  const totalChecked = checkedItems.filter((id) =>
    filteredGuide.some((cat) => cat.items.some((item) => item.id === id))
  ).length;
  const overallPercent = Math.round((totalChecked / totalItems) * 100);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Packing Guide</Text>
        <Text style={styles.pageSubtitleTag}>What to Bring</Text>
        <Text style={styles.pageSubtitle}>
          Outfit ideas and everything you need for a Swiss wedding weekend
        </Text>
      </View>

      {/* Overall progress */}
      <View style={styles.overallProgress}>
        <Text style={styles.overallLabel}>Overall Progress</Text>
        <Text style={styles.overallPercent}>{overallPercent}%</Text>
        <View style={styles.progressTrackLarge}>
          <View style={[styles.progressFill, { width: `${overallPercent}%` }]} />
        </View>
        <Text style={styles.overallCount}>
          {totalChecked} of {totalItems} items packed
        </Text>
        {overallPercent === 100 && (
          <Text style={styles.allPackedText}>You're all packed! See you in Switzerland!</Text>
        )}
      </View>

      {/* Categories */}
      {filteredGuide.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          checkedItems={checkedItems}
          onToggle={handleToggle}
        />
      ))}

      {/* Tips footer */}
      <View style={styles.tipsFooter}>
        <Text style={styles.tipsTitle}>Tip: Pack for the Lake & the Mountains</Text>
        <Text style={styles.tipsText}>
          May in Montreux can bring spring showers and cool evenings by the lake. Bring layers and a packable rain jacket alongside your event outfits.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

  pageHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
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

  overallProgress: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  overallLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  overallPercent: {
    fontSize: 46,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: -1,
  },
  progressTrackLarge: {
    width: '100%',
    height: 6,
    backgroundColor: Colors.divider,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  overallCount: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
  allPackedText: {
    fontFamily: Fonts.serifItalic,
    fontSize: 15,
    color: Colors.success,
    marginTop: Spacing.sm,
  },

  categoryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryHeaderText: { flex: 1 },
  categoryTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  categoryProgress: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginTop: 2,
  },

  progressTrack: {
    height: 3,
    backgroundColor: Colors.divider,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.full,
  },
  progressFillDone: {
    backgroundColor: Colors.success,
  },

  itemsList: { gap: 2 },
  itemRow: { marginBottom: Spacing.xs },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.border,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  itemLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  itemLabelChecked: {
    color: Colors.textMuted,
    textDecorationLine: 'line-through',
  },

  tipBubble: {
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginTop: 2,
    marginLeft: 30,
    borderWidth: 0.5,
    borderColor: Colors.divider,
  },
  tipText: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  tipsFooter: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.accent + '30',
  },
  tipsTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.accent,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  tipsText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.accent,
    lineHeight: 20,
    opacity: 0.85,
  },
});
