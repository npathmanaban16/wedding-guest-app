/**
 * AI Assistant service — calls the supabase `ai-assistant` edge function and
 * persists the Q&A history in `public.ai_questions`.
 *
 * The wedding context (events, dress codes, packing list, destination guide)
 * lives in app constants rather than the DB, so the client builds a markdown
 * `contextBlock` and sends it with each request. The edge function caches
 * that block via Anthropic prompt caching so repeated questions for the same
 * wedding hit the cache cheaply.
 */
import { supabase } from '@/lib/supabase';
import type { WeddingRow, Gender } from '@/services/wedding';
import type {
  WeddingEvent,
  PackingCategory,
  PackingItem,
  GuideSection,
  GuideItem,
  HotelLogistics,
} from '@/constants/weddingData';
import { isEventVisible, isPackingItemVisible } from '@/constants/visibility';

// ─── Tab context ─────────────────────────────────────────────────────────────
// Stable identifiers used both for tagging persisted Q&As and for
// contextual prompt suggestions in the chat UI.
export type TabContext =
  | 'home'
  | 'schedule'
  | 'destination'
  | 'packing'
  | 'photos'
  | 'songs'
  | 'messages'
  | 'my-info';

export interface AskHistoryItem {
  id: string;
  question: string;
  answer: string;
  tabContext: string | null;
  createdAt: string;
}

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Contextual prompts per tab ──────────────────────────────────────────────
// Surface 3–4 starter questions in the chat modal that match what the guest
// is most likely to want help with from the screen they're on. The labels are
// what guests see; the same string is sent as the question.

export interface ContextualPrompt {
  label: string;
  emoji: string;
}

// The base set below is intentionally destination-neutral — every
// prompt here should read well for any wedding regardless of country
// or theme. Location-specific starters (EES at the EU border,
// vineyard wine tastings, etc.) live in extraPromptsForWedding
// further down and are appended only for weddings where they apply,
// so a guest of a US wedding never sees a Schengen-border question.
export const CONTEXTUAL_PROMPTS: Record<TabContext, ContextualPrompt[]> = {
  home: [
    { emoji: '🗓️', label: 'What\'s the order of events that weekend?' },
    { emoji: '🌤️', label: 'What\'s the weather usually like?' },
    { emoji: '💡', label: 'What should I do the day before the wedding?' },
    { emoji: '🎁', label: 'Any tips on a thoughtful gift?' },
  ],
  schedule: [
    { emoji: '👗', label: 'What should I wear to each event?' },
    { emoji: '🚐', label: 'How do I get between venues?' },
    { emoji: '⏰', label: 'When should I arrive at the ceremony?' },
    { emoji: '🌧️', label: 'What if it rains during an outdoor event?' },
  ],
  destination: [
    { emoji: '🥾', label: 'Best half-day activity near the hotel?' },
    { emoji: '🍽️', label: 'Where should I have a casual dinner?' },
    { emoji: '🚶', label: 'How far is my hotel from the wedding venue?' },
  ],
  packing: [
    { emoji: '🧳', label: 'What\'s the absolute essentials list?' },
    { emoji: '👠', label: 'What shoes work for an outdoor ceremony?' },
    { emoji: '🌦️', label: 'What weather should I pack for?' },
    { emoji: '🔌', label: 'Will my charger work there?' },
    { emoji: '💡', label: 'Is there anything else you\'d recommend bringing that\'s not on the packing list?' },
  ],
  photos: [
    { emoji: '📸', label: 'What\'s the best way to share my photos?' },
    { emoji: '🤳', label: 'Any photo etiquette I should know?' },
  ],
  songs: [
    { emoji: '🎶', label: 'What kinds of songs would fit the vibe?' },
    { emoji: '💃', label: 'Suggest a great wedding dance song' },
  ],
  messages: [
    { emoji: '💬', label: 'How do notifications work in this app?' },
  ],
  'my-info': [
    { emoji: '✈️', label: 'When should I plan to arrive and leave?' },
    { emoji: '🏨', label: 'Tips for booking the right hotel?' },
  ],
};

// Generic fallback prompts — shown if a tab isn't mapped above or when
// opened from a non-tab context.
export const DEFAULT_PROMPTS: ContextualPrompt[] = [
  { emoji: '🗓️', label: 'What should I do on Saturday before the wedding?' },
  { emoji: '🥂', label: 'What\'s the dress code at each event?' },
  { emoji: '🥾', label: 'Anything fun to do near the hotel?' },
];

// Minimal shape needed from the wedding row to compute location-conditional
// prompts. Kept as a structural type so callers can pass a WeddingRow
// directly without an import cycle back into services/wedding.
export interface PromptWeddingContext {
  location: string;
  destination_city: string;
}

// Prompt supplements gated on where the wedding is being held. Extended
// as new location-specific starters make sense — the goal is a chip the
// AI can actually answer well for that region, not a decorative one.
function extraPromptsForWedding(
  wedding: PromptWeddingContext | null,
  tab: TabContext,
): ContextualPrompt[] {
  if (!wedding) return [];
  const loc = `${wedding.location} ${wedding.destination_city}`.toLowerCase();
  // Schengen area — the Entry/Exit System (EES) applies at every land,
  // sea, and air border crossing into these countries. Substring match
  // on the wedding location covers current tenants; if we ever add a
  // country code column on the wedding row we can key off that instead.
  const isSchengen =
    /switzerland|france|germany|italy|spain|netherlands|belgium|austria|denmark|sweden|norway|finland|portugal|greece|poland|czech|slovak|hungary|slovenia|estonia|latvia|lithuania|luxembourg|malta|iceland|liechtenstein/i.test(
      loc,
    );
  // Regions where a wine-tasting recommendation is a natural ask — the
  // AI can point at a specific appellation instead of shrugging.
  const isWineRegion =
    /montreux|lavaux|geneva|napa|sonoma|tuscany|piedmont|bordeaux|champagne|rioja|douro/i.test(
      loc,
    );

  const extras: ContextualPrompt[] = [];
  if (tab === 'home' && isSchengen) {
    extras.push({ emoji: '🛂', label: 'What do I need to know about EES at the EU border?' });
  }
  if (tab === 'destination' && isWineRegion) {
    extras.push({ emoji: '🍷', label: 'Recommend a wine tasting nearby' });
  }
  return extras;
}

export function promptsForTab(
  tab: TabContext | null,
  wedding?: PromptWeddingContext | null,
): ContextualPrompt[] {
  if (!tab) return DEFAULT_PROMPTS;
  const base = CONTEXTUAL_PROMPTS[tab] ?? DEFAULT_PROMPTS;
  const extras = extraPromptsForWedding(wedding ?? null, tab);
  return extras.length > 0 ? [...base, ...extras] : base;
}

// ─── Per-guest filtering ─────────────────────────────────────────────────────
// The AI used to receive the full packing list + every event with metadata
// tags ("[bridal party only, male]") and was expected to scope answers
// itself. It didn't, reliably — bridal-party-only items were leaking to
// other wedding-party members, and wedding-party-only events to regular
// guests. The filtering rules below mirror the ones the packing and
// schedule screens apply at render time, so the assistant only sees the
// slice of the wedding that actually applies to the asking guest.

interface GuestVisibility {
  inWeddingParty: boolean;
  inBridalParty: boolean;
  gender: Gender | null;
  userGroupIds: ReadonlySet<string>;
}

function visibilityFor(profile: GuestProfile): GuestVisibility {
  return {
    inWeddingParty: profile.isWeddingParty || profile.isBridalParty,
    inBridalParty: profile.isBridalParty,
    gender: profile.gender,
    userGroupIds: profile.userGroupIds,
  };
}

export function filterEventsForGuest(
  events: WeddingEvent[],
  profile: GuestProfile,
): WeddingEvent[] {
  const v = visibilityFor(profile);
  return events.filter((e) => isEventVisible(e, v));
}

export function filterPackingForGuest(
  packing: PackingCategory[],
  profile: GuestProfile,
): PackingCategory[] {
  const v = visibilityFor(profile);
  return packing
    .map((cat) => ({
      ...cat,
      items: cat.items.filter((item) => isPackingItemVisible(item, v)),
    }))
    .filter((cat) => cat.items.length > 0);
}

// ─── Context block builder ───────────────────────────────────────────────────
// Assembles a markdown bundle of everything the assistant should know about
// this wedding. Identical across guests of the same wedding (so the edge
// function's prompt cache hits), with the per-guest profile sent separately
// in the user message.

export interface BuildContextArgs {
  wedding: WeddingRow;
  events: WeddingEvent[];
  packingGuide: PackingCategory[];
  destinationGuide: GuideSection[];
  destinationCity: string;
  hotelLogistics?: HotelLogistics[];
  // Notes for any off-site event venues (e.g. a vineyard rehearsal dinner) —
  // distance from the wedding hotel + how transport is being handled.
  offsiteVenueTransport?: { venue: string; notes: string }[];
  // The asking guest's own additions to the packing list (per-guest, private).
  // Surfaced under the packing section so the AI can answer questions like
  // "did I add my contact lens solution?" or "what have I added so far?".
  customPackingItems?: { id: string; label: string }[];
  registryUrl?: string | null;
}

export function buildContextBlock(args: BuildContextArgs): string {
  const {
    wedding,
    events,
    packingGuide,
    destinationGuide,
    destinationCity,
    hotelLogistics,
    offsiteVenueTransport,
    customPackingItems,
    registryUrl,
  } = args;

  const sections: string[] = [];

  // ── Overview ──────────────────────────────────────────────────────────
  // Planner name is sourced from the per-wedding column on the weddings
  // table — never from a build-variant constant — so the AI can't refer
  // to one wedding's planner when the user is signed into another tenant.
  const weddingDate = new Date(wedding.wedding_date).toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
  sections.push(
    [
      '## Wedding Overview',
      `Couple: ${wedding.couple_names}`,
      `Wedding date: ${weddingDate}`,
      `Location: ${wedding.location}`,
      `Destination city: ${destinationCity}`,
      wedding.hashtag ? `Hashtag: ${wedding.hashtag}` : null,
      wedding.website ? `Website: ${wedding.website}` : null,
      wedding.planner_name ? `Wedding planner: ${wedding.planner_name}` : null,
      registryUrl ? `Registry: ${registryUrl}` : null,
    ].filter(Boolean).join('\n'),
  );

  // ── App Features ──────────────────────────────────────────────────────
  // What guests can do inside this app. Surfaced to the AI so it points
  // people at in-app features first ("share photos via the Photos tab")
  // before suggesting external workarounds (the wedding website).
  sections.push(
    [
      '## In-App Features (what guests can do in this app)',
      `- Schedule tab: full event lineup with times, venues, dress codes, and color palettes for each event.`,
      `- ${destinationCity} tab: curated guide with things to do, where to eat, and how to get around.`,
      `- Packing tab: outfit and essentials checklist tailored to the wedding's events and the destination's weather.`,
      `- Photos tab: ${wedding.photo_album_url
          ? `links to the wedding's shared Google Photos album (${wedding.photo_album_url}) where guests upload photos and view what others have shared. Encourage guests to use this album rather than the wedding website.`
          : `placeholder until the couple sets up a shared photo album.`}`,
      `- Songs tab: guests can submit song requests for the playlist.`,
      `- Messages tab: in-app announcements from the couple/planner show up here.`,
      `- My Info / Details tab: guests update their own travel details (hotel, check-in/out, arrival time, flight number, dietary preferences). This info is private to each guest and the couple — not shared between guests.`,
      ``,
      `Important: each guest arranges their own accommodation. The app does NOT designate a hotel for guests, the wedding party, or the bridal party — even when wedding events are held at a hotel like the Fairmont. Don't assume guests are staying at the venue hotel. If a guest asks where to stay, suggest they ask the couple or check the wedding website for any recommended room blocks.`,
    ].join('\n'),
  );

  // ── Events ────────────────────────────────────────────────────────────
  sections.push('## Events');
  events.forEach((event) => {
    const lines: string[] = [];
    // Signal restricted visibility to the assistant so it can qualify
    // answers about the event ("this one's only for the wedding party"
    // etc.). Any group filter or the legacy weddingPartyOnly flag both
    // qualify — either means non-general guests may not have received
    // details about it elsewhere.
    const restricted = event.weddingPartyOnly || (event.visibleToGroups?.length ?? 0) > 0;
    lines.push(`### ${event.title}${restricted ? ' (restricted event)' : ''}`);
    lines.push(`When: ${event.date}, ${event.time}`);
    lines.push(`Venue: ${event.venue}`);
    if (event.address) lines.push(`Address: ${event.address}`);
    lines.push(`Dress code: ${event.dressCode}`);
    lines.push(`About: ${event.description}`);
    if (event.notes) lines.push(`Notes: ${event.notes}`);
    if (event.outdoorNote) lines.push(`Outdoor: ${event.outdoorNote}`);
    if (event.colorPalette && event.colorPalette.length > 0) {
      lines.push(`Color palette: ${event.colorPalette.map((c) => c.name).join(', ')}`);
    }
    if (event.indianAttire) {
      if (event.indianAttire.forWomen?.length) {
        lines.push(`Indian attire (women): ${event.indianAttire.forWomen.join(' | ')}`);
      }
      if (event.indianAttire.forMen?.length) {
        lines.push(`Indian attire (men): ${event.indianAttire.forMen.join(' | ')}`);
      }
    }
    if (event.blackTieGuide) {
      lines.push(`Black-tie guide — men: ${event.blackTieGuide.men}; women: ${event.blackTieGuide.women}`);
    }
    if (event.tuxedoNote) lines.push(`Tux note: ${event.tuxedoNote}`);
    sections.push(lines.join('\n'));
  });

  // ── Hotel logistics ───────────────────────────────────────────────────
  // Walking times + addresses for the hotels guests pick from in My Info,
  // so the AI can answer "how far is Mona from the Fairmont?" or "how do
  // I get from Royal Plaza to the ceremony?" without inventing numbers.
  if (hotelLogistics && hotelLogistics.length > 0) {
    const hotelLines: string[] = [
      '## Hotels & Walking Times to the Wedding Venue',
      'Each hotel below is one of the options guests can pick in the app. Walking times are approximate Google Maps estimates to Fairmont Le Montreux Palace, where the Sangeet, ceremony, cocktail hour, and reception all take place.',
      '',
    ];
    hotelLogistics.forEach((h) => {
      hotelLines.push(`### ${h.name}`);
      hotelLines.push(`Address: ${h.address}`);
      if (h.walkToFairmont) {
        hotelLines.push(
          `Walk to Fairmont: ${h.walkToFairmont.minutes} min (~${h.walkToFairmont.meters} m). ${h.walkToFairmont.description}`,
        );
      }
      if (h.transportNote) hotelLines.push(`Note: ${h.transportNote}`);
    });
    sections.push(hotelLines.join('\n'));
  }

  if (offsiteVenueTransport && offsiteVenueTransport.length > 0) {
    const lines: string[] = ['## Getting to Off-Site Event Venues'];
    offsiteVenueTransport.forEach((entry) => {
      lines.push(`### ${entry.venue}`);
      lines.push(entry.notes);
    });
    sections.push(lines.join('\n'));
  }

  // ── Packing ───────────────────────────────────────────────────────────
  sections.push('## Packing Guide');
  packingGuide.forEach((cat) => {
    const items = cat.items.map((item) => formatPackingItem(item)).join('\n');
    sections.push(`### ${cat.title}\n${items}`);
  });
  if (customPackingItems && customPackingItems.length > 0) {
    // The guest's own additions, alongside the built-in packing list. Listed
    // separately so the AI can talk about them as personal items the guest
    // added themselves, not as items the couple is providing.
    const lines = customPackingItems.map((item) => `- ${item.label}`).join('\n');
    sections.push(`### My Personal Additions (this guest's own custom items)\n${lines}`);
  }

  // ── Destination guide ─────────────────────────────────────────────────
  sections.push(`## ${destinationCity} Guide`);
  destinationGuide.forEach((section) => {
    if (section.items?.length) {
      const items = section.items.map((item) => formatGuideItem(item)).join('\n');
      sections.push(`### ${section.title}\n${items}`);
    }
    section.subsections?.forEach((sub) => {
      const items = sub.items.map((item) => formatGuideItem(item)).join('\n');
      sections.push(`### ${section.title} — ${sub.title}\n${items}`);
    });
  });

  return sections.join('\n\n');
}

function formatPackingItem(item: PackingItem): string {
  const flags: string[] = [];
  if (item.weddingPartyOnly) flags.push('wedding party only');
  if (item.bridalPartyOnly) flags.push('bridal party only');
  if (item.gender) flags.push(item.gender);
  const flagStr = flags.length ? ` [${flags.join(', ')}]` : '';
  const tip = item.tip ? ` — ${item.tip}` : '';
  return `- ${item.label}${flagStr}${tip}`;
}

function formatGuideItem(item: GuideItem): string {
  const parts = [`- **${item.name}**: ${item.description.replace(/\n+/g, ' ')}`];
  if (item.tip) parts.push(`  Tip: ${item.tip}`);
  if (item.address) parts.push(`  Address: ${item.address}`);
  return parts.join('\n');
}

// ─── Per-guest profile ───────────────────────────────────────────────────────
// Prepended to each user question so the assistant can scope packing /
// dress-code answers to the guest's role and gender. Kept short to avoid
// nudging the cached prompt prefix out of cache.

export interface GuestProfile {
  guestName: string;
  isWeddingParty: boolean;
  isBridalParty: boolean;
  gender: Gender | null;
  // Guest_groups.id values this guest belongs to. Feeds the same
  // isEventVisible / isPackingItemVisible helpers the client screens
  // use, so the assistant sees the same slice of the schedule and
  // packing list as the guest asking the question.
  userGroupIds: ReadonlySet<string>;
  tabContext: TabContext | null;
}

function formatProfile(profile: GuestProfile): string {
  const tags: string[] = [];
  if (profile.isBridalParty) tags.push('bridal party');
  else if (profile.isWeddingParty) tags.push('wedding party');
  if (profile.gender) tags.push(profile.gender);
  const tagStr = tags.length ? ` (${tags.join(', ')})` : '';
  const tab = profile.tabContext ? ` · viewing ${profile.tabContext} tab` : '';
  return `[Guest: ${profile.guestName}${tagStr}${tab}]`;
}

// ─── Edge function call ──────────────────────────────────────────────────────

export interface AskAiArgs {
  weddingId: string;
  profile: GuestProfile;
  question: string;
  contextBlock: string;
  history?: ChatTurn[];
}

export interface AskAiResult {
  answer: string;
}

export async function askAi(args: AskAiArgs): Promise<AskAiResult> {
  const { weddingId, profile, question, contextBlock, history } = args;
  const profilePrefix = formatProfile(profile);
  const composedQuestion = `${profilePrefix}\n\n${question.trim()}`;

  const { data, error } = await supabase.functions.invoke<{
    answer?: string;
    error?: string;
  }>('ai-assistant', {
    body: {
      weddingId,
      guestName: profile.guestName,
      question: composedQuestion,
      tabContext: profile.tabContext,
      contextBlock,
      history,
    },
  });

  if (error) throw new Error(error.message ?? 'AI request failed');
  if (!data?.answer) throw new Error(data?.error ?? 'AI returned no answer');
  return { answer: data.answer };
}

// ─── History ─────────────────────────────────────────────────────────────────

// Identities whose Q&A is NEVER persisted or fetched. Mirrors the matching
// set in supabase/functions/ai-assistant — Preview Guest is the public demo
// login on the invite screen, so showing persisted history under that name
// would expose prior demo users' chats to every visitor.
const EPHEMERAL_GUEST_NAMES: ReadonlySet<string> = new Set(['Preview Guest']);

export function isEphemeralGuest(guestName: string): boolean {
  return EPHEMERAL_GUEST_NAMES.has(guestName);
}

export async function getAskHistory(
  weddingId: string,
  guestName: string,
  limit = 30,
): Promise<AskHistoryItem[]> {
  if (isEphemeralGuest(guestName)) return [];
  const { data, error } = await supabase
    .from('ai_questions')
    .select('id, question, answer, tab_context, created_at')
    .eq('wedding_id', weddingId)
    .eq('guest_name', guestName)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    // Strip the [Guest: …] profile prefix that we prepend on the way out.
    question: stripProfilePrefix(row.question),
    answer: row.answer,
    tabContext: row.tab_context,
    createdAt: row.created_at,
  }));
}

function stripProfilePrefix(question: string): string {
  // Profile lines look like "[Guest: Name (tags) · viewing X tab]\n\n…"
  return question.replace(/^\[Guest:[^\]]*\]\s*\n+/, '').trim();
}

// Always scope delete by (wedding_id, guest_name) so a misbehaving client
// can't wipe someone else's history even with permissive RLS in place.

export async function deleteAskItem(
  weddingId: string,
  guestName: string,
  itemId: string,
): Promise<void> {
  const { error } = await supabase
    .from('ai_questions')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('guest_name', guestName)
    .eq('id', itemId);
  if (error) throw error;
}

export async function clearAskHistory(
  weddingId: string,
  guestName: string,
): Promise<void> {
  const { error } = await supabase
    .from('ai_questions')
    .delete()
    .eq('wedding_id', weddingId)
    .eq('guest_name', guestName);
  if (error) throw error;
}

// Routes a guest's "Report response" through the existing send-notification
// edge function (kind='ai-report') so the couple gets an email with both
// the question and the flagged AI answer. Apple Guideline 1.2 requires a
// reporting mechanism on user-facing AI output.
export async function reportAiAnswer(args: {
  weddingId: string;
  guestName: string;
  question: string;
  answer: string;
}): Promise<void> {
  const { weddingId, guestName, question, answer } = args;
  // Demo-account safeguard: never email the couple for Preview Guest
  // reports. Anyone can sign in under that name from the invite screen,
  // so unsuppressed reports would noise up the inbox during testing.
  // The UI flow still treats the call as successful.
  if (isEphemeralGuest(guestName)) return;
  const body = [
    `Question:`,
    question,
    ``,
    `AI response:`,
    answer,
  ].join('\n');
  const { error } = await supabase.functions.invoke('send-notification', {
    body: { weddingId, guestName, details: body, kind: 'ai-report' },
  });
  if (error) throw error;
}
