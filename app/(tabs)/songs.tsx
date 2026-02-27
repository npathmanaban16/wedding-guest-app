import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getSongRequests, addSongRequest, SongRequest } from '@/services/storage';

const SAMPLE_SUGGESTIONS = [
  { song: 'Can't Help Falling in Love', artist: 'Elvis Presley' },
  { song: 'Perfect', artist: 'Ed Sheeran' },
  { song: 'At Last', artist: 'Etta James' },
  { song: 'Jai Ho', artist: 'A.R. Rahman' },
  { song: 'Tum Hi Ho', artist: 'Arijit Singh' },
  { song: 'Thinking Out Loud', artist: 'Ed Sheeran' },
  { song: 'Shape of You', artist: 'Ed Sheeran' },
  { song: "I'm Yours", artist: 'Jason Mraz' },
  { song: 'Galway Girl', artist: 'Ed Sheeran' },
  { song: 'Senorita', artist: 'Justin Timberlake' },
];

function SongCard({ request }: { request: SongRequest }) {
  return (
    <View style={[styles.songCard, Shadow.small]}>
      <View style={styles.musicIcon}>
        <Ionicons name="musical-note" size={18} color={Colors.primary} />
      </View>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{request.song}</Text>
        {request.artist ? <Text style={styles.songArtist}>{request.artist}</Text> : null}
        <Text style={styles.requestedBy}>Requested by {request.requestedBy.split(' ')[0]}</Text>
      </View>
    </View>
  );
}

export default function SongsScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');

  useEffect(() => {
    getSongRequests().then((data) => {
      setRequests(data.reverse());
      setLoading(false);
    });
  }, []);

  const handleSubmit = async () => {
    if (!song.trim() || !guestName) return;
    setSubmitting(true);
    try {
      const newRequest = await addSongRequest(song, artist, guestName);
      setRequests((prev) => [newRequest, ...prev]);
      setSong('');
      setArtist('');
      Alert.alert('🎵 Song requested!', `"${newRequest.song}" has been added to the DJ's list.`);
    } catch {
      Alert.alert('Error', 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fillSuggestion = (s: { song: string; artist: string }) => {
    setSong(s.song);
    setArtist(s.artist);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageEmoji}>🎵</Text>
          <Text style={styles.pageTitle}>Song Requests</Text>
          <Text style={styles.pageSubtitle}>
            What songs do you want to dance to? Request your favourites for the reception!
          </Text>
        </View>

        {/* Request form */}
        <View style={[styles.formCard, Shadow.medium]}>
          <Text style={styles.formTitle}>Request a song</Text>

          <Text style={styles.inputLabel}>Song name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Jai Ho"
            placeholderTextColor={Colors.textMuted}
            value={song}
            onChangeText={setSong}
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Artist (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. A.R. Rahman"
            placeholderTextColor={Colors.textMuted}
            value={artist}
            onChangeText={setArtist}
            returnKeyType="done"
            onSubmitEditing={handleSubmit}
          />

          <TouchableOpacity
            style={[styles.submitButton, (!song.trim() || submitting) && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={!song.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} size="small" />
            ) : (
              <>
                <Ionicons name="musical-notes" size={18} color={Colors.white} />
                <Text style={styles.submitButtonText}>Request this song</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsTitle}>Need inspiration? 💡</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestionsScroll}
          >
            {SAMPLE_SUGGESTIONS.map((s, i) => (
              <TouchableOpacity
                key={i}
                style={styles.suggestionPill}
                onPress={() => fillSuggestion(s)}
              >
                <Text style={styles.suggestionSong}>{s.song}</Text>
                <Text style={styles.suggestionArtist}>{s.artist}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* All requests */}
        <View style={styles.requestsSection}>
          <Text style={styles.requestsTitle}>
            {requests.length > 0
              ? `${requests.length} song${requests.length !== 1 ? 's' : ''} requested so far`
              : 'No requests yet — be the first!'}
          </Text>

          {loading ? (
            <ActivityIndicator color={Colors.primary} style={styles.loader} />
          ) : (
            requests.map((r) => <SongCard key={r.id} request={r} />)
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.xxl },

  pageHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  pageEmoji: { fontSize: 48, marginBottom: Spacing.sm },
  pageTitle: {
    fontSize: Typography.xxl,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  pageSubtitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },

  formCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  formTitle: {
    fontSize: Typography.lg,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  inputLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: Typography.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    marginBottom: Spacing.md,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  submitButtonDisabled: { backgroundColor: Colors.border },
  submitButtonText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: '600',
  },

  suggestionsSection: { marginBottom: Spacing.lg },
  suggestionsTitle: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  suggestionsScroll: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  suggestionPill: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minWidth: 140,
    borderWidth: 1,
    borderColor: Colors.border,
    marginRight: Spacing.xs,
  },
  suggestionSong: {
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionArtist: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },

  requestsSection: { paddingHorizontal: Spacing.lg },
  requestsTitle: {
    fontSize: Typography.base,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  loader: { marginTop: Spacing.xl },

  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  musicIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  songInfo: { flex: 1 },
  songTitle: {
    fontSize: Typography.base,
    color: Colors.textPrimary,
    fontWeight: '500',
    marginBottom: 1,
  },
  songArtist: {
    fontSize: Typography.sm,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  requestedBy: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
  },
});
