import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';

export const HOTEL_OPTIONS = [
  'Fairmont Le Montreux Palace',
  'Mona Montreux',
  'Villa Toscane',
  'Grand Hotel Suisse Majestic',
  'Royal Plaza Montreux',
];

const OTHER = 'Other';

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function HotelPickerField({ label, value, onChange }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const isOther = value !== '' && !HOTEL_OPTIONS.includes(value);
  const [otherText, setOtherText] = useState(isOther ? value : '');

  const displayValue = HOTEL_OPTIONS.includes(value) ? value : value ? value : '';

  const handleSelect = (option: string) => {
    if (option === OTHER) {
      setModalVisible(false);
      onChange(otherText);
    } else {
      setModalVisible(false);
      setOtherText('');
      onChange(option);
    }
  };

  const selectedLabel = HOTEL_OPTIONS.includes(value)
    ? value
    : value
    ? `Other: ${value}`
    : '';

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      {/* Trigger button */}
      <TouchableOpacity
        style={styles.trigger}
        onPress={() => setModalVisible(true)}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerText, !selectedLabel && { color: Colors.textMuted }]}>
          {selectedLabel || 'Select hotel...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      {/* "Other" free-text input appears inline when no listed hotel is selected */}
      {isOther && (
        <TextInput
          style={styles.otherInput}
          value={value}
          onChangeText={onChange}
          placeholder="Enter your accommodation..."
          placeholderTextColor={Colors.textMuted}
          autoCorrect={false}
        />
      )}

      {/* Modal picker */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Where are you staying?</Text>

          <FlatList
            data={[...HOTEL_OPTIONS, OTHER]}
            keyExtractor={(item) => item}
            renderItem={({ item }) => {
              const isSelected =
                item === OTHER ? isOther : value === item;
              return (
                <TouchableOpacity
                  style={[styles.option, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                    {item}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={18} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              );
            }}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />

          {/* "Other" inline text input inside modal */}
          {(isOther || value === '') && (
            <View style={styles.otherSection}>
              <Text style={styles.otherLabel}>Or type your accommodation:</Text>
              <TextInput
                style={styles.otherModalInput}
                value={isOther ? value : otherText}
                onChangeText={(t) => {
                  setOtherText(t);
                  onChange(t);
                }}
                placeholder="Hotel or accommodation name..."
                placeholderTextColor={Colors.textMuted}
                autoCorrect={false}
              />
            </View>
          )}

          <TouchableOpacity style={styles.doneButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: Spacing.md },
  label: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },
  otherInput: {
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },

  // Modal
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Platform.OS === 'android' ? Spacing.lg : 0,
    maxHeight: '75%',
    ...Shadow.large,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.md,
    letterSpacing: 0.2,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 15,
  },
  optionSelected: { backgroundColor: Colors.surfaceWarm },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },

  otherSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginTop: Spacing.xs,
  },
  otherLabel: {
    fontSize: 11,
    fontFamily: Fonts.sansMedium,
    color: Colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: Spacing.xs,
  },
  otherModalInput: {
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

  doneButton: {
    margin: Spacing.lg,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
  },
});
