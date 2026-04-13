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

const HIGHLIGHTED = '#BAD8E8'; // general event/function rooms (floor-plan blue)
const VENUE_BLUE  = '#A8CCE0'; // our wedding venue rooms (richer blue)
const VENUE_GREEN = '#BDD8AE'; // outdoor wedding venue (garden)
const CONTEXT     = '#EFEBE4'; // non-event rooms
const DIVIDER     = '#ADA9A4'; // internal room dividers
const OUTLINE     = '#4A4540'; // building outlines
const ROAD_COLOR  = '#D0CCC8'; // road separating hotel from grounds

const VENUES = [
  { n: 1, event: 'Sangeet',   room: 'La Coupole & Terrasse du Petit Palais', when: 'Fri 22 May · 6:30 PM', color: '#B81D56' },
  { n: 2, event: 'Ceremony',  room: 'Garden', when: 'Sat 23 May · 5:00 PM', color: '#4A7040' },
  { n: 3, event: 'Reception', room: 'Salle des Fêtes', when: 'Sat 23 May · 7:30 PM', color: Colors.primary },
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
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View>
          <View style={s.divider} />
          <View style={s.mapArea}>

            {/* ── GRAND HÔTEL ───────────────────────────────────────
                Height ~108px. Left col ≈ 34 % (Salles des Congrès area),
                right col ≈ 66 % (Stage / Salles des Fêtes / Grand Hall).
            ───────────────────────────────────────────────────────── */}
            <Text style={s.bldTitle}>Grand Hôtel · Main Building</Text>
            <View style={s.hotelBld}>
              {/* Left col: Salles des Congrès / Bars & Dining */}
              <View style={s.hotelLeft}>
                <View style={[s.room, { backgroundColor: HIGHLIGHTED, flex: 1.5, borderBottomWidth: 0.75, borderBottomColor: DIVIDER }]}>
                  <Text style={s.hlText}>Salles des{'\n'}Congrès</Text>
                </View>
                <View style={[s.room, { backgroundColor: CONTEXT, flex: 1 }]}>
                  <Text style={s.roomText}>Bars &{'\n'}Dining</Text>
                </View>
              </View>

              {/* Right col: 3 rows */}
              <View style={s.hotelRight}>
                {/* Row 1 — Stage / Salon Club / Salon Rouge */}
                <View style={[s.hotelRow, { flex: 1 }]}>
                  <View style={[s.room, { backgroundColor: HIGHLIGHTED, flex: 1, borderRightWidth: 0.75, borderRightColor: DIVIDER }]}>
                    <Text style={s.hlText}>Stage</Text>
                  </View>
                  <View style={[s.room, { backgroundColor: HIGHLIGHTED, flex: 1, borderRightWidth: 0.75, borderRightColor: DIVIDER }]}>
                    <Text style={s.hlText}>Salon{'\n'}Club</Text>
                  </View>
                  <View style={[s.room, { backgroundColor: HIGHLIGHTED, flex: 1 }]}>
                    <Text style={s.hlText}>Salon{'\n'}Rouge</Text>
                  </View>
                </View>

                {/* Row 2 — Salles des Fêtes ③ (larger) + Salon Bridge */}
                <View style={[s.hotelRow, { flex: 1.6, borderTopWidth: 0.75, borderTopColor: DIVIDER, borderBottomWidth: 0.75, borderBottomColor: DIVIDER }]}>
                  <View style={[s.room, { backgroundColor: VENUE_BLUE, flex: 2, borderRightWidth: 0.75, borderRightColor: DIVIDER, gap: 4 }]}>
                    <Text style={s.venueText}>Salles des Fêtes</Text>
                    <Pin n={3} color={VENUES[2].color} />
                  </View>
                  <View style={[s.room, { backgroundColor: CONTEXT, flex: 1 }]}>
                    <Text style={s.roomText}>Salon{'\n'}Bridge</Text>
                  </View>
                </View>

                {/* Row 3 — Grand Hall / La Palmeraie */}
                <View style={[s.hotelRow, { flex: 1 }]}>
                  <View style={[s.room, { backgroundColor: CONTEXT, flex: 1, borderRightWidth: 0.75, borderRightColor: DIVIDER }]}>
                    <Text style={s.roomText}>Grand Hall{'\n'}(Lobby)</Text>
                  </View>
                  <View style={[s.room, { backgroundColor: HIGHLIGHTED, flex: 1 }]}>
                    <Text style={s.hlText}>La{'\n'}Palmeraie</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* ── ROAD ─────────────────────────────────────────────── */}
            <View style={s.road}>
              <Text style={s.roadLabel}>Av. Claude-Nobs  ·  tunnel to Le Petit Palais underneath</Text>
            </View>

            {/* ── GROUNDS (south of road, lakeside) ─────────────────
                Height ~158px — noticeably taller than the hotel to
                match floor-plan proportions.

                Left  ≈ 57 %: Garden ② (ceremony lawn)
                Right ≈ 43 %: Le Petit Palais — La Coupole ① (top,
                              ~35 % of height) + Terrasse ① (bottom,
                              ~65 % of height, significantly larger).
            ───────────────────────────────────────────────────────── */}
            <View style={s.grounds}>
              {/* Garden — Ceremony ② */}
              <View style={[s.room, { backgroundColor: VENUE_GREEN, flex: 1.6, borderRightWidth: 1.5, borderRightColor: OUTLINE, gap: 6 }]}>
                <Pin n={2} color={VENUES[1].color} />
                <Text style={s.gardenText}>Garden</Text>
              </View>

              {/* Petit Palais — stacked La Coupole (smaller) + Terrasse (larger) */}
              <View style={s.petitCol}>
                {/* La Coupole — Sangeet ① indoor */}
                <View style={[s.room, { backgroundColor: VENUE_BLUE, flex: 0.55, borderBottomWidth: 1, borderBottomColor: DIVIDER, gap: 3 }]}>
                  <Text style={s.venueText}>La Coupole</Text>
                  <Pin n={1} color={VENUES[0].color} />
                </View>
                {/* Terrasse du Petit Palais — Sangeet ① outdoor (≈ 2× taller) */}
                <View style={[s.room, { backgroundColor: VENUE_BLUE, flex: 1 }]}>
                  <Text style={s.venueText}>Terrasse du{'\n'}Petit Palais</Text>
                </View>
              </View>
            </View>

            {/* ── LAKE GENEVA ───────────────────────────────────────── */}
            <View style={s.lake}>
              <Text style={s.lakeText}>Lac Léman  ·  Lake Geneva</Text>
            </View>

          </View>

          {/* ── Legend ────────────────────────────────────────────── */}
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

  // ── Map canvas ────────────────────────────────────────────────────
  mapArea: {
    backgroundColor: '#FAFAF8',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  bldTitle: {
    fontSize: 8.5,
    fontFamily: Fonts.sansMedium,
    color: OUTLINE,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 4,
  },

  // ── Grand Hôtel ───────────────────────────────────────────────────
  // Height 108 px. Left col 34 %, right col 66 %.
  hotelBld: {
    flexDirection: 'row',
    height: 108,
    borderWidth: 1.5,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  hotelLeft: {
    flex: 1.3,
    flexDirection: 'column',
    borderRightWidth: 0.75,
    borderRightColor: DIVIDER,
  },
  hotelRight: {
    flex: 2.5,
    flexDirection: 'column',
  },
  hotelRow: {
    flexDirection: 'row',
  },

  // ── Road ──────────────────────────────────────────────────────────
  road: {
    height: 22,
    backgroundColor: ROAD_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadLabel: {
    fontSize: 7.5,
    fontFamily: Fonts.sans,
    color: '#4A4540',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },

  // ── Grounds ───────────────────────────────────────────────────────
  // Height 158 px — taller than the hotel to match floor-plan scale.
  // Garden left 57 %, Petit Palais right 43 %.
  grounds: {
    flexDirection: 'row',
    height: 158,
    borderWidth: 1.5,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  // Petit Palais column: La Coupole (flex 0.55) + Terrasse (flex 1.0)
  // → Terrasse ≈ 2× taller than La Coupole, matching the floor plan.
  petitCol: {
    flex: 1.2,
    flexDirection: 'column',
  },

  // ── Generic room ──────────────────────────────────────────────────
  room: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 5,
  },
  roomText: {
    fontSize: 7.5,
    fontFamily: Fonts.sans,
    color: '#4A4540',
    textAlign: 'center',
    lineHeight: 11,
  },
  hlText: {
    fontSize: 7,
    fontFamily: Fonts.sansMedium,
    color: '#1A3A58',
    textAlign: 'center',
    lineHeight: 10,
  },
  venueText: {
    fontSize: 7.5,
    fontFamily: Fonts.sansMedium,
    color: '#1A3A58',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    lineHeight: 11,
  },
  gardenText: {
    fontSize: 9,
    fontFamily: Fonts.sansMedium,
    color: '#1A3818',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  // ── Lake ──────────────────────────────────────────────────────────
  lake: {
    height: 36,
    backgroundColor: '#9DC4D8',
    borderWidth: 0.75,
    borderColor: '#6A9AB0',
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  lakeText: {
    fontSize: 9.5,
    fontFamily: Fonts.serifItalic,
    color: '#1A4060',
    letterSpacing: 0.5,
  },

  // ── Pins ──────────────────────────────────────────────────────────
  pin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  pinNum: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: '#fff',
  },

  // ── Legend ────────────────────────────────────────────────────────
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

  note: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    fontStyle: 'italic',
  },
});
