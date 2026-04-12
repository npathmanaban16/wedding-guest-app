import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { WEDDING } from '@/constants/weddingData';

const ALBUM_URL = 'https://photos.app.goo.gl/YCMxM6i7XRNzKERd6';

export default function PhotosScreen() {
  const insets = useSafeAreaInsets();

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
          Share your favourite photos and videos from the weekend
        </Text>
      </View>

      {/* Main CTA card */}
      <View style={styles.albumCard}>
        <View style={styles.albumIconWrap}>
          <Ionicons name="images" size={40} color={Colors.primary} />
        </View>
        <Text style={styles.albumTitle}>Neha & Naveen's Shared Album</Text>
        <Text style={styles.albumBody}>
          All photos and videos from the wedding weekend live here. Add yours and see what everyone else captured.
        </Text>
        <TouchableOpacity
          style={styles.albumButton}
          onPress={() => Linking.openURL(ALBUM_URL)}
          activeOpacity={0.85}
        >
          <Ionicons name="logo-google" size={18} color={Colors.white} style={{ marginRight: Spacing.xs }} />
          <Text style={styles.albumButtonText}>Open in Google Photos</Text>
        </TouchableOpacity>
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
          <Text style={styles.hashtag}>{WEDDING.hashtag}</Text>
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
