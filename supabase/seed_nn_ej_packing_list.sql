-- ============================================================
-- Seed N&N (SaaS) + Emma & James packing lists
-- ============================================================
-- One-time bootstrap that promotes both weddings from the bundled
-- NN_FULL_PACKING_LIST / DEMO_FULL_PACKING_LIST constants to
-- DB-backed wedding_packing_lists rows so the admin
-- "Edit App Content → Packing List" editor works for them.
--
-- N&N gets the NN packing list content (Sangeet, Indian attire extras,
-- 2026 passport tip). Emma & James gets the demo variant: the
-- "Attire Extras" category is dropped, Sangeet is renamed to Welcome
-- Party, and the passport tip is bumped to 2027 — matches the current
-- code-defined DEMO_FULL_PACKING_LIST behaviour.
--
-- BEFORE RUNNING THIS SEED:
-- 1. Confirm migration 028 (wedding_packing_lists) has been applied.
--    If not, paste it from supabase/migrations/ into the SQL Editor
--    and run first.
--
-- 2. Paste this whole file into the Supabase SQL Editor and Run.
--
-- Idempotent — safe to re-run. After it lands, the admin editor
-- opens directly on both weddings.
-- ============================================================

-- ─── N&N (SaaS) (a0000000-0000-0000-0000-000000000001) ─────────────────────────────────────────
insert into public.wedding_packing_lists (
  wedding_id, page_title, page_subtitle_tag, page_subtitle,
  completion_message, categories, tip_footer
) values (
  'a0000000-0000-0000-0000-000000000001',
  $s$Packing Guide$s$,
  $s$What to Bring$s$,
  $s$Outfit ideas and everything you need for a Swiss wedding weekend$s$,
  $s$You're all packed! See you in Switzerland!$s$,
  $pk$[
  {
    "id": "outfits",
    "title": "Outfits",
    "emoji": "👗",
    "items": [
      {
        "id": "mehendi-outfit",
        "label": "Rehearsal Dinner outfit",
        "tip": "Smart casual Indian or Western. White, soft neutrals, shades of green or rose. The venue is a vineyard estate — comfortable yet elegant.",
        "weddingPartyOnly": true
      },
      {
        "id": "sangeet-outfit",
        "label": "Sangeet outfit",
        "tip": "Festive Indian or semi-formal Western. Bright jewel tones and festive hues! Think vibrant lehenga, saree, salwar kameez, or a colorful cocktail dress. This is a big dancing night!",
        "gender": "female"
      },
      {
        "id": "sangeet-outfit-male",
        "label": "Sangeet outfit",
        "tip": "Festive Indian or semi-formal Western. Bright jewel tones and festive hues! Think sherwani, kurta, or smart semi-formal attire. This is a big dancing night!",
        "gender": "male"
      },
      {
        "id": "ceremony-outfit",
        "label": "Ceremony & Reception outfit",
        "tip": "Indian formal or black-tie Western. Elegant neutrals and muted evening tones. Lehenga, saree, or floor length gown.",
        "gender": "female",
        "excludeBridalParty": true
      },
      {
        "id": "ceremony-outfit-male",
        "label": "Tuxedo or Black Suit",
        "tip": "Black-tie dress code applies.",
        "gender": "male",
        "excludeWeddingParty": true
      },
      {
        "id": "ceremony-outfit-male-wp",
        "label": "Tuxedo",
        "tip": "Black-tie dress code applies.",
        "gender": "male",
        "weddingPartyOnly": true
      },
      {
        "id": "bridal-morning-outfit",
        "label": "Light pink outfit for the wedding morning",
        "tip": "For getting-ready photos before the bride changes into her ceremony attire.",
        "bridalPartyOnly": true
      },
      {
        "id": "bridesmaid-sweatshirt",
        "label": "Bridesmaid sweatshirt (provided by Neha)",
        "tip": "For the ceremony rehearsal on Thursday afternoon.",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "bridesman-sweatshirt",
        "label": "Bridesman sweatshirt (provided by Neha)",
        "tip": "For the ceremony rehearsal on Thursday afternoon.",
        "bridalPartyOnly": true,
        "gender": "male"
      },
      {
        "id": "bridal-ceremony-lehenga",
        "label": "Pink lehenga for the wedding ceremony (provided by Neha)",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "bridal-ceremony-sherwani",
        "label": "Pink sherwani for the wedding ceremony (provided by Neha)",
        "tip": "For photos prior to the wedding ceremony. You'll change into your tuxedo before the ceremony so you can walk down the aisle with the groomsmen.",
        "bridalPartyOnly": true,
        "gender": "male"
      },
      {
        "id": "bridal-reception-outfit",
        "label": "Reception outfit (optional)",
        "tip": "Black-tie attire. You can stay in the pink lehenga through the reception if you prefer.",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "casual-exploring",
        "label": "Casual sightseeing clothes (2–3 outfits)"
      },
      {
        "id": "travel-outfit",
        "label": "Comfortable travel outfit for the journey"
      }
    ]
  },
  {
    "id": "footwear",
    "title": "Footwear",
    "emoji": "👠",
    "items": [
      {
        "id": "shoes-mehendi-male",
        "label": "Shoes for Rehearsal Dinner",
        "tip": "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
        "weddingPartyOnly": true,
        "gender": "male"
      },
      {
        "id": "flats-mehendi",
        "label": "Flats or heels for Rehearsal Dinner",
        "tip": "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
        "weddingPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "heels-sangeet",
        "label": "Flats, heels, or comfortable shoes for Sangeet",
        "tip": "Choose shoes you can dance in all night.",
        "gender": "female"
      },
      {
        "id": "heels-ceremony",
        "label": "Flats or heels for Ceremony & Reception",
        "tip": "The ceremony and cocktail hour are outdoors.",
        "gender": "female"
      },
      {
        "id": "shoes-sangeet-male",
        "label": "Shoes for Sangeet",
        "tip": "Comfortable shoes for a night of dancing.",
        "gender": "male"
      },
      {
        "id": "dress-shoes-ceremony-male",
        "label": "Dress Shoes for Ceremony & Reception",
        "tip": "Black patent leather pairs best with a tuxedo. Polished black leather works with a black suit.",
        "gender": "male",
        "excludeWeddingParty": true
      },
      {
        "id": "dress-shoes-ceremony-male-wp",
        "label": "Dress Shoes for Ceremony & Reception",
        "tip": "Black patent leather pairs best with a tuxedo.",
        "gender": "male",
        "weddingPartyOnly": true
      },
      {
        "id": "walking-shoes",
        "label": "Comfortable walking shoes for sightseeing or gym",
        "tip": "Essential for the Montreux promenade and Château de Chillon.",
        "gender": "male"
      },
      {
        "id": "socks",
        "label": "Socks",
        "gender": "male"
      },
      {
        "id": "walking-shoes-female",
        "label": "Comfortable walking shoes for sightseeing or gym",
        "tip": "Essential for the Montreux promenade and Château de Chillon.",
        "gender": "female"
      }
    ]
  },
  {
    "id": "weather-gear",
    "title": "May Weather Essentials",
    "emoji": "🌦️",
    "items": [
      {
        "id": "light-jacket",
        "label": "Light waterproof jacket",
        "tip": "May in Montreux can bring spring showers. A packable rain jacket is perfect."
      },
      {
        "id": "sunglasses",
        "label": "Sunglasses"
      },
      {
        "id": "sunscreen",
        "label": "Sunscreen",
        "tip": "Especially if you're heading up to Rochers de Naye."
      },
      {
        "id": "swim-trunks",
        "label": "Swim trunks for hotel pools and hot tubs",
        "gender": "male"
      },
      {
        "id": "swimsuit",
        "label": "Swimsuit for hotel pools and hot tubs",
        "gender": "female"
      }
    ]
  },
  {
    "id": "indian-attire-extras",
    "title": "Attire Extras",
    "emoji": "✨",
    "items": [
      {
        "id": "bridal-earrings-tikka",
        "label": "Indian earrings and tikka for the wedding ceremony (provided by Neha)",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "bridal-bangles",
        "label": "Bangles for the wedding ceremony (provided by Neha)",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "bridal-scrunchie",
        "label": "White floral scrunchie for the rehearsal dinner (provided by Neha)",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "jewelry",
        "label": "Jewelry for each event",
        "gender": "female"
      },
      {
        "id": "safety-pins",
        "label": "Safety pins (essential if wearing a saree)",
        "gender": "female"
      },
      {
        "id": "fashion-tape",
        "label": "Double-sided fashion tape",
        "gender": "female"
      },
      {
        "id": "bindi",
        "label": "Bindis and accessories",
        "gender": "female"
      },
      {
        "id": "clutch",
        "label": "Small clutch or evening bag for Sangeet and Reception",
        "gender": "female"
      },
      {
        "id": "belt",
        "label": "Belt",
        "gender": "male"
      },
      {
        "id": "bow-tie",
        "label": "Bow tie",
        "gender": "male"
      },
      {
        "id": "tie",
        "label": "Tie",
        "gender": "male"
      },
      {
        "id": "cufflinks",
        "label": "Cufflinks",
        "gender": "male"
      }
    ]
  },
  {
    "id": "grooming",
    "title": "Grooming & Personal Care",
    "emoji": "💄",
    "items": [
      {
        "id": "toothbrush",
        "label": "Toothbrush"
      },
      {
        "id": "toothpaste",
        "label": "Toothpaste"
      },
      {
        "id": "deodorant",
        "label": "Deodorant"
      },
      {
        "id": "makeup-kit",
        "label": "Makeup",
        "gender": "female"
      },
      {
        "id": "makeup-remover",
        "label": "Makeup remover wipes",
        "gender": "female"
      },
      {
        "id": "hair-styling",
        "label": "Hair styling tools (curler / straightener)",
        "tip": "Switzerland runs on 230V — check your tools are dual-voltage or bring a converter, not just an adaptor.",
        "gender": "female"
      },
      {
        "id": "shaving-kit",
        "label": "Shaving kit",
        "tip": "Pack charging cables — Swiss plugs are Type J and may need an adaptor.",
        "gender": "male"
      }
    ]
  },
  {
    "id": "essentials",
    "title": "Travel Essentials",
    "emoji": "🧳",
    "items": [
      {
        "id": "passport",
        "label": "Passport / ID",
        "tip": "Ensure your passport is valid through at least November 2026."
      },
      {
        "id": "currency",
        "label": "Some Swiss Francs (CHF) cash (optional)",
        "tip": "Cards widely accepted but some cafés and markets prefer cash."
      },
      {
        "id": "adaptor",
        "label": "Swiss plug adaptor (Type J / universal adaptor)",
        "tip": "Swiss sockets are unique — EU adaptors don't always fit."
      },
      {
        "id": "meds",
        "label": "Personal medications"
      },
      {
        "id": "phone-charger",
        "label": "Phone charger"
      },
      {
        "id": "battery-pack",
        "label": "Portable battery pack",
        "tip": "Handy for long days of sightseeing, especially at Rochers de Naye or on the lake."
      }
    ]
  }
]$pk$::jsonb,
  $pk${
  "title": "Tip: Pack for the Lake & the Mountains",
  "text": "May in Montreux can bring spring showers and cool evenings by the lake. Bring layers and a packable rain jacket alongside your event outfits."
}$pk$::jsonb
) on conflict (wedding_id) do update set
  page_title         = excluded.page_title,
  page_subtitle_tag  = excluded.page_subtitle_tag,
  page_subtitle      = excluded.page_subtitle,
  completion_message = excluded.completion_message,
  categories         = excluded.categories,
  tip_footer         = excluded.tip_footer,
  updated_at         = now();


-- ─── Emma & James (a0000000-0000-0000-0000-000000000002) ─────────────────────────────────────────
insert into public.wedding_packing_lists (
  wedding_id, page_title, page_subtitle_tag, page_subtitle,
  completion_message, categories, tip_footer
) values (
  'a0000000-0000-0000-0000-000000000002',
  $s$Packing Guide$s$,
  $s$What to Bring$s$,
  $s$Outfit ideas and everything you need for a Swiss wedding weekend$s$,
  $s$You're all packed! See you in Switzerland!$s$,
  $pk$[
  {
    "id": "outfits",
    "title": "Outfits",
    "emoji": "👗",
    "items": [
      {
        "id": "mehendi-outfit",
        "label": "Rehearsal Dinner outfit",
        "tip": "Smart casual. White, soft neutrals, shades of green or rose. The venue is a vineyard estate — comfortable yet elegant.",
        "weddingPartyOnly": true
      },
      {
        "id": "welcome-party-outfit",
        "label": "Welcome Party outfit",
        "tip": "Festive semi-formal. Bright jewel tones and colorful cocktail attire — this is a big dancing night!",
        "gender": "female"
      },
      {
        "id": "welcome-party-outfit-male",
        "label": "Welcome Party outfit",
        "tip": "Festive semi-formal. Bright jewel tones and colorful cocktail attire — this is a big dancing night!",
        "gender": "male"
      },
      {
        "id": "ceremony-outfit",
        "label": "Ceremony & Reception outfit",
        "tip": "Black-tie. Elegant neutrals and muted evening tones. Floor-length gown.",
        "gender": "female",
        "excludeBridalParty": true
      },
      {
        "id": "ceremony-outfit-male",
        "label": "Tuxedo or Black Suit",
        "tip": "Black-tie dress code applies.",
        "gender": "male",
        "excludeWeddingParty": true
      },
      {
        "id": "ceremony-outfit-male-wp",
        "label": "Tuxedo",
        "tip": "Black-tie dress code applies.",
        "gender": "male",
        "weddingPartyOnly": true
      },
      {
        "id": "bridal-morning-outfit",
        "label": "Light pink outfit for the wedding morning",
        "tip": "For getting-ready photos before the bride changes into her ceremony attire.",
        "bridalPartyOnly": true
      },
      {
        "id": "bridesmaid-sweatshirt",
        "label": "Bridesmaid sweatshirt (provided by Neha)",
        "tip": "For the ceremony rehearsal on Thursday afternoon.",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "bridesman-sweatshirt",
        "label": "Bridesman sweatshirt (provided by Neha)",
        "tip": "For the ceremony rehearsal on Thursday afternoon.",
        "bridalPartyOnly": true,
        "gender": "male"
      },
      {
        "id": "bridal-ceremony-lehenga",
        "label": "Pink lehenga for the wedding ceremony (provided by Neha)",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "bridal-ceremony-sherwani",
        "label": "Pink sherwani for the wedding ceremony (provided by Neha)",
        "tip": "For photos prior to the wedding ceremony. You'll change into your tuxedo before the ceremony so you can walk down the aisle with the groomsmen.",
        "bridalPartyOnly": true,
        "gender": "male"
      },
      {
        "id": "bridal-reception-outfit",
        "label": "Reception outfit (optional)",
        "tip": "Black-tie attire. You can stay in the pink lehenga through the reception if you prefer.",
        "bridalPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "casual-exploring",
        "label": "Casual sightseeing clothes (2–3 outfits)"
      },
      {
        "id": "travel-outfit",
        "label": "Comfortable travel outfit for the journey"
      }
    ]
  },
  {
    "id": "footwear",
    "title": "Footwear",
    "emoji": "👠",
    "items": [
      {
        "id": "shoes-mehendi-male",
        "label": "Shoes for Rehearsal Dinner",
        "tip": "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
        "weddingPartyOnly": true,
        "gender": "male"
      },
      {
        "id": "flats-mehendi",
        "label": "Flats or heels for Rehearsal Dinner",
        "tip": "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
        "weddingPartyOnly": true,
        "gender": "female"
      },
      {
        "id": "heels-welcome-party",
        "label": "Flats, heels, or comfortable shoes for Welcome Party",
        "tip": "Choose shoes you can dance in all night.",
        "gender": "female"
      },
      {
        "id": "heels-ceremony",
        "label": "Flats or heels for Ceremony & Reception",
        "tip": "The ceremony and cocktail hour are outdoors.",
        "gender": "female"
      },
      {
        "id": "shoes-welcome-party-male",
        "label": "Shoes for Welcome Party",
        "tip": "Comfortable shoes for a night of dancing.",
        "gender": "male"
      },
      {
        "id": "dress-shoes-ceremony-male",
        "label": "Dress Shoes for Ceremony & Reception",
        "tip": "Black patent leather pairs best with a tuxedo. Polished black leather works with a black suit.",
        "gender": "male",
        "excludeWeddingParty": true
      },
      {
        "id": "dress-shoes-ceremony-male-wp",
        "label": "Dress Shoes for Ceremony & Reception",
        "tip": "Black patent leather pairs best with a tuxedo.",
        "gender": "male",
        "weddingPartyOnly": true
      },
      {
        "id": "walking-shoes",
        "label": "Comfortable walking shoes for sightseeing or gym",
        "tip": "Essential for the Montreux promenade and Château de Chillon.",
        "gender": "male"
      },
      {
        "id": "socks",
        "label": "Socks",
        "gender": "male"
      },
      {
        "id": "walking-shoes-female",
        "label": "Comfortable walking shoes for sightseeing or gym",
        "tip": "Essential for the Montreux promenade and Château de Chillon.",
        "gender": "female"
      }
    ]
  },
  {
    "id": "weather-gear",
    "title": "May Weather Essentials",
    "emoji": "🌦️",
    "items": [
      {
        "id": "light-jacket",
        "label": "Light waterproof jacket",
        "tip": "May in Montreux can bring spring showers. A packable rain jacket is perfect."
      },
      {
        "id": "sunglasses",
        "label": "Sunglasses"
      },
      {
        "id": "sunscreen",
        "label": "Sunscreen",
        "tip": "Especially if you're heading up to Rochers de Naye."
      },
      {
        "id": "swim-trunks",
        "label": "Swim trunks for hotel pools and hot tubs",
        "gender": "male"
      },
      {
        "id": "swimsuit",
        "label": "Swimsuit for hotel pools and hot tubs",
        "gender": "female"
      }
    ]
  },
  {
    "id": "grooming",
    "title": "Grooming & Personal Care",
    "emoji": "💄",
    "items": [
      {
        "id": "toothbrush",
        "label": "Toothbrush"
      },
      {
        "id": "toothpaste",
        "label": "Toothpaste"
      },
      {
        "id": "deodorant",
        "label": "Deodorant"
      },
      {
        "id": "makeup-kit",
        "label": "Makeup",
        "gender": "female"
      },
      {
        "id": "makeup-remover",
        "label": "Makeup remover wipes",
        "gender": "female"
      },
      {
        "id": "hair-styling",
        "label": "Hair styling tools (curler / straightener)",
        "tip": "Switzerland runs on 230V — check your tools are dual-voltage or bring a converter, not just an adaptor.",
        "gender": "female"
      },
      {
        "id": "shaving-kit",
        "label": "Shaving kit",
        "tip": "Pack charging cables — Swiss plugs are Type J and may need an adaptor.",
        "gender": "male"
      }
    ]
  },
  {
    "id": "essentials",
    "title": "Travel Essentials",
    "emoji": "🧳",
    "items": [
      {
        "id": "passport",
        "label": "Passport / ID",
        "tip": "Ensure your passport is valid through at least November 2027."
      },
      {
        "id": "currency",
        "label": "Some Swiss Francs (CHF) cash (optional)",
        "tip": "Cards widely accepted but some cafés and markets prefer cash."
      },
      {
        "id": "adaptor",
        "label": "Swiss plug adaptor (Type J / universal adaptor)",
        "tip": "Swiss sockets are unique — EU adaptors don't always fit."
      },
      {
        "id": "meds",
        "label": "Personal medications"
      },
      {
        "id": "phone-charger",
        "label": "Phone charger"
      },
      {
        "id": "battery-pack",
        "label": "Portable battery pack",
        "tip": "Handy for long days of sightseeing, especially at Rochers de Naye or on the lake."
      }
    ]
  }
]$pk$::jsonb,
  $pk${
  "title": "Tip: Pack for the Lake & the Mountains",
  "text": "May in Montreux can bring spring showers and cool evenings by the lake. Bring layers and a packable rain jacket alongside your event outfits."
}$pk$::jsonb
) on conflict (wedding_id) do update set
  page_title         = excluded.page_title,
  page_subtitle_tag  = excluded.page_subtitle_tag,
  page_subtitle      = excluded.page_subtitle,
  completion_message = excluded.completion_message,
  categories         = excluded.categories,
  tip_footer         = excluded.tip_footer,
  updated_at         = now();
