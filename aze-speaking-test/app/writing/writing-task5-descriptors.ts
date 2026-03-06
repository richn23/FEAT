// ─────────────────────────────────────────────────────────────────────────────
// writing-task5-descriptors.ts — Single source of truth for Writing Task 5
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// Task 5: Compare & Advise (Mediation)
// Format: Two visual stimulus cards displayed + situational chat
// Functions tested: MEDIATING + INFORMING + DIRECTING
// Who: Everyone
//
// CHANGES v2:
//   • Stimulus pool expanded from 3 → 20 sets
//   • 4 tiers: simple (A1-A2), everyday (A2+-B1), detailed (B1+-B2), complex (B2+-C1)
//   • Route picks 1 random set per session based on candidate level
//   • Each set has 4 situations — AI picks from these during the chat
//
// DESIGN PRINCIPLE: Macros are topic-agnostic. They test the ability to
// relay information from a source, match it to needs, and advise.
// ─────────────────────────────────────────────────────────────────────────────

export type CefrLevel =
  | "A1" | "A2" | "A2_PLUS"
  | "B1" | "B1_PLUS"
  | "B2" | "B2_PLUS" | "C1";

export type FunctionType = "Mediating" | "Informing" | "Directing";
export type MacroVerdict = "CAN" | "NOT_YET" | "NOT_TESTED";

export interface CardFeature {
  icon: string;
  label: string;
  value: string;
}

export interface StimulusCard {
  id: string;
  name: string;
  tagline: string;
  rating: number;
  price: string;
  priceNote?: string;
  features: CardFeature[];
  highlight?: string;
}

export interface StimulusSet {
  id: string;
  category: string;
  categoryIcon: string;
  // simple   — A1-A2: few features, obvious differences, concrete
  // everyday — A2+-B1: more features, some trade-offs
  // detailed — B1+-B2: richer features, less obvious choice
  // complex  — B2+-C1: nuanced trade-offs, context-dependent advice
  tier: "simple" | "everyday" | "detailed" | "complex";
  cardA: StimulusCard;
  cardB: StimulusCard;
  situations: string[]; // AI picks from these during the chat
}

export interface GseMicro {
  id: string;
  gse: number;
  fn: FunctionType;
  text: string;
}

export interface AzeMacro {
  azeId: string;
  claim: string;
  fn: FunctionType;
  level: CefrLevel;
  microIds: string[];
  signals: string[];
  notes?: string;
}

export interface LevelCluster {
  level: CefrLevel;
  label: string;
  gseRange: [number, number];
  macroIds: string[];
  confirmThreshold: number;
  totalMacros: number;
  onConfirm: string;
  levelDescription: string;
}

export interface WritingTask5Config {
  meta: {
    taskId: string;
    title: string;
    functions: FunctionType[];
    maxExchanges: number;
    description: string;
  };
  principles: {
    visualStimulusAlwaysVisible: boolean;
    situationalQuestions: boolean;
    functionAndFormSeparate: boolean;
    macrosAreTopicAgnostic: boolean;
    aiChangesScenario: boolean;
  };
  stimulusSets: StimulusSet[];
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: WritingTask5Config["meta"] = {
  taskId: "w-task-5",
  title: "Compare & Advise",
  functions: ["Mediating", "Informing", "Directing"],
  maxExchanges: 12,
  description:
    "Split-screen task. Two visual cards displayed (hotels, jobs, phones, etc.) " +
    "with a chat below. AI asks situational questions: 'Which for a family?' " +
    "'What if budget is tight?' Tests mediation: relaying source info to meet needs.",
};

const principles: WritingTask5Config["principles"] = {
  visualStimulusAlwaysVisible: true,
  situationalQuestions: true,
  functionAndFormSeparate: true,
  macrosAreTopicAgnostic: true,
  aiChangesScenario: true,
};


// ═════════════════════════════════════════════════════════════════════════════
// STIMULUS SETS (20 total)
//
// simple   (5) — A1-A2:    few features, clear differences, concrete everyday topics
// everyday (5) — A2+-B1:   more features, some trade-offs, familiar contexts
// detailed (5) — B1+-B2:   richer detail, less obvious choice, requires selection
// complex  (5) — B2+-C1:   nuanced trade-offs, context-dependent, abstract factors
//
// Route picks 1 set per session based on candidate level from previous tasks.
// ═════════════════════════════════════════════════════════════════════════════

const stimulusSets: StimulusSet[] = [

  // ── Simple (5) — A1-A2 ────────────────────────────────────────────────

  {
    id: "cafes",
    category: "Cafés",
    categoryIcon: "☕",
    tier: "simple",
    cardA: {
      id: "cafe-a",
      name: "Quick Cup",
      tagline: "Fast, cheap, and cheerful",
      rating: 3,
      price: "$3",
      priceNote: "per coffee",
      features: [
        { icon: "⏱️", label: "Wait time", value: "2 minutes" },
        { icon: "💺", label: "Seating", value: "10 seats" },
        { icon: "📶", label: "WiFi", value: "No" },
        { icon: "🥐", label: "Food", value: "Sandwiches only" },
        { icon: "🕗", label: "Hours", value: "7am – 5pm" },
      ],
    },
    cardB: {
      id: "cafe-b",
      name: "The Slow Brew",
      tagline: "Relax, work, stay a while",
      rating: 5,
      price: "$6",
      priceNote: "per coffee",
      features: [
        { icon: "⏱️", label: "Wait time", value: "10 minutes" },
        { icon: "💺", label: "Seating", value: "40 seats" },
        { icon: "📶", label: "WiFi", value: "Fast, free" },
        { icon: "🥐", label: "Food", value: "Full menu" },
        { icon: "🕗", label: "Hours", value: "8am – 10pm" },
      ],
      highlight: "Great for remote work",
    },
    situations: [
      "Your friend needs a quick coffee before catching a bus in 5 minutes.",
      "A student wants somewhere to study for 3 hours.",
      "Someone who only has $4 and wants a coffee and a snack.",
      "A group of 8 people who want to sit together after dinner.",
    ],
  },

  {
    id: "gyms",
    category: "Gyms",
    categoryIcon: "🏋️",
    tier: "simple",
    cardA: {
      id: "gym-a",
      name: "FitBasic",
      tagline: "No frills, just results",
      rating: 3,
      price: "$20",
      priceNote: "per month",
      features: [
        { icon: "🏋️", label: "Equipment", value: "Weights + cardio" },
        { icon: "🕗", label: "Hours", value: "6am – 10pm" },
        { icon: "🧘", label: "Classes", value: "None" },
        { icon: "🚿", label: "Showers", value: "Yes" },
        { icon: "📍", label: "Location", value: "10 min drive" },
      ],
    },
    cardB: {
      id: "gym-b",
      name: "PremiumFit Club",
      tagline: "Everything in one place",
      rating: 5,
      price: "$80",
      priceNote: "per month",
      features: [
        { icon: "🏋️", label: "Equipment", value: "Full facility" },
        { icon: "🕗", label: "Hours", value: "24 hours" },
        { icon: "🧘", label: "Classes", value: "30+ per week" },
        { icon: "🏊", label: "Pool", value: "25m pool" },
        { icon: "📍", label: "Location", value: "City centre" },
      ],
      highlight: "Personal trainer included",
    },
    situations: [
      "Someone on a tight budget who just wants to lift weights.",
      "A person who loves yoga and group fitness classes.",
      "A busy professional who can only go to the gym early in the morning or late at night.",
      "Someone who wants to swim as part of their routine.",
    ],
  },

  {
    id: "language-schools",
    category: "Language Schools",
    categoryIcon: "📚",
    tier: "simple",
    cardA: {
      id: "school-a",
      name: "EasySpeak Centre",
      tagline: "Friendly classes for everyday English",
      rating: 3,
      price: "$150",
      priceNote: "per month",
      features: [
        { icon: "👥", label: "Class size", value: "15 students" },
        { icon: "⏰", label: "Schedule", value: "Evenings only" },
        { icon: "🌐", label: "Online", value: "No" },
        { icon: "📜", label: "Certificate", value: "Not offered" },
        { icon: "📍", label: "Location", value: "Local area" },
      ],
    },
    cardB: {
      id: "school-b",
      name: "GlobalLanguage Academy",
      tagline: "Intensive English with certification",
      rating: 5,
      price: "$450",
      priceNote: "per month",
      features: [
        { icon: "👥", label: "Class size", value: "6 students" },
        { icon: "⏰", label: "Schedule", value: "Full day, flexible" },
        { icon: "🌐", label: "Online", value: "Hybrid available" },
        { icon: "📜", label: "Certificate", value: "IELTS preparation" },
        { icon: "📍", label: "Location", value: "City centre" },
      ],
      highlight: "90% exam pass rate",
    },
    situations: [
      "A person who works full time and just wants to improve their conversational English.",
      "A student preparing for a university application who needs an IELTS certificate.",
      "Someone who lives far from the city and prefers to study online.",
      "A retiree looking for a social activity to improve their English.",
    ],
  },

  {
    id: "parking",
    category: "Parking Options",
    categoryIcon: "🅿️",
    tier: "simple",
    cardA: {
      id: "parking-a",
      name: "Street Parking",
      tagline: "Pay and display on the street",
      rating: 2,
      price: "$2",
      priceNote: "per hour",
      features: [
        { icon: "⏱️", label: "Max stay", value: "2 hours" },
        { icon: "🔒", label: "Security", value: "None" },
        { icon: "🌧️", label: "Cover", value: "No" },
        { icon: "📍", label: "Distance", value: "5 min walk" },
        { icon: "🕗", label: "Hours", value: "8am – 8pm only" },
      ],
    },
    cardB: {
      id: "parking-b",
      name: "SecurePark Garage",
      tagline: "Safe, covered, all-day parking",
      rating: 4,
      price: "$5",
      priceNote: "per hour / $25 day",
      features: [
        { icon: "⏱️", label: "Max stay", value: "Unlimited" },
        { icon: "🔒", label: "Security", value: "CCTV + guard" },
        { icon: "🌧️", label: "Cover", value: "Fully covered" },
        { icon: "📍", label: "Distance", value: "2 min walk" },
        { icon: "🕗", label: "Hours", value: "24 hours" },
      ],
      highlight: "Monthly passes available",
    },
    situations: [
      "Someone who just needs to park for 30 minutes to pick up a prescription.",
      "A person leaving their car while travelling for a week.",
      "Someone with an expensive car who is worried about theft.",
      "A worker who needs to park near the office every day for a month.",
    ],
  },

  {
    id: "delivery-services",
    category: "Food Delivery",
    categoryIcon: "🛵",
    tier: "simple",
    cardA: {
      id: "delivery-a",
      name: "QuickBite",
      tagline: "Fast delivery, local restaurants",
      rating: 3,
      price: "$2",
      priceNote: "delivery fee",
      features: [
        { icon: "⏱️", label: "Delivery time", value: "20–30 mins" },
        { icon: "🍕", label: "Restaurants", value: "Local only" },
        { icon: "💳", label: "Min order", value: "$10" },
        { icon: "📱", label: "App", value: "Basic" },
        { icon: "🕗", label: "Hours", value: "11am – 11pm" },
      ],
    },
    cardB: {
      id: "delivery-b",
      name: "FoodWorld Express",
      tagline: "Every restaurant, any time",
      rating: 5,
      price: "$5",
      priceNote: "delivery fee",
      features: [
        { icon: "⏱️", label: "Delivery time", value: "30–50 mins" },
        { icon: "🍕", label: "Restaurants", value: "500+ options" },
        { icon: "💳", label: "Min order", value: "$15" },
        { icon: "📱", label: "App", value: "Track in real time" },
        { icon: "🕗", label: "Hours", value: "7am – midnight" },
      ],
      highlight: "Free delivery on first order",
    },
    situations: [
      "Someone who just wants a quick pizza from the place down the road.",
      "A person hosting a party who wants to order from 3 different restaurants.",
      "Someone who wants food delivered at 6am for an early meeting.",
      "A student with only $12 to spend on dinner.",
    ],
  },

  // ── Everyday (5) — A2+-B1 ─────────────────────────────────────────────

  {
    id: "hotels-beach",
    category: "Beach Hotels",
    categoryIcon: "🏨",
    tier: "everyday",
    cardA: {
      id: "hotel-beach-a",
      name: "Sunny Bay Inn",
      tagline: "Simple, friendly, by the sea",
      rating: 3,
      price: "$65",
      priceNote: "per night",
      features: [
        { icon: "🏖️", label: "Beach", value: "2 min walk" },
        { icon: "📶", label: "WiFi", value: "Free" },
        { icon: "🍳", label: "Breakfast", value: "Not included" },
        { icon: "🅿️", label: "Parking", value: "Free" },
        { icon: "👨‍👩‍👧", label: "Family rooms", value: "Available" },
      ],
      highlight: "Best value near the beach",
    },
    cardB: {
      id: "hotel-beach-b",
      name: "Grand Coral Resort",
      tagline: "Luxury beachfront experience",
      rating: 5,
      price: "$280",
      priceNote: "per night",
      features: [
        { icon: "🏖️", label: "Beach", value: "Private beach" },
        { icon: "📶", label: "WiFi", value: "Free" },
        { icon: "🍳", label: "Breakfast", value: "Buffet included" },
        { icon: "🏊", label: "Pool", value: "3 pools + kids pool" },
        { icon: "💆", label: "Spa", value: "Full service" },
      ],
      highlight: "All-inclusive available",
    },
    situations: [
      "A family with two young children on a limited budget.",
      "A couple celebrating their anniversary who want something special.",
      "A group of university students looking for a fun week at the beach.",
      "A freelancer who needs a quiet place to work remotely near the sea.",
    ],
  },

  {
    id: "phone-plans",
    category: "Phone Plans",
    categoryIcon: "📱",
    tier: "everyday",
    cardA: {
      id: "phone-a",
      name: "BasicConnect",
      tagline: "Everything you need, nothing you don't",
      rating: 3,
      price: "$15",
      priceNote: "per month",
      features: [
        { icon: "📞", label: "Calls", value: "Unlimited local" },
        { icon: "💬", label: "Texts", value: "Unlimited" },
        { icon: "📊", label: "Data", value: "5GB" },
        { icon: "🌍", label: "Roaming", value: "Not included" },
        { icon: "📄", label: "Contract", value: "No contract" },
      ],
    },
    cardB: {
      id: "phone-b",
      name: "ProMax Ultra",
      tagline: "Unlimited everything, everywhere",
      rating: 5,
      price: "$55",
      priceNote: "per month",
      features: [
        { icon: "📞", label: "Calls", value: "Unlimited worldwide" },
        { icon: "💬", label: "Texts", value: "Unlimited" },
        { icon: "📊", label: "Data", value: "Unlimited" },
        { icon: "🌍", label: "Roaming", value: "50 countries free" },
        { icon: "📄", label: "Contract", value: "12 months" },
      ],
      highlight: "Free phone upgrade included",
    },
    situations: [
      "A teenager who mostly uses WiFi at home and doesn't travel.",
      "A business person who travels internationally every month.",
      "An elderly person who just wants to make calls and send messages.",
      "A student studying abroad for a year.",
    ],
  },

  {
    id: "apartments",
    category: "Apartments to Rent",
    categoryIcon: "🏠",
    tier: "everyday",
    cardA: {
      id: "apt-a",
      name: "City Studio",
      tagline: "Small but central",
      rating: 3,
      price: "$800",
      priceNote: "per month",
      features: [
        { icon: "📍", label: "Location", value: "City centre" },
        { icon: "📐", label: "Size", value: "35m²" },
        { icon: "🚇", label: "Transport", value: "Metro: 2 min" },
        { icon: "🅿️", label: "Parking", value: "Not included" },
        { icon: "🐾", label: "Pets", value: "Not allowed" },
      ],
    },
    cardB: {
      id: "apt-b",
      name: "Suburban 2-Bed",
      tagline: "Space and quiet, away from the centre",
      rating: 4,
      price: "$950",
      priceNote: "per month",
      features: [
        { icon: "📍", label: "Location", value: "20 min from centre" },
        { icon: "📐", label: "Size", value: "75m²" },
        { icon: "🚇", label: "Transport", value: "Bus: 10 min" },
        { icon: "🅿️", label: "Parking", value: "Included" },
        { icon: "🐾", label: "Pets", value: "Welcome" },
      ],
      highlight: "Garden included",
    },
    situations: [
      "A young professional who works in the city and hates commuting.",
      "A couple with a dog who want more space.",
      "A student who needs cheap accommodation close to the university.",
      "A family with a car who want a quieter neighbourhood.",
    ],
  },

  {
    id: "laptops",
    category: "Laptops",
    categoryIcon: "💻",
    tier: "everyday",
    cardA: {
      id: "laptop-a",
      name: "BudgetBook Pro",
      tagline: "Reliable for everyday tasks",
      rating: 3,
      price: "$399",
      priceNote: "one-time",
      features: [
        { icon: "⚡", label: "Speed", value: "Standard" },
        { icon: "🔋", label: "Battery", value: "6 hours" },
        { icon: "⚖️", label: "Weight", value: "2.1 kg" },
        { icon: "💾", label: "Storage", value: "256GB" },
        { icon: "🛡️", label: "Warranty", value: "1 year" },
      ],
    },
    cardB: {
      id: "laptop-b",
      name: "UltraSlim X1",
      tagline: "Powerful, light, built for professionals",
      rating: 5,
      price: "$1,299",
      priceNote: "one-time",
      features: [
        { icon: "⚡", label: "Speed", value: "High performance" },
        { icon: "🔋", label: "Battery", value: "14 hours" },
        { icon: "⚖️", label: "Weight", value: "1.1 kg" },
        { icon: "💾", label: "Storage", value: "1TB SSD" },
        { icon: "🛡️", label: "Warranty", value: "3 years" },
      ],
      highlight: "Best for designers and developers",
    },
    situations: [
      "A retired teacher who wants to browse the internet and video call family.",
      "A graphic designer who works with large files and travels frequently.",
      "A student on a tight budget who needs a laptop for writing essays.",
      "A software developer who needs fast performance and long battery life.",
    ],
  },

  {
    id: "holiday-destinations",
    category: "Holiday Destinations",
    categoryIcon: "✈️",
    tier: "everyday",
    cardA: {
      id: "dest-a",
      name: "City Break: Lisbon",
      tagline: "Culture, food, history",
      rating: 5,
      price: "$600",
      priceNote: "flights + 3 nights",
      features: [
        { icon: "🌡️", label: "Weather", value: "Warm, sunny" },
        { icon: "🏛️", label: "Culture", value: "Museums, history" },
        { icon: "🍽️", label: "Food", value: "Excellent, affordable" },
        { icon: "🚶", label: "Activities", value: "Walking, sightseeing" },
        { icon: "👨‍👩‍👧", label: "Kids", value: "Friendly" },
      ],
    },
    cardB: {
      id: "dest-b",
      name: "Beach Holiday: Bali",
      tagline: "Relax, swim, explore",
      rating: 5,
      price: "$1,200",
      priceNote: "flights + 7 nights",
      features: [
        { icon: "🌡️", label: "Weather", value: "Hot, tropical" },
        { icon: "🏖️", label: "Beaches", value: "World class" },
        { icon: "🍽️", label: "Food", value: "Varied, inexpensive" },
        { icon: "🤿", label: "Activities", value: "Diving, surfing, temples" },
        { icon: "👨‍👩‍👧", label: "Kids", value: "Good for families" },
      ],
      highlight: "7 nights vs 3 nights",
    },
    situations: [
      "A couple with one week off work who love art and history.",
      "A group of friends who want to relax on a beach and go diving.",
      "A family with two young children who want somewhere safe and easy.",
      "A person who has never travelled far before and wants a manageable first trip abroad.",
    ],
  },

  // ── Detailed (5) — B1+-B2 ─────────────────────────────────────────────

  {
    id: "jobs",
    category: "Job Adverts",
    categoryIcon: "💼",
    tier: "detailed",
    cardA: {
      id: "job-a",
      name: "Marketing Coordinator",
      tagline: "Creative agency — fast-paced, flexible",
      rating: 4,
      price: "$42,000",
      priceNote: "per year",
      features: [
        { icon: "📍", label: "Location", value: "Remote / hybrid" },
        { icon: "⏰", label: "Hours", value: "Flexible" },
        { icon: "📈", label: "Growth", value: "Small team, fast promotion" },
        { icon: "🏖️", label: "Holiday", value: "25 days" },
        { icon: "🎓", label: "Training", value: "Learn on the job" },
      ],
      highlight: "Creative freedom",
    },
    cardB: {
      id: "job-b",
      name: "Marketing Manager",
      tagline: "Global corporation — structured, stable",
      rating: 4,
      price: "$68,000",
      priceNote: "per year",
      features: [
        { icon: "📍", label: "Location", value: "Office (city centre)" },
        { icon: "⏰", label: "Hours", value: "9-5 fixed" },
        { icon: "📈", label: "Growth", value: "Clear career ladder" },
        { icon: "🏖️", label: "Holiday", value: "20 days" },
        { icon: "🎓", label: "Training", value: "Formal programme" },
      ],
      highlight: "Full benefits package",
    },
    situations: [
      "A recent graduate who values work-life balance and creativity.",
      "Someone with a family who needs stability and a good income.",
      "A person who wants to develop their career quickly.",
      "Someone who has had enough of office politics and wants more freedom.",
    ],
  },

  {
    id: "health-insurance",
    category: "Health Insurance Plans",
    categoryIcon: "🏥",
    tier: "detailed",
    cardA: {
      id: "health-a",
      name: "BasicCare Plan",
      tagline: "Essential cover at a low price",
      rating: 3,
      price: "$60",
      priceNote: "per month",
      features: [
        { icon: "🏥", label: "Hospital", value: "Public only" },
        { icon: "💊", label: "Prescriptions", value: "50% covered" },
        { icon: "👁️", label: "Dental/Vision", value: "Not included" },
        { icon: "🚑", label: "Emergency", value: "Covered" },
        { icon: "🌍", label: "Abroad", value: "Not covered" },
      ],
    },
    cardB: {
      id: "health-b",
      name: "ComprehensiveCare Plus",
      tagline: "Full cover, anywhere in the world",
      rating: 5,
      price: "$220",
      priceNote: "per month",
      features: [
        { icon: "🏥", label: "Hospital", value: "Public + private" },
        { icon: "💊", label: "Prescriptions", value: "Fully covered" },
        { icon: "👁️", label: "Dental/Vision", value: "Included" },
        { icon: "🚑", label: "Emergency", value: "Covered" },
        { icon: "🌍", label: "Abroad", value: "Worldwide" },
      ],
      highlight: "No waiting period",
    },
    situations: [
      "A healthy 25-year-old with no regular medical needs who rarely travels.",
      "A family with two young children who visit the dentist regularly.",
      "A person planning to work abroad for two years.",
      "An older adult with a chronic condition who needs regular prescriptions.",
    ],
  },

  {
    id: "universities",
    category: "Universities",
    categoryIcon: "🎓",
    tier: "detailed",
    cardA: {
      id: "uni-a",
      name: "City University",
      tagline: "Urban campus, industry connections",
      rating: 4,
      price: "$12,000",
      priceNote: "per year",
      features: [
        { icon: "📍", label: "Location", value: "City centre" },
        { icon: "🏛️", label: "Ranking", value: "Top 100 nationally" },
        { icon: "💼", label: "Internships", value: "Strong industry links" },
        { icon: "🏠", label: "Accommodation", value: "Limited on campus" },
        { icon: "👥", label: "Class size", value: "Large (200+)" },
      ],
    },
    cardB: {
      id: "uni-b",
      name: "Hillside College",
      tagline: "Small campus, personal attention",
      rating: 4,
      price: "$18,000",
      priceNote: "per year",
      features: [
        { icon: "📍", label: "Location", value: "Rural, 2hr from city" },
        { icon: "🏛️", label: "Ranking", value: "Top 200 nationally" },
        { icon: "💼", label: "Internships", value: "Some, less connected" },
        { icon: "🏠", label: "Accommodation", value: "Guaranteed on campus" },
        { icon: "👥", label: "Class size", value: "Small (20-30)" },
      ],
      highlight: "Excellent student satisfaction",
    },
    situations: [
      "A student who wants to start a career in business as quickly as possible.",
      "A student who struggles in large classes and learns better with personal attention.",
      "An international student who needs guaranteed accommodation.",
      "A student who wants to be close to the city for social life and part-time work.",
    ],
  },

  {
    id: "banks",
    category: "Bank Accounts",
    categoryIcon: "🏦",
    tier: "detailed",
    cardA: {
      id: "bank-a",
      name: "StandardBank Current",
      tagline: "Reliable, no-fuss banking",
      rating: 3,
      price: "$5",
      priceNote: "per month",
      features: [
        { icon: "🏧", label: "ATMs", value: "Free at own ATMs" },
        { icon: "🌍", label: "Abroad", value: "3% fee" },
        { icon: "📱", label: "App", value: "Basic" },
        { icon: "💰", label: "Overdraft", value: "Up to $500" },
        { icon: "🎁", label: "Rewards", value: "None" },
      ],
    },
    cardB: {
      id: "bank-b",
      name: "SmartBank Premium",
      tagline: "Digital-first, built for modern life",
      rating: 5,
      price: "$15",
      priceNote: "per month",
      features: [
        { icon: "🏧", label: "ATMs", value: "Free worldwide" },
        { icon: "🌍", label: "Abroad", value: "No fees" },
        { icon: "📱", label: "App", value: "Full financial dashboard" },
        { icon: "💰", label: "Overdraft", value: "Up to $2,000" },
        { icon: "🎁", label: "Rewards", value: "Cashback on purchases" },
      ],
      highlight: "Instant notifications + budgeting tools",
    },
    situations: [
      "A retired person who only uses their bank locally and rarely travels.",
      "A young professional who travels for work several times a year.",
      "Someone who frequently goes overdrawn and needs a higher limit.",
      "A student who wants to manage their money carefully with budgeting tools.",
    ],
  },

  {
    id: "cars",
    category: "Cars",
    categoryIcon: "🚗",
    tier: "detailed",
    cardA: {
      id: "car-a",
      name: "EcoCity Hatchback",
      tagline: "Small, efficient, easy to park",
      rating: 4,
      price: "$18,000",
      priceNote: "purchase price",
      features: [
        { icon: "⛽", label: "Fuel", value: "55 mpg" },
        { icon: "👥", label: "Seats", value: "5" },
        { icon: "🧳", label: "Boot space", value: "Small" },
        { icon: "🔧", label: "Maintenance", value: "Low cost" },
        { icon: "🌿", label: "Emissions", value: "Low" },
      ],
    },
    cardB: {
      id: "car-b",
      name: "FamilyMax SUV",
      tagline: "Space, comfort, and power",
      rating: 4,
      price: "$38,000",
      priceNote: "purchase price",
      features: [
        { icon: "⛽", label: "Fuel", value: "28 mpg" },
        { icon: "👥", label: "Seats", value: "7" },
        { icon: "🧳", label: "Boot space", value: "Very large" },
        { icon: "🔧", label: "Maintenance", value: "Higher cost" },
        { icon: "🌿", label: "Emissions", value: "Higher" },
      ],
      highlight: "Towing capability",
    },
    situations: [
      "A single person who lives in the city and mainly commutes short distances.",
      "A family of five who go on camping holidays and need to carry a lot of luggage.",
      "Someone who cares about the environment and wants to reduce their carbon footprint.",
      "A couple who want a second car mainly for weekends and errands.",
    ],
  },

  // ── Complex (5) — B2+-C1 ──────────────────────────────────────────────

  {
    id: "startup-vs-corporate",
    category: "Work Environments",
    categoryIcon: "🏢",
    tier: "complex",
    cardA: {
      id: "work-a",
      name: "TechStart (Startup)",
      tagline: "Build something from scratch",
      rating: 4,
      price: "$45,000",
      priceNote: "per year + equity",
      features: [
        { icon: "📍", label: "Location", value: "Remote-first" },
        { icon: "⏰", label: "Culture", value: "High autonomy, fast-paced" },
        { icon: "📈", label: "Growth", value: "Uncertain but high potential" },
        { icon: "🎁", label: "Benefits", value: "Minimal" },
        { icon: "🔄", label: "Job security", value: "Low" },
      ],
      highlight: "Equity stake in company",
    },
    cardB: {
      id: "work-b",
      name: "GlobalCorp (Corporation)",
      tagline: "Stability, scale, and structure",
      rating: 4,
      price: "$75,000",
      priceNote: "per year + full benefits",
      features: [
        { icon: "📍", label: "Location", value: "Office (hybrid option)" },
        { icon: "⏰", label: "Culture", value: "Structured, process-driven" },
        { icon: "📈", label: "Growth", value: "Slower but predictable" },
        { icon: "🎁", label: "Benefits", value: "Pension, health, bonus" },
        { icon: "🔄", label: "Job security", value: "High" },
      ],
      highlight: "International transfer opportunities",
    },
    situations: [
      "A 28-year-old with no dependents who is willing to take risks for potential big rewards.",
      "Someone with a mortgage and young children who cannot afford income uncertainty.",
      "A mid-career professional who wants to learn new skills quickly and has savings to fall back on.",
      "Someone who values mentorship and structured development over freedom.",
    ],
  },

  {
    id: "living-abroad-options",
    category: "Living Abroad",
    categoryIcon: "🌍",
    tier: "complex",
    cardA: {
      id: "abroad-a",
      name: "Option A: Expat Package",
      tagline: "Employer-supported relocation",
      rating: 4,
      price: "Employer paid",
      priceNote: "full package",
      features: [
        { icon: "🏠", label: "Housing", value: "Provided by employer" },
        { icon: "✈️", label: "Flights", value: "Annual return covered" },
        { icon: "🎓", label: "Kids' school", value: "International school paid" },
        { icon: "🌐", label: "Community", value: "Expat network" },
        { icon: "📋", label: "Contract", value: "2 years fixed" },
      ],
      highlight: "Low financial risk",
    },
    cardB: {
      id: "abroad-b",
      name: "Option B: Independent Move",
      tagline: "Go it alone, on your own terms",
      rating: 4,
      price: "Self-funded",
      priceNote: "all costs personal",
      features: [
        { icon: "🏠", label: "Housing", value: "Find your own" },
        { icon: "✈️", label: "Flights", value: "At your cost" },
        { icon: "🎓", label: "Kids' school", value: "Local school (free)" },
        { icon: "🌐", label: "Community", value: "Local integration" },
        { icon: "📋", label: "Contract", value: "No fixed term" },
      ],
      highlight: "Full freedom and flexibility",
    },
    situations: [
      "A family with school-age children who want certainty and support.",
      "A single person who wants to fully immerse in the local culture.",
      "Someone who has been offered the expat package but is considering whether to negotiate for independence instead.",
      "A couple where one partner has a job offer and the other needs to find work.",
    ],
  },

  {
    id: "education-routes",
    category: "Career Education Routes",
    categoryIcon: "🎓",
    tier: "complex",
    cardA: {
      id: "edu-a",
      name: "Traditional Degree",
      tagline: "3-year university programme",
      rating: 4,
      price: "$45,000",
      priceNote: "total (3 years)",
      features: [
        { icon: "📜", label: "Qualification", value: "Bachelor's degree" },
        { icon: "⏰", label: "Time", value: "3 years full-time" },
        { icon: "💼", label: "Recognition", value: "Widely recognised" },
        { icon: "🌐", label: "Network", value: "Alumni connections" },
        { icon: "🔄", label: "Flexibility", value: "Low during study" },
      ],
      highlight: "Broad academic foundation",
    },
    cardB: {
      id: "edu-b",
      name: "Vocational Bootcamp",
      tagline: "12-week intensive, job-ready fast",
      rating: 4,
      price: "$8,000",
      priceNote: "total",
      features: [
        { icon: "📜", label: "Qualification", value: "Industry certificate" },
        { icon: "⏰", label: "Time", value: "12 weeks" },
        { icon: "💼", label: "Recognition", value: "Growing in tech/design" },
        { icon: "🌐", label: "Network", value: "Hiring partner companies" },
        { icon: "🔄", label: "Flexibility", value: "Can work part-time" },
      ],
      highlight: "Job placement support included",
    },
    situations: [
      "A school leaver who wants to enter the workforce quickly and earn money.",
      "A career changer in their 30s who cannot afford to stop working for 3 years.",
      "A person who wants to work in a traditional professional field like law or medicine.",
      "Someone who learns best by doing rather than academic study.",
    ],
  },

  {
    id: "remote-work-locations",
    category: "Remote Work Locations",
    categoryIcon: "🌐",
    tier: "complex",
    cardA: {
      id: "remote-a",
      name: "Co-working Space Membership",
      tagline: "Professional, structured, social",
      rating: 4,
      price: "$200",
      priceNote: "per month",
      features: [
        { icon: "📶", label: "Internet", value: "Guaranteed fast" },
        { icon: "👥", label: "Community", value: "Networking events" },
        { icon: "🏢", label: "Environment", value: "Office-like" },
        { icon: "⏰", label: "Access", value: "Fixed hours" },
        { icon: "🔇", label: "Noise", value: "Managed" },
      ],
      highlight: "Meeting rooms available",
    },
    cardB: {
      id: "remote-b",
      name: "Work from Home",
      tagline: "Total flexibility, zero commute",
      rating: 4,
      price: "$0",
      priceNote: "ongoing cost",
      features: [
        { icon: "📶", label: "Internet", value: "Depends on setup" },
        { icon: "👥", label: "Community", value: "Isolated" },
        { icon: "🏢", label: "Environment", value: "Variable" },
        { icon: "⏰", label: "Access", value: "24/7" },
        { icon: "🔇", label: "Noise", value: "Depends on home" },
      ],
      highlight: "No commute, full control",
    },
    situations: [
      "A new employee who wants to build relationships with colleagues and clients.",
      "A parent of young children who needs to be home during school hours.",
      "Someone who struggles with motivation and productivity when working alone.",
      "A highly experienced freelancer who needs guaranteed internet for client video calls.",
    ],
  },

  {
    id: "investment-options",
    category: "Savings & Investment",
    categoryIcon: "💰",
    tier: "complex",
    cardA: {
      id: "invest-a",
      name: "Fixed Savings Account",
      tagline: "Safe, predictable, guaranteed",
      rating: 3,
      price: "3.5%",
      priceNote: "annual interest",
      features: [
        { icon: "🔒", label: "Risk", value: "None" },
        { icon: "📈", label: "Returns", value: "Guaranteed 3.5%" },
        { icon: "🔄", label: "Access", value: "Locked for 2 years" },
        { icon: "💸", label: "Min deposit", value: "$1,000" },
        { icon: "🛡️", label: "Protection", value: "Government insured" },
      ],
    },
    cardB: {
      id: "invest-b",
      name: "Diversified Index Fund",
      tagline: "Grow your money over time",
      rating: 4,
      price: "~8%",
      priceNote: "average annual return",
      features: [
        { icon: "🔒", label: "Risk", value: "Moderate" },
        { icon: "📈", label: "Returns", value: "Variable, avg ~8%" },
        { icon: "🔄", label: "Access", value: "Withdraw anytime" },
        { icon: "💸", label: "Min deposit", value: "$100" },
        { icon: "🛡️", label: "Protection", value: "Not guaranteed" },
      ],
      highlight: "Long-term growth potential",
    },
    situations: [
      "A person saving for a house purchase in 18 months who cannot afford to lose money.",
      "A 30-year-old who wants to grow their retirement savings over 30 years.",
      "Someone who gets anxious about money and needs certainty.",
      "A person with $500 who wants to start investing for the first time.",
    ],
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// GSE MICRO DESCRIPTORS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [
  { id: "w5-gse-30-i", gse: 30, fn: "Informing",  text: "Can identify simple factual information in a visual." },
  { id: "w5-gse-36-m", gse: 36, fn: "Mediating",  text: "Can relay simple factual information from a source." },
  { id: "w5-gse-43-m", gse: 43, fn: "Mediating",  text: "Can compare two options and identify key differences." },
  { id: "w5-gse-49-d", gse: 49, fn: "Directing",  text: "Can make simple recommendations based on stated needs." },
  { id: "w5-gse-55-m", gse: 55, fn: "Mediating",  text: "Can select relevant information from a source to match specific needs." },
  { id: "w5-gse-58-d", gse: 58, fn: "Directing",  text: "Can give reasons for recommendations with reference to source." },
  { id: "w5-gse-62-m", gse: 62, fn: "Mediating",  text: "Can weigh trade-offs and explain why one option suits a situation better." },
  { id: "w5-gse-68-m", gse: 68, fn: "Mediating",  text: "Can adapt advice when circumstances change." },
  { id: "w5-gse-74-m", gse: 74, fn: "Mediating",  text: "Can synthesise multiple factors from a source into clear, tailored advice." },
  { id: "w5-gse-80-m", gse: 80, fn: "Mediating",  text: "Can mediate complex information for different audiences with full control." },
];


// ═════════════════════════════════════════════════════════════════════════════
// AZE MACRO DESCRIPTORS (unchanged — topic-agnostic)
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [
  {
    azeId: "W5-F1",
    claim: "Can identify and state basic facts from a visual source",
    fn: "Informing",
    level: "A1",
    microIds: ["w5-gse-30-i"],
    signals: [
      "Names items, prices, or features from the cards",
      "Conveys at least one factual difference",
      "Reader can tell the candidate looked at the source",
    ],
  },
  {
    azeId: "W5-F2",
    claim: "Can relay simple differences between two options",
    fn: "Mediating",
    level: "A2",
    microIds: ["w5-gse-36-m", "w5-gse-43-m"],
    signals: [
      "States at least 2 differences between the options",
      "Information comes from the source, not invented",
      "Comparison is clear even if simple (A is X, B is Y)",
    ],
  },
  {
    azeId: "W5-F3",
    claim: "Can recommend an option based on a stated need",
    fn: "Directing",
    level: "A2_PLUS",
    microIds: ["w5-gse-49-d"],
    signals: [
      "Makes a clear recommendation (I think X is better for them)",
      "Links recommendation to the person's need",
      "Uses information from the source to support the choice",
    ],
  },
  {
    azeId: "W5-F4",
    claim: "Can select and relay relevant information to match specific needs",
    fn: "Mediating",
    level: "B1",
    microIds: ["w5-gse-55-m"],
    signals: [
      "Doesn't just list everything — selects what's relevant",
      "Connects specific features to specific needs",
      "Shows awareness of what matters for THIS person",
    ],
    notes: "Key B1 differentiator: selective relay, not full dump.",
  },
  {
    azeId: "W5-F5",
    claim: "Can give reasons for recommendations with reference to the source",
    fn: "Directing",
    level: "B1_PLUS",
    microIds: ["w5-gse-58-d"],
    signals: [
      "Recommendation is justified with specific details from the cards",
      "Goes beyond 'it's better' — explains WHY it's better for them",
      "References concrete features (price, location, etc.)",
    ],
  },
  {
    azeId: "W5-F6",
    claim: "Can weigh trade-offs and explain why one option suits better",
    fn: "Mediating",
    level: "B2",
    microIds: ["w5-gse-62-m"],
    signals: [
      "Acknowledges that both options have pros and cons",
      "Explains the trade-off (cheaper but no breakfast, etc.)",
      "Makes a balanced assessment, not just one-sided",
    ],
  },
  {
    azeId: "W5-F7",
    claim: "Can adapt advice when the situation or needs change",
    fn: "Mediating",
    level: "B2_PLUS",
    microIds: ["w5-gse-68-m"],
    signals: [
      "When AI changes the scenario, candidate adjusts their recommendation",
      "Doesn't just repeat — genuinely re-evaluates based on new information",
      "Shows flexibility in applying source information to different needs",
    ],
  },
  {
    azeId: "W5-F8",
    claim: "Can synthesise multiple factors into clear, tailored advice",
    fn: "Mediating",
    level: "C1",
    microIds: ["w5-gse-74-m", "w5-gse-80-m"],
    signals: [
      "Pulls together multiple features, needs, and trade-offs",
      "Advice is tailored, specific, and well-reasoned",
      "Reads like genuinely helpful guidance, not a feature list",
      "Full control of mediating discourse",
    ],
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// LEVEL CLUSTERS + THRESHOLDS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "A1", label: "A1", gseRange: [22, 29],
    macroIds: ["W5-F1"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed A1.", levelDescription: "States basic facts from visual.",
  },
  {
    level: "A2", label: "A2", gseRange: [30, 35],
    macroIds: ["W5-F2"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed A2.", levelDescription: "Relays simple differences.",
  },
  {
    level: "A2_PLUS", label: "A2+", gseRange: [36, 42],
    macroIds: ["W5-F3"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed A2+.", levelDescription: "Recommends based on stated need.",
  },
  {
    level: "B1", label: "B1", gseRange: [43, 50],
    macroIds: ["W5-F4"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed B1.", levelDescription: "Selects relevant info for specific needs.",
  },
  {
    level: "B1_PLUS", label: "B1+", gseRange: [51, 58],
    macroIds: ["W5-F5"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed B1+.", levelDescription: "Justifies recommendations with source detail.",
  },
  {
    level: "B2", label: "B2", gseRange: [59, 66],
    macroIds: ["W5-F6"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed B2.", levelDescription: "Weighs trade-offs between options.",
  },
  {
    level: "B2_PLUS", label: "B2+", gseRange: [67, 75],
    macroIds: ["W5-F7"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed B2+.", levelDescription: "Adapts advice when situation changes.",
  },
  {
    level: "C1", label: "C1", gseRange: [76, 84],
    macroIds: ["W5-F8"], confirmThreshold: 1, totalMacros: 1,
    onConfirm: "Confirmed C1. Ceiling.", levelDescription: "Synthesises multiple factors into tailored advice.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const WRITING_TASK5: WritingTask5Config = {
  meta,
  principles,
  stimulusSets,
  gseMicro,
  azeMacro,
  levelClusters,
};

export default WRITING_TASK5;