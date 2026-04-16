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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// Image pixel dimensions (888 × 1016)
const IMG_W = 888;
const IMG_H = 1016;

const VENUES = [
  { n: 1, event: 'Sangeet',   room: 'La Coupole & Terrasse du Petit Palais', when: 'Fri 22 May · 6:30 PM', color: '#B81D56' },
  { n: 2, event: 'Ceremony',  room: 'Garden',                                when: 'Sat 23 May · 5:00 PM', color: '#4A7040' },
  { n: 3, event: 'Reception', room: 'Salle des Fêtes',                       when: 'Sat 23 May · 7:30 PM', color: Colors.primary },
];


export function FairmontMap() {
  const [open, setOpen] = useState(false);
  // Measure the rendered width of the image wrapper so we can set explicit
  // pixel dimensions on the Image — avoids percentage/aspectRatio sizing bugs.
  const [imgW, setImgW] = useState(0);
  const imgH = imgW > 0 ? Math.round(imgW * (IMG_H / IMG_W)) : 0;


  const toggle = () => {
    animateLayout();
    setOpen(v => !v);
  };

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.header} onPress={toggle} activeOpacity={0.85}>
        <View>
          <Text style={s.tag}>Venue Overview</Text>
          <Text style={s.title}>Hotel Map</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
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
            <Text style={s.zoomHint}>Pinch to zoom</Text>
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
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.small,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  tag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: 2,
  },
  title: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },

  imageContainer: {
    backgroundColor: '#FFFFFF',
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
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  legendPinNum: {
    fontSize: 10,
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
