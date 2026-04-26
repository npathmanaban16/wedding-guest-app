import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { NN_WEDDING_IDS } from '@/constants/weddingData';
import { useWedding } from '@/context/WeddingContext';

// Commissioned watercolor of the couple in front of Fairmont Le Montreux
// Palace. Shown on the N&N variant in place of the stock album icon —
// the SaaS/demo tenant keeps the Ionicons placeholder.
const NN_COUPLE_ILLUSTRATION = require('@/assets/images/nn_couple_fairmont.png');

// Size the illustration frame from the PNG's real aspect ratio so the
// watercolor always fits exactly and the whole composition is visible.
const NN_COUPLE_ASPECT = (() => {
  const src = Image.resolveAssetSource(NN_COUPLE_ILLUSTRATION);
  return src && src.height > 0 ? src.width / src.height : 2 / 3;
})();
const NN_ILLUSTRATION_HEIGHT = 180;
const NN_ILLUSTRATION_WIDTH = NN_ILLUSTRATION_HEIGHT * NN_COUPLE_ASPECT;

export default function PhotosScreen() {
  const insets = useSafeAreaInsets();
  const { wedding } = useWedding();
  const isNN = NN_WEDDING_IDS.has(wedding.id);
  const albumUrl = wedding.photo_album_url ?? '';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Photo Gallery</Text>
        <Text style={styles.pageSubtitleTag}>Share Your Moments</Text>
        <Text style={styles.pageSubtitle}>
          Share your favorite photos and videos from the weekend
        </Text>
      </View>

      {/* Main CTA card */}
      <View style={styles.albumCard}>
        {isNN ? (
          <View
            style={[
              styles.illustrationWrap,
              { width: NN_ILLUSTRATION_WIDTH, height: NN_ILLUSTRATION_HEIGHT },
            ]}
          >
            <Image
              source={NN_COUPLE_ILLUSTRATION}
              style={styles.illustrationImage}
              resizeMode="cover"
              accessibilityLabel={`Watercolor of ${wedding.couple_names} at the Fairmont Le Montreux Palace`}
            />
          </View>
        ) : (
          <View style={styles.albumIconWrap}>
            <Ionicons name="images" size={40} color={Colors.primary} />
          </View>
        )}
        <Text style={styles.albumTitle}>{wedding.couple_names}'s Shared Album</Text>
        <Text style={styles.albumBody}>
          All photos and videos from the wedding weekend live here. Add yours and see what everyone else captured.
        </Text>
        {albumUrl ? (
          <TouchableOpacity
            style={styles.albumButton}
            onPress={() => Linking.openURL(albumUrl)}
            activeOpacity={0.85}
          >
            <Ionicons name="logo-google" size={18} color={Colors.white} style={{ marginRight: Spacing.xs }} />
            <Text style={styles.albumButtonText}>Open in Google Photos</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.albumBody}>
            The shared album hasn't been set up yet — check back soon.
          </Text>
        )}
      </View>

      {/* How to add photos */}
      <View style={styles.stepsCard}>
        <Text style={styles.stepsTitle}>How to add your photos</Text>
        {[
          { n: '1', text: 'Tap "Open in Google Photos" above' },
          { n: '2', text: 'Sign in with any Google account' },
          { n: '3', text: 'Tap the + button to add photos or videos from your camera roll' },
          { n: '4', text: 'They\'ll appear in the shared album for everyone to see' },
        ].map((step) => (
          <View key={step.n} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{step.n}</Text>
            </View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Hashtag nudge */}
      <View style={styles.hashtagCard}>
        <Ionicons name="rose-outline" size={16} color={Colors.gold} style={{ marginRight: Spacing.xs, marginTop: 1 }} />
        <Text style={styles.hashtagText}>
          Also tag your posts{' '}
          <Text style={styles.hashtag}>{wedding.hashtag}</Text>
          {' '}so we can find them!
        </Text>
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

  // Wrap for the N&N watercolor that takes the album card's icon slot.
  // Width + height are applied inline from the PNG's actual aspect
  // ratio so the whole composition always fits exactly.
  illustrationWrap: {
    marginBottom: Spacing.lg,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceWarm,
  },
  illustrationImage: { width: '100%', height: '100%' },

  albumCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  albumIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.surfaceWarm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  albumTitle: {
    fontSize: 20,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  albumBody: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  albumButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xl,
    ...Shadow.small,
  },
  albumButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
    letterSpacing: 0.2,
  },

  stepsCard: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  stepsTitle: {
    fontSize: 15,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    letterSpacing: 0.2,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
    marginTop: 1,
    flexShrink: 0,
  },
  stepNumberText: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 21,
  },

  hashtagCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  hashtagText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  hashtag: {
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },
});
