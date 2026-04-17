import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { SWITZERLAND_GUIDE, GuideItem } from '@/constants/weddingData';
import { haptic } from '@/utils/haptics';
import { Linking } from 'react-native';
import { Platform } from 'react-native';

const PIN_COLORS: Record<string, string> = {
  Sightseeing: '#8B5E6B',
  Activity: '#4A7C6F',
  Restaurant: '#C9853A',
  Bar: '#C9853A',
  Café: '#C9853A',
};

function openMaps(address: string) {
  haptic.medium();
  const encoded = encodeURIComponent(address);
  const url = Platform.select({
    ios: `maps:0,0?q=${encoded}`,
    android: `geo:0,0?q=${encoded}`,
    default: `https://maps.google.com/maps?q=${encoded}`,
  });
  Linking.openURL(url);
}

type Pin = GuideItem & { coordinate: { latitude: number; longitude: number } };

function allPins(): Pin[] {
  const pins: Pin[] = [];
  for (const section of SWITZERLAND_GUIDE) {
    const items = section.subsections
      ? section.subsections.flatMap((s) => s.items)
      : (section.items ?? []);
    for (const item of items) {
      if (item.coordinate) pins.push(item as Pin);
    }
  }
  return pins;
}

const MAP_PINS = allPins();

export default function GuideMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const selectedPin = MAP_PINS.find((p) => p.id === selected) ?? null;

  return (
    <View style={styles.mapContainer}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 46.4314,
          longitude: 6.9108,
          latitudeDelta: 0.25,
          longitudeDelta: 0.35,
        }}
        showsUserLocation={false}
        showsPointsOfInterest={false}
        mapType="standard"
      >
        {MAP_PINS.map((pin) => (
          <Marker
            key={pin.id}
            coordinate={pin.coordinate}
            title={pin.name}
            pinColor={PIN_COLORS[pin.category] ?? '#8B5E6B'}
            onPress={() => setSelected(pin.id === selected ? null : pin.id)}
          />
        ))}
      </MapView>
      {selectedPin && (
        <View style={styles.callout}>
          <View style={styles.calloutInner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.calloutName}>{selectedPin.name}</Text>
              <Text style={styles.calloutCategory}>{selectedPin.category}</Text>
            </View>
            <TouchableOpacity
              style={styles.calloutBtn}
              onPress={() => openMaps(selectedPin.address!)}
              activeOpacity={0.8}
            >
              <Ionicons name="map-outline" size={13} color={Colors.gold} />
              <Text style={styles.calloutBtnText}>Directions</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mapContainer: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  map: {
    width: '100%',
    height: 220,
  },
  callout: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 0.5,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  calloutInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  calloutName: {
    fontFamily: Fonts.serifMedium,
    fontSize: 14,
    color: Colors.textPrimary,
  },
  calloutCategory: {
    fontFamily: Fonts.sans,
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 1,
  },
  calloutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.md,
    paddingVertical: 7,
    paddingHorizontal: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  calloutBtnText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
