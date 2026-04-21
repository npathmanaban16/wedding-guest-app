import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import { WEDDING, SenderId } from '@/constants/weddingData';

type SenderOption = {
  id: SenderId;
  label: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, isAdmin, wedding } = useWedding();

  const [sender, setSender] = useState<SenderId>('couple');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  // Guard — should not be reachable via normal navigation, but just in case
  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const senders: SenderOption[] = [
    { id: 'couple', label: wedding.couple_names, icon: 'heart' },
    { id: 'planner', label: WEDDING.plannerName, subtitle: WEDDING.plannerSubtitle, icon: 'star' },
  ];
  const senderLabel = senders.find((s) => s.id === sender)?.label ?? wedding.couple_names;

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;
    haptic.medium();

    Alert.alert(
      'Send notification?',
      `"${trimmed}"\n\nFrom: ${senderLabel}\n\nThis will be sent to all guests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'default',
          onPress: async () => {
            setSending(true);
            try {
              const { data, error } = await supabase.functions.invoke('send-push', {
                body: { weddingId, message: trimmed, sender: senderLabel },
              });
              if (error) throw error;
              const sent = data?.sent ?? 0;
              const failed = data?.failed ?? 0;
              const detail = data?.message ?? `Delivered to ${sent} device${sent !== 1 ? 's' : ''}${failed ? `, ${failed} failed` : ''}`;
              Alert.alert('Sent!', detail);
              setMessage('');
            } catch (e: unknown) {
              let msg = e instanceof Error ? e.message : 'Unknown error';
              // Try to extract the actual error body from a FunctionsHttpError
              if (e != null && typeof e === 'object' && 'context' in e && e.context instanceof Response) {
                try {
                  const body = await (e.context as Response).json();
                  if (body?.error) msg = body.error;
                } catch {}
              }
              Alert.alert('Error', `Could not send notification: ${msg}`);
            } finally {
              setSending(false);
            }
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Send Notification</Text>
          <Text style={styles.pageSubtitle}>Message all guests instantly</Text>
        </View>

        {/* Sender selection */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Sending as</Text>
          <View style={styles.senderRow}>
            {senders.map((s) => (
              <TouchableOpacity
                key={s.id}
                style={[
                  styles.senderOption,
                  sender === s.id && styles.senderOptionActive,
                ]}
                onPress={() => setSender(s.id as 'couple' | 'planner')}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={s.icon}
                  size={18}
                  color={sender === s.id ? Colors.white : Colors.textMuted}
                  style={{ marginBottom: 4 }}
                />
                <Text
                  style={[
                    styles.senderLabel,
                    sender === s.id && styles.senderLabelActive,
                  ]}
                >
                  {s.label}
                </Text>
                {s.subtitle && (
                  <Text
                    style={[
                      styles.senderSub,
                      sender === s.id && styles.senderSubActive,
                    ]}
                  >
                    {s.subtitle}
                  </Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Message input */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Message</Text>
          <TextInput
            style={styles.messageInput}
            placeholder={`e.g. "Coaches are leaving the hotel at 6:00 PM — see you at the Fairmont!"`}
            placeholderTextColor={Colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            textAlignVertical="top"
            maxLength={500}
          />
          <Text style={styles.charCount}>{message.length}/500</Text>
        </View>

        {/* Preview */}
        {message.trim().length > 0 && (
          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Preview</Text>
            <View style={styles.notificationBubble}>
              <View style={styles.notificationIcon}>
                <Ionicons name="heart" size={14} color={Colors.white} />
              </View>
              <View style={styles.notificationContent}>
                <Text style={styles.notificationSender}>{senderLabel}</Text>
                <Text style={styles.notificationMessage}>{message.trim()}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Send button */}
        <TouchableOpacity
          style={[
            styles.sendButton,
            (!message.trim() || sending) && styles.sendButtonDisabled,
          ]}
          onPress={handleSend}
          disabled={!message.trim() || sending}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="send" size={16} color={Colors.white} />
              <Text style={styles.sendButtonText}>Send to all guests</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: insets.bottom + Spacing.xxl }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1 },
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

  senderRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  senderOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  senderOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  senderLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  senderLabelActive: { color: Colors.white },
  senderSub: {
    fontFamily: Fonts.sans,
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
  },
  senderSubActive: { color: Colors.white, opacity: 0.8 },

  messageInput: {
    minHeight: 120,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    lineHeight: 24,
    paddingTop: 0,
  },
  charCount: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
    textAlign: 'right',
    marginTop: Spacing.xs,
  },

  previewCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  previewLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  notificationBubble: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    gap: Spacing.sm,
  },
  notificationIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notificationContent: { flex: 1 },
  notificationSender: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  notificationMessage: {
    fontFamily: Fonts.sans,
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },

  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 16,
    gap: Spacing.sm,
    ...Shadow.small,
  },
  sendButtonDisabled: { opacity: 0.45 },
  sendButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 16,
    color: Colors.white,
    letterSpacing: 0.3,
  },
});
