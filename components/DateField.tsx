import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

// Dates stored as ISO date strings "YYYY-MM-DD" or '' if not set
function parseDate(value: string): Date {
  if (value) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  // Default to May 21 2026
  return new Date('2026-05-21');
}

function formatDisplay(value: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  label: string;
  value: string; // ISO date string "YYYY-MM-DD" or ''
  onChange: (v: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

export function DateField({ label, value, onChange, placeholder, minimumDate, maximumDate }: Props) {
  const [show, setShow] = useState(false);
  const date = parseDate(value);

  const handleChange = (_: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) {
      // Store as YYYY-MM-DD
      const iso = selected.toISOString().split('T')[0];
      onChange(iso);
    }
  };

  const displayText = formatDisplay(value);

  if (Platform.OS === 'android') {
    return (
      <View style={styles.wrapper}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity style={styles.trigger} onPress={() => setShow(true)} activeOpacity={0.8}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} style={styles.icon} />
          <Text style={[styles.triggerText, !displayText && { color: Colors.textMuted }]}>
            {displayText || placeholder || 'Select date...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
        {show && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </View>
    );
  }

  // iOS — show in a modal overlay
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.trigger} onPress={() => setShow(true)} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} style={styles.icon} />
        <Text style={[styles.triggerText, !displayText && { color: Colors.textMuted }]}>
          {displayText || placeholder || 'Select date...'}
        </Text>
        <Ionicons name="chevron-down" size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      <Modal visible={show} transparent animationType="slide" onRequestClose={() => setShow(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setShow(false)} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{label}</Text>
          <DateTimePicker
            value={date}
            mode="date"
            display="spinner"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            style={styles.picker}
          />
          <TouchableOpacity style={styles.doneButton} onPress={() => setShow(false)}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
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
  icon: { marginRight: Spacing.xs },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },

  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 40,
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
    marginBottom: Spacing.sm,
    letterSpacing: 0.2,
  },
  picker: {
    width: '100%',
  },
  doneButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
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
