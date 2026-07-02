import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Image,
  KeyboardAvoidingView,
  LayoutAnimation,
  Modal,
  Platform,
  Pressable,
  UIManager,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import {
  getNotifications,
  getReactions,
  toggleReaction,
  deleteNotification,
  editNotification,
  markMessagesRead,
  getReplies,
  addReply,
  addChatMessage,
  deleteReply,
  notifyMessageReaction,
  notifyMessageReply,
  uploadMessageImage,
  AppNotification,
  ReactionSummary,
  NotificationReply,
} from '@/services/storage';
import { MessageImage } from '@/components/MessageImage';
import { AttendeeCard } from '@/components/AttendeeCard';

const REACTION_EMOJIS = ['❤️', '🎉', '😂', '👏', '🙌'];
const COLLAPSED_REPLY_COUNT = 3;

type MessagesTab = 'announcements' | 'chat' | 'attendees';

const TAB_LABELS: Record<MessagesTab, string> = {
  announcements: 'Announcements',
  chat: 'Chat',
  attendees: 'Attendees',
};

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  canManage,
  onReact,
  onDelete,
  onEdit,
  onReply,
  onDeleteReply,
  onReplyOpen,
}: {
  notification: AppNotification;
  reactions: ReactionSummary[];
  replies: NotificationReply[];
  guestName: string | null;
  isAdmin: boolean;
  // Whether the current user may edit/delete this message. Admins manage
  // announcements; on the chat tab guests also manage their own posts.
  canManage: boolean;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onEdit: (message: string) => Promise<boolean>;
  onReply: (message: string) => void;
  onDeleteReply: (replyId: string) => void;
  onReplyOpen: (y: number) => void;
}) {
  const myReaction = guestName
    ? (reactions.find((r) => r.guestNames.includes(guestName))?.emoji ?? null)
    : null;

  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(notification.message);
  const [savingEdit, setSavingEdit] = useState(false);

  const [reactionsModalOpen, setReactionsModalOpen] = useState(false);
  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  // When a thread has more than COLLAPSED_REPLY_COUNT replies, hide the
  // older ones behind a "View N earlier replies" button. Tap expands
  // inline with a layout animation; navigating away from the screen
  // resets back to collapsed so each visit starts clean.
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  useFocusEffect(
    useCallback(() => () => setRepliesExpanded(false), []),
  );
  const hiddenReplyCount = Math.max(0, replies.length - COLLAPSED_REPLY_COUNT);
  const visibleReplies =
    repliesExpanded || hiddenReplyCount === 0
      ? replies
      : replies.slice(-COLLAPSED_REPLY_COUNT);

  const handleToggleReplies = () => {
    haptic.selection();
    if (Platform.OS !== 'web') {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setRepliesExpanded((v) => !v);
  };

  const cardYRef = useRef(0);

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

  const handleOpenReply = () => {
    setReplyOpen(true);
    // Let the input mount + keyboard animation start, then scroll the
    // card into view above the keyboard.
    setTimeout(() => onReplyOpen(cardYRef.current), 50);
  };

  const handleStartEdit = () => {
    haptic.light();
    setEditText(notification.message);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    const trimmed = editText.trim();
    if (!trimmed || trimmed === notification.message) {
      setEditOpen(false);
      return;
    }
    setSavingEdit(true);
    const ok = await onEdit(trimmed);
    setSavingEdit(false);
    if (ok) setEditOpen(false);
  };

  return (
    <View
      style={styles.card}
      onLayout={(e) => { cardYRef.current = e.nativeEvent.layout.y; }}
    >
      <View style={styles.cardHeader}>
        <View style={styles.senderBadge}>
          <Ionicons
            name={notification.kind === 'chat' ? 'chatbubble' : 'notifications'}
            size={13}
            color={Colors.primary}
          />
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.senderName}>{notification.sender}</Text>
          <Text style={styles.timeAgo}>
            {timeAgo(notification.sentAt)}
            {notification.editedAt ? ' · edited' : ''}
          </Text>
          {notification.weddingPartyOnly && (
            <View style={styles.partyOnlyBadge}>
              <Ionicons name="people-outline" size={10} color={Colors.gold} style={{ marginRight: 3 }} />
              <Text style={styles.partyOnlyBadgeText}>Wedding party only</Text>
            </View>
          )}
        </View>
        {canManage && !editOpen && (
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleStartEdit} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="pencil-outline" size={15} color={Colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { haptic.warning(); onDelete(); }} style={styles.iconBtn} hitSlop={8}>
              <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {editOpen ? (
        <View style={styles.editSection}>
          <TextInput
            style={styles.editInput}
            value={editText}
            onChangeText={setEditText}
            multiline
            maxLength={2000}
            autoFocus
            textAlignVertical="top"
          />
          <View style={styles.editActions}>
            <TouchableOpacity
              onPress={() => setEditOpen(false)}
              style={[styles.editBtn, styles.editCancel]}
              activeOpacity={0.7}
            >
              <Text style={styles.editCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={!editText.trim() || savingEdit}
              style={[styles.editBtn, styles.editSave, (!editText.trim() || savingEdit) && styles.editSaveDisabled]}
              activeOpacity={0.7}
            >
              <Text style={styles.editSaveText}>{savingEdit ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          {notification.message.length > 0 && (
            <Text style={styles.messageText}>{notification.message}</Text>
          )}
          {notification.imageUrl && (
            <MessageImage uri={notification.imageUrl} style={styles.messageImage} />
          )}
        </>
      )}

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

      {/* See who reacted — inline link opening a modal breakdown */}
      {totalReactions > 0 && (
        <TouchableOpacity
          style={styles.seeReactionsBtn}
          onPress={() => { haptic.selection(); setReactionsModalOpen(true); }}
          activeOpacity={0.7}
        >
          <Text style={styles.seeReactionsText}>
            See who reacted
          </Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={reactionsModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReactionsModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setReactionsModalOpen(false)}
          />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reactions</Text>
              <TouchableOpacity
                onPress={() => setReactionsModalOpen(false)}
                hitSlop={8}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={styles.modalBodyContent}
              showsVerticalScrollIndicator
              persistentScrollbar
              nestedScrollEnabled
            >
              {reactions.length === 0 ? (
                <Text style={styles.modalEmptyText}>No reactions yet.</Text>
              ) : (
                reactions.map((r) => (
                  <View key={r.emoji} style={styles.modalReactionGroup}>
                    <View style={styles.modalReactionHeader}>
                      <Text style={styles.modalReactionEmoji}>{r.emoji}</Text>
                      <Text style={styles.modalReactionCount}>{r.count}</Text>
                    </View>
                    {r.guestNames.map((name) => (
                      <Text key={name} style={styles.modalReactionName}>
                        {name}
                      </Text>
                    ))}
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Replies */}
      {replies.length > 0 && (
        <View style={styles.repliesSection}>
          {hiddenReplyCount > 0 && (
            <TouchableOpacity
              onPress={handleToggleReplies}
              style={styles.viewEarlierBtn}
              activeOpacity={0.7}
            >
              <Text style={styles.viewEarlierText}>
                {repliesExpanded
                  ? 'Hide earlier replies'
                  : `View ${hiddenReplyCount} earlier ${hiddenReplyCount === 1 ? 'reply' : 'replies'}`}
              </Text>
            </TouchableOpacity>
          )}
          {visibleReplies.map((r) => (
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
            onFocus={() => onReplyOpen(cardYRef.current)}
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
          onPress={handleOpenReply}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.replyToggleText}>Reply</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Attendees directory — every invited guest including the couple.
// Named wedding party members (bridesmaids/groomsmen/family) sort to
// the top with a "Wedding party" badge — that group includes the
// couple themselves via is_wedding_party=true + wedding_party_role
// null (backward-compat badge path). Everyone else follows in
// alphabetical order. Partners of party members
// (wedding_party_role='partner') intentionally don't get a badge
// even though they carry the is_wedding_party access flag.
// Rendered as a 2-per-row grid.
//
// Legacy rows with is_wedding_party=true and wedding_party_role=null
// still show the badge (backward-compat) — customers can suppress
// individual spouses by explicitly setting their role to 'partner'.
function shouldShowWeddingPartyBadge(
  attendee: ReturnType<typeof useWedding>['attendees'][number],
): boolean {
  if (!attendee.is_wedding_party) return false;
  if (attendee.wedding_party_role === 'partner') return false;
  return true;
}

function AttendeesList({
  attendees,
  currentGuestName,
}: {
  attendees: ReturnType<typeof useWedding>['attendees'];
  currentGuestName: string | null;
}) {
  // Name search. State lives here so it resets when the tab unmounts
  // (switching tabs clears the query — each visit starts fresh).
  const [query, setQuery] = useState('');
  const trimmedQuery = query.trim().toLowerCase();

  const visible = attendees
    .filter((a) => !trimmedQuery || a.canonical_name.toLowerCase().includes(trimmedQuery))
    .sort((a, b) => {
      const aWp = shouldShowWeddingPartyBadge(a);
      const bWp = shouldShowWeddingPartyBadge(b);
      if (aWp !== bWp) return aWp ? -1 : 1;
      return a.canonical_name.localeCompare(b.canonical_name);
    });

  if (attendees.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="people-outline" size={40} color={Colors.textMuted} />
        <Text style={styles.emptyText}>Guest list coming soon</Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.attendeeSearchBar}>
        <Ionicons name="search" size={16} color={Colors.textMuted} />
        <TextInput
          style={styles.attendeeSearchInput}
          placeholder="Search guests..."
          placeholderTextColor={Colors.textMuted}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => { haptic.selection(); setQuery(''); }} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {visible.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="search-outline" size={40} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No guests found</Text>
          <Text style={styles.emptySubtext}>No one matches “{query.trim()}”</Text>
        </View>
      ) : (
        <View style={styles.attendeesGrid}>
          {visible.map((a) => {
            const isMe = !!currentGuestName && a.canonical_name.toLowerCase() === currentGuestName.toLowerCase();
            const showWpBadge = shouldShowWeddingPartyBadge(a);
            const badge = isMe ? 'You' : showWpBadge ? 'Wedding party' : undefined;
            return (
              <View key={a.canonical_name} style={styles.attendeesGridItem}>
                <AttendeeCard attendee={a} badge={badge} />
              </View>
            );
          })}
        </View>
      )}
    </>
  );
}

export default function MessagesScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();
  const { weddingId, isAdmin: isAdminCheck, isWeddingParty, wedding, attendees } = useWedding();
  const isAdmin = !!guestName && isAdminCheck(guestName);
  const inWeddingParty = !!guestName && isWeddingParty(guestName);
  const [activeTab, setActiveTab] = useState<MessagesTab>('announcements');

  // Admin-controlled feature flags (App Features screen). Anything that
  // isn't exactly `false` means enabled — covers databases that predate
  // migrations 038/039, where the columns are missing.
  const attendeesEnabled = wedding.attendees_enabled !== false;
  const chatEnabled = wedding.chat_enabled !== false;
  const visibleTabs: MessagesTab[] = [
    'announcements' as const,
    ...(chatEnabled ? ['chat' as const] : []),
    ...(attendeesEnabled ? ['attendees' as const] : []),
  ];

  // If an admin turns a feature off while this user is sitting on its
  // tab, bounce them back to Announcements.
  useEffect(() => {
    if (
      (activeTab === 'attendees' && !attendeesEnabled) ||
      (activeTab === 'chat' && !chatEnabled)
    ) {
      setActiveTab('announcements');
    }
  }, [attendeesEnabled, chatEnabled, activeTab]);

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [reactions, setReactions] = useState<Record<string, ReactionSummary[]>>({});
  const [allReplies, setAllReplies] = useState<Record<string, NotificationReply[]>>({});
  const [loading, setLoading] = useState(true);

  // Guest chat composer (Chat tab). The optional photo is picked locally
  // and only uploaded when the guest sends, so an abandoned compose
  // doesn't leave orphan files in the bucket (same as the admin flow).
  const [chatText, setChatText] = useState('');
  const [chatImage, setChatImage] = useState<{ uri: string; mimeType: string } | null>(null);
  const [postingChat, setPostingChat] = useState(false);

  // Both streams live in `notifications` (same table, discriminated by
  // kind) so reactions/replies/unread-badging are shared; the tabs just
  // split the list at render time.
  const announcements = notifications.filter((n) => n.kind !== 'chat');
  const chatMessages = notifications.filter((n) => n.kind === 'chat');

  const loadData = useCallback(async () => {
    const all = await getNotifications(weddingId);
    // Hide wedding-party-only messages from non-wedding-party users.
    // Admins who are also party members see them; vendor-role admins
    // (e.g. DJ) do not.
    const notifs = all.filter((n) => !n.weddingPartyOnly || inWeddingParty);
    setNotifications(notifs);
    if (notifs.length > 0) {
      const ids = notifs.map((n) => n.id);
      const [r, rep] = await Promise.all([
        getReactions(weddingId, ids),
        getReplies(weddingId, ids),
      ]);
      setReactions(r);
      setAllReplies(rep);
    }
    setLoading(false);
  }, [weddingId, inWeddingParty]);

  useEffect(() => {
    loadData();
    if (guestName) markMessagesRead(weddingId, guestName).catch(() => {});
    if (Platform.OS !== 'web') {
      import('expo-notifications').then((mod) => mod.setBadgeCountAsync(0)).catch(() => {});
    }

    const poll = setInterval(loadData, 30_000);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        loadData();
        if (guestName) markMessagesRead(weddingId, guestName).catch(() => {});
        if (Platform.OS !== 'web') {
          import('expo-notifications').then((mod) => mod.setBadgeCountAsync(0)).catch(() => {});
        }
      }
    });

    return () => { clearInterval(poll); sub.remove(); };
  }, [loadData, weddingId, guestName]);

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
      await toggleReaction(weddingId, notificationId, guestName, emoji, myCurrentReaction);
      // Email the couple only when a reaction is added or changed, not when
      // it's removed. `myCurrentReaction === emoji` would mean the same
      // emoji was tapped again, which the storage layer treats as a remove.
      // Guest-chat messages skip the email — reactions there are
      // guest-to-guest chatter, not feedback on a couple announcement.
      if (myCurrentReaction !== emoji) {
        const original = notifications.find((n) => n.id === notificationId);
        if (original && original.kind !== 'chat') {
          notifyMessageReaction(
            weddingId,
            guestName,
            emoji,
            original.sender,
            original.message,
          ).catch(() => {});
        }
      }
    } catch {
      loadData();
    }
  }, [weddingId, guestName, reactions, notifications, loadData]);

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
      await addReply(weddingId, notificationId, guestName, message);
      // Same chat carve-out as reactions: don't email the couple about
      // guest-to-guest replies on the Chat tab.
      const original = notifications.find((n) => n.id === notificationId);
      if (original && original.kind !== 'chat') {
        notifyMessageReply(
          weddingId,
          guestName,
          message,
          original.sender,
          original.message,
        ).catch(() => {});
      }
      loadData();
    } catch {
      loadData();
      Alert.alert('Error', 'Could not post your reply.');
    }
  }, [weddingId, guestName, notifications, loadData]);

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
            await deleteReply(weddingId, replyId);
          } catch {
            loadData();
            Alert.alert('Error', 'Could not delete the reply.');
          }
        },
      },
    ]);
  }, [weddingId, loadData]);

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
              await deleteNotification(weddingId, id);
            } catch {
              loadData();
              Alert.alert('Error', 'Could not delete the message.');
            }
          },
        },
      ],
    );
  }, [weddingId, loadData]);

  const handleEdit = useCallback(async (id: string, message: string): Promise<boolean> => {
    const previous = notifications.find((n) => n.id === id);
    const optimisticEditedAt = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, message, editedAt: optimisticEditedAt } : n)),
    );
    try {
      const { editedAt } = await editNotification(weddingId, id, message);
      // Reconcile: if migration 007 isn't applied yet, editedAt comes back null
      if (editedAt !== optimisticEditedAt) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, editedAt } : n)),
        );
      }
      return true;
    } catch {
      if (previous) {
        setNotifications((prev) => prev.map((n) => (n.id === id ? previous : n)));
      }
      Alert.alert('Error', 'Could not save your changes.');
      return false;
    }
  }, [weddingId, notifications]);

  const handlePickChatImage = async () => {
    haptic.light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access in Settings to attach a photo.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setChatImage({
      uri: asset.uri,
      mimeType: asset.mimeType ?? 'image/jpeg',
    });
  };

  const handlePostChat = useCallback(async () => {
    const text = chatText.trim();
    if ((!text && !chatImage) || !guestName || postingChat) return;
    haptic.medium();
    setPostingChat(true);

    // Optimistic prepend (feed is newest-first) using the local file URI
    // for the photo; reconciled by loadData once the insert lands, which
    // swaps the temp id + local URI for the real row and public URL.
    const image = chatImage;
    const optimistic: AppNotification = {
      id: `temp-${Date.now()}`,
      message: text,
      sender: guestName,
      sentAt: new Date().toISOString(),
      editedAt: null,
      weddingPartyOnly: false,
      imageUrl: image?.uri ?? null,
      kind: 'chat',
    };
    setNotifications((prev) => [optimistic, ...prev]);
    setChatText('');
    setChatImage(null);

    try {
      // Upload first so the row never points at a missing file.
      let imageUrl: string | null = null;
      if (image) {
        imageUrl = await uploadMessageImage(weddingId, image.uri, image.mimeType);
      }
      await addChatMessage(weddingId, guestName, text, imageUrl);
      loadData();
    } catch {
      setNotifications((prev) => prev.filter((n) => n.id !== optimistic.id));
      setChatText(text);
      setChatImage(image);
      Alert.alert('Error', 'Could not post your message.');
    } finally {
      setPostingChat(false);
    }
  }, [chatText, chatImage, guestName, postingChat, weddingId, loadData]);

  // Scroll a message card into view so the keyboard doesn't cover its
  // reply input. Called when a guest taps "Reply" or focuses the input.
  const scrollRef = useRef<ScrollView>(null);
  const handleReplyOpen = useCallback((cardY: number) => {
    // Position the top of the card near the top of the viewport so the
    // input at the card's bottom sits well above the keyboard.
    const targetY = Math.max(0, cardY - Spacing.md);
    scrollRef.current?.scrollTo({ y: targetY, animated: true });
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Messages</Text>
          <Text style={styles.pageSubtitleTag}>
            {activeTab === 'announcements'
              ? 'From the couple'
              : activeTab === 'chat'
                ? 'Everyone can join in'
                : `${attendees.length} attending`}
          </Text>
        </View>

        {/* Segmented control — swaps between the announcement feed
            (existing behavior, kept as default), the guest Chat feed,
            and the Attendees directory. Tabs the admin has turned off
            (App Features) are omitted; with everything off only the
            announcement feed remains and the control is hidden. */}
        {visibleTabs.length > 1 && (
        <View style={styles.segmented}>
          {visibleTabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => { haptic.selection(); setActiveTab(tab); }}
                style={[styles.segmentedTab, active && styles.segmentedTabActive]}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.segmentedLabel, active && styles.segmentedLabelActive]}
                  numberOfLines={1}
                >
                  {TAB_LABELS[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        )}

        {/* Chat composer — always visible on the Chat tab so posting
            doesn't wait on the feed load. Any signed-in guest can post
            text, a photo, or both. */}
        {activeTab === 'chat' && (
          <View style={styles.chatComposer}>
            {chatImage && (
              <View style={styles.chatAttachmentRow}>
                <Image source={{ uri: chatImage.uri }} style={styles.chatAttachmentThumb} />
                <Text style={styles.chatAttachmentLabel}>Photo attached</Text>
                <TouchableOpacity
                  onPress={() => { haptic.light(); setChatImage(null); }}
                  hitSlop={8}
                  disabled={postingChat}
                >
                  <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            <View style={styles.chatInputRow}>
              <TouchableOpacity
                onPress={handlePickChatImage}
                disabled={postingChat}
                style={styles.chatAttachBtn}
                hitSlop={6}
              >
                <Ionicons name="image-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
              <TextInput
                style={styles.chatInput}
                placeholder="Message all guests..."
                placeholderTextColor={Colors.textMuted}
                value={chatText}
                onChangeText={setChatText}
                multiline
                maxLength={1000}
              />
              <TouchableOpacity
                onPress={handlePostChat}
                disabled={(!chatText.trim() && !chatImage) || postingChat}
                style={[
                  styles.sendBtn,
                  ((!chatText.trim() && !chatImage) || postingChat) && styles.sendBtnDisabled,
                ]}
              >
                {postingChat ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="send" size={16} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'attendees' ? (
          <AttendeesList attendees={attendees} currentGuestName={guestName} />
        ) : loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.loader} />
        ) : activeTab === 'announcements' ? (
          announcements.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="notifications-outline" size={40} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubtext}>Updates from {wedding.couple_names} will appear here</Text>
            </View>
          ) : (
            announcements.map((n) => (
              <MessageCard
                key={n.id}
                notification={n}
                reactions={reactions[n.id] ?? []}
                replies={allReplies[n.id] ?? []}
                guestName={guestName}
                isAdmin={isAdmin}
                canManage={isAdmin}
                onReact={(emoji) => handleReact(n.id, emoji)}
                onDelete={() => handleDelete(n.id, n.message)}
                onEdit={(msg) => handleEdit(n.id, msg)}
                onReply={(msg) => handleReply(n.id, msg)}
                onDeleteReply={(replyId) => handleDeleteReply(n.id, replyId)}
                onReplyOpen={handleReplyOpen}
              />
            ))
          )
        ) : chatMessages.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No chat messages yet</Text>
            <Text style={styles.emptySubtext}>Say hi — every guest can see and join this chat</Text>
          </View>
        ) : (
          chatMessages.map((n) => (
            <MessageCard
              key={n.id}
              notification={n}
              reactions={reactions[n.id] ?? []}
              replies={allReplies[n.id] ?? []}
              guestName={guestName}
              isAdmin={isAdmin}
              canManage={isAdmin || n.sender === guestName}
              onReact={(emoji) => handleReact(n.id, emoji)}
              onDelete={() => handleDelete(n.id, n.message)}
              onEdit={(msg) => handleEdit(n.id, msg)}
              onReply={(msg) => handleReply(n.id, msg)}
              onDeleteReply={(replyId) => handleDeleteReply(n.id, replyId)}
              onReplyOpen={handleReplyOpen}
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

  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.full,
    padding: 3,
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },

  attendeeSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.white,
    borderRadius: Radius.full,
    borderWidth: 0.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  attendeeSearchInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
    padding: 0,
  },

  attendeesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    // Balance the negative gap-emulation margin so the row-edge cards
    // sit flush with the ScrollView's horizontal padding.
    marginHorizontal: -Spacing.xs,
  },
  attendeesGridItem: {
    width: '50%',
    paddingHorizontal: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  segmentedTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentedTabActive: {
    backgroundColor: Colors.white,
    ...Shadow.small,
  },
  segmentedLabel: {
    fontFamily: Fonts.sansMedium,
    // 12 (down from 13) so "Announcements" still fits with three tabs
    // on narrow screens.
    fontSize: 12,
    color: Colors.textMuted,
    letterSpacing: 0.3,
  },
  segmentedLabelActive: {
    color: Colors.textPrimary,
  },

  // Guest chat composer
  chatComposer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  chatAttachBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatAttachmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.xs,
    marginBottom: Spacing.xs,
    borderRadius: Radius.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  chatAttachmentThumb: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    backgroundColor: Colors.border,
  },
  chatAttachmentLabel: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
  },
  chatInput: {
    flex: 1,
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 20,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 6,
    maxHeight: 100,
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
  partyOnlyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.gold,
  },
  partyOnlyBadgeText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 9,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: Colors.gold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBtn: {
    padding: Spacing.xs,
  },

  editSection: {
    marginBottom: Spacing.md,
  },
  editInput: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
    minHeight: 80,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  editCancel: {
    backgroundColor: 'transparent',
  },
  editCancelText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  editSave: {
    backgroundColor: Colors.primary,
  },
  editSaveDisabled: {
    opacity: 0.45,
  },
  editSaveText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.white,
  },

  messageText: {
    fontFamily: Fonts.sans,
    fontSize: 15,
    color: Colors.textPrimary,
    lineHeight: 23,
    marginBottom: Spacing.md,
  },
  messageImage: {
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

  seeReactionsBtn: {
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    marginTop: 2,
  },
  seeReactionsText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textMuted,
  },

  // Reactions modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '75%',
    flexDirection: 'column',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    ...Shadow.small,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 17,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  modalCloseBtn: { padding: Spacing.xs },
  modalBody: {
    flexShrink: 1,
  },
  modalBodyContent: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalEmptyText: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  modalReactionGroup: {
    marginBottom: Spacing.md,
  },
  modalReactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  modalReactionEmoji: {
    fontSize: 20,
  },
  modalReactionCount: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textMuted,
  },
  modalReactionName: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textPrimary,
    paddingVertical: 3,
    paddingLeft: 28,
  },

  // Replies
  repliesSection: {
    marginTop: Spacing.md,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingTop: Spacing.sm,
  },
  viewEarlierBtn: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.xs,
    alignSelf: 'flex-start',
  },
  viewEarlierText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.primary,
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
