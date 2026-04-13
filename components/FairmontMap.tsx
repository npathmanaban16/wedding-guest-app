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

// Colour palette matching the floor plan's visual language
const HIGHLIGHTED = '#BAD8E8'; // general event/function rooms (floor-plan blue)
const VENUE_BLUE  = '#A8CCE0'; // our wedding venue rooms (slightly richer blue)
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

            {/* ── GRAND HÔTEL (north side of road) ─────────── */}
            <View style={s.bldTitleRow}>
              <Text style={s.bldTitle}>Grand Hôtel · Main Building</Text>
              <View style={s.compass}>
                <Text style={s.compassArrow}>↑</Text>
                <Text style={s.compassN}>N</Text>
              </View>
            </View>

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

              {/* Centre col: 3 rows */}
              <View style={s.hotelCenter}>
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

                {/* Row 2 — Salles des Fêtes ③ (wedding venue) + Salon Bridge */}
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

            {/* ── ROAD ─────────────────────────────────────── */}
            <View style={s.road}>
              <Text style={s.roadLabel}>Av. Claude-Nobs</Text>
              <Text style={s.roadSub}> · tunnel underneath to Le Petit Palais</Text>
            </View>

            {/* ── GROUNDS (south of road, lakeside) ─────────
                Left:   Le Petit Palais building (context)
                Centre: Garden ② (Ceremony)
                Right:  La Coupole + Terrasse du Petit Palais ① (Sangeet)
            ─────────────────────────────────────────────── */}
            <View style={s.grounds}>
              {/* Le Petit Palais building — context only */}
              <View style={[s.room, { backgroundColor: CONTEXT, flex: 1, borderRightWidth: 0.75, borderRightColor: DIVIDER }]}>
                <Text style={s.groundsBldText}>Le Petit{'\n'}Palais</Text>
                <Text style={s.groundsBldSub}>Conference{'\n'}Centre</Text>
              </View>

              {/* Garden — ceremony ② */}
              <View style={[s.room, { backgroundColor: VENUE_GREEN, flex: 1.5, borderRightWidth: 0.75, borderRightColor: DIVIDER, gap: 5 }]}>
                <Pin n={2} color={VENUES[1].color} />
                <Text style={s.gardenText}>Garden</Text>
              </View>

              {/* La Coupole + Terrasse — sangeet ① (stacked) */}
              <View style={s.sangeetCol}>
                <View style={[s.room, { backgroundColor: VENUE_BLUE, flex: 1, borderBottomWidth: 0.75, borderBottomColor: DIVIDER, gap: 3 }]}>
                  <Text style={s.venueText}>La Coupole</Text>
                  <Pin n={1} color={VENUES[0].color} />
                </View>
                <View style={[s.room, { backgroundColor: VENUE_BLUE, flex: 1.3 }]}>
                  <Text style={s.venueText}>Terrasse du{'\n'}Petit Palais</Text>
                </View>
              </View>
            </View>

            {/* ── LAKE GENEVA ───────────────────────────────── */}
            <View style={s.lake}>
              <Text style={s.lakeText}>Lac Léman  ·  Lake Geneva</Text>
            </View>

          </View>

          {/* ── Legend ────────────────────────────────────── */}
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

  bldTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bldTitle: {
    fontSize: 8.5,
    fontFamily: Fonts.sansMedium,
    color: OUTLINE,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },

  compass: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 5,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  compassArrow: { fontSize: 11, color: Colors.textSecondary, lineHeight: 14 },
  compassN: { fontSize: 8, fontFamily: Fonts.sansMedium, color: Colors.textSecondary, lineHeight: 10 },

  // ── Hotel building ────────────────────────────────────────────────
  hotelBld: {
    flexDirection: 'row',
    height: 118,
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
  hotelCenter: {
    flex: 2.5,
    flexDirection: 'column',
  },
  hotelRow: {
    flexDirection: 'row',
  },

  // ── Road ──────────────────────────────────────────────────────────
  road: {
    height: 24,
    backgroundColor: ROAD_COLOR,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  roadLabel: {
    fontSize: 8.5,
    fontFamily: Fonts.sansMedium,
    color: '#4A4540',
    letterSpacing: 0.4,
  },
  roadSub: {
    fontSize: 7,
    fontFamily: Fonts.sans,
    color: '#6A6460',
    fontStyle: 'italic',
  },

  // ── Grounds ───────────────────────────────────────────────────────
  grounds: {
    flexDirection: 'row',
    height: 118,
    borderWidth: 1.5,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  sangeetCol: {
    flex: 1.2,
    flexDirection: 'column',
  },

  // ── Room base style ───────────────────────────────────────────────
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
  // Highlighted event rooms (floor-plan blue tint)
  hlText: {
    fontSize: 7,
    fontFamily: Fonts.sansMedium,
    color: '#1A3A58',
    textAlign: 'center',
    lineHeight: 10,
  },
  // Wedding venue rooms (with pins)
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
    fontSize: 8,
    fontFamily: Fonts.sansMedium,
    color: '#1A3818',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  groundsBldText: {
    fontSize: 8,
    fontFamily: Fonts.sansMedium,
    color: '#4A4540',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    lineHeight: 11,
  },
  groundsBldSub: {
    fontSize: 6.5,
    fontFamily: Fonts.sans,
    color: '#6A6460',
    textAlign: 'center',
    lineHeight: 10,
    marginTop: 2,
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
