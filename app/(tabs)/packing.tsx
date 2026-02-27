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
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { PACKING_GUIDE, PackingCategory, PackingItem } from '@/constants/weddingData';
import { getCheckedItems, togglePackingItem } from '@/services/storage';

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
          {checked && <Ionicons name="checkmark" size={14} color={Colors.white} />}
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
              size={18}
              color={showTip ? Colors.secondary : Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {item.tip && showTip && (
        <View style={styles.tipBubble}>
          <Text style={styles.tipText}>✨ {item.tip}</Text>
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
    <View style={[styles.categoryCard, Shadow.small]}>
      <View style={styles.categoryHeader}>
        <Text style={styles.categoryEmoji}>{category.emoji}</Text>
        <View style={styles.categoryHeaderText}>
          <Text style={styles.categoryTitle}>{category.title}</Text>
          <Text style={styles.categoryProgress}>
            {checkedCount}/{total} packed
          </Text>
        </View>
        {allDone && (
          <View style={styles.allDoneBadge}>
            <Ionicons name="checkmark-circle" size={20} color={Colors.success} />
          </View>
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

  const totalItems = PACKING_GUIDE.reduce((sum, cat) => sum + cat.items.length, 0);
  const totalChecked = checkedItems.length;
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
        <Text style={styles.pageEmoji}>🧳</Text>
        <Text style={styles.pageTitle}>Packing Guide</Text>
        <Text style={styles.pageSubtitle}>
          Outfit ideas and everything you need for a Swiss wedding weekend
        </Text>
      </View>

      {/* Overall progress */}
      <View style={[styles.overallProgress, Shadow.medium]}>
        <Text style={styles.overallLabel}>Overall packing progress</Text>
        <Text style={styles.overallPercent}>{overallPercent}%</Text>
        <View style={styles.progressTrackLarge}>
          <View style={[styles.progressFill, { width: `${overallPercent}%` }]} />
        </View>
        <Text style={styles.overallCount}>
          {totalChecked} of {totalItems} items packed
        </Text>
        {overallPercent === 100 && (
          <Text style={styles.allPackedText}>🎉 You're all packed! See you in Switzerland!</Text>
        )}
      </View>

      {/* Categories */}
      {PACKING_GUIDE.map((category) => (
        <CategorySection
          key={category.id}
          category={category}
          checkedItems={checkedItems}
          onToggle={handleToggle}
        />
      ))}

      {/* Tips footer */}
      <View style={styles.tipsFooter}>
        <Text style={styles.tipsTitle}>🏔️ Zermatt is car-free</Text>
        <Text style={styles.tipsText}>
          You'll carry your luggage from the train station. Pack light if you can, or arrange
          luggage transport with your hotel in advance.
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

  overallProgress: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
  },
  overallLabel: {
    color: Colors.white,
    opacity: 0.8,
    fontSize: Typography.sm,
    marginBottom: Spacing.xs,
  },
  overallPercent: {
    color: Colors.white,
    fontSize: Typography.xxxl,
    fontFamily: Typography.serif,
    fontWeight: '700',
    marginBottom: Spacing.sm,
  },
  progressTrackLarge: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  overallCount: {
    color: Colors.white,
    opacity: 0.7,
    fontSize: Typography.xs,
  },
  allPackedText: {
    color: Colors.white,
    fontSize: Typography.sm,
    marginTop: Spacing.sm,
    fontWeight: '600',
  },

  categoryCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryEmoji: { fontSize: 24, marginRight: Spacing.sm },
  categoryHeaderText: { flex: 1 },
  categoryTitle: {
    fontSize: Typography.base,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
  },
  categoryProgress: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
  allDoneBadge: {},

  progressTrack: {
    height: 4,
    backgroundColor: Colors.divider,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.secondary,
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
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
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
    fontSize: Typography.sm,
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
  },
  tipText: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },

  tipsFooter: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    backgroundColor: Colors.sageLight,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  tipsTitle: {
    fontSize: Typography.base,
    fontFamily: Typography.serif,
    color: Colors.sageDark,
    marginBottom: Spacing.xs,
  },
  tipsText: {
    fontSize: Typography.sm,
    color: Colors.sageDark,
    lineHeight: 20,
  },
});
