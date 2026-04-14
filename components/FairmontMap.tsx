import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// Image pixel dimensions (888 × 1016)
const IMG_W = 888;
const IMG_H = 1016;

// Pin positions as fractions of image dimensions (0–1).
// px = left fraction, py = top fraction.
const VENUES = [
  { n: 1, event: 'Sangeet',   room: 'La Coupole & Terrasse du Petit Palais', when: 'Fri 22 May · 6:30 PM', color: '#B81D56', px: 0.70, py: 0.57 },
  { n: 2, event: 'Ceremony',  room: 'Garden',                                when: 'Sat 23 May · 5:00 PM', color: '#4A7040', px: 0.17, py: 0.65 },
  { n: 3, event: 'Reception', room: 'Salle des Fêtes',                       when: 'Sat 23 May · 7:30 PM', color: Colors.primary, px: 0.55, py: 0.28 },
];

const PIN_R = 11; // pin radius (px)

export function FairmontMap() {
  const [open, setOpen] = useState(true);
  // Measure the rendered width of the image wrapper so we can set explicit
  // pixel dimensions on the Image — avoids percentage/aspectRatio sizing bugs.
  const [imgW, setImgW] = useState(0);
  const imgH = imgW > 0 ? Math.round(imgW * (IMG_H / IMG_W)) : 0;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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

          <View style={s.imageContainer}>
            {/* onLayout gives us the true rendered width after padding */}
            <View
              style={s.imageWrapper}
              onLayout={e => setImgW(Math.floor(e.nativeEvent.layout.width))}
            >
              {imgW > 0 && (
                <>
                  <Image
                    source={require('@/assets/images/fairmont_floor_plan.png')}
                    style={{ width: imgW, height: imgH }}
                    resizeMode="stretch"
                  />
                  {VENUES.map(v => (
                    <View
                      key={v.n}
                      style={[s.pin, {
                        backgroundColor: v.color,
                        left: imgW * v.px - PIN_R,
                        top:  imgH * v.py - PIN_R,
                      }]}
                    >
                      <Text style={s.pinNum}>{v.n}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
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
  imageWrapper: {
    width: '100%',
  },

  pin: {
    position: 'absolute',
    width:  PIN_R * 2,
    height: PIN_R * 2,
    borderRadius: PIN_R,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  pinNum: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: '#fff',
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
