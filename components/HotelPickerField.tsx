import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  FlatList,
  SafeAreaView,
  TextInput,
  KeyboardAvoidingView,
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

const OTHER = '__other__';
const LIST_ITEMS = [...HOTEL_OPTIONS, OTHER];

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
}

export function HotelPickerField({ label, value, onChange }: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [otherText, setOtherText] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);

  const isKnownHotel = HOTEL_OPTIONS.includes(value);
  const isOther = !isKnownHotel && value !== '';
  const triggerLabel = isKnownHotel ? value : isOther ? value : '';

  const handleSelect = (item: string) => {
    if (item === OTHER) {
      setOtherText(isOther ? value : '');
      setShowOtherInput(true);
    } else {
      setShowOtherInput(false);
      onChange(item);
      setModalVisible(false);
    }
  };

  const handleOtherConfirm = () => {
    if (otherText.trim()) {
      onChange(otherText.trim());
    }
    setShowOtherInput(false);
    setModalVisible(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.trigger, modalVisible && styles.triggerActive]}
        onPress={() => { setShowOtherInput(false); setModalVisible(true); }}
        activeOpacity={0.8}
      >
        <Ionicons
          name="bed-outline"
          size={16}
          color={modalVisible ? Colors.primary : Colors.textMuted}
          style={styles.icon}
        />
        <Text style={[styles.triggerText, !triggerLabel && { color: Colors.textMuted }]}>
          {triggerLabel || 'Select hotel...'}
        </Text>
        <Ionicons
          name={modalVisible ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        />
        <SafeAreaView style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Where are you staying?</Text>

          {showOtherInput ? (
            <View style={styles.otherSection}>
              <Text style={styles.otherLabel}>Enter your hotel name</Text>
              <TextInput
                style={styles.otherInput}
                placeholder="e.g. Hotel Splendid"
                placeholderTextColor={Colors.textMuted}
                value={otherText}
                onChangeText={setOtherText}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleOtherConfirm}
              />
            </View>
          ) : (
            <FlatList
              data={LIST_ITEMS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => {
                const isSelected = item === OTHER ? isOther : value === item;
                const displayText = item === OTHER ? 'Somewhere else...' : item;
                return (
                  <TouchableOpacity
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                      item === OTHER && styles.optionTextOther,
                    ]}>
                      {displayText}
                    </Text>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              }}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}

          <TouchableOpacity
            style={styles.doneButton}
            onPress={showOtherInput ? handleOtherConfirm : () => setModalVisible(false)}
          >
            <Text style={styles.doneButtonText}>
              {showOtherInput ? 'Confirm' : 'Done'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
        </KeyboardAvoidingView>
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
  triggerActive: {
    borderColor: Colors.primary,
  },
  icon: { marginRight: Spacing.xs },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },

  kav: { flex: 1 },
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
  optionTextOther: {
    color: Colors.textMuted,
    fontFamily: Fonts.sans,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.divider,
    marginHorizontal: Spacing.lg,
  },

  otherSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  otherLabel: {
    fontFamily: Fonts.sansMedium,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  otherInput: {
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
