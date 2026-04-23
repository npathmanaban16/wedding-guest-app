import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { NN_WEDDING_IDS } from '@/constants/weddingData';
import { useWedding } from '@/context/WeddingContext';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// Image pixel dimensions (888 × 1016)
const IMG_W = 888;
const IMG_H = 1016;

// N&N venues + dates (May 2026). The SaaS variant swaps the Sangeet label
// for "Welcome Party" and shifts dates forward one year to match
// EVENTS_DEMO + the demo wedding_date in seed_demo_wedding.sql.
const VENUES_NN = [
  { n: 1, event: 'Sangeet',       room: 'La Coupole & Terrasse du Petit Palais', when: 'Fri 22 May · 6:30 PM', color: '#B81D56' },
  { n: 2, event: 'Ceremony',      room: 'Garden',                                when: 'Sat 23 May · 5:00 PM', color: '#4A7040' },
  { n: 3, event: 'Reception',     room: 'Salle des Fêtes',                       when: 'Sat 23 May · 7:30 PM', color: Colors.primary },
];

const VENUES_DEMO = [
  { n: 1, event: 'Welcome Party', room: 'La Coupole & Terrasse du Petit Palais', when: 'Fri 21 May · 6:30 PM', color: '#B81D56' },
  { n: 2, event: 'Ceremony',      room: 'Garden',                                when: 'Sat 22 May · 5:00 PM', color: '#4A7040' },
  { n: 3, event: 'Reception',     room: 'Salle des Fêtes',                       when: 'Sat 22 May · 7:30 PM', color: Colors.primary },
];

export function FairmontMap() {
  const { weddingId } = useWedding();
  const VENUES = NN_WEDDING_IDS.has(weddingId ?? '') ? VENUES_NN : VENUES_DEMO;
  const [open, setOpen] = useState(false);
  const [imgW, setImgW] = useState(0);
  const imgH = imgW > 0 ? Math.round(imgW * (IMG_H / IMG_W)) : 0;

  const toggle = () => {
    animateLayout();
    setOpen(v => !v);
  };

  return (
    // Outer view carries the shadow; inner view clips to border radius.
    // Splitting them prevents iOS from clipping the shadow.
    <View style={s.shadowWrap}>
      <View style={s.card}>
        <TouchableOpacity style={s.header} onPress={toggle} activeOpacity={0.85}>
          <View style={s.headerLeft}>
            <Text style={s.tag}>Venue Overview</Text>
            <Text style={s.title}>Hotel Map</Text>
          </View>
          <View style={[s.chevronWrap, open && s.chevronWrapOpen]}>
            <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={open ? Colors.primary : Colors.textMuted} />
          </View>
        </TouchableOpacity>

        {open && (
          <View>
            <View style={s.divider} />

            <View
              style={s.imageContainer}
              onLayout={e => setImgW(Math.floor(e.nativeEvent.layout.width) - Spacing.md * 2)}
            >
              <ScrollView
                style={{ height: imgH > 0 ? Math.min(imgH, 420) : 420 }}
                minimumZoomScale={1}
                maximumZoomScale={4}
                centerContent
                bouncesZoom
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                {imgW > 0 && (
                  <Image
                    source={require('@/assets/images/fairmont_floor_plan.png')}
                    style={{ width: imgW, height: imgH }}
                    resizeMode="stretch"
                  />
                )}
              </ScrollView>
              <Text style={s.zoomHint}>Pinch to zoom · double-tap to reset</Text>
            </View>

            <View style={s.divider} />

            {/* Legend */}
            <View style={s.legend}>
              {VENUES.map(v => (
                <View key={v.n} style={s.legendRow}>
                  <View style={[s.legendPin, { backgroundColor: v.color }]}>
                    <Text style={s.legendPinNum}>{v.n}</Text>
                  </View>
                  <View style={s.legendInfo}>
                    <Text style={s.legendEvent}>{v.event}</Text>
                    <Text style={s.legendRoom}>{v.room}</Text>
                    <Text style={s.legendWhen}>{v.when}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // Shadow lives here; no overflow so it isn't clipped on iOS
  shadowWrap: {
    borderRadius: Radius.lg,
    ...Shadow.small,
  },
  // Clip border radius here without a shadow
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surfaceWarm,
  },
  headerLeft: { gap: 2 },
  tag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.gold,
  },
  title: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  chevronWrapOpen: {
    backgroundColor: Colors.surfaceWarm,
    borderColor: Colors.primaryLight,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },

  imageContainer: {
    backgroundColor: Colors.white,
    padding: Spacing.md,
  },
  zoomHint: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },

  legend: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  legendPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
    flexShrink: 0,
  },
  legendPinNum: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: '#fff',
  },
  legendInfo: { flex: 1 },
  legendEvent: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  legendRoom: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  legendWhen: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
