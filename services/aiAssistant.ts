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
} from '@/constants/weddingData';

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
    { emoji: '🍷', label: 'Recommend a wine tasting nearby' },
    { emoji: '🍽️', label: 'Where should I have a casual dinner?' },
    { emoji: '🚆', label: 'How do I get around without a car?' },
  ],
  packing: [
    { emoji: '🧳', label: 'What\'s the absolute essentials list?' },
    { emoji: '👠', label: 'What shoes work for an outdoor ceremony?' },
    { emoji: '🌦️', label: 'What weather should I pack for?' },
    { emoji: '🔌', label: 'Will my charger work there?' },
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
  { emoji: '👗', label: 'Will a sage long green dress work for the wedding?' },
  { emoji: '🗓️', label: 'What should I do on Saturday before the wedding?' },
  { emoji: '🥂', label: 'What\'s the dress code at each event?' },
  { emoji: '🥾', label: 'Anything fun to do near the hotel?' },
];

export function promptsForTab(tab: TabContext | null): ContextualPrompt[] {
  if (!tab) return DEFAULT_PROMPTS;
  return CONTEXTUAL_PROMPTS[tab] ?? DEFAULT_PROMPTS;
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
  plannerName?: string;
  registryUrl?: string | null;
}

export function buildContextBlock(args: BuildContextArgs): string {
  const {
    wedding,
    events,
    packingGuide,
    destinationGuide,
    destinationCity,
    plannerName,
    registryUrl,
  } = args;

  const sections: string[] = [];

  // ── Overview ──────────────────────────────────────────────────────────
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
      plannerName ? `Wedding planner: ${plannerName}` : null,
      registryUrl ? `Registry: ${registryUrl}` : null,
    ].filter(Boolean).join('\n'),
  );

  // ── Events ────────────────────────────────────────────────────────────
  sections.push('## Events');
  events.forEach((event) => {
    const lines: string[] = [];
    lines.push(`### ${event.title}${event.weddingPartyOnly ? ' (wedding party only)' : ''}`);
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

  // ── Packing ───────────────────────────────────────────────────────────
  sections.push('## Packing Guide');
  packingGuide.forEach((cat) => {
    const items = cat.items.map((item) => formatPackingItem(item)).join('\n');
    sections.push(`### ${cat.title}\n${items}`);
  });

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

export async function getAskHistory(
  weddingId: string,
  guestName: string,
  limit = 30,
): Promise<AskHistoryItem[]> {
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
