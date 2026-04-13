import React, { useState } from 'react';
import {
  View,
  Text,
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
  {
    n: 1,
    event: 'Sangeet',
    room: 'La Coupole & Terrasse du Petit Palais',
    when: 'Fri 22 May · 6:30 PM',
    color: '#B81D56',
  },
  {
    n: 2,
    event: 'Ceremony',
    room: 'Garden',
    when: 'Sat 23 May · 5:00 PM',
    color: '#4A7040',
  },
  {
    n: 3,
    event: 'Reception',
    room: 'Salle des Fêtes',
    when: 'Sat 23 May · 7:30 PM',
    color: Colors.primary,
  },
];

function Pin({ n, color }: { n: number; color: string }) {
  return (
    <View style={[s.pin, { backgroundColor: color }]}>
      <Text style={s.pinNum}>{n}</Text>
    </View>
  );
}

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
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {open && (
        <View>
          <View style={s.divider} />

          {/* ── Map schematic ── */}
          <View style={s.mapWrap}>
            {/* Compass */}
            <View style={s.compass}>
              <Text style={s.compassArrow}>↑</Text>
              <Text style={s.compassN}>N</Text>
            </View>

            {/* Street */}
            <View style={s.street}>
              <Text style={s.streetLabel}>Av. Claude-Nobs</Text>
            </View>

            {/* Building row: Grand Hôtel (left 2/3) | Petit Palais (right 1/3) */}
            <View style={s.buildingRow}>
              <View style={s.mainBuilding}>
                <Text style={s.bldLabel}>Grand Hôtel</Text>
                <Pin n={3} color={VENUES[2].color} />
              </View>
              <View style={s.petitPalais}>
                <Text style={s.bldLabel}>Petit{'\n'}Palais</Text>
                <Pin n={1} color={VENUES[0].color} />
              </View>
            </View>

            {/* Garden row: main garden (left 2/3) | Terrasse du Petit Palais (right 1/3) */}
            <View style={s.gardenRow}>
              <View style={s.garden}>
                <Pin n={2} color={VENUES[1].color} />
                <Text style={s.gardenLabel}>Garden</Text>
              </View>
              <View style={s.terrasse}>
                <Text style={s.terrasseLabel}>Terrasse{'\n'}du Petit{'\n'}Palais</Text>
              </View>
            </View>

            {/* Promenade */}
            <View style={s.promenade}>
              <Text style={s.promenadeLabel}>— Promenade —</Text>
            </View>

            {/* Lake */}
            <View style={s.lake}>
              <Text style={s.lakeLabel}>Lac Léman  ·  Lake Geneva</Text>
            </View>
          </View>

          {/* ── Legend ── */}
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

          <Text style={s.note}>Illustrative schematic · not to scale</Text>
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

  // ── Map ──────────────────────────────────────────────
  mapWrap: {
    overflow: 'hidden',
    position: 'relative',
  },

  compass: {
    position: 'absolute',
    top: 22,
    right: 10,
    zIndex: 10,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  compassArrow: {
    fontSize: 11,
    color: Colors.textSecondary,
    lineHeight: 14,
  },
  compassN: {
    fontSize: 8,
    fontFamily: Fonts.sansMedium,
    color: Colors.textSecondary,
    lineHeight: 10,
  },

  street: {
    height: 20,
    backgroundColor: '#CCCAC4',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  streetLabel: {
    fontSize: 8.5,
    fontFamily: Fonts.sans,
    color: '#4A4640',
    letterSpacing: 0.4,
  },

  buildingRow: {
    flexDirection: 'row',
    height: 68,
  },
  mainBuilding: {
    flex: 2,
    backgroundColor: '#BFB4A0',
    borderRightWidth: 2,
    borderRightColor: '#8A8078',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 6,
  },
  petitPalais: {
    flex: 1,
    backgroundColor: '#CABFB0',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: 6,
  },
  bldLabel: {
    fontSize: 8,
    fontFamily: Fonts.sansMedium,
    color: '#2A2018',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 11,
  },

  gardenRow: {
    flexDirection: 'row',
    height: 86,
  },
  garden: {
    flex: 2,
    backgroundColor: '#7B9E6E',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  gardenLabel: {
    fontSize: 8,
    fontFamily: Fonts.sansMedium,
    color: '#182C14',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  terrasse: {
    flex: 1,
    backgroundColor: '#9BB888',
    borderLeftWidth: 1.5,
    borderLeftColor: '#CABFB0',
    borderTopWidth: 1.5,
    borderTopColor: '#CABFB0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  terrasseLabel: {
    fontSize: 7.5,
    fontFamily: Fonts.sans,
    color: '#182C14',
    textAlign: 'center',
    lineHeight: 11,
  },

  promenade: {
    height: 14,
    backgroundColor: '#C0BAB2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promenadeLabel: {
    fontSize: 7.5,
    fontFamily: Fonts.sans,
    color: '#4A4640',
    letterSpacing: 0.5,
  },

  lake: {
    height: 38,
    backgroundColor: '#9DC4D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lakeLabel: {
    fontSize: 10,
    fontFamily: Fonts.serifItalic,
    color: '#1A4060',
    letterSpacing: 0.5,
  },

  // ── Pins ────────────────────────────────────────────
  pin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
  },
  pinNum: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: '#fff',
  },

  // ── Legend ──────────────────────────────────────────
  legend: {
    padding: Spacing.md,
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

  note: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingBottom: Spacing.md,
    fontStyle: 'italic',
  },
});
