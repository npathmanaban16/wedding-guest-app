/**
 * Floating "Ask" assistant — a circular button anchored bottom-right that
 * opens a chat modal. Powered by the supabase `ai-assistant` edge function
 * which calls Claude Sonnet 4.6.
 *
 * The component is rendered once at the tab layout level so it stays
 * visible across every tab; per-tab prompt suggestions are driven by the
 * `tabContext` prop. The chat modal:
 *   • Loads recent Q&A history from public.ai_questions on open
 *   • Surfaces 3–4 contextual starter prompts when empty
 *   • Streams in answers (single-shot — no token streaming yet)
 *   • Persists each Q&A automatically via the edge function
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Radius, Shadow, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import {
  EVENTS_NN,
  EVENTS_DEMO,
  PACKING_GUIDE_NN,
  PACKING_GUIDE_DEMO,
  SWITZERLAND_GUIDE,
  WEDDING,
  NN_WEDDING_IDS,
} from '@/constants/weddingData';
import {
  askAi,
  buildContextBlock,
  getAskHistory,
  promptsForTab,
  type AskHistoryItem,
  type GuestProfile,
  type TabContext,
} from '@/services/aiAssistant';
import { haptic } from '@/utils/haptics';

interface AskAiProps {
  tabContext: TabContext | null;
  // Pixel offset above the tab bar so the FAB doesn't overlap nav icons.
  bottomOffset?: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  // Pending = grayed-out user bubble while we await the assistant reply.
  pending?: boolean;
}

export function AskAi({ tabContext, bottomOffset = 84 }: AskAiProps) {
  const { guestName } = useAuth();
  const { wedding, weddingId, isWeddingParty, isBridalParty, getGuestGender } = useWedding();
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [history, setHistory] = useState<AskHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);

  const isNN = NN_WEDDING_IDS.has(wedding.id);
  const events = isNN ? EVENTS_NN : EVENTS_DEMO;
  const packingGuide = isNN ? PACKING_GUIDE_NN : PACKING_GUIDE_DEMO;

  const contextBlock = useMemo(
    () =>
      buildContextBlock({
        wedding,
        events,
        packingGuide,
        // Switzerland guide ships with all weddings for now (single-destination
        // app). When the SaaS variant grows multiple destinations this will
        // switch on the wedding's destination_city.
        destinationGuide: SWITZERLAND_GUIDE,
        destinationCity: wedding.destination_city,
        plannerName: WEDDING.plannerName,
        registryUrl: wedding.registry_url,
      }),
    [wedding, events, packingGuide],
  );

  const profile: GuestProfile | null = guestName
    ? {
        guestName,
        isWeddingParty: isWeddingParty(guestName),
        isBridalParty: isBridalParty(guestName),
        gender: getGuestGender(guestName),
        tabContext,
      }
    : null;

  const prompts = promptsForTab(tabContext);

  // Load past Q&As whenever the modal opens. Cheap (indexed query, capped at
  // 30 rows) so we just refetch each time rather than caching across opens.
  useEffect(() => {
    if (!open || !guestName || !weddingId) return;
    setHistoryLoading(true);
    getAskHistory(weddingId, guestName)
      .then(setHistory)
      .catch((err) => console.warn('[AskAi] history fetch failed', err))
      .finally(() => setHistoryLoading(false));
  }, [open, guestName, weddingId]);

  const reset = useCallback(() => {
    setMessages([]);
    setInput('');
    setError(null);
    setShowHistory(false);
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
    // Clear the in-session conversation when closing so reopening starts
    // fresh — past turns remain in the History view.
    reset();
  }, [reset]);

  const sendQuestion = useCallback(
    async (raw: string) => {
      const question = raw.trim();
      if (!question || !profile || !weddingId) return;
      setError(null);
      setShowHistory(false);

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: question,
      };
      const placeholderId = `a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        userMsg,
        { id: placeholderId, role: 'assistant', content: '', pending: true },
      ]);
      setInput('');
      setSending(true);
      haptic.light();
      // Defer to next frame so the user bubble paints before we scroll.
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

      try {
        const conversationHistory = messages
          .filter((m) => !m.pending && m.content)
          .map((m) => ({ role: m.role, content: m.content }));

        const { answer } = await askAi({
          weddingId,
          profile,
          question,
          contextBlock,
          history: conversationHistory,
        });

        setMessages((prev) =>
          prev.map((m) =>
            m.id === placeholderId
              ? { ...m, content: answer, pending: false }
              : m,
          ),
        );
        haptic.success();
        // Refresh history in the background so the new Q&A shows up if the
        // user toggles into the History view.
        getAskHistory(weddingId, profile.guestName)
          .then(setHistory)
          .catch(() => {});
      } catch (e) {
        const detail = e instanceof Error ? e.message : 'Something went wrong';
        setError(detail);
        setMessages((prev) => prev.filter((m) => m.id !== placeholderId));
        haptic.warning();
      } finally {
        setSending(false);
        requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
      }
    },
    [contextBlock, messages, profile, weddingId],
  );

  // Hide entirely if there's no logged-in guest — assistant is a guest-only
  // surface and the contexts above would throw without one.
  if (!guestName) return null;

  return (
    <>
      <Pressable
        onPress={() => {
          haptic.light();
          setOpen(true);
        }}
        style={({ pressed }) => [
          styles.fab,
          { bottom: bottomOffset + Spacing.md },
          pressed && styles.fabPressed,
        ]}
        accessibilityLabel="Ask the wedding assistant"
        accessibilityRole="button"
      >
        <Ionicons name="sparkles" size={20} color={Colors.white} />
        <Text style={styles.fabLabel}>Ask</Text>
      </Pressable>

      <Modal
        visible={open}
        animationType="slide"
        transparent={false}
        onRequestClose={handleClose}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="sparkles" size={18} color={Colors.gold} />
              <Text style={styles.headerTitle}>Ask the Assistant</Text>
            </View>
            <TouchableOpacity onPress={handleClose} accessibilityLabel="Close">
              <Ionicons name="close" size={26} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.tabRow}>
            <TabPill
              label="Chat"
              active={!showHistory}
              onPress={() => setShowHistory(false)}
            />
            <TabPill
              label={`History${history.length ? ` · ${history.length}` : ''}`}
              active={showHistory}
              onPress={() => setShowHistory(true)}
            />
          </View>

          {showHistory ? (
            <HistoryView
              loading={historyLoading}
              items={history}
              onPick={(item) => {
                setShowHistory(false);
                setMessages([
                  { id: `u-${item.id}`, role: 'user', content: item.question },
                  { id: `a-${item.id}`, role: 'assistant', content: item.answer },
                ]);
              }}
            />
          ) : (
            <KeyboardAvoidingView
              style={styles.chatRoot}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            >
              <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
              >
                {messages.length === 0 ? (
                  <EmptyState
                    prompts={prompts}
                    onPick={(text) => sendQuestion(text)}
                    coupleNames={wedding.couple_names}
                  />
                ) : (
                  messages.map((m) => <Bubble key={m.id} message={m} />)
                )}
                {error && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
              </ScrollView>

              <View
                style={[
                  styles.inputBar,
                  { paddingBottom: Math.max(insets.bottom, Spacing.sm) },
                ]}
              >
                <TextInput
                  style={styles.input}
                  value={input}
                  onChangeText={setInput}
                  placeholder="Ask anything about the wedding…"
                  placeholderTextColor={Colors.textMuted}
                  multiline
                  editable={!sending}
                  returnKeyType="send"
                  blurOnSubmit
                  onSubmitEditing={() => sendQuestion(input)}
                />
                <TouchableOpacity
                  onPress={() => sendQuestion(input)}
                  disabled={sending || !input.trim()}
                  style={[
                    styles.sendButton,
                    (sending || !input.trim()) && styles.sendButtonDisabled,
                  ]}
                  accessibilityLabel="Send question"
                >
                  {sending ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Ionicons name="arrow-up" size={18} color={Colors.white} />
                  )}
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          )}
        </View>
      </Modal>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
      <Text style={[styles.pillLabel, active && styles.pillLabelActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  if (message.pending) {
    return (
      <View style={[styles.bubbleRow, styles.assistantRow]}>
        <View style={[styles.bubble, styles.assistantBubble]}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      </View>
    );
  }
  return (
    <View style={[styles.bubbleRow, isUser ? styles.userRow : styles.assistantRow]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={isUser ? styles.userText : styles.assistantText}>{message.content}</Text>
      </View>
    </View>
  );
}

function EmptyState({
  prompts,
  onPick,
  coupleNames,
}: {
  prompts: { emoji: string; label: string }[];
  onPick: (label: string) => void;
  coupleNames: string;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyEyebrow}>WEDDING ASSISTANT</Text>
      <Text style={styles.emptyTitle}>How can I help?</Text>
      <Text style={styles.emptyBody}>
        Ask anything about {coupleNames}'s wedding — the schedule, dress codes,
        what to pack, things to do nearby, or general travel tips.
      </Text>
      <View style={styles.promptList}>
        {prompts.map((p) => (
          <TouchableOpacity
            key={p.label}
            style={styles.promptChip}
            onPress={() => onPick(p.label)}
            activeOpacity={0.85}
          >
            <Text style={styles.promptEmoji}>{p.emoji}</Text>
            <Text style={styles.promptLabel}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function HistoryView({
  loading,
  items,
  onPick,
}: {
  loading: boolean;
  items: AskHistoryItem[];
  onPick: (item: AskHistoryItem) => void;
}) {
  if (loading) {
    return (
      <View style={styles.historyEmpty}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  }
  if (items.length === 0) {
    return (
      <View style={styles.historyEmpty}>
        <Text style={styles.historyEmptyText}>
          No past questions yet. Anything you ask will show up here.
        </Text>
      </View>
    );
  }
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.historyContent}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.id}
          style={styles.historyCard}
          onPress={() => onPick(item)}
          activeOpacity={0.85}
        >
          <Text style={styles.historyQuestion} numberOfLines={2}>
            {item.question}
          </Text>
          <Text style={styles.historyAnswer} numberOfLines={3}>
            {item.answer}
          </Text>
          <Text style={styles.historyMeta}>
            {formatDate(item.createdAt)}
            {item.tabContext ? ` · ${item.tabContext}` : ''}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: Spacing.md,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.full,
    gap: 6,
    ...Shadow.large,
  },
  fabPressed: { opacity: 0.85, transform: [{ scale: 0.97 }] },
  fabLabel: {
    color: Colors.white,
    fontFamily: Fonts.sansSemiBold,
    fontSize: Typography.sm,
    letterSpacing: 0.4,
  },

  modalRoot: { flex: 1, backgroundColor: Colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.md,
    color: Colors.textPrimary,
  },

  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  pillLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
  },
  pillLabelActive: { color: Colors.white },

  chatRoot: { flex: 1 },

  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.md, paddingBottom: Spacing.lg },

  empty: { padding: Spacing.md },
  emptyEyebrow: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  emptyTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: Typography.xl,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyBody: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  promptList: { gap: Spacing.sm },
  promptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: Spacing.sm,
  },
  promptEmoji: { fontSize: 18 },
  promptLabel: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
  },

  bubbleRow: { flexDirection: 'row', marginBottom: Spacing.sm },
  userRow: { justifyContent: 'flex-end' },
  assistantRow: { justifyContent: 'flex-start' },
  bubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.lg,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  userText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.white,
    lineHeight: 22,
  },
  assistantText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    lineHeight: 22,
  },

  errorBox: {
    backgroundColor: '#F8E5DF',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
  },
  errorText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.error,
  },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.4 },

  historyEmpty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  historyEmptyText: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  historyContent: { padding: Spacing.md, gap: Spacing.sm },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  historyQuestion: {
    fontFamily: Fonts.sansSemiBold,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  historyAnswer: {
    fontFamily: Fonts.sans,
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 6,
  },
  historyMeta: {
    fontFamily: Fonts.sans,
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});
