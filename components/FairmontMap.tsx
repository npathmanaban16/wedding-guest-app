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

const VENUES = [
  { n: 1, event: 'Sangeet',   room: 'La Coupole & Terrasse du Petit Palais', when: 'Fri 22 May · 6:30 PM', color: '#B81D56', left: '70%', top: '62%' },
  { n: 2, event: 'Ceremony',  room: 'Garden', when: 'Sat 23 May · 5:00 PM', color: '#4A7040', left: '18%', top: '68%' },
  { n: 3, event: 'Reception', room: 'Salle des Fêtes', when: 'Sat 23 May · 7:30 PM', color: Colors.primary, left: '52%', top: '27%' },
];

export function FairmontMap() {
  const [open, setOpen] = useState(true);

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
            <View style={s.imageWrapper}>
              <Image
                source={require('@/assets/images/fairmont_floor_plan.png')}
                style={s.image}
                resizeMode="contain"
              />
              {VENUES.map(v => (
                <View
                  key={v.n}
                  style={[s.pin, { backgroundColor: v.color, left: v.left as any, top: v.top as any }]}
                >
                  <Text style={s.pinNum}>{v.n}</Text>
                </View>
              ))}
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
    position: 'relative',
  },
  image: {
    width: '100%',
    aspectRatio: 0.77, // portrait: ~490 wide × ~640 tall
  },
  pin: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    marginLeft: -11,
    marginTop: -11,
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
