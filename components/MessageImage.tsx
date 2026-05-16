import React, { useState } from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors, Radius } from '@/constants/theme';

// Renders an attached message photo at its natural aspect ratio so guests
// see the full image without a center-crop. We can't know the ratio until
// the image loads — until then we hold a 4:3 placeholder so layout doesn't
// jump dramatically once the dimensions arrive.
export function MessageImage({
  uri,
  style,
}: {
  uri: string;
  style?: StyleProp<ViewStyle>;
}) {
  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);

  return (
    <View style={[styles.frame, { aspectRatio }, style]}>
      <Image
        source={{ uri }}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        onLoad={(e) => {
          const { width, height } = e.nativeEvent.source;
          if (width > 0 && height > 0) setAspectRatio(width / height);
        }}
        accessible
        accessibilityLabel="Attached photo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    borderRadius: Radius.md,
    backgroundColor: Colors.border,
    overflow: 'hidden',
  },
});
