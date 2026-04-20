import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  AppState,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import { WEDDING } from '@/constants/weddingData';
import {
  getNotifications,
  getReactions,
  toggleReaction,
  deleteNotification,
  markMessagesRead,
  getReplies,
  addReply,
  deleteReply,
  AppNotification,
  ReactionSummary,
  NotificationReply,
} from '@/services/storage';

const REACTION_EMOJIS = ['❤️', '🎉', '😂', '👏', '🙌'];

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function MessageCard({
  notification,
  reactions,
  replies,
  guestName,
  isAdmin,
  onReact,
  onDelete,
  onReply,
  onDeleteReply,
}: {
  notification: AppNotification;
  reactions: ReactionSummary[];
  replies: NotificationReply[];
  guestName: string | null;
  isAdmin: boolean;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onReply: (message: string) => void;
  onDeleteReply: (replyId: string) => void;
}) {
  const myReaction = guestName
    ? (reactions.find((r) => r.guestNames.includes(guestName))?.emoji ?? null)
    : null;

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    const text = replyText.trim();
    if (!text) return;
    haptic.medium();
    setSending(true);
    onReply(text);
    setReplyText('');
    setReplyOpen(false);
    setSending(false);
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.senderBadge}>
          <Ionicons name="notifications" size={13} color={Colors.primary} />
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.senderName}>{notification.sender}</Text>
          <Text style={styles.timeAgo}>{timeAgo(notification.sentAt)}</Text>
        </View>
        {isAdmin && (
          <TouchableOpacity onPress={() => { haptic.warning(); onDelete(); }} style={styles.deleteBtn} hitSlop={8}>
            <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.messageText}>{notification.message}</Text>

      <View style={styles.reactionStrip}>
        {REACTION_EMOJIS.map((emoji) => {
          const summary = reactions.find((r) => r.emoji === emoji);
          const selected = myReaction === emoji;
          return (
            <TouchableOpacity
              key={emoji}
              style={[styles.reactionBtn, selected && styles.reactionBtnSelected]}
              onPress={() => { haptic.light(); onReact(emoji); }}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {summary ? <Text style={[styles.reactionCount, selected && styles.reactionCountSelected]}>{summary.count}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Replies */}
      {replies.length > 0 && (
        <View style={styles.repliesSection}>
          {replies.map((r) => (
            <View key={r.id} style={styles.replyRow}>
              <View style={styles.replyContent}>
                <Text style={styles.replyAuthor}>{r.guestName}</Text>
                <Text style={styles.replyText}>{r.message}</Text>
                <Text style={styles.replyTime}>{timeAgo(r.createdAt)}</Text>
              </View>
              {(r.guestName === guestName || isAdmin) && (
                <TouchableOpacity
                  onPress={() => onDeleteReply(r.id)}
                  style={styles.replyDeleteBtn}
                  hitSlop={8}
                >
                  <Ionicons name="close" size={14} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Reply input */}
      {replyOpen ? (
        <View style={styles.replyInputRow}>
          <TextInput
            style={styles.replyInput}
            placeholder="Write a reply..."
            placeholderTextColor={Colors.textMuted}
            value={replyText}
            onChangeText={setReplyText}
            multiline
            maxLength={280}
            autoFocus
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!replyText.trim() || sending}
            style={[styles.sendBtn, (!replyText.trim() || sending) && styles.sendBtnDisabled]}
          >
            <Ionicons name="send" size={16} color={Colors.white} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.replyToggle}
          onPress={() => setReplyOpen(true)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.replyToggleText}>Reply</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();
  const { isAdmin: isAdminCheck } = useWedding();
  const isAdmin = !!guestName && isAdminCheck(guestName);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionSummary[]>>({});
  const [allReplies, setAllReplies] = useState<Record<string, NotificationReply[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const notifs = await getNotifications();
    setNotifications(notifs);
    if (notifs.length > 0) {
      const ids = notifs.map((n) => n.id);
      const [r, rep] = await Promise.all([getReactions(ids), getReplies(ids)]);
      setReactions(r);
      setAllReplies(rep);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    if (guestName) markMessagesRead(guestName).catch(() => {});
    if (Platform.OS !== 'web') {
      import('expo-notifications').then((mod) => mod.setBadgeCountAsync(0)).catch(() => {});
    }

    const poll = setInterval(loadData, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
        if (guestName) markMessagesRead(guestName).catch(() => {});
        if (Platform.OS !== 'web') {
          import('expo-notifications').then((mod) => mod.setBadgeCountAsync(0)).catch(() => {});
        }
      }
    });

    return () => { clearInterval(poll); sub.remove(); };
  }, [loadData, guestName]);

  const handleReact = useCallback(async (notificationId: string, emoji: string) => {
    if (!guestName) return;

    const currentReactions = reactions[notificationId] ?? [];
    const myCurrentReaction = currentReactions.find((r) => r.guestNames.includes(guestName))?.emoji ?? null;

    // Optimistic update
    setReactions((prev) => {
      const current = (prev[notificationId] ?? []).map((r) => ({ ...r, guestNames: [...r.guestNames] }));

      if (myCurrentReaction) {
        const idx = current.findIndex((r) => r.emoji === myCurrentReaction);
        if (idx >= 0) {
          if (current[idx].count === 1) current.splice(idx, 1);
          else {
            current[idx].count--;
            current[idx].guestNames = current[idx].guestNames.filter((n) => n !== guestName);
          }
        }
      }

      if (myCurrentReaction !== emoji) {
        const idx = current.findIndex((r) => r.emoji === emoji);
        if (idx >= 0) {
          current[idx].count++;
          current[idx].guestNames.push(guestName);
        } else {
          current.push({ emoji, count: 1, guestNames: [guestName] });
        }
      }

      return { ...prev, [notificationId]: current };
    });

    try {
      await toggleReaction(notificationId, guestName, emoji, myCurrentReaction);
    } catch {
      loadData();
    }
  }, [guestName, reactions, loadData]);

  const handleReply = useCallback(async (notificationId: string, message: string) => {
    if (!guestName) return;

    // Optimistic update
    const optimistic: NotificationReply = {
      id: `temp-${Date.now()}`,
      notificationId,
      guestName,
      message,
      createdAt: new Date().toISOString(),
    };
    setAllReplies((prev) => ({
      ...prev,
      [notificationId]: [...(prev[notificationId] ?? []), optimistic],
    }));

    try {
      await addReply(notificationId, guestName, message);
      loadData();
    } catch {
      loadData();
      Alert.alert('Error', 'Could not post your reply.');
    }
  }, [guestName, loadData]);

  const handleDeleteReply = useCallback((notificationId: string, replyId: string) => {
    Alert.alert('Delete reply?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setAllReplies((prev) => ({
            ...prev,
            [notificationId]: (prev[notificationId] ?? []).filter((r) => r.id !== replyId),
          }));
          try {
            await deleteReply(replyId);
          } catch {
            loadData();
            Alert.alert('Error', 'Could not delete the reply.');
          }
        },
      },
    ]);
  }, [loadData]);

  const handleDelete = useCallback((id: string, message: string) => {
    Alert.alert(
      'Delete message?',
      `"${message.slice(0, 80)}${message.length > 80 ? '…' : ''}"`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
            try {
              await deleteNotification(id);
            } catch {
              loadData();
              Alert.alert('Error', 'Could not delete the message.');
            }
          },
        },
      ],
    );
  }, [loadData]);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Messages</Text>
          <Text style={styles.pageSubtitleTag}>From the couple</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : notifications.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="notifications-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Updates from {WEDDING.coupleNames} will appear here</Text>
          </View>
        ) : (
          notifications.map((n) => (
            <MessageCard
              key={n.id}
              notification={n}
              reactions={reactions[n.id] ?? []}
              replies={allReplies[n.id] ?? []}
              guestName={guestName}
              isAdmin={isAdmin}
              onReact={(emoji) => handleReact(n.id, emoji)}
              onDelete={() => handleDelete(n.id, n.message)}
              onReply={(msg) => handleReply(n.id, msg)}
              onDeleteReply={(replyId) => handleDeleteReply(n.id, replyId)}
            />
          ))
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl },
  loader: { marginTop: Spacing.xxl },

  pageHeader: {
    alignItems: 'center',
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
  },

  empty: {
    alignItems: 'center',
    paddingTop: Spacing.xxl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontFamily: Fonts.serifMedium,
    fontSize: 17,
    color: Colors.textSecondary,
  },
  emptySubtext: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  senderBadge: {
    width: 28,
    height: 28,
    borderRadius: Radius.full,
    backgroundColor: Colors.accentLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    flexShrink: 0,
  },
  headerMeta: { flex: 1 },
  senderName: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  timeAgo: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  deleteBtn: {
    padding: Spacing.xs,
  },

  messageText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
    marginBottom: Spacing.md,
  },

  reactionStrip: {
    flexDirection: 'row',
    gap: Spacing.xs,
    flexWrap: 'wrap',
  },
  reactionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  reactionBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.accentLight,
  },
  reactionEmoji: { fontSize: 15 },
  reactionCount: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  reactionCountSelected: {
    color: Colors.primary,
  },

  // Replies
  repliesSection: {
    marginTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  replyContent: { flex: 1 },
  replyAuthor: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textPrimary,
  },
  replyText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 20,
    marginTop: 1,
  },
  replyTime: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
  },
  replyDeleteBtn: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },

  // Reply input
  replyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    paddingTop: Spacing.xs,
  },
  replyToggleText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  replyInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    maxHeight: 80,
    backgroundColor: Colors.background,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
