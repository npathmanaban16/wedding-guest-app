// ============================================================
// WEDDING DATA
// ============================================================

export const WEDDING = {
  bride: "Neha",
  groom: "Naveen",
  coupleNames: "Neha & Naveen",
  weddingDate: new Date("2026-05-23T15:00:00Z"), // Saturday 23 May 2026, 5:00 PM CEST (UTC+2)
  location: "Montreux, Switzerland",
  hashtag: "#NehaNaveen2026",       // TODO: Update with your actual hashtag
  website: "https://www.neha-naveen.com",
  contactEmail: "nehanaveen2026@gmail.com",
  registry: "https://blissandbone.sendbirdie.com/r/neha-naveen",
};

// ============================================================
// EVENTS / SCHEDULE
// ============================================================

export interface WeddingEvent {
  id: string;
  title: string;
  emoji: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  dressCode: string;
  description: string;
  notes?: string;
  weddingPartyOnly?: boolean;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  colorPalette?: { name: string; hex: string }[];
  outdoorNote?: string;
  outfitInspirationUrl?: string;
  indianAttire?: { forWomen: string[]; forMen: string[] };
  blackTieGuide?: { men: string; women: string };
  tuxedoNote?: string;
  hairMakeupLinks?: { label: string; url: string }[];
}

export const EVENTS: WeddingEvent[] = [
  {
    id: "rehearsal-dinner",
    title: "Rehearsal Dinner",
    emoji: "🍽️",
    date: "Thursday, 21 May 2026",
    time: "6:00 PM – 9:00 PM",
    startDate: "2026-05-21T16:00:00Z",
    endDate: "2026-05-21T19:00:00Z",
    venue: "Lavaux Vineyards | Le Baron Tavernier",
    address: "Route de la Corniche 4, 1070 Puidoux, Vaud, Switzerland",
    dressCode:
      "Smart casual Indian or Western attire. White, soft neutrals, shades of green or rose.",
    description:
      "An intimate dinner for the wedding party, following the ceremony rehearsal earlier in the day. Join us for a beautiful evening among UNESCO-listed terraced vineyards above Lake Geneva.",
    notes:
      "Transportation will be provided from the Fairmont Le Montreux Palace.",
    weddingPartyOnly: true,
    colorPalette: [
      { name: 'white', hex: '#FFFFFF' },
      { name: 'ivory', hex: '#F5F0DC' },
      { name: 'champagne', hex: '#EDD9A3' },
      { name: 'gold', hex: '#C9A84C' },
      { name: 'emerald', hex: '#2D6A4F' },
      { name: 'sage', hex: '#78A38A' },
      { name: 'deep rose', hex: '#8B2252' },
      { name: 'magenta', hex: '#C41E5E' },
    ],
  },
  {
    id: "sangeet",
    title: "Sangeet",
    emoji: "💃",
    date: "Friday, 22 May 2026",
    time: "6:30 PM – 11:00 PM",
    startDate: "2026-05-22T16:30:00Z",
    endDate: "2026-05-22T21:00:00Z",
    venue: "Fairmont Le Montreux Palace | La Coupole & La Terrasse du Petit Palais",
    address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
    dressCode:
      "Festive Indian or semi-formal Western. Bright jewel tones and festive hues — think vibrant lehengas, sarees, sherwanis, or colorful cocktail attire.",
    description:
      "Welcome party with dancing, drinks, and dinner. This is the big celebration night — come ready to dance!",
    colorPalette: [
      { name: 'ruby red', hex: '#9B1C1C' },
      { name: 'magenta', hex: '#C41E5E' },
      { name: 'burnt orange', hex: '#E8602C' },
      { name: 'marigold', hex: '#F0A500' },
      { name: 'emerald green', hex: '#006B3C' },
      { name: 'teal', hex: '#007272' },
      { name: 'light blue', hex: '#89CFF0' },
      { name: 'sapphire', hex: '#0F52BA' },
    ],
    outdoorNote: "The Sangeet will be held on a terrace and is outdoors, weather permitting. In the event of rain or inclement weather, it will be moved indoors.",
    outfitInspirationUrl: "https://neha-naveen-wedding-outfit-inspo.netlify.app/",
    indianAttire: {
      forWomen: [
        "Lehenga — A long skirt with a matching blouse and dupatta (scarf)",
        "Sharara / Anarkali — A long, flowing dress with Indian embroidery or embellishments and pants",
        "Saree — A draped fabric over a blouse and skirt. Beautiful but requires practice, so only if you're comfortable",
      ],
      forMen: [
        "Kurta — A long tunic with slim pants, can be paired with a vest for a dressier look",
        "Sherwani — A more formal embroidered tunic, often worn for weddings",
      ],
    },
  },
  {
    id: "ceremony",
    title: "Wedding Ceremony",
    emoji: "💍",
    date: "Saturday, 23 May 2026",
    time: "5:00 PM",
    startDate: "2026-05-23T15:00:00Z",
    endDate: "2026-05-23T16:00:00Z",
    venue: "Fairmont Le Montreux Palace | Garden",
    address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
    dressCode:
      "Indian formal or black-tie. Elegant neutrals and muted evening tones.",
    description:
      "The wedding ceremony in the beautiful gardens of the Fairmont, with the Alps and Lake Geneva as backdrop. Please arrive 20–30 minutes early to be seated.",
    notes: "Cocktail hour to follow at 6:00 PM.",
    colorPalette: [
      { name: 'blush', hex: '#F2C4CE' },
      { name: 'dusty rose', hex: '#C8A0A0' },
      { name: 'champagne', hex: '#EDD9A3' },
      { name: 'sage', hex: '#8FAF88' },
      { name: 'dove gray', hex: '#A8AFB8' },
      { name: 'charcoal', hex: '#3C4043' },
      { name: 'black', hex: '#000000' },
      { name: 'deep taupe', hex: '#6B5A4E' },
      { name: 'muted plum', hex: '#7B5080' },
      { name: 'antique gold', hex: '#C9A84C' },
    ],
    outdoorNote: "The ceremony will take place in the garden at the Fairmont Le Montreux Palace. We recommend wearing shoes you'll be comfortable walking on grass in. In the event of inclement weather, the ceremony will be moved indoors.",
    outfitInspirationUrl: "https://neha-naveen-wedding-outfit-inspo.netlify.app/",
    blackTieGuide: {
      men: "Tuxedos (or a black suit)",
      women: "Floor-length gowns or formal Indian attire such as sarees or lehengas",
    },
    tuxedoNote: "Renting a tux? Based on The Black Tux rental service: rentals typically arrive ~10 days before the wedding, with standard returns due within 5 days after the event. An extended 12-day return is available for ~$60 extra — useful if you're traveling after the wedding. Timelines and pricing may vary by rental service.",
    hairMakeupLinks: [
      { label: "Coiffure du Palace (Hair)", url: "https://salonkee.ch/salon/coiffure-du-palace?lang=en" },
      { label: "Fairmont Spa (Makeup)", url: "https://emea.spatime.com/fhmp1820/5673372/offering/33647422?types=1,0,4,8,16" },
    ],
  },
  {
    id: "reception",
    title: "Reception",
    emoji: "🥂",
    date: "Saturday, 23 May 2026",
    time: "7:30 PM – 1:00 AM",
    startDate: "2026-05-23T17:30:00Z",
    endDate: "2026-05-23T23:00:00Z",
    venue: "Fairmont Le Montreux Palace | Salle des Fêtes",
    address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
    dressCode:
      "Indian formal or black-tie. Elegant neutrals and muted evening tones — same outfit as the ceremony.",
    description:
      "Dinner, speeches, dancing, and celebrating into the night in the grand Salle des Fêtes ballroom.",
    notes:
      "The reception follows directly from the cocktail hour.",
    colorPalette: [
      { name: 'blush', hex: '#F2C4CE' },
      { name: 'dusty rose', hex: '#C8A0A0' },
      { name: 'champagne', hex: '#EDD9A3' },
      { name: 'sage', hex: '#8FAF88' },
      { name: 'dove gray', hex: '#A8AFB8' },
      { name: 'charcoal', hex: '#3C4043' },
      { name: 'black', hex: '#000000' },
      { name: 'deep taupe', hex: '#6B5A4E' },
      { name: 'muted plum', hex: '#7B5080' },
      { name: 'antique gold', hex: '#C9A84C' },
    ],
    blackTieGuide: {
      men: "Tuxedos (or a black suit)",
      women: "Floor-length gowns or formal Indian attire such as sarees or lehengas",
    },
  },
];

// ============================================================
// SWITZERLAND GUIDE — Montreux
// ============================================================

export interface GuideLink {
  label: string;
  url: string;
}

export interface GuideItem {
  id: string;
  name: string;
  description: string;
  category: string;
  tip?: string;
  link?: string;
  links?: GuideLink[];
  address?: string;
}

export interface GuideSubsection {
  id: string;
  title: string;
  emoji: string;
  category?: string;
  items: GuideItem[];
}

export interface GuideSection {
  id: string;
  title: string;
  emoji: string;
  items?: GuideItem[];
  subsections?: GuideSubsection[];
}

export const SWITZERLAND_GUIDE: GuideSection[] = [
  {
    id: "getting-there",
    title: "Getting to Montreux",
    emoji: "✈️",
    items: [
      {
        id: "flights",
        name: "Flights",
        category: "Transport",
        description:
          "Geneva (GVA) is the recommended airport — direct flights from London, Paris, Amsterdam, Dubai, and many other cities, with Montreux just 1h30 by train or 1 hour by car.\n\nIf you can't get a direct flight to Geneva, Zurich (ZRH) is Switzerland's main hub. Train from Zurich to Montreux takes about 2 hours through the heart of Switzerland.",
        tip: "Book flights and trains in advance — Geneva fills up quickly during peak season.",
      },
      {
        id: "train-montreux",
        name: "By Train",
        category: "Transport",
        description:
          "Switzerland's trains are the best way to reach Montreux — punctual, scenic, and stress-free. From Geneva Airport, take a direct train to Montreux (no transfers needed). Journey time is about 1 hour 30 minutes with beautiful views of the lake and vineyards along the way. The Fairmont is a 5-minute walk from Montreux station.\n\nImportant: tickets must be purchased before boarding — buy in the SBB app or at station ticket counters.",
        tip: "A Swiss Travel Pass gives unlimited train travel — great value if you're exploring Switzerland before or after the wedding.",
        links: [
          { label: "SBB website", url: "https://www.sbb.ch/en" },
          { label: "SBB app — iOS", url: "https://apps.apple.com/us/app/sbb-mobile/id294855237" },
          { label: "SBB app — Android", url: "https://play.google.com/store/apps/details?id=ch.sbb.mobile.android.b2c&feature=search_result&hl=en&pli=1" },
        ],
      },
      {
        id: "by-car",
        name: "By Car or Uber",
        category: "Transport",
        description:
          "It's approximately a 1 hour drive from Geneva Airport to Montreux, following the A1 and A9 highways along the lake. Rental cars are available at the airport. Uber also operates in Geneva and Montreux if you'd prefer not to drive.",
        tip: "Rental cars give you flexibility to explore Lavaux and the surrounding region at your own pace.",
      },
    ],
  },
  {
    id: "getting-around",
    title: "Getting Around Montreux",
    emoji: "🚌",
    items: [
      {
        id: "riviera-card",
        name: "Montreux Riviera Card",
        category: "Practical",
        description:
          "Many hotels provide guests with a Montreux Riviera Card, which includes free or discounted travel on local buses, boats, and mountain railways throughout the region.",
        tip: "Ask your hotel at check-in — it can save you a lot on local transport.",
      },
      {
        id: "uber-local",
        name: "Uber & Taxis",
        category: "Practical",
        description:
          "Uber and taxis also operate in Geneva, Montreux, Lausanne, and surrounding areas.",
      },
    ],
  },
  {
    id: "things-to-do",
    title: "Things to Do",
    emoji: "🗺️",
    subsections: [
      {
        id: "walks-hikes",
        title: "Walks & Hikes",
        emoji: "🥾",
        category: "Sightseeing",
        items: [
          {
            id: "lake-promenade",
            name: "Montreux Riviera Promenade",
            category: "Sightseeing",
            description:
              "Just steps from the Fairmont, this lakeside path is lined with vibrant flowers and palm trees, offering sweeping views of Lake Geneva and the Alps. Stretches several kilometres from Clarens to Villeneuve — perfect for a morning jog, leisurely walk, or sunset stroll. The famous Freddie Mercury statue is along the way.",
            tip: "May is peak blooming season — perfect for photos with the Alps reflecting on the lake.",
            address: "Quai Edouard-Jaccoud, 1820 Montreux, Switzerland",
          },
          {
            id: "rochers-de-naye",
            name: "Rochers de Naye",
            category: "Sightseeing",
            description:
              "Take the cogwheel train from Montreux station up to 2,042m for panoramic views over Lake Geneva and the Alps. At the top you'll find hiking trails, alpine gardens, and marmots!",
            tip: "Sit on the right side going up for the best lake views. About 55 minutes from Montreux.",
            address: "Rochers de Naye, 1820 Montreux, Switzerland",
          },
          {
            id: "narcissus-hikes",
            name: "Narcissus Hikes",
            category: "Sightseeing",
            description:
              "From late May to early June, the hills above Montreux are blanketed in blooming narcissus flowers — a local phenomenon known as \"May Snow.\" Beautiful trails at Les Pléiades and Les Avants offer some of the best views of this fleeting sight.",
            tip: "Trail conditions vary — ask the Fairmont concierge for up-to-date route recommendations.",
            address: "Les Avants, 1833 Montreux, Switzerland",
          },
          {
            id: "glacier-3000",
            name: "Glacier 3000",
            category: "Sightseeing",
            description:
              "Head to Glacier 3000 near Les Diablerets — about 1.5 hours from Montreux. Reachable by cable car, with spectacular views of Mont Blanc and the Matterhorn, year-round snow, and the Peak Walk by Tissot — the world's first suspension bridge connecting two mountain peaks.",
            tip: "Dress warmly even in summer. Short hikes and snow activities available year-round.",
            address: "Col du Pillon, 1865 Les Diablerets, Switzerland",
          },
        ],
      },
      {
        id: "castles",
        title: "Castles",
        emoji: "🏰",
        category: "Sightseeing",
        items: [
          {
            id: "chillon",
            name: "Château de Chillon",
            category: "Sightseeing",
            description:
              "Switzerland's most visited castle, right on the edge of Lake Geneva. Medieval architecture, historic rooms, dungeons, and picturesque courtyards — immortalised by Lord Byron.\n\nWalk: ~45 min from the Fairmont along the promenade\nTrain: Montreux → Veytaux-Chillon (2 min, ~15 min total)\nOpen daily 9am–7pm (last entry 6pm) · CHF 13",
            links: [
              { label: "Château de Chillon", url: "https://www.chillon.ch/" },
            ],
            address: "Avenue de Chillon 21, 1820 Veytaux, Switzerland",
          },
          {
            id: "chateau-aigle",
            name: "Château d'Aigle",
            category: "Sightseeing",
            description:
              "A medieval castle housing a fascinating wine museum — a great pairing with a Lavaux wine tour.\n\nTrain: Montreux → Aigle (10 min, ~30 min total)\nTue–Sun 10am–5pm, closed Mon · CHF 12",
            links: [
              { label: "Château d'Aigle", url: "https://www.chateau-aigle.ch/" },
            ],
            address: "Place du Château 1, 1860 Aigle, Switzerland",
          },
        ],
      },
      {
        id: "lavaux",
        title: "Lavaux & Wine",
        emoji: "🍇",
        category: "Sightseeing",
        items: [
          {
            id: "lavaux-vineyards",
            name: "Lavaux Vineyards (UNESCO)",
            category: "Sightseeing",
            description:
              "Terraced vineyards along the hillsides above Lake Geneva — a UNESCO World Heritage Site. Accessible by train, car, or on foot between the villages of Cully, Epesses, and Saint-Saphorin.",
            tip: "Hop aboard the Lavaux Express or Lavaux Panoramic — tourist trains winding through the vineyards with stops for tastings.",
            address: "Lavaux, Cully, Switzerland",
          },
          {
            id: "lavaux-wine",
            name: "Wine Tasting",
            category: "Sightseeing",
            description:
              "Family-run domaines specialising in Chasselas — a crisp, mineral-rich white wine native to the area. Most require reservations, especially on weekends.",
            tip: "Book ahead — same-day tastings are rarely available at the best estates.",
            links: [
              { label: "Domaine Bovy (Chexbres)", url: "https://www.domainebovy.ch/" },
              { label: "Domaine Croix Duplex (Grandvaux)", url: "https://www.croixduplex.ch/" },
              { label: "Domaine Louis Bovard (Cully)", url: "https://www.louisbovard.ch/" },
              { label: "Domaine Blaise Duboux (Epesses)", url: "https://www.blaiseduboux.ch/" },
              { label: "Les Frères Dubois (Dézaley)", url: "https://www.lesfreresdubois.ch/" },
            ],
          },
        ],
      },
      {
        id: "more-activities",
        title: "More Activities",
        emoji: "✨",
        category: "Activity",
        items: [
          {
            id: "by-boat",
            name: "Lake Geneva by Boat",
            category: "Activity",
            description:
              "The CGN (Compagnie Générale de Navigation) offers elegant cruises on Lake Geneva with a stop in Montreux — a beautiful way to spend an afternoon.",
            tip: "Perfect for a leisurely day trip or a memorable arrival on the lake.",
            links: [
              { label: "CGN Lake Geneva cruises", url: "https://www.cgn.ch/en/" },
            ],
            address: "Quai du Débarcadère, 1820 Montreux, Switzerland",
          },
          {
            id: "tennis",
            name: "Montreux Tennis Club",
            category: "Activity",
            description:
              "Outdoor red clay courts with lake views, open to visitors of all levels.\n\nCourt rental: CHF 60/hr · Coaching: CHF 100/hr\n30 min walk along the promenade · Train: Montreux → Territet (2 min)",
            links: [
              { label: "Montreux Tennis Club", url: "https://montreux-tennis-club.ch/" },
            ],
            address: "Quai Ami Chessex 11, 1820 Montreux, Switzerland",
          },
          {
            id: "fairmont-pools",
            name: "Fairmont — Pools & Hot Tub",
            category: "Activity",
            description:
              "Outdoor and heated indoor pool plus a hot tub, all with panoramic mountain views. Located on floor -1 of the Fairmont.",
            tip: "A perfect way to unwind between wedding events.",
            address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
          },
          {
            id: "fairmont-spa",
            name: "Fairmont — Spa & Gym",
            category: "Activity",
            description:
              "Sauna, steam room, jacuzzi, spa treatments, and a fully equipped gym with fitness classes. Located on floor -1 of the Fairmont.",
            tip: "Book spa treatments in advance — they fill up quickly.",
            links: [
              { label: "Fairmont Wellness", url: "https://www.fairmont.com/en/hotels/montreux/fairmont-le-montreux-palace/wellness.html" },
            ],
            address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
          },
        ],
      },
      {
        id: "beyond-montreux",
        title: "Beyond Montreux",
        emoji: "🗺️",
        category: "Sightseeing",
        items: [
          {
            id: "lausanne",
            name: "Day Trip to Lausanne",
            category: "Sightseeing",
            description:
              "A vibrant Swiss city just 30 minutes by train. Highlights: Gothic cathedral, Olympic Museum, the charming Old Town, and the lakefront at Ouchy.",
            tip: "The Olympic Museum is world-class and right on the lake — worth a few hours.",
            address: "Lausanne, Switzerland",
          },
          {
            id: "golden-pass",
            name: "GoldenPass Panoramic Train",
            category: "Sightseeing",
            description:
              "One of Switzerland's most iconic train journeys — starting in Montreux and winding through the Alps toward Gstaad. Panoramic windows and plush seating with breathtaking mountain views.",
            tip: "Book panoramic seats in advance. The stretch from Montreux to Zweisimmen is especially dramatic.",
            links: [
              { label: "Book on SBB", url: "https://www.sbb.ch/en" },
            ],
          },
        ],
      },
    ],
  },
  {
    id: "restaurants",
    title: "Eating & Drinking",
    emoji: "🍷",
    items: [
      {
        id: "sleepy-bear",
        name: "Sleepy Bear Coffee",
        category: "Café",
        description:
          "Montreux's premier specialty coffee shop — the perfect place to start your day with expertly crafted espresso and a welcoming atmosphere.",
        address: "Rue du Marché 1, 1820 Montreux, Switzerland",
      },
      {
        id: "confiserie-zurcher",
        name: "Confiserie Zurcher",
        category: "Café",
        description:
          "A traditional Swiss confectionery and café — perfect for breakfast pastries, hot chocolate, and handmade chocolates to take home.",
        tip: "Pick up a box of Swiss chocolates as a souvenir — made in-house.",
        address: "Av. du Casino 45, 1820 Montreux, Switzerland",
      },
      {
        id: "montreux-jazz-cafe",
        name: "Montreux Jazz Café",
        category: "Restaurant",
        description:
          "Lively vibes and modern European cuisine inspired by the legendary Montreux Jazz Festival. Located at the Fairmont.",
        address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
      },
      {
        id: "la-terrasse",
        name: "La Terrasse",
        category: "Restaurant",
        description:
          "Elegant Mediterranean-inspired dining at the Fairmont with beautiful views of Lake Geneva — perfect for a romantic dinner.",
        address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
      },
      {
        id: "funky-claudes",
        name: "Funky Claude's Bar",
        category: "Bar",
        description:
          "Casual cocktails, light bites, and a comfort-food menu with a fun, jazzy atmosphere at the Fairmont. Live music most evenings.",
        tip: "Named after legendary Montreux Jazz Festival founder Claude Nobs — a Montreux icon.",
        address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
      },
      {
        id: "la-rouvenaz",
        name: "La Rouvenaz",
        category: "Restaurant",
        description:
          "A charming local favorite right on the lakeside — known for fresh seafood and Swiss specialties with beautiful lake views.",
        tip: "Perch (perche) from Lake Geneva is a local specialty — try the classic meunière style.",
        address: "Rue du Marché 1, 1820 Montreux, Switzerland",
      },
      {
        id: "lausanne-dining",
        name: "Michelin Dining in Lausanne",
        category: "Restaurant",
        description:
          "If you have extra time, a quick 30-minute train ride to Lausanne opens up several world-class Michelin-starred restaurants for a truly special meal.",
        tip: "Book well in advance — Michelin restaurants in the region fill up weeks ahead.",
      },
    ],
  },
  {
    id: "practical",
    title: "Practical Info",
    emoji: "💡",
    items: [
      {
        id: "currency",
        name: "Currency",
        category: "Practical",
        description:
          "Switzerland uses Swiss Francs (CHF).",
        link: "https://www.xe.com/currencyconverter/convert/?Amount=1&From=CHF&To=USD",
      },
      {
        id: "language",
        name: "Language",
        category: "Practical",
        description:
          "Montreux is in French-speaking Switzerland. French is the main language, but English is widely spoken in hotels, restaurants, and tourist areas.",
        tip: "'Merci' (thank you), 'Bonjour' (hello), 'S'il vous plaît' (please) — locals appreciate the effort!",
      },
      {
        id: "weather-may",
        name: "Weather in May",
        category: "Practical",
        description:
          "May in Montreux is beautiful spring weather: 59–72°F on warm days. Expect occasional rain — pack a light waterproof jacket.",
        tip: "May is peak blooming season — the lake promenade will be stunning with roses and flowers.",
      },
      {
        id: "getting-around",
        name: "Getting Around Montreux",
        category: "Transport",
        description:
          "Montreux is a normal town — cars, taxis, and Uber all work here. The town center is walkable. Trains connect to Lausanne (30 min), Geneva (1 hr), and beyond.",
        tip: "The Fairmont is 5 minutes on foot from Montreux train station. Most wedding venues are at or near the hotel.",
      },
      {
        id: "adaptor",
        name: "Plug Adaptor",
        category: "Practical",
        description:
          "Switzerland uses Type J sockets, which are unique to Switzerland. A universal travel adaptor will cover this.",
        tip: "Don't forget — EU adaptors don't always fit Swiss sockets!",
      },
      {
        id: "emergency",
        name: "Emergency Numbers",
        category: "Practical",
        description:
          "Police: 117 | Ambulance: 144 | Fire: 118. The nearest hospital is RSMR in Vevey, about 5km from Montreux.",
      },
    ],
  },
];

// ============================================================
// PACKING GUIDE
// ============================================================

export interface PackingCategory {
  id: string;
  title: string;
  emoji: string;
  items: PackingItem[];
}

export interface PackingItem {
  id: string;
  label: string;
  tip?: string;
  weddingPartyOnly?: boolean;
  /**
   * If set, this item is only shown to guests of that gender.
   * Guests whose gender is unknown see all items regardless.
   */
  gender?: 'male' | 'female';
}

export const PACKING_GUIDE: PackingCategory[] = [
  {
    id: "outfits",
    title: "Outfits",
    emoji: "👗",
    items: [
      {
        id: "mehendi-outfit",
        label: "Rehearsal Dinner outfit",
        tip: "Smart casual Indian or Western. White, soft neutrals, shades of green or rose. The venue is a vineyard estate — comfortable yet elegant.",
        weddingPartyOnly: true,
      },
      {
        id: "sangeet-outfit",
        label: "Sangeet outfit",
        tip: "Festive Indian or semi-formal Western. Bright jewel tones and festive hues! Think vibrant lehenga, saree, salwar kameez, or a colorful cocktail dress. This is the big dancing night — dress to impress!",
        gender: 'female',
      },
      {
        id: "sangeet-outfit-male",
        label: "Sangeet outfit",
        tip: "Festive Indian or semi-formal Western. Bright jewel tones and festive hues! Think sherwani, kurta, or smart semi-formal attire. This is the big dancing night — dress to impress!",
        gender: 'male',
      },
      {
        id: "ceremony-outfit",
        label: "Ceremony & Reception outfit",
        tip: "Indian formal or black-tie Western. Elegant neutrals and muted evening tones. Lehenga, saree, or floor length gown.",
        gender: 'female',
      },
      {
        id: "ceremony-outfit-male",
        label: "Tuxedo or Black Suit",
        tip: "Black-tie dress code applies.",
        gender: 'male',
      },
      {
        id: "casual-exploring",
        label: "Casual sightseeing clothes (2–3 outfits)",
        tip: "Comfortable walking shoes essential — you'll be on the lake promenade and cobblestone streets.",
      },
      {
        id: "travel-outfit",
        label: "Comfortable travel outfit for the journey",
      },
    ],
  },
  {
    id: "footwear",
    title: "Footwear",
    emoji: "👠",
    items: [
      {
        id: "shoes-mehendi-male",
        label: "Shoes for Rehearsal Dinner",
        tip: "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
        weddingPartyOnly: true,
        gender: 'male',
      },
      {
        id: "flats-mehendi",
        label: "Flats or heels for Rehearsal Dinner",
        tip: "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
        weddingPartyOnly: true,
        gender: 'female',
      },
      {
        id: "heels-sangeet",
        label: "Flats, heels, or comfortable shoes for Sangeet",
        tip: "Choose shoes you can dance in all night — block heels or kitten heels work well.",
        gender: 'female',
      },
      {
        id: "heels-ceremony",
        label: "Flats or heels for Ceremony & Reception",
        tip: "All events are indoors at the Fairmont — heels are fine.",
        gender: 'female',
      },
      {
        id: "shoes-sangeet-male",
        label: "Shoes for Sangeet",
        tip: "Comfortable shoes for a night of dancing.",
        gender: 'male',
      },
      {
        id: "dress-shoes-ceremony-male",
        label: "Dress Shoes for Ceremony & Reception",
        tip: "Polished black leather pairs best with a tuxedo or black suit.",
        gender: 'male',
      },
      {
        id: "walking-shoes",
        label: "Comfortable walking shoes for sightseeing or gym",
        tip: "Essential for the Montreux promenade and Château de Chillon — quite a lot of walking.",
        gender: 'male',
      },
      {
        id: "socks",
        label: "Socks",
        gender: 'male',
      },
      {
        id: "walking-shoes-female",
        label: "Comfortable walking shoes for sightseeing or gym",
        tip: "Essential for the Montreux promenade and Château de Chillon — quite a lot of walking.",
        gender: 'female',
      },
    ],
  },
  {
    id: "weather-gear",
    title: "May Weather Essentials",
    emoji: "🌦️",
    items: [
      {
        id: "light-jacket",
        label: "Light waterproof jacket",
        tip: "May in Montreux can bring spring showers. A packable rain jacket is perfect.",
      },
      {
        id: "sunglasses",
        label: "Sunglasses",
      },
      {
        id: "sunscreen",
        label: "Sunscreen",
        tip: "Especially if you're heading up to Rochers de Naye.",
      },
      {
        id: "swim-trunks",
        label: "Swim trunks for hotel pools and hot tubs",
        gender: 'male',
      },
      {
        id: "swimsuit",
        label: "Swimsuit for hotel pools and hot tubs",
        gender: 'female',
      },
    ],
  },
  {
    id: "indian-attire-extras",
    title: "Attire Extras",
    emoji: "✨",
    items: [
      {
        id: "jewelry",
        label: "Jewelry for each event",
        tip: "Pack pieces in individual pouches to avoid tangling. Sangeet = bold statement jewelry; Ceremony = elegant classics.",
        gender: 'female',
      },
      {
        id: "safety-pins",
        label: "Safety pins (essential if wearing a saree)",
        tip: "A small pouch of safety pins is a lifesaver for keeping a saree draped all night.",
        gender: 'female',
      },
      {
        id: "fashion-tape",
        label: "Double-sided fashion tape",
        tip: "Lifesaver for blouses, dupattas, and formal dresses.",
        gender: 'female',
      },
      {
        id: "bindi",
        label: "Bindis and accessories",
        gender: 'female',
      },
      {
        id: "clutch",
        label: "Small clutch or evening bag for Sangeet and Reception",
        gender: 'female',
      },
      {
        id: "belt",
        label: "Belt",
        gender: 'male',
      },
      {
        id: "bow-tie",
        label: "Bow tie",
        gender: 'male',
      },
      {
        id: "tie",
        label: "Tie",
        gender: 'male',
      },
      {
        id: "cufflinks",
        label: "Cufflinks",
        gender: 'male',
      },
    ],
  },
  {
    id: "grooming",
    title: "Grooming & Personal Care",
    emoji: "💄",
    items: [
      {
        id: "toothbrush",
        label: "Toothbrush",
      },
      {
        id: "toothpaste",
        label: "Toothpaste",
      },
      {
        id: "deodorant",
        label: "Deodorant",
      },
      {
        id: "makeup-kit",
        label: "Makeup",
        gender: 'female',
      },
      {
        id: "makeup-remover",
        label: "Makeup remover wipes",
        gender: 'female',
      },
      {
        id: "hair-styling",
        label: "Hair styling tools (curler / straightener)",
        tip: "Switzerland runs on 230V — check your tools are dual-voltage or bring a converter, not just an adaptor.",
        gender: 'female',
      },
      {
        id: "shaving-kit",
        label: "Shaving kit",
        tip: "Pack charging cables — Swiss plugs are Type J and may need an adaptor.",
        gender: 'male',
      },
    ],
  },
  {
    id: "essentials",
    title: "Travel Essentials",
    emoji: "🧳",
    items: [
      { id: "passport", label: "Passport / ID", tip: "Ensure your passport is valid through at least November 2026." },
      {
        id: "currency",
        label: "Some Swiss Francs (CHF) cash (optional)",
        tip: "Cards widely accepted but some cafés and markets prefer cash.",
      },
      {
        id: "adaptor",
        label: "Swiss plug adaptor (Type J / universal adaptor)",
        tip: "Swiss sockets are unique — EU adaptors don't always fit.",
      },
      {
        id: "meds",
        label: "Personal medications",
      },
    ],
  },
];
