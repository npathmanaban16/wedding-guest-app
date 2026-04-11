// ============================================================
// WEDDING DATA
// ============================================================

export const WEDDING = {
  bride: "Neha",
  groom: "Naveen",
  coupleNames: "Neha & Naveen",
  weddingDate: new Date("2026-05-23T17:00:00"), // Saturday 23 May 2026, ceremony at 5:00 PM
  location: "Montreux, Switzerland",
  hashtag: "#NehaNaveen2026",       // TODO: Update with your actual hashtag
  website: "https://www.neha-naveen.com",
  contactEmail: "nehanaveen2026@gmail.com",
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
}

export const EVENTS: WeddingEvent[] = [
  {
    id: "rehearsal-mehendi",
    title: "Rehearsal Dinner & Mehendi",
    emoji: "🌿",
    date: "Thursday, 21 May 2026",
    time: "6:00 PM – 9:00 PM",
    venue: "Lavaux Vineyards | Le Baron Tavernier",
    address: "Lavaux, Switzerland (transportation provided from hotel)",
    dressCode:
      "Smart casual Indian or Western attire. White, soft neutrals, shades of green or rose.",
    description:
      "A rehearsal dinner inspired by mehendi traditions, following the ceremony rehearsal earlier in the day. Join us for an intimate evening among UNESCO-listed terraced vineyards above Lake Geneva.",
    notes:
      "Transportation will be provided from the Fairmont Le Montreux Palace. Wear loose or open-sleeved clothing so henna can be applied to hands and arms!",
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
    notes:
      "La Terrasse du Petit Palais offers stunning views over Lake Geneva. Cocktail attire with an Indian festive flair is encouraged.",
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
      "Indian formal or black-tie Western. Elegant neutrals and muted evening tones. Please avoid white, ivory, and cream.",
    description:
      "The wedding ceremony in the beautiful gardens of the Fairmont, with the Alps and Lake Geneva as backdrop. Please arrive 20–30 minutes early to be seated.",
    notes: "Cocktail hour to follow at 6:00 PM.",
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
      "Indian formal or black-tie Western. Elegant neutrals and muted evening tones — same outfit as the ceremony.",
    description:
      "Dinner, speeches, dancing, and celebrating into the night in the grand Salle des Fêtes ballroom.",
    notes:
      "The reception follows directly from the cocktail hour. Taxis can be arranged through the hotel concierge.",
  },
];

// ============================================================
// SWITZERLAND GUIDE — Montreux
// ============================================================

export interface GuideItem {
  id: string;
  name: string;
  description: string;
  category: string;
  tip?: string;
  link?: string;
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
          "Geneva Airport is the closest major hub. Montreux is about 1 hour from Geneva by train or car — a scenic journey along the shores of Lake Geneva.",
        tip: "Direct flights to Geneva from London, Paris, Amsterdam, Dubai, and many other cities. Book trains in advance at sbb.ch.",
      },
      {
        id: "zurich-flight",
        name: "Fly into Zurich (ZRH)",
        category: "Transport",
        description:
          "Zurich is Switzerland's main hub if you can't get a direct flight to Geneva. Train from Zurich to Montreux takes about 2 hours.",
        tip: "Zurich to Montreux is a beautiful ride through Central Switzerland.",
      },
      {
        id: "train-montreux",
        name: "Train: Geneva Airport → Montreux",
        category: "Transport",
        description:
          "Trains run several times every hour from Geneva Airport directly to Montreux. Journey time is about 1 hour. The Fairmont Le Montreux Palace is a 5-minute walk from Montreux train station.",
        tip: "A Swiss Travel Pass gives unlimited train travel — great value if you're exploring Switzerland before or after the wedding.",
      },
      {
        id: "taxi-uber",
        name: "Taxi or Uber",
        category: "Transport",
        description:
          "Montreux is fully accessible by car. Uber operates in the Geneva/Lausanne region. A taxi from Geneva Airport to Montreux costs approximately CHF 120–160.",
        tip: "Uber is usually cheaper than traditional taxis from the airport.",
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
          "Switzerland's most visited historic monument — a stunning medieval castle on a rocky island at the edge of Lake Geneva, just 3km from Montreux. Immortalised by Lord Byron.",
        tip: "Walk or cycle along the lake promenade from Montreux (about 45 minutes). Or take bus 201.",
      },
      {
        id: "lake-promenade",
        name: "Montreux Lake Promenade",
        category: "Sightseeing",
        description:
          "A gorgeous flower-lined lakeside walkway stretching for several kilometres. In May the roses are in full bloom. The famous Freddie Mercury statue is on the promenade.",
        tip: "May is peak blooming season — perfect for photos with the Alps reflecting on the lake.",
      },
      {
        id: "rochers-de-naye",
        name: "Rochers de Naye",
        category: "Activity",
        description:
          "Take the GoldenPass cogwheel railway from Montreux station up to 2,042m for panoramic views over Lake Geneva and the Alps. There are marmots at the summit!",
        tip: "The train journey itself is half the attraction — sit on the right side going up for lake views. About 55 minutes from Montreux.",
      },
      {
        id: "lavaux",
        name: "Lavaux Vineyards (UNESCO)",
        category: "Activity",
        description:
          "The terraced vineyards between Lausanne and Montreux are a UNESCO World Heritage Site — and you'll be visiting for the Rehearsal Dinner! Come earlier for wine tasting and hiking.",
        tip: "The Lavaux Vinorama in Rivaz has excellent local wine tasting with stunning views.",
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
        name: "GoldenPass Express Train",
        category: "Activity",
        description:
          "One of Switzerland's most scenic train journeys starts in Montreux and winds through the mountains toward Interlaken and Lucerne. Even a short section is spectacular.",
        tip: "Book panoramic seats at sbb.ch. The stretch from Montreux to Zweisimmen is especially dramatic.",
      },
    ],
  },
  {
    id: "restaurants",
    title: "Eating & Drinking",
    emoji: "🍷",
    items: [
      {
        id: "baron-tavernier",
        name: "Le Baron Tavernier",
        category: "Restaurant",
        description:
          "A beautiful estate restaurant in the Lavaux vineyards — this is where the Rehearsal Dinner is being held! The estate also offers wine tasting.",
        tip: "The local Chasselas white wine from the Lavaux region is exceptional.",
      },
      {
        id: "fairmont-dining",
        name: "Fairmont Le Montreux Palace",
        category: "Restaurant",
        description:
          "The hotel has several dining options: Funky Claude's Bar (Japanese fusion), Le Deck (brasserie with lake views), and afternoon tea in the Salon.",
        tip: "Funky Claude's Bar is a great spot for pre-dinner drinks — named after legendary Montreux Jazz Festival founder Claude Nobs.",
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
      {
        id: "coop-migros",
        name: "Coop & Migros Supermarkets",
        category: "Practical",
        description:
          "Both supermarkets are in the Montreux town centre. Great for wine, cheese, chocolate, and breakfast supplies at much better value than restaurants.",
        tip: "Try local Chasselas wine, Gruyère cheese, and Cailler chocolate (made nearby in Broc).",
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
          "Switzerland uses Swiss Francs (CHF). 1 CHF ≈ £0.90 / €1.05 / $1.10. Cards are widely accepted but carry some cash for smaller shops.",
        tip: "Swiss prices are high — budget CHF 25–40 for a main course at a mid-range restaurant.",
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
}

export const PACKING_GUIDE: PackingCategory[] = [
  {
    id: "outfits",
    title: "Outfits for Each Event",
    emoji: "👗",
    items: [
      {
        id: "mehendi-outfit",
        label: "Rehearsal Dinner / Mehendi — Smart casual Indian or Western",
        tip: "White, soft neutrals, shades of green or rose. Wear loose or open-sleeved clothing so henna can be applied easily to hands and arms!",
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
        label: "Flats or comfortable shoes for Mehendi dinner",
        tip: "Le Baron Tavernier is a vineyard estate — you may be on terraced outdoor terrain.",
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
      { id: "passport", label: "Passport / ID" },
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
