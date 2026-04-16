import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { isAdminGuest } from '@/app/admin';
import {
  getNotifications,
  getReactions,
  toggleReaction,
  deleteNotification,
  markMessagesRead,
  AppNotification,
  ReactionSummary,
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
  guestName,
  isAdmin,
  onReact,
  onDelete,
}: {
  notification: AppNotification;
  reactions: ReactionSummary[];
  guestName: string | null;
  isAdmin: boolean;
  onReact: (emoji: string) => void;
  onDelete: () => void;
}) {
  const myReaction = guestName
    ? (reactions.find((r) => r.guestNames.includes(guestName))?.emoji ?? null)
    : null;

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
          <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={8}>
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
              onPress={() => onReact(emoji)}
              activeOpacity={0.7}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
              {summary ? <Text style={[styles.reactionCount, selected && styles.reactionCountSelected]}>{summary.count}</Text> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();
  const isAdmin = isAdminGuest(guestName);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionSummary[]>>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const notifs = await getNotifications();
    setNotifications(notifs);
    if (notifs.length > 0) {
      const r = await getReactions(notifs.map((n) => n.id));
      setReactions(r);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    markMessagesRead().catch(() => {});
    Notifications.setBadgeCountAsync(0).catch(() => {});

    const poll = setInterval(loadData, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
        markMessagesRead().catch(() => {});
        Notifications.setBadgeCountAsync(0).catch(() => {});
      }
    });

    return () => { clearInterval(poll); sub.remove(); };
  }, [loadData]);

  const handleReact = useCallback(async (notificationId: string, emoji: string) => {
    if (!guestName) return;

    const currentReactions = reactions[notificationId] ?? [];
    const myCurrentReaction = currentReactions.find((r) => r.guestNames.includes(guestName))?.emoji ?? null;

    // Optimistic update
    setReactions((prev) => {
      const current = (prev[notificationId] ?? []).map((r) => ({ ...r, guestNames: [...r.guestNames] }));

      // Remove old reaction
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

      // Add new reaction (if different)
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
      loadData(); // revert on failure
    }
  }, [guestName, reactions, loadData]);

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
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      showsVerticalScrollIndicator={false}
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
          <Text style={styles.emptySubtext}>Updates from Neha & Naveen will appear here</Text>
        </View>
      ) : (
        notifications.map((n) => (
          <MessageCard
            key={n.id}
            notification={n}
            reactions={reactions[n.id] ?? []}
            guestName={guestName}
            isAdmin={isAdmin}
            onReact={(emoji) => handleReact(n.id, emoji)}
            onDelete={() => handleDelete(n.id, n.message)}
          />
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
});
