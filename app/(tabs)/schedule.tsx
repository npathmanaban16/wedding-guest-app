import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
  Image,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Calendar from 'expo-calendar';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { EVENTS_NN, EVENTS_DEMO, NN_WEDDING_IDS, WeddingEvent } from '@/constants/weddingData';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { FairmontMap } from '@/components/FairmontMap';
import { haptic } from '@/utils/haptics';
import { getEventTimeOverrides } from '@/services/storage';

// Pass `name` when a human-readable landmark / venue exists so the maps
// app resolves to the actual destination rather than geocoding just the
// street address — especially helpful for venues like "Fairmont Le
// Montreux Palace" that sit on long shared blocks.
function openMaps(address: string, name?: string) {
  const query = name ? `${name}, ${address}` : address;
  const encoded = encodeURIComponent(query);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
    default: `https://maps.google.com/maps?q=${encoded}`,
  });
  Linking.openURL(url);
}

async function addToCalendar(event: WeddingEvent, coupleNames: string) {
  if (Platform.OS === 'web') {
    Alert.alert('Not available', 'Add to Calendar is only available on the mobile app.');
    return;
  }

  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Please allow calendar access to add this event.');
    return;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const defaultCalendar =
    Platform.OS === 'ios'
      ? calendars.find((c) => c.source?.name === 'iCloud') ?? calendars.find((c) => c.allowsModifications)
      : calendars.find((c) => c.isPrimary) ?? calendars.find((c) => c.allowsModifications);

  if (!defaultCalendar) {
    Alert.alert('No calendar found', 'Could not find a writable calendar on this device.');
    return;
  }

  try {
    await Calendar.createEventAsync(defaultCalendar.id, {
      title: `${event.title} — ${coupleNames}'s Wedding`,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      location: `${event.venue}\n${event.address}`,
      notes: [event.description, event.dressCode ? `Dress code: ${event.dressCode}` : null, event.notes].filter(Boolean).join('\n\n'),
      timeZone: 'Europe/Zurich',
      alarms: [{ relativeOffset: -60 }],
    });
    Alert.alert('Added', `"${event.title}" has been added to your calendar.`);
  } catch {
    Alert.alert('Error', 'Could not add the event to your calendar.');
  }
}

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

function BulletRow({ text }: { text: string }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bulletDot}>•</Text>
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

interface EventCardProps {
  event: WeddingEvent;
  coupleNames: string;
  expanded: boolean;
  onToggle: () => void;
}

function EventCard({ event, coupleNames, expanded, onToggle }: EventCardProps) {
  const [dressExpanded, setDressExpanded] = useState(false);

  // When the parent collapses this card (because another event was opened),
  // fold the dress-code subsection back up so the next open starts clean.
  useEffect(() => {
    if (!expanded) setDressExpanded(false);
  }, [expanded]);

  const toggle = () => {
    haptic.selection();
    onToggle();
  };

  const toggleDress = () => {
    haptic.selection();
    animateLayout();
    setDressExpanded((v) => !v);
  };

  const swatchsPerRow = event.colorPalette && event.colorPalette.length <= 8 ? 4 : 5;
  const swatchWidth = `${100 / swatchsPerRow}%` as const;

  return (
    <View style={styles.card}>
      {/* Header — tapping here (title/date/time row) toggles the card */}
      <TouchableOpacity onPress={toggle} activeOpacity={0.9}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventDateTime}>{event.date}</Text>
            <Text style={styles.eventTime}>{event.time}</Text>
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={Colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          <View style={styles.divider} />

          <InfoRow icon="location-outline" label="Venue" value={event.venue} />
          <InfoRow icon="navigate-outline" label="Address" value={event.address} />

          {/* Action buttons */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => {
                haptic.medium();
                // Venues are sometimes "Main Property | Specific Room"; the
                // part before the pipe is what maps need for place lookup.
                const venueName = event.venue.split('|')[0].trim();
                openMaps(event.address, venueName);
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="map-outline" size={14} color={Colors.gold} />
              <Text style={styles.actionBtnText}>Get Directions</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => { haptic.medium(); addToCalendar(event, coupleNames); }}
              activeOpacity={0.7}
            >
              <Ionicons name="calendar-outline" size={14} color={Colors.gold} />
              <Text style={styles.actionBtnText}>Add to Calendar</Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={styles.description}>{event.description}</Text>

          {/* Outdoor note */}
          {event.outdoorNote && (
            <View style={[styles.notesCard, { borderLeftColor: '#D4920A' }]}>
              <Ionicons
                name="sunny-outline"
                size={16}
                color={Colors.gold}
                style={{ marginRight: Spacing.xs, marginTop: 1 }}
              />
              <Text style={styles.notesText}>{event.outdoorNote}</Text>
            </View>
          )}

          {/* Dress Code — collapsible */}
          <TouchableOpacity
            style={styles.dressCodeCard}
            onPress={toggleDress}
            activeOpacity={0.85}
          >
            <View style={styles.dressCodeHeader}>
              <View>
                <Text style={styles.dressCodeLabel}>Dress Code</Text>
                {!dressExpanded && (
                  <Text style={styles.dressCodeHint}>Tap to expand</Text>
                )}
              </View>
              <Ionicons
                name={dressExpanded ? 'chevron-up' : 'chevron-down'}
                size={14}
                color={Colors.textMuted}
              />
            </View>

            {dressExpanded && (
              <>
                <Text style={styles.dressCodeText}>{event.dressCode}</Text>

                {/* Black-tie breakdown */}
                {event.blackTieGuide && (
                  <View style={styles.dressGuide}>
                    <View style={styles.dressGuideRow}>
                      <Text style={styles.dressGuideKey}>Men</Text>
                      <Text style={styles.dressGuideVal}>{event.blackTieGuide.men}</Text>
                    </View>
                    <View style={styles.dressGuideRow}>
                      <Text style={styles.dressGuideKey}>Women</Text>
                      <Text style={styles.dressGuideVal}>{event.blackTieGuide.women}</Text>
                    </View>
                  </View>
                )}

                {/* Color palette */}
                {event.colorPalette && (
                  <View style={styles.palette}>
                    <Text style={styles.paletteHeading}>Suggested Color Palette</Text>
                    <View style={styles.paletteGrid}>
                      {event.colorPalette.map((c) => (
                        <View key={c.name} style={[styles.swatchItem, { width: swatchWidth }]}>
                          <View style={[styles.swatch, { backgroundColor: c.hex }]} />
                          <Text style={styles.swatchLabel}>{c.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Outfit inspiration link */}
                {event.outfitInspirationUrl && (
                  <View style={styles.outfitLinkWrapper}>
                    <Text style={styles.outfitLinkLabel}>Need outfit ideas?</Text>
                    <TouchableOpacity
                      style={styles.outfitLink}
                      onPress={() => Linking.openURL(event.outfitInspirationUrl!)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="sparkles-outline" size={14} color={Colors.white} />
                      <Text style={styles.outfitLinkText}>Outfit Inspiration Generator</Text>
                      <Ionicons name="arrow-forward" size={14} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                )}

                {/* Indian attire guide (Sangeet) */}
                {event.indianAttire && (
                  <View style={styles.indianAttireCard}>
                    <Text style={styles.indianAttireTitle}>Indian Attire Guide</Text>
                    <Text style={styles.indianAttireIntro}>
                      Indian outfits are not required — wear whatever makes you feel festive and fabulous!
                    </Text>
                    <Text style={styles.indianAttireGender}>For Women</Text>
                    {event.indianAttire.forWomen.map((item, i) => (
                      <BulletRow key={i} text={item} />
                    ))}
                    <Text style={[styles.indianAttireGender, { marginTop: Spacing.sm }]}>For Men</Text>
                    {event.indianAttire.forMen.map((item, i) => (
                      <BulletRow key={i} text={item} />
                    ))}
                  </View>
                )}

                {/* Tuxedo rental note */}
                {event.tuxedoNote && (
                  <View style={styles.infoBox}>
                    <View style={styles.infoBoxHeader}>
                      <Ionicons name="shirt-outline" size={14} color={Colors.primary} style={{ marginRight: Spacing.xs }} />
                      <Text style={styles.infoBoxTitle}>Tuxedo Rentals</Text>
                    </View>
                    <Text style={styles.infoBoxText}>{event.tuxedoNote}</Text>
                  </View>
                )}

                {/* Hair & makeup booking */}
                {event.hairMakeupLinks && event.hairMakeupLinks.length > 0 && (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoBoxTitle}>Book Hair & Makeup <Text style={styles.optionalTag}>(optional)</Text></Text>
                    <Text style={styles.infoBoxSubtitle}>For those who want to book professional hair and makeup services</Text>
                    {event.hairMakeupLinks.map((link) => (
                      <TouchableOpacity
                        key={link.url}
                        style={styles.linkButton}
                        onPress={() => Linking.openURL(link.url)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.linkText}>{link.label}</Text>
                        <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </TouchableOpacity>

          {/* General notes */}
          {event.notes && (
            <View style={styles.notesCard}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={Colors.gold}
                style={{ marginRight: Spacing.xs, marginTop: 1 }}
              />
              <Text style={styles.notesText}>{event.notes}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

interface InfoRowProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
}

function InfoRow({ icon, label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={15} color={Colors.primary} style={styles.infoIcon} />
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();
  const { weddingId, isWeddingParty, wedding } = useWedding();
  const inWeddingParty = isWeddingParty(guestName ?? '');
  const events = NN_WEDDING_IDS.has(wedding.id) ? EVENTS_NN : EVENTS_DEMO;

  // Admins can override event.time without a code deploy. Fetched once on
  // mount; if an admin edits while a guest is viewing, the guest will see
  // the update on next foreground / re-mount.
  const [timeOverrides, setTimeOverrides] = useState<Record<string, string>>({});
  useEffect(() => {
    getEventTimeOverrides(weddingId).then(setTimeOverrides).catch(() => {});
  }, [weddingId]);

  const visibleEvents = events
    .map((e) => (timeOverrides[e.id] ? { ...e, time: timeOverrides[e.id] } : e))
    .filter((e) => !e.weddingPartyOnly || inWeddingParty);

  // Accordion: at most one event expanded at a time. Tapping another event
  // collapses the current one; tapping the open event again collapses it.
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const handleToggle = (id: string) => {
    animateLayout();
    setExpandedEventId((cur) => (cur === id ? null : id));
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Wedding Schedule</Text>
        <Text style={styles.pageSubtitleTag}>Program</Text>
        <Text style={styles.pageSubtitle}>
          Tap each event for full details, including venue, dress code, and color palette.
        </Text>
      </View>

      {/* Timeline */}
      <View style={styles.timeline}>
        {visibleEvents.map((event, index) => (
          <View key={event.id} style={styles.timelineItem}>
            {index < visibleEvents.length - 1 && <View style={styles.connector} />}
            <View style={styles.dot} />
            <View style={styles.timelineContent}>
              <EventCard
                event={event}
                coupleNames={wedding.couple_names}
                expanded={expandedEventId === event.id}
                onToggle={() => handleToggle(event.id)}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Venue map */}
      <View style={styles.mapSection}>
        <FairmontMap />
        <Image
          source={require('@/assets/images/fairmont.png')}
          style={styles.fairmontPhoto}
          resizeMode="cover"
        />
      </View>

      {/* Footer note */}
      <View style={styles.footerNote}>
        <Ionicons name="time-outline" size={14} color={Colors.textMuted} style={{ marginRight: Spacing.xs }} />
        <Text style={styles.footerText}>
          All times are Central European Summer Time (CEST / UTC+2)
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },

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

  mapSection: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  fairmontPhoto: {
    width: '100%',
    height: 200,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  timeline: { paddingLeft: Spacing.xl, paddingRight: Spacing.lg },
  timelineItem: { flexDirection: 'row', marginBottom: Spacing.md, position: 'relative' },
  connector: {
    position: 'absolute',
    left: -16,
    top: 24,
    bottom: -Spacing.md,
    width: 1,
    backgroundColor: Colors.border,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    position: 'absolute',
    left: -21,
    top: 19,
    borderWidth: 2,
    borderColor: Colors.background,
  },
  timelineContent: { flex: 1 },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  cardHeaderText: { flex: 1 },
  eventTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  eventDateTime: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginBottom: 2,
  },
  eventTime: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },

  cardBody: { marginTop: Spacing.sm },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 9,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceWarm,
  },
  actionBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  infoIcon: { marginRight: Spacing.sm, marginTop: 2 },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },

  // Dress code block
  dressCodeCard: {
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  dressCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dressCodeLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.gold,
  },
  dressCodeHint: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginTop: 2,
  },
  optionalTag: {
    fontSize: 9,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textTransform: 'none',
    letterSpacing: 0,
  },
  dressCodeText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm,
  },

  // Men / Women breakdown
  dressGuide: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
    marginBottom: Spacing.sm,
    gap: 5,
  },
  dressGuideRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  dressGuideKey: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    minWidth: 54,
  },
  dressGuideVal: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
  },

  // Color palette
  palette: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  paletteHeading: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: Spacing.sm,
  },
  paletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  swatchItem: {
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 6,
    marginBottom: 4,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  swatchLabel: {
    fontSize: 8,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 11,
  },

  // Outfit inspiration link
  outfitLinkWrapper: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    marginBottom: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
  },
  outfitLinkLabel: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  outfitLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 10,
    paddingHorizontal: Spacing.md,
  },
  outfitLinkText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
  },

  // Indian attire guide
  indianAttireCard: {
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  indianAttireTitle: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: Colors.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  indianAttireIntro: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginBottom: Spacing.sm,
    fontStyle: 'italic',
  },
  indianAttireGender: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3,
  },
  bulletDot: {
    fontSize: 12,
    color: Colors.gold,
    marginRight: 6,
    lineHeight: 20,
  },
  bulletText: {
    flex: 1,
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  description: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },

  notesCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    borderLeftWidth: 2,
    borderLeftColor: Colors.gold,
    marginBottom: Spacing.sm,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  // Generic info box (tuxedo, hair/makeup)
  infoBox: {
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  infoBoxHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  infoBoxTitle: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  infoBoxSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginBottom: Spacing.sm,
  },
  infoBoxText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  linkText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  footerText: {
    flex: 1,
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 18,
  },
});
