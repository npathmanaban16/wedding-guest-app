import React, { useEffect, useState } from 'react';
import {
  Keyboard,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

// Parse YYYY-MM-DD as local time to avoid UTC offset shifting the date
function parseLocalDate(value: string): Date | null {
  const parts = value?.split('-').map(Number);
  if (parts?.length === 3 && parts.every((n) => !isNaN(n))) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  return null;
}

function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatDisplay(value: string): string {
  if (!value) return '';
  const d = parseLocalDate(value);
  if (!d) return value;
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
}

function NativeDateField({ label, value, onChange, placeholder, minimumDate, maximumDate }: Props) {
  const [show, setShow] = useState(false);

  // Draft state: the date currently displayed in the picker. Seeded from
  // `value` (or minimumDate / today if unset) and kept in sync as the user
  // scrubs. Committing on iOS "Done" uses this, so tapping Done without
  // first changing the date still saves — fixing the bug where tapping the
  // already-selected default didn't fire the picker's onChange.
  const pickerFallback = minimumDate ?? new Date();
  const [draft, setDraft] = useState<Date>(() => parseLocalDate(value) ?? pickerFallback);

  // Re-sync draft when the parent value changes (e.g. a new field loaded
  // from storage) so the picker opens on the saved date next time.
  useEffect(() => {
    const parsed = parseLocalDate(value);
    if (parsed) setDraft(parsed);
  }, [value]);

  // Lazy-load DateTimePicker only on native
  const DateTimePicker = require('@react-native-community/datetimepicker').default;

  const handleChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShow(false);
      if (selected) onChange(formatIso(selected));
      return;
    }
    // iOS inline: just track the draft; commit happens when Done is tapped.
    if (selected) setDraft(selected);
  };

  const handleDone = () => {
    onChange(formatIso(draft));
    setShow(false);
  };

  const displayText = formatDisplay(value);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.trigger, show && styles.triggerActive]}
        onPress={() => {
          // Dismiss any soft-keyboard still up from a previous text input
          // so it doesn't overlap the inline iOS calendar / Android dialog.
          Keyboard.dismiss();
          setShow((v) => !v);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} style={styles.icon} />
        <Text style={[styles.triggerText, !displayText && { color: Colors.textMuted }]}>
          {displayText || placeholder || 'Select date...'}
        </Text>
        <Ionicons name={show ? 'chevron-up' : 'chevron-down'} size={18} color={Colors.textMuted} />
      </TouchableOpacity>

      {show && (
        <View style={styles.pickerContainer}>
          <DateTimePicker
            value={draft}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            themeVariant="light"
            accentColor={Colors.primary}
            style={styles.picker}
          />
          {Platform.OS === 'ios' && (
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

function WebDateField({ label, value, onChange, placeholder, minimumDate, maximumDate }: Props) {
  const formatDateAttr = (d?: Date) => {
    if (!d) return undefined;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.trigger}>
        <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} style={styles.icon} />
        <TextInput
          style={[styles.triggerText, !value && { color: Colors.textMuted }]}
          value={value ? formatDisplay(value) : ''}
          placeholder={placeholder || 'Select date...'}
          placeholderTextColor={Colors.textMuted}
          onFocus={(e) => {
            // On web, swap to a date input type
            const input = e.target as unknown as HTMLInputElement;
            if (input) {
              input.type = 'date';
              if (minimumDate) input.min = formatDateAttr(minimumDate) ?? '';
              if (maximumDate) input.max = formatDateAttr(maximumDate) ?? '';
              if (value) input.value = value;
            }
          }}
          onBlur={(e) => {
            const input = e.target as unknown as HTMLInputElement;
            if (input) input.type = 'text';
          }}
          onChange={(e) => {
            const nativeValue = (e.nativeEvent as any).text || (e.target as unknown as HTMLInputElement)?.value;
            if (nativeValue && /^\d{4}-\d{2}-\d{2}$/.test(nativeValue)) {
              onChange(nativeValue);
            }
          }}
        />
      </View>
    </View>
  );
}

export function DateField(props: Props) {
  if (Platform.OS === 'web') {
    return <WebDateField {...props} />;
  }
  return <NativeDateField {...props} />;
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
  pickerContainer: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginTop: 4,
  },
  picker: {
    width: '100%',
  },
  doneButton: {
    marginHorizontal: Spacing.md,
    marginTop: 4,
    marginBottom: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: 13,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 15,
    fontFamily: Fonts.sansMedium,
    color: Colors.white,
  },
});
