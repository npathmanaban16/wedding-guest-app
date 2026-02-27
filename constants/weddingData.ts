// ============================================================
// WEDDING DATA — update these details with your actual information
// ============================================================

export const WEDDING = {
  bride: "Neha",
  groom: "Naveen",
  coupleNames: "Neha & Naveen",
  weddingDate: new Date("2026-08-15T15:00:00"), // TODO: Update with your actual date & time
  location: "Switzerland",
  hashtag: "#NehaNaveen2026",       // TODO: Update with your hashtag
  website: "https://www.neha-naveen.com",
  contactEmail: "wedding@neha-naveen.com", // TODO: Update
};

// ============================================================
// EVENTS / SCHEDULE
// ============================================================

export interface WeddingEvent {
  id: string;
  title: string;
  emoji: string;
  date: string;      // Display string, e.g. "Friday, 14 August 2026"
  time: string;      // Display string, e.g. "7:00 PM"
  venue: string;
  address: string;
  dressCode: string;
  description: string;
  notes?: string;
}

export const EVENTS: WeddingEvent[] = [
  {
    id: "welcome-dinner",
    title: "Welcome Dinner",
    emoji: "🍽️",
    date: "Friday, 14 August 2026",      // TODO: Update
    time: "7:00 PM",
    venue: "Restaurant Cheval Blanc",     // TODO: Update
    address: "Bahnhofstrasse 10, Zermatt, Switzerland", // TODO: Update
    dressCode: "Smart Casual — think elegant but comfortable. Denim welcome!",
    description:
      "Join us for an intimate welcome dinner the evening before the big day. This is a relaxed gathering for us to spend time with our nearest and dearest before all the excitement begins.",
    notes: "Dinner will be followed by drinks on the terrace with views of the Matterhorn.",
  },
  {
    id: "ceremony",
    title: "Wedding Ceremony",
    emoji: "💍",
    date: "Saturday, 15 August 2026",    // TODO: Update
    time: "3:00 PM",
    venue: "Chapel of St. Mauritius",    // TODO: Update
    address: "Kirchplatz, Zermatt, Switzerland", // TODO: Update
    dressCode:
      "Formal / Black Tie Optional. Ladies: floor-length gowns or elegant midi dresses. Gentlemen: suits or tuxedos.",
    description:
      "The ceremony will be an intimate civil service followed by a symbolic blessing. Please arrive 20–30 minutes early to be seated. Tissues recommended! 🥲",
    notes:
      "The chapel is a short walk from the main square. Electric taxis will be available from the hotel.",
  },
  {
    id: "reception",
    title: "Wedding Reception & Dinner",
    emoji: "🥂",
    date: "Saturday, 15 August 2026",   // TODO: Update
    time: "6:00 PM",
    venue: "Grand Hotel Zermatterhof",  // TODO: Update
    address: "Bahnhofstrasse 55, Zermatt, Switzerland", // TODO: Update
    dressCode: "Formal / Black Tie Optional — same outfit as the ceremony.",
    description:
      "The reception begins with cocktail hour in the garden, followed by a seated dinner and dancing. Speeches, cake, and lots of joy await!",
    notes:
      "The venue has a late-night bar. Last shuttle back to nearby hotels runs at 1:00 AM.",
  },
  {
    id: "farewell-brunch",
    title: "Farewell Brunch",
    emoji: "☀️",
    date: "Sunday, 16 August 2026",     // TODO: Update
    time: "10:30 AM",
    venue: "Hotel Alex Zermatt",        // TODO: Update
    address: "Bodmenstrasse 12, Zermatt, Switzerland", // TODO: Update
    dressCode: "Casual — come as you are!",
    description:
      "A relaxed goodbye brunch for those still in town. Come and relive the highlights over eggs and mimosas before heading home.",
    notes: "No RSVP needed — just show up!",
  },
];

// ============================================================
// SWITZERLAND GUIDE
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
    title: "Getting to Zermatt",
    emoji: "🚄",
    items: [
      {
        id: "zurich-flight",
        name: "Fly into Zurich (ZRH)",
        category: "Transport",
        description:
          "Zurich Airport is the main hub with direct flights from most major cities. From the airport, take the train to Brig or Visp, then change to the Matterhorn Gotthard Bahn to Zermatt.",
        tip: "Book trains in advance on sbb.ch for cheaper fares. The journey takes around 3.5 hours.",
      },
      {
        id: "geneva-flight",
        name: "Fly into Geneva (GVA)",
        category: "Transport",
        description:
          "Geneva Airport is closer to Zermatt if you're coming from western Europe. Train from Geneva to Visp, then to Zermatt — about 3 hours.",
        tip: "Geneva to Zermatt by train is a gorgeous journey through the Rhône Valley.",
      },
      {
        id: "train-to-zermatt",
        name: "Train to Zermatt",
        category: "Transport",
        description:
          "Zermatt is car-free! You must take the Matterhorn Gotthard Bahn from Visp or Brig to reach the village. Cars are left at Täsch, from where there's a shuttle train.",
        tip: "Swiss Travel Pass covers most trains — great value if you plan to explore Switzerland.",
      },
    ],
  },
  {
    id: "things-to-do",
    title: "Things to Do",
    emoji: "🏔️",
    items: [
      {
        id: "matterhorn",
        name: "See the Matterhorn",
        category: "Sightseeing",
        description:
          "The iconic pyramid-shaped peak is unmistakable on the Zermatt skyline. Head to Riffelberg or Gornergrat for the most stunning views.",
        tip: "The Matterhorn Glacier Paradise (Klein Matterhorn) is the highest cable car in the Alps — incredible on a clear day!",
      },
      {
        id: "gornergrat",
        name: "Gornergrat Railway",
        category: "Activity",
        description:
          "Take the cogwheel railway 3,089m up to Gornergrat for panoramic views of 29 four-thousanders, including the Matterhorn and Europe's largest glacier (outside the polar region).",
        tip: "Go early morning for the clearest views and fewer crowds. Sunrise trips are magical.",
      },
      {
        id: "hiking",
        name: "Hiking",
        category: "Activity",
        description:
          "Zermatt has over 400km of summer hiking trails for all abilities. The Five Lakes Walk (Fünf Seen Wanderung) is a classic — each lake reflects the Matterhorn differently.",
        tip: "The Five Lakes Walk is about 10km and takes 3–4 hours. Moderate difficulty.",
      },
      {
        id: "glacier-paradise",
        name: "Matterhorn Glacier Paradise",
        category: "Activity",
        description:
          "At 3,883m, this is the highest cable car station in the Alps. There's even an ice palace carved into the glacier!",
        tip: "Bring a warm layer — it's very cold at the top even in summer.",
      },
      {
        id: "village",
        name: "Explore Zermatt Village",
        category: "Sightseeing",
        description:
          "The charming car-free village has beautiful old chalets, boutique shops, the Matterhorn Museum (Zermatlantis), and fantastic restaurants. A stroll through the Hinterdorf area is lovely.",
      },
    ],
  },
  {
    id: "restaurants",
    title: "Eating & Drinking",
    emoji: "🍷",
    items: [
      {
        id: "whymper-stube",
        name: "Whymper-Stube",
        category: "Restaurant",
        description:
          "A cosy, traditional Swiss restaurant named after Edward Whymper who first summited the Matterhorn. Famous for its raclette and fondues.",
        tip: "Get the raclette — it's the real Swiss experience.",
      },
      {
        id: "chez-vrony",
        name: "Chez Vrony",
        category: "Restaurant",
        description:
          "A beloved mountain restaurant on the slopes of Sunnegga with spectacular Matterhorn views. Walk or ski down from Sunnegga station.",
        tip: "Lunch here on a sunny day with a glass of local wine and a cheese plate is perfection.",
      },
      {
        id: "elsie-bar",
        name: "Elsie's Bar",
        category: "Bar",
        description:
          "A Zermatt institution since 1970. Tiny and atmospheric, Elsie's is the place for an après-ski drink or a late-night cocktail.",
        tip: "The Matterhorn-shaped chocolate they bring with your drinks is adorable.",
      },
      {
        id: "cervo",
        name: "Cervo Mountain Resort",
        category: "Restaurant",
        description:
          "Upscale dining with stunning mountain views. The Bistro Cervo and SITI Restaurant offer excellent modern Alpine cuisine.",
      },
      {
        id: "supermarkt",
        name: "Coop & Migros Supermarkets",
        category: "Practical",
        description:
          "Both supermarkets are in the village centre. Stock up on Swiss chocolate, local cheeses, and wine — much better value than restaurants for breakfast supplies!",
        tip: "Try Gruyère, Emmental, and Appenzeller cheese. And Cailler chocolate — it's Swiss-made.",
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
          "Switzerland uses Swiss Francs (CHF). 1 CHF ≈ £0.90 / €1.05 / $1.10. Most places accept cards but carry some cash for smaller shops.",
        tip: "Swiss prices are high — budget around CHF 25–40 for a main course at a mid-range restaurant.",
      },
      {
        id: "language",
        name: "Language",
        category: "Practical",
        description:
          "Zermatt is in the German-speaking region of Switzerland. German is the main language, but almost everyone in the village speaks English fluently.",
        tip: "Learn 'Merci' (thank you) and 'Hoi' (hi) — locals appreciate the effort!",
      },
      {
        id: "weather",
        name: "Weather in August",
        category: "Practical",
        description:
          "August is warm in the valley (18–25°C) but much colder at altitude. Expect warm sunny days and the possibility of afternoon thunderstorms in the mountains.",
        tip: "Layer up for mountain excursions. A light waterproof jacket is essential.",
      },
      {
        id: "electric-taxis",
        name: "Getting Around",
        category: "Transport",
        description:
          "Zermatt is car-free. You'll get around on foot, by electric taxi, horse-drawn carriage, or hotel shuttle. The village is compact — most things are walkable.",
        tip: "Electric taxis are quick and not too expensive for luggage or late nights.",
      },
      {
        id: "emergency",
        name: "Emergency Numbers",
        category: "Practical",
        description:
          "Police: 117 | Ambulance: 144 | Fire: 118 | Mountain Rescue: 1414. The nearest hospital is in Visp, about 35km away.",
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
        id: "welcome-dinner-outfit",
        label: "Welcome Dinner — Smart Casual outfit",
        tip: "Think elegant but relaxed. A nice blouse with trousers, or a midi dress. No jeans required, but fine if you prefer.",
      },
      {
        id: "ceremony-outfit",
        label: "Ceremony & Reception — Formal outfit",
        tip: "Ladies: floor-length gown or elegant midi dress in any colour except white/ivory. Gentlemen: suit or tuxedo. Heels not required — cobblestones can be tricky!",
      },
      {
        id: "farewell-brunch-outfit",
        label: "Farewell Brunch — Casual outfit",
        tip: "Whatever you're comfortable in! Jeans, casual dress, whatever.",
      },
      {
        id: "hiking-outfit",
        label: "Hiking / Mountain day outfit",
        tip: "Moisture-wicking layers, waterproof jacket, and sturdy walking shoes or hiking boots.",
      },
      {
        id: "casual-sightseeing",
        label: "Casual sightseeing clothes (2–3 outfits)",
        tip: "Comfortable walking shoes are a must — Zermatt's streets are cobblestone and hilly.",
      },
    ],
  },
  {
    id: "footwear",
    title: "Footwear",
    emoji: "👟",
    items: [
      {
        id: "comfortable-walking",
        label: "Comfortable walking shoes / trainers",
        tip: "Essential — you'll be walking a lot on cobblestones.",
      },
      {
        id: "dress-shoes",
        label: "Dress shoes for the ceremony & reception",
        tip: "Consider block heels or low heels — stilettos on cobblestones are tricky!",
      },
      {
        id: "hiking-boots",
        label: "Hiking boots or sturdy trail shoes (optional)",
        tip: "Only needed if you plan to hike. Trail runners also work for easier hikes.",
      },
    ],
  },
  {
    id: "weather-gear",
    title: "Weather & Mountain Gear",
    emoji: "🏔️",
    items: [
      {
        id: "light-jacket",
        label: "Waterproof / windproof jacket",
        tip: "Mountain weather changes fast. A packable rain jacket is perfect.",
      },
      {
        id: "warm-layer",
        label: "Warm mid-layer (fleece or puffer)",
        tip: "Temperatures at altitude (3000m+) can be close to freezing even in August.",
      },
      {
        id: "sunglasses",
        label: "Sunglasses",
        tip: "UV is intense at altitude. Polarised lenses recommended.",
      },
      {
        id: "sunscreen",
        label: "High-SPF sunscreen (SPF 50+)",
        tip: "Mountain sun is much stronger — you'll burn faster than at sea level.",
      },
      {
        id: "hat",
        label: "Sun hat + warm beanie",
        tip: "A sun hat for the village and a beanie for the mountain cable cars.",
      },
    ],
  },
  {
    id: "essentials",
    title: "Travel Essentials",
    emoji: "🧳",
    items: [
      { id: "passport", label: "Passport / ID" },
      { id: "travel-insurance", label: "Travel insurance documents", tip: "Especially important for mountain activities." },
      { id: "euros-francs", label: "Swiss Francs (CHF) — some cash", tip: "Cards accepted widely but some places are cash-only." },
      { id: "adaptor", label: "Swiss plug adaptor (Type J)", tip: "Swiss sockets are unique — Type J adaptors. A universal adaptor usually works." },
      { id: "meds", label: "Personal medications + basic first aid", tip: "Pharmacies (Apotheke) are available in the village." },
      { id: "reusable-bottle", label: "Reusable water bottle", tip: "Swiss tap water is some of the best in the world — drink freely!" },
      { id: "day-bag", label: "Small day backpack", tip: "Useful for mountain excursions." },
      { id: "camera", label: "Camera / extra memory cards", tip: "There will be lots of photo opportunities — storage fills up fast!" },
    ],
  },
  {
    id: "beauty",
    title: "Beauty & Toiletries",
    emoji: "💄",
    items: [
      { id: "lip-balm", label: "SPF lip balm", tip: "Your lips will thank you at altitude." },
      { id: "moisturiser", label: "Rich moisturiser", tip: "Mountain air is very dry." },
      { id: "nail-kit", label: "Mini nail kit for the wedding day" },
      { id: "dry-shampoo", label: "Dry shampoo (travel-sized)" },
      { id: "wedding-bag", label: "Small clutch / evening bag for the reception" },
    ],
  },
];
