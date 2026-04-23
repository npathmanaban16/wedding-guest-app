import React, { useRef, useState } from 'react';
import {
  findNodeHandle,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  LayoutAnimation,
  Platform,
  ScrollView,
  UIManager,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius } from '@/constants/theme';

export const HOTEL_OPTIONS = [
  'Fairmont Le Montreux Palace',
  'Mona Montreux',
  'Villa Toscane',
  'Grand Hotel Suisse Majestic',
  'Royal Plaza Montreux',
];

const OTHER = '__other__';
const LIST_ITEMS = [...HOTEL_OPTIONS, OTHER];

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const animateLayout = () => {
  if (Platform.OS !== 'web') LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
};

interface Props {
  label: string;
  value: string;
  onChange: (v: string) => void;
  // Optional ref to the parent ScrollView — when provided, expanding the
  // dropdown auto-scrolls the field near the top so the options stay on screen.
  scrollRef?: React.RefObject<ScrollView | null>;
}

export function HotelPickerField({ label, value, onChange, scrollRef }: Props) {
  const [open, setOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherText, setOtherText] = useState('');
  const wrapperRef = useRef<View>(null);

  const isKnownHotel = HOTEL_OPTIONS.includes(value);
  const isOther = !isKnownHotel && value !== '';
  const triggerLabel = value || '';

  const scrollFieldIntoView = () => {
    if (!scrollRef?.current || !wrapperRef.current) return;
    const node = findNodeHandle(scrollRef.current);
    if (!node) return;
    wrapperRef.current.measureLayout(
      node,
      (_x, y) => {
        scrollRef.current?.scrollTo({ y: Math.max(0, y - Spacing.sm), animated: true });
      },
      () => {},
    );
  };

  const toggleOpen = () => {
    const willOpen = !open;
    animateLayout();
    setOpen(willOpen);
    if (otherOpen) setOtherOpen(false);
    if (willOpen) {
      // Wait for layout + expand animation before measuring.
      setTimeout(scrollFieldIntoView, 60);
    }
  };

  const handleSelect = (item: string) => {
    if (item === OTHER) {
      animateLayout();
      setOtherText(isOther ? value : '');
      setOtherOpen(true);
    } else {
      onChange(item);
      animateLayout();
      setOpen(false);
      setOtherOpen(false);
    }
  };

  const handleOtherConfirm = () => {
    if (otherText.trim()) onChange(otherText.trim());
    animateLayout();
    setOtherOpen(false);
    setOpen(false);
  };

  return (
    <View ref={wrapperRef} style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={toggleOpen}
        activeOpacity={0.8}
      >
        <Ionicons
          name="bed-outline"
          size={16}
          color={open ? Colors.primary : Colors.textMuted}
          style={styles.icon}
        />
        <Text style={[styles.triggerText, !triggerLabel && { color: Colors.textMuted }]}>
          {triggerLabel || 'Select hotel...'}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdown}>
          {otherOpen ? (
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
              <View style={styles.otherActions}>
                <TouchableOpacity
                  onPress={() => { animateLayout(); setOtherOpen(false); }}
                  style={[styles.otherBtn, styles.otherCancel]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.otherCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleOtherConfirm}
                  disabled={!otherText.trim()}
                  style={[styles.otherBtn, styles.otherConfirm, !otherText.trim() && styles.otherConfirmDisabled]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.otherConfirmText}>Confirm</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            LIST_ITEMS.map((item, idx) => {
              const isSelected = item === OTHER ? isOther : value === item;
              const displayText = item === OTHER ? 'Somewhere else…' : item;
              const isLast = idx === LIST_ITEMS.length - 1;
              return (
                <TouchableOpacity
                  key={item}
                  style={[styles.option, !isLast && styles.optionDivider, isSelected && styles.optionSelected]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.6}
                >
                  <Text
                    style={[
                      styles.optionText,
                      isSelected && styles.optionTextSelected,
                      item === OTHER && styles.optionTextOther,
                    ]}
                  >
                    {displayText}
                  </Text>
                  {isSelected ? (
                    <Ionicons name="checkmark" size={16} color={Colors.primary} />
                  ) : null}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      )}
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
  triggerOpen: {
    borderColor: Colors.primary,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  icon: { marginRight: Spacing.xs },
  triggerText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },

  dropdown: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.primary,
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },

  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  optionDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.divider,
  },
  optionSelected: {
    backgroundColor: Colors.surfaceWarm,
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },
  optionTextOther: {
    color: Colors.textMuted,
    fontStyle: 'italic',
  },

  otherSection: {
    padding: Spacing.md,
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
    paddingVertical: 10,
    fontSize: 14,
    fontFamily: Fonts.sans,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  otherActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  otherBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.full,
  },
  otherCancel: {
    backgroundColor: 'transparent',
  },
  otherCancelText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.textMuted,
  },
  otherConfirm: {
    backgroundColor: Colors.primary,
  },
  otherConfirmDisabled: {
    opacity: 0.4,
  },
  otherConfirmText: {
    fontFamily: Fonts.sansMedium,
    fontSize: 13,
    color: Colors.white,
  },
});
