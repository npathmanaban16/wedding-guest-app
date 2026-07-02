import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { useWedding } from '@/context/WeddingContext';
import { haptic } from '@/utils/haptics';
import {
  deleteWeddingGuideImage,
  updateWeddingGuidePhotoStrip,
  uploadWeddingGuideImage,
} from '@/services/guide';

// Persisted-shape row — same as what wedding_guides.photo_strip stores.
interface Photo {
  url: string;
  label: string;
}

// Extracts a URI from a GuidePhoto's `source` field when the underlying
// image is DB-backed (i.e. `{ uri: string }`). Bundled require() modules
// return undefined so we can skip them — they aren't editable.
function extractUri(source: unknown): string | undefined {
  if (typeof source === 'object' && source !== null && 'uri' in source) {
    const uri = (source as { uri: unknown }).uri;
    return typeof uri === 'string' ? uri : undefined;
  }
  return undefined;
}

export default function AdminGuidePhotosScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { guestName } = useAuth();
  const { weddingId, guide, isAdmin, hasEditableGuide, patchGuidePhotoStrip } = useWedding();

  // Local ordered list — mirrors what will be written to
  // wedding_guides.photo_strip when the admin taps Save changes.
  const initial = useMemo<Photo[]>(() => {
    return guide.photoStrip
      .map((p) => {
        const url = extractUri(p.source);
        return url ? { url, label: p.label } : null;
      })
      .filter((p): p is Photo => p !== null);
  }, [guide.photoStrip]);

  const [photos, setPhotos] = useState<Photo[]>(initial);
  const [saved, setSaved] = useState<Photo[]>(initial);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  // URLs that have been removed from the local list but not yet unlinked
  // from the underlying bucket. Deleted from storage AFTER a successful
  // DB write so an aborted save leaves the file intact and re-appearable
  // by adding it back with the same URL.
  const [pendingDeletions, setPendingDeletions] = useState<string[]>([]);

  useEffect(() => {
    setPhotos(initial);
    setSaved(initial);
    setPendingDeletions([]);
  }, [initial]);

  if (!guestName || !isAdmin(guestName)) {
    return (
      <View style={styles.guard}>
        <Text style={styles.guardText}>Not authorized.</Text>
      </View>
    );
  }

  const dirty = useMemo(() => {
    if (photos.length !== saved.length) return true;
    for (let i = 0; i < photos.length; i++) {
      if (photos[i].url !== saved[i].url) return true;
      if (photos[i].label !== saved[i].label) return true;
    }
    return false;
  }, [photos, saved]);

  const handlePickAndUpload = async () => {
    if (!hasEditableGuide) return;
    haptic.light();
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(
        'Photo access needed',
        'Allow photo library access in Settings to add a photo.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType ?? 'image/jpeg';

    setUploading(true);
    try {
      const url = await uploadWeddingGuideImage(weddingId, asset.uri, mimeType);
      setPhotos((prev) => [...prev, { url, label: '' }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Upload failed', msg);
    } finally {
      setUploading(false);
    }
  };

  const updateLabel = (index: number, label: string) => {
    setPhotos((prev) => prev.map((p, i) => (i === index ? { ...p, label } : p)));
  };

  const removePhoto = (index: number) => {
    haptic.light();
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) setPendingDeletions((del) => [...del, removed.url]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= photos.length) return;
    haptic.light();
    setPhotos((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item);
      return next;
    });
  };

  const handleSave = async () => {
    if (!dirty || saving) return;
    haptic.medium();
    setSaving(true);
    try {
      await updateWeddingGuidePhotoStrip(
        weddingId,
        photos.map((p) => ({ url: p.url, label: p.label.trim() })),
      );
      patchGuidePhotoStrip(
        photos.map((p) => ({ url: p.url, label: p.label.trim() })),
      );
      setSaved(photos);
      // Best-effort cleanup — orphaned bucket files add up over time,
      // but a failed delete shouldn't unwind the save the admin just
      // completed. Any file that survives can be cleaned up manually
      // via the Supabase dashboard.
      const toDelete = pendingDeletions;
      setPendingDeletions([]);
      await Promise.all(
        toDelete.map((url) =>
          deleteWeddingGuideImage(url).catch((err) => {
            console.warn('[admin-guide-photos] delete failed', url, err);
          }),
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Save failed', msg);
    } finally {
      setSaving(false);
    }
  };

  // Legacy tenants with no wedding_guides row — the photo strip is a
  // bundled require() list and can't be edited from here. Show a
  // read-only note instead of an empty editor.
  if (!hasEditableGuide) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Travel Photos</Text>
        </View>
        <Text style={styles.readOnlyText}>
          This wedding uses bundled travel photos that can't be changed
          from the app. Contact the couple's developer to update them.
        </Text>
      </ScrollView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color={Colors.textMuted} />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Travel Photos</Text>
          <Text style={styles.pageSubtitle}>
            Upload photos for the carousel at the top of the Travel tab.
            Use the arrows to reorder them.
          </Text>
        </View>

        {photos.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="images-outline" size={28} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No travel photos yet.</Text>
            <Text style={styles.emptyHint}>
              Upload your first one below — guests will see it on the Travel tab.
            </Text>
          </View>
        ) : (
          photos.map((photo, index) => (
            <View key={photo.url} style={styles.photoCard}>
              <Image source={{ uri: photo.url }} style={styles.thumb} resizeMode="cover" />
              <View style={styles.photoBody}>
                <Text style={styles.fieldLabel}>Caption</Text>
                <TextInput
                  style={styles.input}
                  value={photo.label}
                  onChangeText={(text) => updateLabel(index, text)}
                  placeholder="e.g. Salt Creek Beach"
                  placeholderTextColor={Colors.textMuted}
                  autoCapitalize="sentences"
                />
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    onPress={() => move(index, -1)}
                    disabled={index === 0}
                    style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                    hitSlop={8}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="arrow-up" size={16} color={index === 0 ? Colors.textMuted : Colors.textPrimary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => move(index, 1)}
                    disabled={index === photos.length - 1}
                    style={[
                      styles.reorderBtn,
                      index === photos.length - 1 && styles.reorderBtnDisabled,
                    ]}
                    hitSlop={8}
                    activeOpacity={0.6}
                  >
                    <Ionicons
                      name="arrow-down"
                      size={16}
                      color={index === photos.length - 1 ? Colors.textMuted : Colors.textPrimary}
                    />
                  </TouchableOpacity>
                  <View style={{ flex: 1 }} />
                  <TouchableOpacity
                    onPress={() => removePhoto(index)}
                    style={styles.removeBtn}
                    hitSlop={8}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} />
                    <Text style={styles.removeBtnText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}

        <TouchableOpacity
          onPress={handlePickAndUpload}
          disabled={uploading}
          style={[styles.uploadBtn, uploading && styles.uploadBtnDisabled]}
          activeOpacity={0.85}
        >
          {uploading ? (
            <ActivityIndicator color={Colors.primary} size="small" />
          ) : (
            <>
              <Ionicons name="add" size={18} color={Colors.primary} />
              <Text style={styles.uploadBtnText}>Add photo</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSave}
          disabled={!dirty || saving}
          style={[styles.saveBtn, (!dirty || saving) && styles.saveBtnDisabled]}
          activeOpacity={0.85}
        >
          {saving ? (
            <ActivityIndicator color={Colors.white} size="small" />
          ) : (
            <Text style={styles.saveBtnText}>{dirty ? 'Save changes' : 'Saved'}</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Changes apply to all guests on their next app open. Removing a
          photo also deletes it from storage — free-text captions can be
          left blank if you don't want a label under the photo.
        </Text>

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
    lineHeight: 19,
  },

  readOnlyText: {
    fontFamily: Fonts.sans,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  emptyCard: {
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  emptyText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptyHint: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },

  photoCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
    gap: Spacing.md,
  },
  thumb: {
    width: 96,
    height: 96,
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
  },
  photoBody: { flex: 1 },
  fieldLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    marginBottom: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  reorderBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceWarm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  reorderBtnDisabled: { opacity: 0.4 },
  removeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
  },
  removeBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.error,
  },

  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    marginBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  uploadBtnDisabled: { opacity: 0.5 },
  uploadBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 14,
    color: Colors.primary,
  },

  saveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: Spacing.md,
    ...Shadow.small,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: 0.3,
  },

  footnote: {
    fontFamily: Fonts.sans,
    fontSize: 12,
    color: Colors.textMuted,
    lineHeight: 17,
    paddingHorizontal: Spacing.xs,
  },
});
