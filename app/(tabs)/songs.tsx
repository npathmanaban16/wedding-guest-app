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
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getSongRequests, addSongRequest, deleteSongRequest, SongRequest } from '@/services/storage';
import { useWedding } from '@/context/WeddingContext';
import { DEFAULT_WEDDING_ID } from '@/constants/weddingData';
import { haptic } from '@/utils/haptics';

const PLAYLIST_TAG = DEFAULT_WEDDING_ID === null
  ? 'Welcome Party & Reception Playlist'
  : 'Sangeet & Reception Playlist';

// Inspiration chips shown above the "Request a song" form. The last three
// Bollywood picks only make sense for the N&N sangeet; swap them for a few
// broadly known dance hits on the SaaS variant so the demo reads generic.
const SAMPLE_SUGGESTIONS_NN = [
  { song: 'Gimme! Gimme! Gimme!', artist: 'ABBA' },
  { song: 'Despacito', artist: 'Luis Fonsi' },
  { song: 'We Found Love', artist: 'Rihanna' },
  { song: 'I Wanna Dance with Somebody', artist: 'Whitney Houston' },
  { song: 'Just Dance', artist: 'Lady Gaga' },
  { song: 'Saree Ke Fall Sa', artist: 'Nakash Aziz' },
  { song: 'Desi Girl', artist: 'Shankar Mahadevan' },
  { song: 'Amplifier', artist: 'Imran Khan' },
];

const SAMPLE_SUGGESTIONS_DEMO = [
  { song: 'Gimme! Gimme! Gimme!', artist: 'ABBA' },
  { song: 'Despacito', artist: 'Luis Fonsi' },
  { song: 'We Found Love', artist: 'Rihanna' },
  { song: 'I Wanna Dance with Somebody', artist: 'Whitney Houston' },
  { song: 'Just Dance', artist: 'Lady Gaga' },
  { song: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars' },
  { song: 'Shut Up and Dance', artist: 'Walk the Moon' },
  { song: 'Shake It Off', artist: 'Taylor Swift' },
];

const SAMPLE_SUGGESTIONS =
  DEFAULT_WEDDING_ID === null ? SAMPLE_SUGGESTIONS_DEMO : SAMPLE_SUGGESTIONS_NN;

function SongCard({
  request,
  currentGuest,
  onDelete,
}: {
  request: SongRequest;
  currentGuest: string | null;
  onDelete: (id: string) => void;
}) {
  const isOwner = currentGuest && request.requestedBy === currentGuest;
  return (
    <View style={styles.songCard}>
      <View style={styles.musicIcon}>
        <Ionicons name="musical-note" size={16} color={Colors.primary} />
      </View>
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{request.song}</Text>
        {request.artist ? <Text style={styles.songArtist}>{request.artist}</Text> : null}
        <Text style={styles.requestedBy}>Requested by {request.requestedBy}</Text>
      </View>
      {isOwner && (
        <TouchableOpacity style={styles.deleteButton} onPress={() => { haptic.warning(); onDelete(request.id); }}>
          <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function SongsScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();
  const { weddingId } = useWedding();
  const [requests, setRequests] = useState<SongRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [song, setSong] = useState('');
  const [artist, setArtist] = useState('');

  useEffect(() => {
    getSongRequests(weddingId).then((data) => {
      setRequests(data.reverse());
      setLoading(false);
    });
  }, [weddingId]);

  const handleSubmit = async () => {
    if (!song.trim() || !guestName) return;
    haptic.success();
    setSubmitting(true);
    try {
      const newRequest = await addSongRequest(weddingId, song, artist, guestName);
      setRequests((prev) => [newRequest, ...prev]);
      setSong('');
      setArtist('');
      Alert.alert('Song requested!', `"${newRequest.song}" has been added to the DJ's list.`);
    } catch {
      Alert.alert('Error', 'Could not submit your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove request', 'Remove this song from the list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          setRequests((prev) => prev.filter((r) => r.id !== id));
          try {
            await deleteSongRequest(weddingId, id);
          } catch {
            Alert.alert('Error', 'Could not remove the request. Please try again.');
            getSongRequests(weddingId).then((data) => setRequests(data.reverse()));
          }
        },
      },
    ]);
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
          <Text style={styles.pageTitle}>Song Requests</Text>
          <Text style={styles.pageSubtitleTag}>{PLAYLIST_TAG}</Text>
          <Text style={styles.pageSubtitle}>
            What songs do you want to dance to? Request your favorites for the reception!
          </Text>
        </View>

        {/* Request form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Request a song</Text>

          <Text style={styles.inputLabel}>Song name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Levitating"
            placeholderTextColor={Colors.textMuted}
            value={song}
            onChangeText={setSong}
            returnKeyType="next"
          />

          <Text style={styles.inputLabel}>Artist (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dua Lipa"
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
                <Ionicons name="musical-notes" size={17} color={Colors.white} />
                <Text style={styles.submitButtonText}>Request this song</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Suggestions */}
        <View style={styles.suggestionsSection}>
          <Text style={styles.suggestionsLabel}>Need inspiration?</Text>
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
            requests.map((r) => (
              <SongCard key={r.id} request={r} currentGuest={guestName} onDelete={handleDelete} />
            ))
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
    marginBottom: Spacing.sm,
  },
  pageSubtitle: {
    fontSize: 13,
    fontFamily: Fonts.sans,
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
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  formTitle: {
    fontSize: 21,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 0.2,
  },
  inputLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
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
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: {
    color: Colors.white,
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
  },

  suggestionsSection: { marginBottom: Spacing.lg },
  suggestionsLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.textMuted,
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
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  suggestionArtist: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },

  requestsSection: { paddingHorizontal: Spacing.lg },
  requestsTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 0.2,
  },
  loader: { marginTop: Spacing.xl },

  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  musicIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  songInfo: { flex: 1 },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  songTitle: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    marginBottom: 1,
  },
  songArtist: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  requestedBy: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },
});
