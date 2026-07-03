import type { Gender } from '@/services/wedding';
import type { GuestGroup } from '@/services/guestGroups';

// ============================================================
// GUEST GROUPS CSV
// ============================================================
// Round-trips the admin guest-groups spreadsheet through a CSV so
// couples can bulk-edit membership in Excel/Sheets and re-upload the
// result. Two directions:
//
//   * Export: attendee list + Wedding Party flag + Gender + one column
//     per user-created group. Yes/blank cells so a spreadsheet editor
//     can eyeball state and rewrite easily.
//   * Import: parse the CSV, match by canonical name (case-insensitive),
//     match user-group columns by name (case-insensitive), compute a
//     per-attendee diff against the current DB state, and surface a
//     preview count before applying. Rows/columns the CSV mentions
//     that aren't in the current wedding are reported as "unknown" and
//     skipped rather than silently creating anything — a new group has
//     to be created from the UI first.
//
// Import is intentionally conservative: only cells that changed are
// written, and only groups that already exist are touched. Cells left
// blank in the CSV are treated as "not in group" (No) — otherwise a
// half-filled CSV would leave stale memberships lingering, which is
// exactly the confusion the import was supposed to fix.

export interface CsvAttendee {
  canonicalName: string;
  isWeddingParty: boolean;
  gender: Gender | null;
}

// ─── CSV building (export) ──────────────────────────────────────────

// RFC 4180-ish: wrap fields containing commas, quotes, or newlines in
// double quotes and double-escape internal quotes. Empty fields stay
// empty (not the string "") since a blank cell is the natural "not
// selected" state for the spreadsheet editor.
function csvEscape(value: string): string {
  if (value == null) return '';
  const needsQuotes = /[",\r\n]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuotes ? `"${escaped}"` : escaped;
}

function boolToCell(value: boolean): string {
  return value ? 'Yes' : '';
}

function genderToCell(g: Gender | null): string {
  if (g === 'female') return 'Female';
  if (g === 'male') return 'Male';
  return '';
}

export function buildGuestGroupsCsv(
  attendees: CsvAttendee[],
  userGroups: GuestGroup[],
): string {
  const headers = ['Name', 'Wedding Party', 'Gender', ...userGroups.map((g) => g.name)];
  const membershipByGroup = new Map<string, Set<string>>();
  for (const g of userGroups) {
    membershipByGroup.set(g.id, new Set(g.members));
  }
  const rows = attendees.map((a) => {
    const cells = [
      csvEscape(a.canonicalName),
      csvEscape(boolToCell(a.isWeddingParty)),
      csvEscape(genderToCell(a.gender)),
      ...userGroups.map((g) =>
        csvEscape(boolToCell(membershipByGroup.get(g.id)?.has(a.canonicalName) ?? false)),
      ),
    ];
    return cells.join(',');
  });
  // Leading BOM so Excel opens UTF-8 cleanly (names with accents etc.).
  // LF line endings (not CRLF) — Numbers.app and Gmail preview both
  // treat CR and LF as separate line breaks, so an RFC 4180 CRLF file
  // renders with a blank row between every entry. Every modern
  // spreadsheet importer handles LF just fine.
  return `﻿${headers.map(csvEscape).join(',')}\n${rows.join('\n')}\n`;
}

// Blank guest-list template for couples doing an initial upload. Two
// example rows demonstrate the format (Name / Wedding Party / Gender
// values); admins replace them with real names. Kept intentionally
// simple — the built-in Wedding Party + Gender columns are the only
// dimensions the initial upload needs to set; custom groups can be
// added via the sheet after the first import.
export function buildGuestListTemplateCsv(): string {
  const headers = ['Name', 'Wedding Party', 'Gender'];
  const exampleRows = [
    ['Ada Lovelace', 'Yes', 'Female'],
    ['Alan Turing', '', 'Male'],
    ['Grace Hopper', '', 'Female'],
  ];
  const body = exampleRows.map((r) => r.map(csvEscape).join(',')).join('\n');
  return `﻿${headers.map(csvEscape).join(',')}\n${body}\n`;
}

// ─── CSV parsing (import) ───────────────────────────────────────────

// Parses a single logical CSV line, handling quoted fields (which may
// contain commas or CRLF). Standard RFC 4180 field state machine.
// Returns [nextIdx, fields]. nextIdx is the character position AFTER
// the line terminator so the caller can resume parsing.
function parseCsvLine(input: string, start: number): [number, string[]] {
  const fields: string[] = [];
  let field = '';
  let i = start;
  let inQuotes = false;
  while (i < input.length) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ',') {
      fields.push(field);
      field = '';
      i++;
      continue;
    }
    if (ch === '\r') {
      // Handle CRLF as one line terminator.
      if (input[i + 1] === '\n') i++;
      i++;
      fields.push(field);
      return [i, fields];
    }
    if (ch === '\n') {
      i++;
      fields.push(field);
      return [i, fields];
    }
    field += ch;
    i++;
  }
  // Ended without a terminator — last field still needs pushing.
  fields.push(field);
  return [i, fields];
}

function parseCsv(input: string): string[][] {
  // Strip the UTF-8 BOM if present so it doesn't end up glued onto the
  // first header cell.
  const stripped = input.charCodeAt(0) === 0xFEFF ? input.slice(1) : input;
  const rows: string[][] = [];
  let i = 0;
  while (i < stripped.length) {
    const [nextIdx, fields] = parseCsvLine(stripped, i);
    // Skip trailing blank lines so a file ending in \r\n\r\n doesn't
    // add a phantom row.
    if (!(fields.length === 1 && fields[0] === '')) {
      rows.push(fields);
    }
    i = nextIdx;
  }
  return rows;
}

// Truthy-cell parser. Accepts a small set of common yes-values from
// human editing; anything else falls to false so a blank cell is
// unambiguously "not in group / not this attribute".
function cellToBool(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized === 'yes' || normalized === 'y' || normalized === 'true' || normalized === '1' || normalized === 'x';
}

function cellToGender(value: string): Gender | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'female' || normalized === 'f') return 'female';
  if (normalized === 'male' || normalized === 'm') return 'male';
  return null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// ─── Per-attendee diff produced by import ─────────────────────────────

export interface AttendeeDiff {
  canonicalName: string;
  // Only present when the value in the CSV differs from the DB. Old →
  // new so the preview can show a human-readable "Wedding Party: Yes →
  // No" line if we ever want to.
  weddingParty?: { from: boolean; to: boolean };
  gender?: { from: Gender | null; to: Gender | null };
  addedTo: { groupId: string; groupName: string }[];
  removedFrom: { groupId: string; groupName: string }[];
}

// A CSV row whose name doesn't match any existing guest — surfaced so
// the admin can either fix a typo (cancel + edit + re-upload) or add
// them all to the guest list from the same import (initial-upload
// flow for a fresh wedding). Carries the parsed cells so the insert
// step can populate is_wedding_party / gender / group memberships in
// one pass.
export interface UnknownAttendeeRow {
  name: string;
  isWeddingParty: boolean;
  gender: Gender | null;
  // Guest group IDs the CSV puts this attendee into. Only groups that
  // already exist in the DB are captured — creating new groups from a
  // template upload is out of scope; add unknown columns via the
  // sheet first if needed.
  groups: { groupId: string; groupName: string }[];
}

export interface ImportDiff {
  attendeeDiffs: AttendeeDiff[];
  // Rows in the CSV whose name doesn't match any current guest. The
  // preview modal offers an "Add these as new attendees" toggle so
  // the same file can seed a fresh wedding's guest list.
  unknownAttendees: UnknownAttendeeRow[];
  // Column headers that aren't one of the reserved names (Name,
  // Wedding Party, Gender) and don't match any current group name.
  unknownColumns: string[];
  // Header errors that make the file unusable (no Name column, etc.).
  errors: string[];
  // Total row count that had a name column filled (used for the
  // "M of N rows matched" line in the preview).
  csvRowCount: number;
}

// Wedding-party column values that appear on the export. Kept as a
// set of case-insensitive matches so importing a hand-edited file with
// "wedding party" or "party" as the header still works.
const HEADER_ALIASES: Record<string, 'name' | 'weddingParty' | 'gender'> = {
  'name': 'name',
  'guest': 'name',
  'attendee': 'name',
  'wedding party': 'weddingParty',
  'weddingparty': 'weddingParty',
  'gender': 'gender',
};

// Computes the diff between a parsed CSV and the current wedding
// state. attendees + userGroups come from WeddingContext; the export
// side builds the CSV from the same data so a round-trip through a
// spreadsheet editor with no edits produces zero attendee diffs and
// no unknown names/columns.
export function computeImportDiff(
  csvText: string,
  attendees: CsvAttendee[],
  userGroups: GuestGroup[],
): ImportDiff {
  const errors: string[] = [];
  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return {
      attendeeDiffs: [],
      unknownAttendees: [],
      unknownColumns: [],
      errors: ['The uploaded file is empty.'],
      csvRowCount: 0,
    };
  }

  const [headerRow, ...dataRows] = rows;

  // Map header index → semantic role. Names not in HEADER_ALIASES and
  // not matching a user group become "unknown" and are ignored.
  const attendeeByName = new Map<string, CsvAttendee>();
  for (const a of attendees) {
    attendeeByName.set(normalizeName(a.canonicalName), a);
  }
  const groupByName = new Map<string, GuestGroup>();
  for (const g of userGroups) {
    groupByName.set(normalizeName(g.name), g);
  }

  interface ColumnBinding {
    kind: 'name' | 'weddingParty' | 'gender' | 'group' | 'unknown';
    group?: GuestGroup;
    headerLabel: string;
  }
  const columns: ColumnBinding[] = headerRow.map((h) => {
    const trimmed = h.trim();
    const key = trimmed.toLowerCase();
    const alias = HEADER_ALIASES[key];
    if (alias) return { kind: alias, headerLabel: trimmed };
    const group = groupByName.get(normalizeName(trimmed));
    if (group) return { kind: 'group', group, headerLabel: trimmed };
    return { kind: 'unknown', headerLabel: trimmed };
  });

  const nameColumnIdx = columns.findIndex((c) => c.kind === 'name');
  if (nameColumnIdx === -1) {
    errors.push('The CSV is missing a "Name" column.');
    return {
      attendeeDiffs: [],
      unknownAttendees: [],
      unknownColumns: columns.filter((c) => c.kind === 'unknown').map((c) => c.headerLabel),
      errors,
      csvRowCount: 0,
    };
  }

  const unknownColumns = columns
    .filter((c) => c.kind === 'unknown')
    .map((c) => c.headerLabel)
    .filter((label, i, arr) => arr.indexOf(label) === i);

  const attendeeDiffs: AttendeeDiff[] = [];
  const unknownAttendees: UnknownAttendeeRow[] = [];
  // Dedup unknown names as we go — a spreadsheet with a duplicate name
  // shouldn't create the same attendee twice on apply.
  const seenUnknown = new Set<string>();
  let csvRowCount = 0;

  for (const row of dataRows) {
    const rawName = (row[nameColumnIdx] ?? '').trim();
    if (!rawName) continue;
    csvRowCount++;
    const attendee = attendeeByName.get(normalizeName(rawName));
    if (!attendee) {
      const key = normalizeName(rawName);
      if (seenUnknown.has(key)) continue;
      seenUnknown.add(key);
      // Capture what the CSV wants for this new attendee so the
      // insert step can seed is_wedding_party / gender + memberships
      // in one pass.
      let isWeddingParty = false;
      let gender: Gender | null = null;
      const groups: UnknownAttendeeRow['groups'] = [];
      for (let colIdx = 0; colIdx < columns.length; colIdx++) {
        const col = columns[colIdx];
        const raw = row[colIdx] ?? '';
        if (col.kind === 'weddingParty') {
          isWeddingParty = cellToBool(raw);
        } else if (col.kind === 'gender') {
          gender = cellToGender(raw);
        } else if (col.kind === 'group' && col.group && cellToBool(raw)) {
          groups.push({ groupId: col.group.id, groupName: col.group.name });
        }
      }
      unknownAttendees.push({ name: rawName, isWeddingParty, gender, groups });
      continue;
    }

    let weddingPartyDiff: AttendeeDiff['weddingParty'];
    let genderDiff: AttendeeDiff['gender'];
    const addedTo: AttendeeDiff['addedTo'] = [];
    const removedFrom: AttendeeDiff['removedFrom'] = [];

    for (let colIdx = 0; colIdx < columns.length; colIdx++) {
      const col = columns[colIdx];
      const raw = row[colIdx] ?? '';
      if (col.kind === 'weddingParty') {
        const to = cellToBool(raw);
        if (to !== attendee.isWeddingParty) {
          weddingPartyDiff = { from: attendee.isWeddingParty, to };
        }
      } else if (col.kind === 'gender') {
        const to = cellToGender(raw);
        if (to !== attendee.gender) {
          genderDiff = { from: attendee.gender, to };
        }
      } else if (col.kind === 'group' && col.group) {
        const shouldBeIn = cellToBool(raw);
        const currentlyIn = col.group.members.includes(attendee.canonicalName);
        if (shouldBeIn && !currentlyIn) {
          addedTo.push({ groupId: col.group.id, groupName: col.group.name });
        } else if (!shouldBeIn && currentlyIn) {
          removedFrom.push({ groupId: col.group.id, groupName: col.group.name });
        }
      }
    }

    if (weddingPartyDiff || genderDiff || addedTo.length > 0 || removedFrom.length > 0) {
      attendeeDiffs.push({
        canonicalName: attendee.canonicalName,
        weddingParty: weddingPartyDiff,
        gender: genderDiff,
        addedTo,
        removedFrom,
      });
    }
  }

  return {
    attendeeDiffs,
    unknownAttendees,
    unknownColumns,
    errors,
    csvRowCount,
  };
}
