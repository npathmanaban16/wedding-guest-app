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
// come with unknown intrinsic sizes so we let them layout naturally.
const FAIRMONT_IMG_W = 888;
const FAIRMONT_IMG_H = 1016;

interface HotelMapProps {
  // Header title above the map — typically "Hotel Map" or "Venue Map".
  title: string;
  // require()'d bundled asset or { uri } for a remote URL. Undefined
  // hides the image (legend-only maps still render as a card).
  image?: unknown;
  legend: WeddingMapLegendItem[];
}

export function HotelMap({ title, image, legend }: HotelMapProps) {
  const [open, setOpen] = useState(false);
  const [imgW, setImgW] = useState(0);
  // Only the bundled Fairmont plan has a known aspect ratio we want to
  // preserve. For remote images fall back to a fixed viewport so pinch-
  // to-zoom still works before we know the intrinsic size.
  const imgH = imgW > 0 ? Math.round(imgW * (FAIRMONT_IMG_H / FAIRMONT_IMG_W)) : 0;

  const toggle = () => {
    animateLayout();
    setOpen((v) => !v);
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
          {image !== undefined && (
            <>
              <View style={s.divider} />
              <View
                style={s.imageContainer}
                onLayout={(e) => setImgW(Math.floor(e.nativeEvent.layout.width) - Spacing.md * 2)}
              >
                <ScrollView
                  style={{ height: imgH > 0 ? Math.min(imgH, 420) : 420 }}
                  minimumZoomScale={1}
                  maximumZoomScale={4}
                  centerContent
                  bouncesZoom
                  showsHorizontalScrollIndicator={false}
                  showsVerticalScrollIndicator={false}
                >
                  {imgW > 0 && (
                    <Image
                      source={image as never}
                      style={{ width: imgW, height: imgH }}
                      resizeMode="stretch"
                    />
                  )}
                </ScrollView>
                <Text style={s.zoomHint}>Pinch to zoom</Text>
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
