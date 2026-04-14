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
    venue: "Lavaux Vineyards | Le Baron Tavernier",
    address: "Lavaux, Switzerland (transportation provided from hotel)",
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
    venue: "Fairmont Le Montreux Palace | La Coupole & La Terrasse du Petit Palais",
    address: "Av. Claude-Nobs 2, 1820 Montreux, Switzerland",
    dressCode:
      "Festive Indian or semi-formal Western. Bright jewel tones and festive hues — think vibrant lehengas, sarees, sherwanis, or colourful cocktail attire.",
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
      { name: 'dove grey', hex: '#A8AFB8' },
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
    tuxedoNote: "Renting a tux? Based on The Black Tux rental service: rentals typically arrive ~10 days before the wedding, with standard returns due within 5 days after the event. An extended 12-day return is available for ~$60 extra — useful if you're travelling after the wedding. Timelines and pricing may vary by rental service.",
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
      { name: 'dove grey', hex: '#A8AFB8' },
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
}

export interface GuideSection {
  id: string;
  title: string;
  emoji: string;
  items: GuideItem[];
}

export const SWITZERLAND_GUIDE: GuideSection[] = [
  {
    id: "getting-there",
    title: "Getting to Montreux",
    emoji: "✈️",
    items: [
      {
        id: "geneva-flight",
        name: "Fly into Geneva (GVA) — recommended",
        category: "Transport",
        description:
          "Geneva Airport is the closest major hub with direct flights from London, Paris, Amsterdam, Dubai, and many other cities. From the airport, Montreux is about 1 hour 30 minutes by train or 1 hour by car along the shores of Lake Geneva.",
        tip: "Book flights and trains in advance — Geneva is a popular hub and trains fill up quickly during peak season.",
      },
      {
        id: "zurich-flight",
        name: "Fly into Zurich (ZRH)",
        category: "Transport",
        description:
          "Zurich is Switzerland's main hub if you can't get a direct flight to Geneva. Train from Zurich to Montreux takes about 2 hours through the heart of Switzerland.",
        tip: "Zurich to Montreux is a beautiful ride through Central Switzerland — worth the extra time.",
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
        tip: "Uber is usually cheaper than traditional taxis from the airport.",
      },
      {
        id: "by-boat",
        name: "By Boat",
        category: "Transport",
        description:
          "For a more scenic route, travel to or from Montreux by boat. The CGN (Compagnie Générale de Navigation) offers elegant cruises on Lake Geneva with a stop in Montreux — a beautiful way to arrive.",
        tip: "Perfect for a leisurely day trip or a memorable arrival on the lake.",
        links: [
          { label: "CGN Lake Geneva cruises", url: "https://www.cgn.ch/en/" },
        ],
      },
    ],
  },
  {
    id: "getting-around",
    title: "Getting Around Montreux",
    emoji: "🚶",
    items: [
      {
        id: "walking",
        name: "On Foot",
        category: "Practical",
        description:
          "Montreux is very walkable. The lake promenade, Old Town, and most hotels are within easy walking distance of each other and the train station.",
        tip: "Wear comfortable shoes — some parts of the town are hilly.",
      },
      {
        id: "riviera-card",
        name: "Montreux Riviera Card",
        category: "Practical",
        description:
          "Many hotels provide guests with a Montreux Riviera Card, which includes free or discounted travel on local buses, boats, and mountain railways throughout the region.",
        tip: "Ask your hotel at check-in whether they provide the card — it can save you a lot on local transport.",
      },
      {
        id: "uber-local",
        name: "Uber & Local Taxis",
        category: "Practical",
        description:
          "Uber operates in Montreux and nearby cities including Lausanne. Traditional taxis are also available but tend to be more expensive.",
        tip: "Uber works well for late-night returns after the wedding celebrations.",
      },
    ],
  },
  {
    id: "things-to-do",
    title: "Things to Do",
    emoji: "🏰",
    items: [
      {
        id: "chillon",
        name: "Château de Chillon",
        category: "Sightseeing",
        description:
          "Switzerland's most visited castle, situated right on the edge of Lake Geneva. Medieval architecture, historic rooms, dungeons, and picturesque courtyards — immortalised by Lord Byron.\n\n🚶 Walk: ~45 min from the Fairmont along the promenade\n🚆 Train: Montreux → Veytaux-Chillon (2 min, ~15 min total)\n🕘 Open daily 9am–7pm (last entry 6pm)\n🎟 CHF 13 adults",
        links: [
          { label: "Château de Chillon", url: "https://www.chillon.ch/" },
        ],
      },
      {
        id: "chateau-aigle",
        name: "Château d'Aigle",
        category: "Sightseeing",
        description:
          "A medieval castle a short train ride from Montreux, housing a fascinating wine museum with regular exhibitions — a great pairing with a Lavaux wine tour.\n\n🚆 Train: Montreux → Aigle (10 min, ~30 min total)\n🕘 Tue–Sun 10am–5pm, closed Mondays\n🎟 CHF 12 adults",
        links: [
          { label: "Château d'Aigle", url: "https://www.chateau-aigle.ch/" },
        ],
      },
      {
        id: "lake-promenade",
        name: "Montreux Riviera Promenade",
        category: "Sightseeing",
        description:
          "Just steps from the Fairmont, this lakeside path is lined with vibrant flowers and palm trees, offering sweeping views of Lake Geneva and the Alps. Stretches several kilometres from Clarens to Villeneuve — perfect for a morning jog, leisurely walk, or sunset stroll. The famous Freddie Mercury statue is along the way.",
        tip: "May is peak blooming season — perfect for photos with the Alps reflecting on the lake.",
      },
      {
        id: "rochers-de-naye",
        name: "Rochers de Naye",
        category: "Activity",
        description:
          "Take the cogwheel train from Montreux station up to 2,042m for panoramic views over Lake Geneva and the Alps. At the top you'll find hiking trails, alpine gardens, and marmots!",
        tip: "Sit on the right side going up for the best lake views. About 55 minutes from Montreux.",
      },
      {
        id: "narcissus-hikes",
        name: "Narcissus Hikes",
        category: "Activity",
        description:
          "From late May to early June, the hills above Montreux are blanketed in blooming narcissus flowers — a local phenomenon known as \"May Snow.\" Beautiful trails at Les Pléiades and Les Avants offer some of the best views of this fleeting sight.",
        tip: "Trail conditions vary — ask the Fairmont concierge for up-to-date route recommendations during your stay.",
      },
      {
        id: "glacier-3000",
        name: "Glacier 3000",
        category: "Activity",
        description:
          "For a high-altitude adventure, head to Glacier 3000 near Les Diablerets — about 1.5 hours from Montreux. Reachable by cable car, the glacier offers spectacular views including Mont Blanc and the Matterhorn, year-round snow, and the Peak Walk by Tissot — the world's first suspension bridge connecting two mountain peaks.",
        tip: "Dress warmly even in summer — it's a glacier! Short hikes and snow activities available year-round.",
      },
      {
        id: "lavaux",
        name: "Lavaux Vineyards (UNESCO)",
        category: "Activity",
        description:
          "Terraced vineyards stretching along the hillsides above Lake Geneva — a UNESCO World Heritage Site and one of the most breathtaking wine regions in the world. Accessible by train, car, or on foot between the charming villages of Cully, Epesses, and Saint-Saphorin.",
        tip: "Hop aboard the Lavaux Express or Lavaux Panoramic — tourist trains that wind through the vineyards with stops for tastings and photos.",
      },
      {
        id: "lavaux-wine",
        name: "Wine Tasting in Lavaux",
        category: "Activity",
        description:
          "The region is home to family-run domaines specialising in Chasselas — a crisp, mineral-rich white wine native to the area. Most require reservations, especially on weekends.",
        tip: "Book ahead! Same-day tastings are rarely available at the best estates.",
        links: [
          { label: "Domaine Bovy (Chexbres)", url: "https://www.domainebovy.ch/" },
          { label: "Domaine Croix Duplex (Grandvaux)", url: "https://www.croixduplex.ch/" },
          { label: "Domaine Louis Bovard (Cully)", url: "https://www.louisbovard.ch/" },
          { label: "Domaine Blaise Duboux (Epesses)", url: "https://www.blaiseduboux.ch/" },
          { label: "Les Frères Dubois (Dézaley)", url: "https://www.lesfreresdubois.ch/" },
        ],
      },
      {
        id: "lausanne",
        name: "Day Trip to Lausanne",
        category: "Sightseeing",
        description:
          "A vibrant Swiss city just 30 minutes by train. Highlights: Gothic cathedral, Olympic Museum, the charming Old Town, and the lakefront at Ouchy.",
        tip: "The Olympic Museum at Ouchy is world-class and right on the lake — worth a few hours.",
      },
      {
        id: "golden-pass",
        name: "GoldenPass Panoramic Train",
        category: "Activity",
        description:
          "One of Switzerland's most iconic train journeys starts right in Montreux and winds through the Swiss Alps to the charming resort town of Gstaad and beyond. The train features large panoramic windows and plush seating, offering breathtaking views of mountain peaks, alpine villages, and lush valleys.",
        tip: "Book panoramic seats in advance at sbb.ch. The stretch from Montreux to Zweisimmen is especially dramatic — even a short section is worth it.",
        links: [
          { label: "Book on SBB", url: "https://www.sbb.ch/en" },
        ],
      },
    ],
  },
  {
    id: "fairmont",
    title: "Fairmont Le Montreux Palace",
    emoji: "🏨",
    items: [
      {
        id: "fairmont-pools",
        name: "Pools & Hot Tub",
        category: "Practical",
        description:
          "Both an outdoor pool and a heated indoor pool, plus a hot tub — all with panoramic views of the surrounding mountains. Located on floor -1.",
        tip: "A perfect way to unwind between wedding events.",
      },
      {
        id: "fairmont-spa",
        name: "Spa & Gym",
        category: "Practical",
        description:
          "Sauna, steam room, jacuzzi, spa treatments, and a fully equipped gym with fitness classes. Located on floor -1.",
        tip: "Book spa treatments in advance — they fill up quickly.",
        links: [
          { label: "Fairmont Wellness", url: "https://www.fairmont.com/en/hotels/montreux/fairmont-le-montreux-palace/wellness.html" },
        ],
      },
      {
        id: "fairmont-concierge",
        name: "Concierge",
        category: "Practical",
        description:
          "Don't hesitate to ask the concierge for personalised dining, sightseeing, and activity recommendations to make the most of your stay.",
      },
    ],
  },
  {
    id: "restaurants",
    title: "Eating & Drinking",
    emoji: "🍷",
    items: [
      {
        id: "funky-claudes",
        name: "Funky Claude's Bar",
        category: "Bar",
        description:
          "Cocktails and live music in a cosy atmosphere at the back of the Montreux Jazz Café, on the ground floor of the Fairmont.",
        tip: "Named after legendary Montreux Jazz Festival founder Claude Nobs — a Montreux icon.",
      },
      {
        id: "fairmont-dining",
        name: "Fairmont Dining",
        category: "Restaurant",
        description:
          "The Fairmont has several on-site dining options. See the full list on their website.",
        links: [
          { label: "View all dining options", url: "https://www.fairmont.com/en/hotels/montreux/fairmont-le-montreux-palace/dining.html" },
        ],
      },
      {
        id: "baron-tavernier",
        name: "Le Baron Tavernier",
        category: "Restaurant",
        description:
          "A beautiful estate restaurant in the Lavaux vineyards — this is where the Rehearsal Dinner is being held! The estate also offers wine tasting.",
        tip: "The local Chasselas white wine from the Lavaux region is exceptional.",
      },
      {
        id: "la-rouvenaz",
        name: "Hôtel & Restaurant La Rouvenaz",
        category: "Restaurant",
        description:
          "A Montreux institution right on the lakeside, serving Swiss-Italian cuisine with beautiful lake views. Known for fresh fish from Lake Geneva.",
        tip: "Perch (perche) from Lake Geneva is a local speciality — try the classic meunière style.",
      },
      {
        id: "confiserie-zurcher",
        name: "Confiserie Zurcher",
        category: "Café",
        description:
          "A traditional Swiss confectionery and café — perfect for breakfast pastries, hot chocolate, and handmade chocolates to take home.",
        tip: "Pick up a box of Swiss chocolates as a souvenir — made in-house.",
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
          "Switzerland uses Swiss Francs (CHF). 1 CHF ≈ £0.90 / €1.05 / $1.27. Cards are widely accepted but carry some cash for smaller shops.",
        tip: "Swiss prices are high — budget CHF 25–40 for a main course at a mid-range restaurant. Check xe.com for the latest exchange rates.",
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
          "May in Montreux is beautiful spring weather: 15–22°C on warm days. Expect occasional rain — pack a light waterproof jacket. The lake acts as a heat buffer making it milder than inland.",
        tip: "May is peak blooming season — the lake promenade will be stunning with roses and flowers.",
      },
      {
        id: "getting-around",
        name: "Getting Around Montreux",
        category: "Transport",
        description:
          "Montreux is a normal town — cars, taxis, and Uber all work here. The town centre is walkable. Trains connect to Lausanne (30 min), Geneva (1 hr), and beyond.",
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
}

export const PACKING_GUIDE: PackingCategory[] = [
  {
    id: "outfits",
    title: "Outfits for Each Event",
    emoji: "👗",
    items: [
      {
        id: "mehendi-outfit",
        label: "Rehearsal Dinner — Smart casual Indian or Western",
        tip: "White, soft neutrals, shades of green or rose. The venue is a vineyard estate — comfortable yet elegant.",
        weddingPartyOnly: true,
      },
      {
        id: "sangeet-outfit",
        label: "Sangeet — Festive Indian or semi-formal Western",
        tip: "Bright jewel tones and festive hues! Think vibrant lehenga, saree, salwar kameez, sherwani, or a colourful cocktail dress. This is the big dancing night — dress to impress!",
      },
      {
        id: "ceremony-outfit",
        label: "Ceremony & Reception — Indian formal or black-tie Western",
        tip: "Elegant neutrals and muted evening tones. Bridal lehenga, silk saree, sherwani, formal gown, or tuxedo. Please avoid white, ivory, and cream.",
      },
      {
        id: "casual-exploring",
        label: "Casual sightseeing / daytime clothes (2–3 outfits)",
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
        id: "heels-events",
        label: "Dressy shoes / heels for Sangeet, Ceremony & Reception",
        tip: "All three main events are indoors at the Fairmont — heels are fine. Block heels or kitten heels are great for dancing at the Sangeet.",
      },
      {
        id: "flats-mehendi",
        label: "Flats or comfortable shoes for Rehearsal Dinner",
        tip: "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
        weddingPartyOnly: true,
      },
      {
        id: "walking-shoes",
        label: "Comfortable walking shoes / trainers for sightseeing",
        tip: "Essential for the Montreux promenade and Château de Chillon — quite a lot of walking.",
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
        label: "Light waterproof / windproof jacket",
        tip: "May in Montreux can bring spring showers. A packable rain jacket is perfect.",
      },
      {
        id: "layers",
        label: "Light layers / cardigan",
        tip: "Evenings by the lake can be cool (12–15°C). Bring a wrap or light jacket for outdoor moments.",
      },
      {
        id: "sunglasses",
        label: "Sunglasses",
        tip: "The lake glare on sunny days is intense.",
      },
      {
        id: "sunscreen",
        label: "Sunscreen (SPF 30+)",
        tip: "Especially if you're heading up to Rochers de Naye.",
      },
    ],
  },
  {
    id: "indian-attire-extras",
    title: "Indian Attire Extras",
    emoji: "✨",
    items: [
      {
        id: "dupatta",
        label: "Dupatta / stole / wrap for each Indian outfit",
        tip: "Handy for cooler evenings outdoors and essential for completing Indian formal looks.",
      },
      {
        id: "jewellery",
        label: "Jewellery for each event",
        tip: "Pack pieces in individual pouches to avoid tangling. Sangeet = bold statement jewellery; Ceremony = elegant classics.",
      },
      {
        id: "safety-pins",
        label: "Safety pins (essential if wearing a saree)",
        tip: "A small pouch of safety pins is a lifesaver for keeping a saree draped all night.",
      },
      {
        id: "fashion-tape",
        label: "Double-sided fashion tape",
        tip: "Lifesaver for blouses, dupattas, and formal dresses.",
      },
      {
        id: "bindi",
        label: "Bindis and accessories",
      },
      {
        id: "clutch",
        label: "Small clutch / evening bag for Sangeet and Reception",
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
        id: "travel-insurance",
        label: "Travel insurance documents",
      },
      {
        id: "currency",
        label: "Some Swiss Francs (CHF) cash",
        tip: "Cards widely accepted but some cafés and markets prefer cash.",
      },
      {
        id: "adaptor",
        label: "Swiss plug adaptor (Type J / universal adaptor)",
        tip: "Swiss sockets are unique — EU adaptors don't always fit.",
      },
      {
        id: "meds",
        label: "Personal medications + basic first aid",
      },
      {
        id: "reusable-bottle",
        label: "Reusable water bottle",
        tip: "Swiss tap water is some of the cleanest in the world.",
      },
      {
        id: "camera",
        label: "Camera / extra memory cards",
        tip: "The Fairmont gardens, Lake Geneva, and Alps make for incredible photos.",
      },
    ],
  },
];
