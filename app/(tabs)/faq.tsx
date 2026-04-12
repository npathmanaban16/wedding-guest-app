import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Spacing, Radius, Shadow } from '@/constants/theme';
import { WEDDING } from '@/constants/weddingData';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

interface FaqLink {
  label: string;
  url: string;
}

interface FaqSection {
  heading?: string;
  text?: string;
  bullets?: string[];
}

interface FaqItem {
  id: string;
  question: string;
  sections: FaqSection[];
  links?: FaqLink[];
}

const FAQS: FaqItem[] = [
  {
    id: 'outdoors',
    question: 'Will events be outdoors?',
    sections: [
      {
        text: "Yes. Our wedding ceremony will take place in the garden at the Fairmont Le Montreux Palace, so we recommend wearing shoes you'll be comfortable walking on grass in. Our Sangeet will be held on a terrace and is also outdoors, weather permitting. In the event of rain or inclement weather, events will be moved indoors to ensure everyone stays dry and comfortable.",
      },
    ],
  },
  {
    id: 'dress-code',
    question: 'What should I wear to the wedding?',
    sections: [
      {
        text: "We'd love for guests to dress in semi-formal or Indian festive attire for our Sangeet — think colourful, celebratory outfits you can comfortably dance in! If you've been wanting to try Indian clothing, this is the perfect night to go for it.",
      },
      {
        text: 'For the wedding ceremony and reception, the dress code is black-tie:',
        bullets: [
          'Men: Tuxedos',
          'Women: Floor-length gowns or formal Indian attire such as sarees or lehengas',
        ],
      },
      {
        text: "Dress to celebrate — we can't wait to see you looking your best!",
      },
    ],
    links: [
      { label: 'Wedding Outfit Inspiration Generator', url: 'https://neha-naveen-wedding-outfit-inspo.netlify.app/' },
    ],
  },
  {
    id: 'tuxedo',
    question: 'How do tuxedo rentals work for guests who are travelling?',
    sections: [
      {
        text: 'For guests renting a tuxedo (for example, from The Black Tux), rentals typically arrive about 10 days before the wedding to allow time for try-ons. Standard returns are due within 5 days after the event.',
      },
      {
        text: 'For guests travelling after the wedding, most rental companies offer an extended return option for an additional $60, allowing returns up to 12 days after the event — providing roughly three weeks total from delivery to return. Guests are also welcome to wear a black suit instead of a tux if that is more convenient.',
      },
    ],
  },
  {
    id: 'indian-attire',
    question: 'Do you have recommendations for Indian attire?',
    sections: [
      {
        text: "If you're looking to wear traditional Indian attire for the Sangeet, here are a few options to consider. Indian outfits are not required — feel free to wear whatever makes you feel festive and fabulous!",
      },
      {
        heading: 'For Women',
        bullets: [
          'Lehenga — A long skirt with a matching blouse and dupatta (scarf)',
          'Sharara / Anarkali — A long, flowing dress with Indian embroidery or embellishments and pants',
          "Saree — A draped fabric over a blouse and skirt. Beautiful but requires a bit of practice, so only if you're comfortable",
        ],
      },
      {
        heading: 'For Men',
        bullets: [
          'Kurta — A long tunic with slim pants, can be paired with a vest for a dressier look',
          'Sherwani — A more formal embroidered tunic, often worn for weddings',
        ],
      },
    ],
  },
  {
    id: 'packing',
    question: 'What should I remember to pack?',
    sections: [
      {
        text: 'Before you pack, please ensure your passport is valid through at least November 2026.',
      },
      {
        text: 'A few essentials we recommend bringing:',
        bullets: [
          'Travel adapters (Switzerland uses Type C & J plugs, 230V supply)',
          'Sunglasses',
          'Comfortable shoes for exploring, walking, or hiking',
          'A light jacket or layers — Swiss weather can be unpredictable!',
        ],
      },
    ],
  },
  {
    id: 'hair-makeup',
    question: 'Can I book professional hair and makeup services?',
    sections: [
      {
        text: "You can book hair and/or makeup appointments directly at the Fairmont Le Montreux Palace's spa or in-house salon.",
      },
    ],
    links: [
      { label: 'Coiffure du Palace (Hair)', url: 'https://salonkee.ch/salon/coiffure-du-palace?lang=en' },
      { label: 'Fairmont Spa (Makeup)', url: 'https://emea.spatime.com/fhmp1820/5673372/offering/33647422?types=1,0,4,8,16' },
    ],
  },
];

function FaqCard({ item }: { item: FaqItem }) {
  const [expanded, setExpanded] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((v) => !v);
  };

  return (
    <TouchableOpacity style={styles.faqCard} onPress={toggle} activeOpacity={0.9}>
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
          style={{ flexShrink: 0, marginLeft: Spacing.sm }}
        />
      </View>

      {expanded && (
        <View style={styles.faqBody}>
          {item.sections.map((section, i) => (
            <View key={i} style={i > 0 ? { marginTop: Spacing.sm } : undefined}>
              {section.heading && (
                <Text style={styles.sectionHeading}>{section.heading}</Text>
              )}
              {section.text && (
                <Text style={styles.faqText}>{section.text}</Text>
              )}
              {section.bullets && (
                <View style={styles.bulletList}>
                  {section.bullets.map((bullet, j) => (
                    <View key={j} style={styles.bulletRow}>
                      <Text style={styles.bulletDot}>•</Text>
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
          {item.links && (
            <View style={styles.linksContainer}>
              {item.links.map((link) => (
                <TouchableOpacity
                  key={link.url}
                  style={styles.linkButton}
                  onPress={() => Linking.openURL(link.url)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>{link.label}</Text>
                  <Ionicons name="arrow-forward" size={13} color={Colors.primary} />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function FaqScreen() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.md }]}
    >
      {/* Page header */}
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>FAQs</Text>
        <Text style={styles.pageSubtitleTag}>Frequently Asked Questions</Text>
        <Text style={styles.pageSubtitle}>
          Everything you need to know before the big day
        </Text>
      </View>

      {/* FAQ list */}
      <View style={styles.faqList}>
        {FAQS.map((item) => (
          <FaqCard key={item.id} item={item} />
        ))}
      </View>

      {/* Contact card */}
      <View style={styles.contactCard}>
        <Ionicons name="mail-outline" size={22} color={Colors.gold} style={{ marginBottom: Spacing.xs }} />
        <Text style={styles.contactTitle}>Still have questions?</Text>
        <Text style={styles.contactBody}>We're happy to help — feel free to reach out.</Text>
        <TouchableOpacity
          onPress={() => Linking.openURL(`mailto:${WEDDING.contactEmail}`)}
          activeOpacity={0.7}
        >
          <Text style={styles.contactEmail}>{WEDDING.contactEmail}</Text>
        </TouchableOpacity>
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

  faqList: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  faqCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Shadow.small,
  },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  faqQuestion: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.serifMedium,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  faqBody: {
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 0.5,
    borderTopColor: Colors.divider,
  },
  faqText: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  sectionHeading: {
    fontSize: 12,
    fontFamily: Fonts.sansMedium,
    color: Colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
  },
  bulletList: {
    marginTop: Spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  bulletDot: {
    fontSize: 13,
    color: Colors.gold,
    marginRight: Spacing.xs,
    lineHeight: 22,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  linksContainer: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  linkText: {
    fontSize: 13,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
  },

  contactCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Colors.surfaceWarm,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: Colors.border,
  },
  contactTitle: {
    fontSize: 17,
    fontFamily: Fonts.serifSemiBold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    letterSpacing: 0.2,
  },
  contactBody: {
    fontSize: 13,
    fontFamily: Fonts.sans,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  contactEmail: {
    fontSize: 14,
    fontFamily: Fonts.sansMedium,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
