import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  FlatList,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Radius, Shadow } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getPhotos, addPhoto, PhotoRecord } from '@/services/storage';
import { WEDDING } from '@/constants/weddingData';

const { width } = Dimensions.get('window');
const PHOTO_SIZE = (width - Spacing.lg * 2 - Spacing.sm) / 2;

function PhotoThumbnail({ photo }: { photo: PhotoRecord }) {
  return (
    <View style={styles.thumbnail}>
      <Image source={{ uri: photo.uri }} style={styles.thumbnailImage} />
      <View style={styles.thumbnailOverlay}>
        {photo.type === 'video' && (
          <View style={styles.videoIndicator}>
            <Ionicons name="play" size={12} color={Colors.white} />
          </View>
        )}
      </View>
      {photo.caption ? (
        <View style={styles.captionStrip}>
          <Text style={styles.captionText} numberOfLines={1}>
            {photo.caption}
          </Text>
        </View>
      ) : null}
      <View style={styles.submittedByStrip}>
        <Text style={styles.submittedByText} numberOfLines={1}>
          {photo.submittedBy.split(' ')[0]}
        </Text>
      </View>
    </View>
  );
}

export default function PhotosScreen() {
  const insets = useSafeAreaInsets();
  const { guestName } = useAuth();
  const [photos, setPhotos] = useState<PhotoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedUri, setSelectedUri] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<'photo' | 'video'>('photo');

  const loadPhotos = useCallback(async () => {
    const data = await getPhotos();
    setPhotos(data.reverse()); // newest first
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPhotos();
  }, [loadPhotos]);

  const pickMedia = async (type: 'photo' | 'video') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission required',
        'Please allow photo library access to share photos.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: type === 'photo'
        ? ImagePicker.MediaTypeOptions.Images
        : ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedUri(result.assets[0].uri);
      setSelectedType(type);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow camera access to take photos.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setSelectedUri(result.assets[0].uri);
      setSelectedType('photo');
    }
  };

  const submitPhoto = async () => {
    if (!selectedUri || !guestName) return;
    setUploading(true);
    try {
      await addPhoto({
        uri: selectedUri,
        caption: caption.trim(),
        submittedBy: guestName,
        type: selectedType,
      });
      setSelectedUri(null);
      setCaption('');
      await loadPhotos();
      Alert.alert(
        '🎉 Shared!',
        "Your photo has been added to the wedding gallery. The couple will love it!",
      );
    } catch {
      Alert.alert('Error', 'Could not save your photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const cancelSelection = () => {
    setSelectedUri(null);
    setCaption('');
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageEmoji}>📸</Text>
        <Text style={styles.pageTitle}>Photo & Video Gallery</Text>
        <Text style={styles.pageSubtitle}>
          Share your favourite moments from the weekend
        </Text>
      </View>

      {/* Shared album banner */}
      <View style={[styles.sharedAlbumBanner, Shadow.small]}>
        <Text style={styles.bannerEmoji}>☁️</Text>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Also share on the cloud</Text>
          <Text style={styles.bannerSubtitle}>
            Tag your posts {WEDDING.hashtag} and we'll collect them all into a shared album after the wedding!
          </Text>
        </View>
      </View>

      {/* Upload section */}
      {selectedUri ? (
        <View style={[styles.previewCard, Shadow.medium]}>
          <Text style={styles.previewLabel}>Selected {selectedType}</Text>
          {selectedType === 'photo' ? (
            <Image source={{ uri: selectedUri }} style={styles.preview} />
          ) : (
            <View style={styles.videoPreview}>
              <Ionicons name="film-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.videoPreviewText}>Video selected</Text>
            </View>
          )}
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption (optional)..."
            placeholderTextColor={Colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            maxLength={120}
          />
          <View style={styles.previewButtons}>
            <TouchableOpacity style={styles.cancelButton} onPress={cancelSelection}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
              onPress={submitPhoto}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Share ✦</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={[styles.uploadButton, Shadow.small]}
            onPress={() => pickMedia('photo')}
          >
            <Ionicons name="images-outline" size={28} color={Colors.primary} />
            <Text style={styles.uploadButtonLabel}>Choose Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadButton, Shadow.small]}
            onPress={() => pickMedia('video')}
          >
            <Ionicons name="film-outline" size={28} color={Colors.primary} />
            <Text style={styles.uploadButtonLabel}>Choose Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.uploadButton, Shadow.small]}
            onPress={takePhoto}
          >
            <Ionicons name="camera-outline" size={28} color={Colors.primary} />
            <Text style={styles.uploadButtonLabel}>Take Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Gallery */}
      <View style={styles.gallerySection}>
        <Text style={styles.gallerySectionTitle}>
          {photos.length > 0
            ? `${photos.length} shared moment${photos.length !== 1 ? 's' : ''}`
            : 'No photos yet — be the first!'}
        </Text>

        {loading ? (
          <ActivityIndicator color={Colors.primary} style={styles.galleryLoader} />
        ) : (
          <View style={styles.grid}>
            {photos.map((photo) => (
              <PhotoThumbnail key={photo.id} photo={photo} />
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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

  sharedAlbumBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.sageLight,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  bannerEmoji: { fontSize: 24, marginRight: Spacing.sm },
  bannerText: { flex: 1 },
  bannerTitle: {
    fontSize: Typography.base,
    fontFamily: Typography.serif,
    color: Colors.sageDark,
    marginBottom: 2,
  },
  bannerSubtitle: {
    fontSize: Typography.xs,
    color: Colors.sageDark,
    lineHeight: 18,
  },

  uploadButtons: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  uploadButtonLabel: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },

  previewCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    overflow: 'hidden',
  },
  previewLabel: {
    fontSize: Typography.xs,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  preview: {
    width: '100%',
    height: 240,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.divider,
  },
  videoPreview: {
    width: '100%',
    height: 160,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPreviewText: {
    fontSize: Typography.sm,
    color: Colors.textMuted,
    marginTop: Spacing.xs,
  },
  captionInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    fontSize: Typography.sm,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    fontFamily: Typography.sans,
  },
  previewButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cancelButton: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
  },
  submitButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    alignItems: 'center',
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: {
    fontSize: Typography.base,
    color: Colors.white,
    fontWeight: '600',
  },

  gallerySection: { paddingHorizontal: Spacing.lg },
  gallerySectionTitle: {
    fontSize: Typography.base,
    fontFamily: Typography.serif,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  galleryLoader: { marginTop: Spacing.xl },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  thumbnail: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.divider,
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
    padding: Spacing.xs,
  },
  videoIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: Radius.full,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  captionStrip: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  captionText: {
    fontSize: Typography.xs,
    color: Colors.white,
  },
  submittedByStrip: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
  },
  submittedByText: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.85)',
  },
});
