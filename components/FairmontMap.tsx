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

// Colours matching the floor plan's visual language
const VENUE_BLUE  = '#C5DFF0';  // indoor wedding venue rooms
const VENUE_GREEN = '#BDD8AE';  // outdoor wedding venue areas
const CONTEXT     = '#EFEBE4';  // non-venue hotel rooms
const DIVIDER     = '#ADA9A4';  // internal room dividers
const OUTLINE     = '#4A4540';  // building outlines

const VENUES = [
  { n: 1, event: 'Sangeet',   room: 'La Coupole & Terrasse du Petit Palais', when: 'Fri 22 May · 6:30 PM', color: '#B81D56' },
  { n: 2, event: 'Ceremony',  room: 'Garden',                                when: 'Sat 23 May · 5:00 PM', color: '#4A7040' },
  { n: 3, event: 'Reception', room: 'Salle des Fêtes',                       when: 'Sat 23 May · 7:30 PM', color: Colors.primary },
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

            {/* ── MAIN BUILDING ─────────────────────────────── */}
            <View style={s.bldTitleRow}>
              <Text style={s.bldTitle}>Main Building</Text>
              {/* North compass */}
              <View style={s.compass}>
                <Text style={s.compassArrow}>↑</Text>
                <Text style={s.compassN}>N</Text>
              </View>
            </View>

            <View style={s.mainBld}>
              {/* Left column: Salles des Congrès / Bars & Dining */}
              <View style={s.mainLeft}>
                <View style={[s.room, { backgroundColor: CONTEXT, flex: 1, borderBottomWidth: 0.75, borderBottomColor: DIVIDER }]}>
                  <Text style={s.roomText}>Salles des{'\n'}Congrès</Text>
                </View>
                <View style={[s.room, { backgroundColor: CONTEXT, flex: 1 }]}>
                  <Text style={s.roomText}>Bars &{'\n'}Dining</Text>
                </View>
              </View>

              {/* Centre column: Salle des Fêtes (③) / Grand Hall */}
              <View style={s.mainMid}>
                <View style={[s.room, { backgroundColor: VENUE_BLUE, flex: 1.5, borderBottomWidth: 0.75, borderBottomColor: DIVIDER, gap: 4 }]}>
                  <Text style={s.venueText}>Salle des{'\n'}Fêtes</Text>
                  <Pin n={3} color={VENUES[2].color} />
                </View>
                <View style={[s.room, { backgroundColor: CONTEXT, flex: 1 }]}>
                  <Text style={s.roomText}>Grand Hall{'\n'}(Lobby)</Text>
                </View>
              </View>

              {/* Right: Garden (②) — full height */}
              <View style={[s.room, { backgroundColor: VENUE_GREEN, flex: 1.5, gap: 5 }]}>
                <Pin n={2} color={VENUES[1].color} />
                <Text style={s.gardenText}>Garden</Text>
              </View>
            </View>

            {/* ── Tunnel connector ──────────────────────────── */}
            {/* Centred under the hotel interior, aligned with Petit Palais */}
            <View style={s.gapRow}>
              <View style={{ flex: 0.40 }} />
              <View style={s.tunnelStrip}>
                <Text style={s.tunnelText}>tunnel</Text>
              </View>
              <View style={{ flex: 0.42 }} />
            </View>

            {/* ── LE PETIT PALAIS ───────────────────────────── */}
            {/* Offset ~22 % from left to sit under the tunnel */}
            <View style={s.petitRowWrap}>
              <View style={{ flex: 0.22 }} />
              <View style={{ flex: 0.55 }}>
                <Text style={s.bldTitle}>Le Petit Palais</Text>
                <View style={s.petitBld}>
                  {/* Left: Parking + Spa */}
                  <View style={[s.room, { backgroundColor: CONTEXT, flex: 1, borderRightWidth: 0.75, borderRightColor: DIVIDER }]}>
                    <Text style={s.roomText}>Parking{'\n'}& Spa</Text>
                  </View>
                  {/* Right column: La Coupole (①) / Terrasse (①) */}
                  <View style={s.petitRight}>
                    <View style={[s.room, { backgroundColor: VENUE_BLUE, flex: 1.3, borderBottomWidth: 0.75, borderBottomColor: DIVIDER, gap: 4 }]}>
                      <Text style={s.venueText}>La Coupole</Text>
                      <Pin n={1} color={VENUES[0].color} />
                    </View>
                    <View style={[s.room, { backgroundColor: VENUE_GREEN, flex: 1 }]}>
                      <Text style={s.venueText}>Terrasse du{'\n'}Petit Palais</Text>
                    </View>
                  </View>
                </View>
              </View>
              <View style={{ flex: 0.23 }} />
            </View>

            {/* Lake Geneva */}
            <View style={s.lake}>
              <Text style={s.lakeText}>Lac Léman  ·  Lake Geneva</Text>
            </View>

          </View>

          {/* ── Legend ─────────────────────────────────────── */}
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

  // Building title row (includes compass on the right for the first building)
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
    letterSpacing: 1.5,
  },

  // Compass
  compass: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.9)',
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

  // ── Main building ─────────────────────────────────────────────────
  mainBld: {
    flexDirection: 'row',
    height: 114,
    borderWidth: 1.5,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  // Left column (Salles des Congrès / Bars & Dining)
  mainLeft: {
    flex: 1.3,
    flexDirection: 'column',
    borderRightWidth: 0.75,
    borderRightColor: DIVIDER,
  },
  // Centre column (Salle des Fêtes / Grand Hall)
  mainMid: {
    flex: 2.5,
    flexDirection: 'column',
    borderRightWidth: 0.75,
    borderRightColor: DIVIDER,
  },

  // ── Gap + tunnel ──────────────────────────────────────────────────
  gapRow: {
    flexDirection: 'row',
    height: 22,
    backgroundColor: '#FAFAF8',
    alignItems: 'stretch',
  },
  tunnelStrip: {
    flex: 0.18,
    backgroundColor: '#D2CEC8',
    borderLeftWidth: 0.75,
    borderRightWidth: 0.75,
    borderColor: DIVIDER,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tunnelText: {
    fontSize: 6.5,
    fontFamily: Fonts.sans,
    color: '#4A4540',
    letterSpacing: 0.3,
  },

  // ── Le Petit Palais ───────────────────────────────────────────────
  petitRowWrap: {
    flexDirection: 'row',
  },
  petitBld: {
    flexDirection: 'row',
    height: 96,
    borderWidth: 1.5,
    borderColor: OUTLINE,
    overflow: 'hidden',
  },
  petitRight: {
    flex: 1.5,
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
  // Venue room labels (blue rooms)
  venueText: {
    fontSize: 7.5,
    fontFamily: Fonts.sansMedium,
    color: '#1A3A58',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    lineHeight: 11,
  },
  // Garden label (green room)
  gardenText: {
    fontSize: 7.5,
    fontFamily: Fonts.sansMedium,
    color: '#1A3818',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ── Lake ──────────────────────────────────────────────────────────
  lake: {
    marginTop: 2,
    height: 36,
    backgroundColor: '#9DC4D8',
    borderWidth: 0.75,
    borderColor: '#6A9AB0',
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
