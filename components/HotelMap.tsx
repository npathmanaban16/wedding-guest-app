import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import type { WeddingMapLegendItem } from '@/constants/weddingData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

// Bundled floor plan pixel dimensions used by the Fairmont fallback so the
// image reserves the right aspect ratio before it loads. Remote images
// come with unknown intrinsic sizes so we let them layout naturally with
// resizeMode="contain".
const FAIRMONT_IMG_W = 888;
const FAIRMONT_IMG_H = 1016;

interface HotelMapProps {
  // Header title above the map — typically "Hotel Map" or "Venue Map".
  title: string;
  // Ordered list of map pages the guest swipes between. Empty means the
  // card renders legend-only (no images). Entries can be require()'d
  // bundled assets or `{ uri }` objects for remote URLs.
  images: unknown[];
  legend: WeddingMapLegendItem[];
}

export function HotelMap({ title, images, legend }: HotelMapProps) {
  const [open, setOpen] = useState(false);
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  // Content width inside the card's horizontal padding.
  const pageWidth = Math.max(0, containerWidth - Spacing.md * 2);
  // Preserve the Fairmont floor-plan aspect ratio for the bundled asset
  // path; clamp to 420 so tall images don't blow out the card.
  const naturalH = pageWidth > 0 ? Math.round(pageWidth * (FAIRMONT_IMG_H / FAIRMONT_IMG_W)) : 0;
  const pageHeight = pageWidth > 0 ? Math.min(naturalH, 420) : 420;

  const toggle = () => {
    animateLayout();
    setOpen((v) => !v);
  };

  // Snap the page indicator to the finished page after a swipe. Uses
  // onMomentumScrollEnd rather than onScroll so we don't churn state
  // 60 times per swipe.
  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (pageWidth === 0) return;
    const page = Math.round(e.nativeEvent.contentOffset.x / pageWidth);
    if (page !== currentPage) setCurrentPage(page);
  };

  return (
    <View style={s.card}>
      <TouchableOpacity style={s.header} onPress={toggle} activeOpacity={0.85}>
        <View>
          <Text style={s.tag}>Venue Overview</Text>
          <Text style={s.title}>{title}</Text>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>

      {open && (
        <View>
          {images.length > 0 && (
            <>
              <View style={s.divider} />
              <View
                style={s.imageContainer}
                onLayout={(e) => setContainerWidth(Math.floor(e.nativeEvent.layout.width))}
              >
                {pageWidth > 0 && (
                  <>
                    {/* Horizontal paging carousel — one map per page.
                        Each page contains its own pinch-to-zoom scroll
                        view so guests can zoom in on either map. */}
                    <ScrollView
                      horizontal
                      pagingEnabled
                      showsHorizontalScrollIndicator={false}
                      onMomentumScrollEnd={handleScrollEnd}
                      // Fixed height so images below don't shift the card.
                      style={{ height: pageHeight }}
                    >
                      {images.map((img, i) => (
                        <ScrollView
                          key={i}
                          style={{ width: pageWidth, height: pageHeight }}
                          minimumZoomScale={1}
                          maximumZoomScale={4}
                          centerContent
                          bouncesZoom
                          showsHorizontalScrollIndicator={false}
                          showsVerticalScrollIndicator={false}
                        >
                          <Image
                            source={img as never}
                            style={{ width: pageWidth, height: pageHeight }}
                            resizeMode="contain"
                          />
                        </ScrollView>
                      ))}
                    </ScrollView>

                    {images.length > 1 && (
                      <View style={s.pageDots}>
                        {images.map((_, i) => (
                          <View
                            key={i}
                            style={[s.pageDot, i === currentPage && s.pageDotActive]}
                          />
                        ))}
                      </View>
                    )}

                    <Text style={s.zoomHint}>
                      {images.length > 1
                        ? 'Swipe between maps · pinch to zoom'
                        : 'Pinch to zoom'}
                    </Text>
                  </>
                )}
              </View>
            </>
          )}

          {legend.length > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.legend}>
                {legend.map((v) => (
                  <View key={v.n} style={s.legendRow}>
                    <View style={[s.legendPin, { backgroundColor: v.color }]}>
                      <Text style={s.legendPinNum}>{v.n}</Text>
                    </View>
                    <View style={s.legendInfo}>
                      <Text style={s.legendEvent}>{v.event}</Text>
                      <Text style={s.legendRoom}>{v.room}</Text>
                      <Text style={s.legendWhen}>{v.when}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 0.5,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadow.small,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  tag: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    color: Colors.gold,
    marginBottom: 2,
  },
  title: {
    fontFamily: Fonts.serifSemiBold,
    fontSize: 18,
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.divider,
  },

  imageContainer: {
    backgroundColor: '#FFFFFF',
    padding: Spacing.md,
  },
  pageDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.sm,
    gap: 6,
  },
  pageDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.divider,
  },
  pageDotActive: {
    backgroundColor: Colors.primary,
    width: 18,
  },
  zoomHint: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },

  legend: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  legendPin: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  legendPinNum: {
    fontSize: 10,
    fontFamily: Fonts.sansMedium,
    color: '#fff',
  },
  legendInfo: { flex: 1 },
  legendEvent: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  legendRoom: {
    fontSize: 11,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  legendWhen: {
    fontSize: 10,
    fontFamily: Fonts.sans,
    color: Colors.textMuted,
    marginTop: 1,
  },
});
