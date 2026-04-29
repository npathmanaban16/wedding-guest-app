import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as MailComposer from 'expo-mail-composer';
import * as FileSystem from 'expo-file-system/legacy';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import {
  getAllGuestAccommodations,
  GuestAccommodation,
} from '@/services/storage';
import { DateField } from '@/components/DateField';

const ALL_HOTELS = '__all__';

const CSV_COLUMNS: Array<{ header: string; pick: (r: GuestAccommodation) => string }> = [
  { header: 'Household', pick: (r) => (r.householdId == null ? '' : String(r.householdId)) },
  { header: 'Guest', pick: (r) => r.guestName },
  { header: 'Submitted?', pick: (r) => (r.submitted ? 'Yes' : 'No') },
  { header: 'Hotel', pick: (r) => r.hotel },
  { header: 'Check-in', pick: (r) => r.checkIn },
  { header: 'Check-out', pick: (r) => r.checkOut },
  { header: 'Arrival time', pick: (r) => r.arrivalTime },
  { header: 'Flight', pick: (r) => r.flightNumber },
  { header: 'Phone', pick: (r) => r.phone },
  { header: 'Email', pick: (r) => r.email },
  { header: 'Notes', pick: (r) => r.extraNotes },
];

interface HouseholdGroup {
  // Stable display key. Solo guests (household_id null) get `solo:<guestName>`
  // so they each render as their own card without colliding.
  key: string;
  // Display label shown in the card header. e.g. "Household 5" for grouped
  // guests, undefined for solo guests where the guest name suffices.
  label: string | null;
  members: GuestAccommodation[];
  // Earliest non-empty check-in across all members; '' if none submitted yet.
  earliestCheckIn: string;
  // True when *every* member is still missing travel info. This is the
  // "needs full outreach" set — used by the missing-info filter and the
  // household-level follow-up badge. A mixed household (some submitted,
  // some not) doesn't qualify, since the couple already has a starting
  // point from whoever did fill it out.
  allMissing: boolean;
}

function groupByHousehold(rows: GuestAccommodation[]): HouseholdGroup[] {
  const grouped = new Map<string, GuestAccommodation[]>();
  for (const r of rows) {
    const key = r.householdId == null ? `solo:${r.guestName}` : `hh:${r.householdId}`;
    const list = grouped.get(key);
    if (list) list.push(r);
    else grouped.set(key, [r]);
  }
  const groups: HouseholdGroup[] = [];
  for (const [key, members] of grouped) {
    members.sort((a, b) => a.guestName.localeCompare(b.guestName));
    const checkIns = members.map((m) => m.checkIn).filter(Boolean).sort();
    const earliestCheckIn = checkIns[0] ?? '';
    const allMissing = members.every((m) => !m.submitted);
    const label = key.startsWith('hh:')
      ? `Household ${key.slice(3)}`
      : null;
    groups.push({ key, label, members, earliestCheckIn, allMissing });
  }
  // Earliest check-in ascending, then households-with-anything-known before
  // those with no submissions, then alphabetical by first member as tiebreak.
  groups.sort((a, b) => {
    if (a.earliestCheckIn && !b.earliestCheckIn) return -1;
    if (!a.earliestCheckIn && b.earliestCheckIn) return 1;
    if (a.earliestCheckIn !== b.earliestCheckIn) return a.earliestCheckIn.localeCompare(b.earliestCheckIn);
    const an = a.members[0]?.guestName ?? '';
    const bn = b.members[0]?.guestName ?? '';
    return an.localeCompare(bn);
  });
  return groups;
}

// RFC 4180-ish escaping: wrap any field containing a comma, quote, or
// newline in double quotes and double-escape internal quotes.
function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function buildCsv(rows: GuestAccommodation[]): string {
  const header = CSV_COLUMNS.map((c) => csvEscape(c.header)).join(',');
  const body = rows
    .map((r) => CSV_COLUMNS.map((c) => csvEscape(c.pick(r))).join(','))
    .join('\r\n');
  // Leading BOM so Excel opens UTF-8 cleanly (names with accents etc.).
  return `﻿${header}\r\n${body}\r\n`;
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Format a YYYY-MM-DD value into "Sat, 14 Jun 2025" for display. Returns the
// raw string if it isn't ISO-shaped (e.g. legacy free-text values).
function formatDateDisplay(value: string): string {
  if (!value) return '';
  const parts = value.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return value;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function AdminAccommodationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, isAdmin } = useWedding();

  const [rows, setRows] = useState<GuestAccommodation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  const [hotelFilter, setHotelFilter] = useState<string>(ALL_HOTELS);
  const [arrivalDate, setArrivalDate] = useState<string>('');
  const [missingOnly, setMissingOnly] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErrored(false);
    getAllGuestAccommodations(weddingId)
      .then((data) => { if (!cancelled) setRows(data); })
      .catch(() => { if (!cancelled) setErrored(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [weddingId]);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  // Distinct hotels (case-insensitive, preserving the first-seen casing) so
  // the filter chip row reflects exactly what guests have entered, including
  // free-text "Other" hotels.
  const hotelOptions = useMemo(() => {
    const seen = new Map<string, string>();
    for (const r of rows) {
      const key = r.hotel.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, r.hotel.trim());
    }
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  // Filter at the household level: a hotel match on one member keeps the
  // whole household visible (so couples don't get split across cards), and
  // the "missing info only" filter narrows to households with at least one
  // unsubmitted member — exactly the follow-up list.
  const groups = useMemo(() => {
    const all = groupByHousehold(rows);
    return all.filter((g) => {
      if (missingOnly && !g.allMissing) return false;
      if (hotelFilter !== ALL_HOTELS) {
        const matches = g.members.some(
          (m) => m.hotel.trim().toLowerCase() === hotelFilter.toLowerCase(),
        );
        if (!matches) return false;
      }
      if (arrivalDate) {
        const matches = g.members.some((m) => m.checkIn === arrivalDate);
        if (!matches) return false;
      }
      return true;
    });
  }, [rows, hotelFilter, arrivalDate, missingOnly]);

  const filteredGuests = useMemo(
    () => groups.flatMap((g) => g.members),
    [groups],
  );

  const totalGuests = rows.length;
  // Households where *no one* has submitted travel info — the actual size of
  // the missing-info filter. Computed off the unfiltered grouping so the
  // count stays stable as the user toggles other filters on/off.
  const allMissingHouseholdCount = useMemo(
    () => groupByHousehold(rows).filter((g) => g.allMissing).length,
    [rows],
  );
  const showingCount = filteredGuests.length;

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (filteredGuests.length === 0) {
      Alert.alert('Nothing to export', 'There are no guests matching the current filters.');
      return;
    }
    setExporting(true);
    try {
      const csv = buildCsv(filteredGuests);
      const filterParts: string[] = [];
      if (hotelFilter !== ALL_HOTELS) filterParts.push(`hotel=${hotelFilter}`);
      if (arrivalDate) filterParts.push(`check-in=${arrivalDate}`);
      if (missingOnly) filterParts.push('missing-info-only');
      const filterSuffix = filterParts.length ? ` (${filterParts.join(', ')})` : '';
      const subject = `Guest accommodations — ${todayIso()}${filterSuffix}`;
      const body =
        `${filteredGuests.length} guest${filteredGuests.length === 1 ? '' : 's'} attached as CSV` +
        `${filterSuffix ? `\nFilters: ${filterParts.join(', ')}` : ''}\n`;

      // Native mail composer path — opens the OS compose sheet with the CSV
      // attached and the recipients field empty so the admin can type in
      // whichever address they want to send it to.
      const canMail = await MailComposer.isAvailableAsync().catch(() => false);
      if (canMail) {
        const fileUri = `${FileSystem.cacheDirectory ?? ''}guest-accommodations-${todayIso()}.csv`;
        await FileSystem.writeAsStringAsync(fileUri, csv, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        const result = await MailComposer.composeAsync({
          subject,
          body,
          attachments: [fileUri],
        });
        if (result.status === MailComposer.MailComposerStatus.SENT) {
          Alert.alert('Sent', 'Email with CSV sent.');
        }
        return;
      }

      // Fallback: device has no configured mail app (common on simulators
      // and web). Open a mailto: link with the CSV inlined into the body
      // so the admin can still paste it somewhere — they fill in the
      // recipient in their mail client.
      const inlineLimit = 1800;
      const inlineCsv = csv.length > inlineLimit
        ? `${csv.slice(0, inlineLimit)}\n…(truncated — ${filteredGuests.length} rows total)`
        : csv;
      const url =
        `mailto:?subject=${encodeURIComponent(subject)}` +
        `&body=${encodeURIComponent(`${body}\n${inlineCsv}`)}`;
      const supported = await Linking.canOpenURL(url).catch(() => false);
      if (!supported) {
        Alert.alert(
          'Email not available',
          'No email app is configured on this device. Try on a real device with the Mail app set up.',
        );
        return;
      }
      await Linking.openURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error';
      Alert.alert('Export failed', msg);
    } finally {
      setExporting(false);
    }
  };

  const callPhone = (raw: string) => {
    const tel = raw.replace(/[^+\d]/g, '');
    if (tel) Linking.openURL(`tel:${tel}`).catch(() => {});
  };
  const emailGuest = (addr: string) => {
    if (addr) Linking.openURL(`mailto:${addr}`).catch(() => {});
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Guest Accommodations</Text>
        <Text style={styles.pageSubtitle}>
          Hotel and arrival info for every guest. Filter by hotel or arrival date.
        </Text>
        <TouchableOpacity
          style={[
            styles.exportButton,
            (exporting || filteredGuests.length === 0) && styles.exportButtonDisabled,
          ]}
          onPress={handleExport}
          disabled={exporting || filteredGuests.length === 0}
          activeOpacity={0.85}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="mail-outline" size={15} color={Colors.white} />
              <Text style={styles.exportButtonText}>
                Email CSV{filteredGuests.length !== rows.length ? ` (${filteredGuests.length} filtered)` : ''}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Hotel filter */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Filter by hotel</Text>
        <View style={styles.chipRow}>
          <Chip
            label={`All hotels${totalGuests ? ` (${totalGuests})` : ''}`}
            active={hotelFilter === ALL_HOTELS}
            onPress={() => setHotelFilter(ALL_HOTELS)}
          />
          {hotelOptions.map((h) => {
            const count = rows.filter(
              (r) => r.hotel.trim().toLowerCase() === h.toLowerCase(),
            ).length;
            return (
              <Chip
                key={h}
                label={`${h} (${count})`}
                active={hotelFilter.toLowerCase() === h.toLowerCase()}
                onPress={() => setHotelFilter(h)}
              />
            );
          })}
        </View>
      </View>

      {/* Arrival date filter */}
      <View style={styles.card}>
        <View style={styles.dateHeaderRow}>
          <Text style={styles.cardLabel}>Filter by arrival date</Text>
          {arrivalDate ? (
            <TouchableOpacity onPress={() => setArrivalDate('')}>
              <Text style={styles.clearLink}>Clear</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <DateField
          label="Check-in date"
          value={arrivalDate}
          onChange={setArrivalDate}
          placeholder="Any arrival date"
        />
      </View>

      {/* Missing-info filter — the primary follow-up lens */}
      <TouchableOpacity
        style={styles.card}
        onPress={() => setMissingOnly((v) => !v)}
        activeOpacity={0.85}
      >
        <View style={styles.dateHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardLabel}>Follow-up</Text>
            <Text style={styles.toggleTitle}>
              {missingOnly
                ? 'Showing households with no info from anyone'
                : 'Show only households with no info from anyone'}
            </Text>
            <Text style={styles.toggleHint}>
              {allMissingHouseholdCount} household{allMissingHouseholdCount === 1 ? '' : 's'} haven't had a single member submit travel details yet.
            </Text>
          </View>
          <View style={[styles.toggleTrack, missingOnly && styles.toggleTrackActive]}>
            <View style={[styles.toggleThumb, missingOnly && styles.toggleThumbActive]} />
          </View>
        </View>
      </TouchableOpacity>

      {/* Result count */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>
          {loading
            ? 'Loading…'
            : errored
              ? 'Could not load guest info.'
              : `Showing ${groups.length} household${groups.length === 1 ? '' : 's'} · ${showingCount} of ${totalGuests} ${totalGuests === 1 ? 'guest' : 'guests'}`}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.primary} style={styles.loader} />
      ) : groups.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="bed-outline" size={28} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No matching households</Text>
          <Text style={styles.emptyBody}>
            {totalGuests === 0
              ? 'No guests in this wedding yet.'
              : 'Try a different hotel, clear the date filter, or turn off the missing-info toggle.'}
          </Text>
        </View>
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.householdCard}>
            <View style={styles.householdHeader}>
              <View style={{ flex: 1 }}>
                {group.label ? (
                  <Text style={styles.householdLabel}>{group.label}</Text>
                ) : null}
                <Text style={styles.householdNames}>
                  {group.members.map((m) => m.guestName).join(' · ')}
                </Text>
              </View>
              {group.allMissing ? (
                <View style={styles.followUpBadge}>
                  <Ionicons name="alert-circle" size={11} color={Colors.error} />
                  <Text style={styles.followUpText}>Needs follow-up</Text>
                </View>
              ) : null}
            </View>

            {group.members.map((r, idx) => (
              <View
                key={r.guestName}
                style={[
                  styles.memberBlock,
                  idx > 0 && styles.memberBlockDivider,
                ]}
              >
                <View style={styles.memberHeader}>
                  <Text style={styles.memberName}>{r.guestName}</Text>
                  {!r.submitted ? (
                    <View style={styles.awaitingPill}>
                      <Text style={styles.awaitingText}>Awaiting info</Text>
                    </View>
                  ) : null}
                </View>

                {r.submitted ? (
                  <>
                    <Text style={styles.memberHotel}>
                      {r.hotel || <Text style={styles.muted}>Hotel not set</Text>}
                    </Text>
                    <View style={styles.fieldGrid}>
                      <DetailField label="Check-in" value={formatDateDisplay(r.checkIn)} />
                      <DetailField label="Check-out" value={formatDateDisplay(r.checkOut)} />
                      <DetailField label="Arrival time" value={r.arrivalTime} />
                      <DetailField label="Flight" value={r.flightNumber} />
                    </View>
                  </>
                ) : (
                  <Text style={styles.awaitingBody}>
                    No travel details submitted yet.
                  </Text>
                )}

                {(r.phone || r.email) && (
                  <View style={styles.contactRow}>
                    {r.phone ? (
                      <TouchableOpacity
                        style={styles.contactPill}
                        onPress={() => callPhone(r.phone)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="call-outline" size={13} color={Colors.primary} />
                        <Text style={styles.contactPillText}>{r.phone}</Text>
                      </TouchableOpacity>
                    ) : null}
                    {r.email ? (
                      <TouchableOpacity
                        style={styles.contactPill}
                        onPress={() => emailGuest(r.email)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="mail-outline" size={13} color={Colors.primary} />
                        <Text style={styles.contactPillText}>{r.email}</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}

                {r.extraNotes ? (
                  <View style={styles.notesBlock}>
                    <Text style={styles.notesLabel}>Notes</Text>
                    <Text style={styles.notesBody}>{r.extraNotes}</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))
      )}

      <View style={{ height: insets.bottom + Spacing.xxl }} />
    </ScrollView>
  );
}

interface ChipProps { label: string; active: boolean; onPress: () => void }
function Chip({ label, active, onPress }: ChipProps) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

interface DetailFieldProps { label: string; value: string }
function DetailField({ label, value }: DetailFieldProps) {
  return (
    <View style={styles.detailField}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[styles.detailValue, !value && styles.muted]}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },

  guard: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  guardText: { fontFamily: Fonts.sans, color: Colors.textMuted },

  header: { marginBottom: Spacing.xl },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  backText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textMuted,
    marginLeft: 2,
  },
  pageTitle: {
    fontSize: 30,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 19,
    marginBottom: Spacing.md,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.full,
    minHeight: 36,
  },
  exportButtonDisabled: { opacity: 0.45 },
  exportButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.2,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  cardLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  dateHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  clearLink: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textSecondary,
    letterSpacing: 0.2,
  },
  chipTextActive: {
    color: Colors.white,
  },

  summaryRow: {
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  summaryText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
  },

  loader: { marginTop: Spacing.xl },

  emptyCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    borderWidth: 0.5,
    borderColor: Colors.border,
    alignItems: 'center',
    ...Shadow.small,
  },
  emptyTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 19,
  },

  householdCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  householdHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  householdLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  householdNames: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 0.1,
    lineHeight: 22,
  },
  followUpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    backgroundColor: '#FBE9E7',
    marginLeft: Spacing.sm,
  },
  followUpText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    color: Colors.error,
    letterSpacing: 0.4,
  },

  memberBlock: {
    paddingTop: Spacing.sm,
  },
  memberBlockDivider: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  memberName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textPrimary,
    letterSpacing: 0.1,
  },
  memberHotel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.primary,
    marginBottom: Spacing.sm,
  },
  awaitingPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: '#FFF4E0',
    borderWidth: 1,
    borderColor: '#E8C36A',
  },
  awaitingText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    color: '#8A5A0B',
    letterSpacing: 0.3,
  },
  awaitingBody: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    fontStyle: 'italic',
    color: Colors.textMuted,
    marginTop: 2,
  },

  toggleTitle: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  toggleHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
  },
  toggleTrack: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.border,
    padding: 3,
    justifyContent: 'center',
    marginLeft: Spacing.md,
  },
  toggleTrackActive: { backgroundColor: Colors.primary },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.white,
  },
  toggleThumbActive: { transform: [{ translateX: 18 }] },

  fieldGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: Spacing.sm,
  },
  detailField: {
    width: '50%',
    paddingRight: Spacing.sm,
  },
  detailLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  detailValue: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  muted: {
    color: Colors.textMuted,
    fontStyle: Platform.OS === 'ios' ? 'italic' : 'normal',
  },

  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  contactPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  contactPillText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.primary,
  },

  notesBlock: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.divider,
  },
  notesLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  notesBody: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
});
