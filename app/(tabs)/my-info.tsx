import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { DEFAULT_WEDDING_ID, getTravelWindow } from '@/constants/weddingData';
import {
  getMyInfo,
  saveMyInfo,
  deleteMyAccount,
  sendGuestMessage,
  uploadGuestProfileImage,
  MyInfo,
} from '@/services/storage';
import { updateGuestProfile } from '@/services/wedding';
import { HotelPickerField } from '@/components/HotelPickerField';
import { DateField } from '@/components/DateField';
import { haptic } from '@/utils/haptics';

// Kept in sync with WeddingContext's WEDDING_ID_STORAGE_KEY. Inlined here
// so sign-out can drop the persisted wedding id without also clearing the
// in-memory context state — clearing context state mid-sign-out can throw
// on any still-mounted screen that calls useWedding().
const WEDDING_ID_STORAGE_KEY = '@wedding_id';

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
}

function Field({ label, value, onChange, placeholder, multiline, keyboardType, autoCapitalize }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={[styles.fieldInput, multiline && styles.fieldInputMultiline]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ''}
        placeholderTextColor={Colors.textMuted}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCapitalize={autoCapitalize ?? 'sentences'}
        keyboardType={keyboardType ?? 'default'}
        autoCorrect={false}
      />
    </View>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.readOnlyField}>
        <Text style={styles.readOnlyText}>{value || '—'}</Text>
      </View>
    </View>
  );
}

export default function MyInfoScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName, logout } = useAuth();
  const { weddingId, wedding, attendees, getCanonicalName, patchAttendeeProfile } = useWedding();

  // Look up this guest's own row from the roster so we can seed the
  // profile-photo / bio editor. `getCanonicalName` normalizes the login
  // name so casing / whitespace differences don't miss the match.
  const canonicalName = guestName ? getCanonicalName(guestName) : null;
  const myRow = canonicalName
    ? attendees.find((a) => a.canonical_name === canonicalName)
    : undefined;

  // Local copies so the field / preview stay responsive while the save
  // completes; reconciled against the fetched row on mount and after
  // successful save.
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(myRow?.profile_photo_url ?? null);
  const [bio, setBio] = useState<string>(myRow?.bio ?? '');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [profileSaveStatus, setProfileSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const bioSaveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Re-sync when the roster loads or the guest switches accounts.
  useEffect(() => {
    setProfilePhotoUrl(myRow?.profile_photo_url ?? null);
    setBio(myRow?.bio ?? '');
  }, [myRow?.profile_photo_url, myRow?.bio]);

  useEffect(() => () => clearTimeout(bioSaveTimer.current), []);

  // Travel window is keyed on the actual weddingId (not the build variant)
  // so the N&N wedding always gets its 2026 window even when reached from
  // the SaaS/Tetherly build.
  const travel = getTravelWindow(weddingId);

  // SaaS: navigate to /invite explicitly and clear storage so the next
  // cold launch also routes to /invite. We do NOT call clearWeddingId()
  // — that mutates in-memory WeddingContext state, which can throw on
  // any screen that's mid-unmount and still calling useWedding().
  const handleSignOut = async () => {
    if (DEFAULT_WEDDING_ID === null) {
      router.replace('/invite');
      await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
    }
    await logout();
  };

  const [deleting, setDeleting] = useState(false);
  const handleDeleteAccount = () => {
    if (!guestName || deleting) return;
    Alert.alert(
      'Delete your account?',
      'This permanently removes your travel details, packing list, song requests, message replies, and reactions for this wedding. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteMyAccount(weddingId, guestName);
              if (DEFAULT_WEDDING_ID === null) {
                router.replace('/invite');
                await AsyncStorage.removeItem(WEDDING_ID_STORAGE_KEY);
              }
              await logout();
            } catch {
              setDeleting(false);
              Alert.alert(
                'Could not delete account',
                'Something went wrong. Please check your connection and try again.',
              );
            }
          },
        },
      ],
    );
  };
  const [info, setInfo] = useState<MyInfo>({
    hotel: '',
    checkIn: '',
    checkOut: '',
    arrivalTime: '',
    flightNumber: '',
    extraNotes: '',
    phone: '',
    email: '',
    dietary: '',
    meal1: '',
    meal2: '',
    meal3: '',
  });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [sendStatus, setSendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (guestName) {
      getMyInfo(weddingId, guestName).then((data) => {
        setInfo(data);
        setLoading(false);
      });
    }
  }, [weddingId, guestName]);

  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const handlePickProfilePhoto = async () => {
    if (!canonicalName) {
      Alert.alert(
        'Not linked to a guest row',
        "We couldn't find your name in the guest list, so uploads aren't wired up. Contact the couple if this is unexpected.",
      );
      return;
    }
    haptic.light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access needed',
        'Please allow photo library access in Settings to upload a profile picture.',
      );
      return;
    }
    // Note: matching the admin message-images picker exactly — no
    // allowsEditing. The iOS 17+ system cropper occasionally returned
    // a ph:// or empty URI after editing which then died silently in
    // the fetch → arrayBuffer step. Circular avatar cropping happens
    // at render time via CSS instead.
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets?.[0];
    if (!asset?.uri) {
      Alert.alert(
        'No photo selected',
        'The picker didn\'t return an image. Please try again.',
      );
      return;
    }

    setUploadingPhoto(true);
    try {
      const url = await uploadGuestProfileImage(
        weddingId,
        canonicalName,
        asset.uri,
        asset.mimeType ?? 'image/jpeg',
      );
      await updateGuestProfile(weddingId, canonicalName, { profile_photo_url: url });
      setProfilePhotoUrl(url);
      // Keep the in-memory attendees list in sync so the Attendees tab
      // shows the new photo immediately without a re-fetch.
      patchAttendeeProfile(canonicalName, { profile_photo_url: url });
      haptic.success();
    } catch (err) {
      // Surface the actual error so we can see what's going wrong — the
      // silent catch was hiding useful signals like "Bucket not found",
      // "row-level security", or a bad file URI.
      const message = err instanceof Error ? err.message : String(err);
      console.error('[profile-photo] upload failed', err);
      Alert.alert('Upload failed', message || 'Could not upload your photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleRemoveProfilePhoto = () => {
    if (!canonicalName) return;
    Alert.alert('Remove profile photo?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          haptic.warning();
          setProfilePhotoUrl(null);
          try {
            await updateGuestProfile(weddingId, canonicalName, { profile_photo_url: null });
            patchAttendeeProfile(canonicalName, { profile_photo_url: null });
          } catch {
            Alert.alert('Error', 'Could not remove your photo.');
          }
        },
      },
    ]);
  };

  const handleBioChange = (value: string) => {
    if (!canonicalName) return;
    setBio(value);
    setProfileSaveStatus('saving');
    clearTimeout(bioSaveTimer.current);
    bioSaveTimer.current = setTimeout(async () => {
      const trimmed = value.trim();
      const nextBio = trimmed.length === 0 ? null : trimmed;
      try {
        await updateGuestProfile(weddingId, canonicalName, { bio: nextBio });
        patchAttendeeProfile(canonicalName, { bio: nextBio });
        setProfileSaveStatus('saved');
      } catch {
        setProfileSaveStatus('idle');
      }
    }, 1000);
  };

  const persist = useCallback(async (updated: MyInfo) => {
    if (!guestName) return;
    setSaveStatus('saving');
    await saveMyInfo(weddingId, guestName, updated);
    setSaveStatus('saved');
  }, [weddingId, guestName]);

  // For text fields: debounce 1 second after typing stops
  const update = (key: keyof MyInfo) => (value: string) => {
    setInfo((prev) => {
      const updated = { ...prev, [key]: value };
      setSaveStatus('idle');
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => persist(updated), 1000);
      return updated;
    });
  };

  // For pickers / date fields: save immediately
  const updateImmediate = (key: keyof MyInfo) => (value: string) => {
    setInfo((prev) => {
      const updated = { ...prev, [key]: value };
      clearTimeout(saveTimer.current);
      persist(updated);
      return updated;
    });
  };

  const handleSendMessage = async () => {
    const message = info.extraNotes.trim();
    if (!guestName || !message) return;
    setSendStatus('sending');
    // Make sure the note is in the DB before the email goes out so the
    // couple's follow-up matches what the guest sees on their device.
    clearTimeout(saveTimer.current);
    try {
      await persist(info);
      await sendGuestMessage(weddingId, guestName, message);
      setSendStatus('sent');
      setTimeout(() => setSendStatus((s) => (s === 'sent' ? 'idle' : s)), 3000);
    } catch {
      setSendStatus('error');
      setTimeout(() => setSendStatus((s) => (s === 'error' ? 'idle' : s)), 4000);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.kav}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        {/* Page header */}
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>My Details</Text>
          <Text style={styles.pageSubtitleTag}>Your Information</Text>
          <Text style={styles.pageSubtitle}>
            Help us plan for your arrival and make sure we have everything just right for you!
          </Text>
        </View>

        {/* Guest name display */}
        <View style={styles.guestBadge}>
          <Ionicons name="person-circle-outline" size={26} color={Colors.primary} />
          <View style={styles.guestBadgeText}>
            <Text style={styles.guestBadgeLabel}>Logged in as</Text>
            <Text style={styles.guestBadgeName}>{guestName}</Text>
          </View>
        </View>

        {/* Profile — shown to other guests on the Attendees directory */}
        {canonicalName && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTag}>Profile</Text>
            <Text style={styles.sectionTitle}>How you'll show up to other guests</Text>
            <Text style={styles.sectionSubtext}>
              Optional. A photo and a short line help other guests recognize you at events.
            </Text>

            <View style={styles.profilePhotoRow}>
              <View style={styles.profilePhotoWrapper}>
                {profilePhotoUrl ? (
                  <Image source={{ uri: profilePhotoUrl }} style={styles.profilePhoto} />
                ) : (
                  <View style={[styles.profilePhoto, styles.profilePhotoPlaceholder]}>
                    <Ionicons name="person" size={38} color={Colors.textMuted} />
                  </View>
                )}
                {uploadingPhoto && (
                  <View style={styles.profilePhotoOverlay}>
                    <ActivityIndicator color={Colors.white} />
                  </View>
                )}
              </View>
              <View style={styles.profilePhotoActions}>
                <TouchableOpacity
                  onPress={handlePickProfilePhoto}
                  disabled={uploadingPhoto}
                  style={styles.profilePhotoButton}
                  activeOpacity={0.85}
                >
                  <Ionicons name="image-outline" size={14} color={Colors.white} />
                  <Text style={styles.profilePhotoButtonText}>
                    {profilePhotoUrl ? 'Change photo' : 'Upload photo'}
                  </Text>
                </TouchableOpacity>
                {profilePhotoUrl && !uploadingPhoto && (
                  <TouchableOpacity
                    onPress={handleRemoveProfilePhoto}
                    style={styles.profilePhotoRemoveButton}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.profilePhotoRemoveText}>Remove</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>How you know {wedding.couple_names}</Text>
              <TextInput
                style={[styles.fieldInput, styles.fieldInputMultiline]}
                value={bio}
                onChangeText={handleBioChange}
                placeholder="e.g. Bride's college roommate"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
                maxLength={140}
              />
              <View style={styles.profileFooter}>
                <Text style={styles.profileFooterCount}>{bio.length}/140</Text>
                {profileSaveStatus === 'saving' && (
                  <Text style={styles.profileFooterHint}>Saving…</Text>
                )}
                {profileSaveStatus === 'saved' && (
                  <Text style={styles.profileFooterHint}>Saved</Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Contact section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Contact</Text>
          <Text style={styles.sectionTitle}>Your contact details</Text>
          <Text style={styles.sectionSubtext}>
            So we can reach you if anything changes before or during the trip.
          </Text>
          <Field
            label="Phone number"
            value={info.phone}
            onChange={update('phone')}
            placeholder="e.g. +1 (555) 000-0000"
            keyboardType="phone-pad"
            autoCapitalize="none"
          />
          <Field
            label="Email address"
            value={info.email}
            onChange={update('email')}
            placeholder="e.g. your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Accommodation section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Accommodation</Text>
          <Text style={styles.sectionTitle}>Where are you staying?</Text>
          <HotelPickerField
            label="Hotel or accommodation"
            value={info.hotel}
            onChange={updateImmediate('hotel')}
            scrollRef={scrollRef}
          />
          <DateField
            label="Check-in date"
            value={info.checkIn}
            onChange={updateImmediate('checkIn')}
            placeholder="Select date"
            minimumDate={travel.min}
            maximumDate={travel.max}
            initialDate={travel.checkInInitial}
          />
          <DateField
            label="Check-out date"
            value={info.checkOut}
            onChange={updateImmediate('checkOut')}
            placeholder="Select date"
            minimumDate={travel.min}
            maximumDate={travel.max}
            initialDate={travel.checkOutInitial}
          />
        </View>

        {/* Arrival section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Arrival</Text>
          <Text style={styles.sectionTitle}>Getting to {wedding.destination_city}</Text>
          <Field
            label={`Estimated arrival time in ${wedding.destination_city}`}
            value={info.arrivalTime}
            onChange={update('arrivalTime')}
            placeholder="e.g. Thursday 3:00 PM"
          />
          <Field
            label="Flight number (if applicable)"
            value={info.flightNumber}
            onChange={update('flightNumber')}
            placeholder="e.g. LX1234 arriving Geneva 11:30"
            autoCapitalize="none"
          />
        </View>

        {/* Meal choices — pre-collected, read-only */}
        {(info.meal1 || info.meal2 || info.meal3) ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTag}>Menu</Text>
            <Text style={styles.sectionTitle}>Your Meal Selections</Text>
            <Text style={styles.sectionSubtext}>
              Your meal choices from your RSVP. Contact us if anything needs to change.
            </Text>
            <ReadOnlyField label="Starter" value={info.meal1} />
            <ReadOnlyField label="Second Course" value={info.meal2} />
            <ReadOnlyField label="Main Course" value={info.meal3} />
          </View>
        ) : null}

        {/* Dietary — pre-collected, read-only */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Dietary</Text>
          <Text style={styles.sectionTitle}>Dietary Requirements</Text>
          {info.dietary ? (
            <>
              <Text style={styles.sectionSubtext}>
                We have noted the following from your RSVP. Contact us if anything has changed.
              </Text>
              <View style={styles.dietaryBadge}>
                <Ionicons name="alert-circle-outline" size={16} color={Colors.primary} />
                <Text style={styles.dietaryBadgeText}>{info.dietary}</Text>
              </View>
            </>
          ) : (
            <Text style={styles.noRestrictions}>
              No dietary restrictions noted from your RSVP. If anything has changed, please contact us.
            </Text>
          )}
        </View>

        {/* Extra notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTag}>Notes</Text>
          <Text style={styles.sectionTitle}>Anything else?</Text>
          <Text style={styles.sectionSubtext}>
            Accessibility needs, special requests, or just a message for the couple?
          </Text>
          <Field
            label={`Notes for ${wedding.couple_names}`}
            value={info.extraNotes}
            onChange={update('extraNotes')}
            placeholder="Type your message here..."
            multiline
          />
          <TouchableOpacity
            style={[
              styles.sendMessageButton,
              (!info.extraNotes.trim() || sendStatus === 'sending') && styles.sendMessageButtonDisabled,
            ]}
            onPress={handleSendMessage}
            disabled={!info.extraNotes.trim() || sendStatus === 'sending'}
            activeOpacity={0.8}
          >
            {sendStatus === 'sending' ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <>
                <Ionicons
                  name={sendStatus === 'sent' ? 'checkmark' : 'paper-plane-outline'}
                  size={15}
                  color={Colors.white}
                />
                <Text style={styles.sendMessageButtonText}>
                  {sendStatus === 'sent' ? 'Sent!' : sendStatus === 'error' ? 'Try again' : 'Send to the couple'}
                </Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.sendMessageHint}>
            The note stays saved here. Sending also emails {wedding.couple_names}.
          </Text>
        </View>

        {/* Auto-save status */}
        {saveStatus !== 'idle' && (
          <View style={styles.saveStatus}>
            {saveStatus === 'saving' ? (
              <>
                <ActivityIndicator size="small" color={Colors.textMuted} style={{ marginRight: 6 }} />
                <Text style={styles.saveStatusText}>Saving…</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={15} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={[styles.saveStatusText, { color: Colors.primary }]}>All changes saved</Text>
              </>
            )}
          </View>
        )}

        <Text style={styles.privacyNote}>
          Your details are shared with {wedding.couple_names} to help with planning.
        </Text>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut} disabled={deleting}>
          <Ionicons name="log-out-outline" size={17} color={Colors.textMuted} />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        {/* Delete account */}
        <TouchableOpacity
          style={styles.deleteAccountButton}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={Colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={15} color={Colors.error} />
              <Text style={styles.deleteAccountText}>Delete my account</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.deleteAccountHint}>
          Permanently removes your data from this wedding. This cannot be undone.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1, backgroundColor: Colors.background },
  container: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: Spacing.lg },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },

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

  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  guestBadgeText: { flex: 1, marginLeft: Spacing.sm },
  guestBadgeLabel: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
  },
  guestBadgeName: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },

  sectionCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  sectionTag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  sectionSubtext: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  field: { marginBottom: Spacing.md },
  fieldLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  fieldInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },

  profilePhotoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  profilePhotoWrapper: {
    width: 92,
    height: 92,
    borderRadius: 46,
    overflow: 'hidden',
    position: 'relative',
  },
  profilePhoto: {
    width: 92,
    height: 92,
    borderRadius: 46,
    backgroundColor: Colors.surfaceWarm,
  },
  profilePhotoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profilePhotoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePhotoActions: { flex: 1, gap: Spacing.xs },
  profilePhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingVertical: 9,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
  },
  profilePhotoButtonText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  profilePhotoRemoveButton: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  profilePhotoRemoveText: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },
  profileFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  profileFooterCount: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },
  profileFooterHint: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
  },

  readOnlyField: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceWarm,
  },
  readOnlyText: {
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },

  dietaryBadge: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  dietaryBadgeText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  noRestrictions: {
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    lineHeight: 20,
  },

  saveStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  saveStatusText: {
    fontSize: 12,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
  },

  privacyNote: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 18,
    marginBottom: Spacing.sm,
  },

  sendMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 11,
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    minHeight: 40,
  },
  sendMessageButtonDisabled: {
    opacity: 0.45,
  },
  sendMessageButtonText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
    letterSpacing: 0.3,
  },
  sendMessageHint: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },

  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  logoutText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textDecorationLine: 'underline',
  },

  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.xs,
    minHeight: 32,
  },
  deleteAccountText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.error,
  },
  deleteAccountHint: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
    lineHeight: 16,
    marginTop: 2,
  },
});
