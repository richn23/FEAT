// ─────────────────────────────────────────────────────────────────────────────
// writing-task3-descriptors.ts — Single source of truth for Writing Task 3
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// Task 3: Express & Argue
// Format: Topic selection → Opinion chat (assessed) → Topic switch at B1+
// Functions tested: EXPRESSING + ARGUING
// Who: Everyone
//
// CHANGES v2:
//   • Topic pool expanded to 25 topics (8 familiar, 8 broader, 9 abstract)
//   • Route picks 3 random familiar topics to show as choices each session
//   • Broader and abstract pools used for AI-driven topic switch
//
// DESIGN PRINCIPLE: Macros are TOPIC-AGNOSTIC. They describe what the
// candidate DOES functionally — not what they argue about.
// ─────────────────────────────────────────────────────────────────────────────

export type CefrLevel =
  | "A1" | "A2" | "A2_PLUS"
  | "B1" | "B1_PLUS"
  | "B2" | "B2_PLUS" | "C1";

export type FunctionType = "Expressing" | "Arguing";
export type MacroVerdict = "CAN" | "NOT_YET" | "NOT_TESTED";

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

export interface TopicOption {
  id: string;
  label: string;
  // familiar  — shown as candidate choice (3 picked randomly per session)
  // broader   — used for AI topic switch at B1+
  // abstract  — used for AI topic switch at B2+
  tier: "familiar" | "broader" | "abstract";
  prompt: string;
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

export interface WritingTask3Config {
  meta: {
    taskId: string;
    title: string;
    functions: FunctionType[];
    maxExchanges: number;
    description: string;
  };
  principles: {
    topicSelectionNotAssessed: boolean;
    topicSwitchAtB1Plus: boolean;
    functionAndFormSeparate: boolean;
    macrosAreTopicAgnostic: boolean;
    aiChallengesAndPushesBack: boolean;
    familiarTopicsShownToCandidate: number; // how many to show as choices
  };
  topicOptions: TopicOption[];
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: WritingTask3Config["meta"] = {
  taskId: "w-task-3",
  title: "Express & Argue",
  functions: ["Expressing", "Arguing"],
  maxExchanges: 14,
  description:
    "Chat-based opinion task. Candidate picks from 3 randomly selected familiar topics, " +
    "then debates with the AI. AI challenges, disagrees, asks why. " +
    "At B1+, AI switches to a broader topic. At B2+, switches to abstract topic. " +
    "Tests expressing opinions and arguing/justifying in written interaction.",
};

const principles: WritingTask3Config["principles"] = {
  topicSelectionNotAssessed: true,
  topicSwitchAtB1Plus: true,
  functionAndFormSeparate: true,
  macrosAreTopicAgnostic: true,
  aiChallengesAndPushesBack: true,
  familiarTopicsShownToCandidate: 3,
};


// ═════════════════════════════════════════════════════════════════════════════
// TOPIC OPTIONS (25 total)
//
// familiar (8) — 3 picked randomly per session and shown as candidate choices
// broader  (8) — AI switches to one of these at B1+
// abstract (9) — AI switches to one of these at B2+
//
// All topics satisfy: LOW knowledge requirement + HIGH language potential.
// Avoid: politics requiring specialist knowledge, technical fields.
// Use: everyday life, opinions, experiences, practical and social questions.
// ═════════════════════════════════════════════════════════════════════════════

const topicOptions: TopicOption[] = [

  // ── Familiar (8) — candidate chooses from 3 random picks ──────────────
  {
    id: "social-media",
    label: "Social Media",
    tier: "familiar",
    prompt: "Is social media good or bad for people?",
  },
  {
    id: "remote-work",
    label: "Working from Home",
    tier: "familiar",
    prompt: "Is working from home better than working in an office?",
  },
  {
    id: "city-country",
    label: "City vs Countryside",
    tier: "familiar",
    prompt: "Is it better to live in a city or the countryside?",
  },
  {
    id: "travel",
    label: "Travel & Holidays",
    tier: "familiar",
    prompt: "Is it better to travel to new places or return to places you know?",
  },
  {
    id: "online-shopping",
    label: "Online vs In-Store Shopping",
    tier: "familiar",
    prompt: "Is online shopping better than shopping in stores?",
  },
  {
    id: "pets",
    label: "Keeping Pets",
    tier: "familiar",
    prompt: "Is it a good idea to keep pets in a city?",
  },
  {
    id: "fast-food",
    label: "Fast Food",
    tier: "familiar",
    prompt: "Is fast food too big a part of modern life?",
  },
  {
    id: "sport",
    label: "Sport & Exercise",
    tier: "familiar",
    prompt: "Should everyone do regular exercise, or is it a personal choice?",
  },

  // ── Broader (8) — AI switches to one of these at B1+ ──────────────────
  {
    id: "education-free",
    label: "Education",
    tier: "broader",
    prompt: "Should university education be free for everyone?",
  },
  {
    id: "technology-jobs",
    label: "Technology & Jobs",
    tier: "broader",
    prompt: "Will technology create more jobs than it destroys?",
  },
  {
    id: "environment-who",
    label: "Environment",
    tier: "broader",
    prompt: "Should individuals or governments be more responsible for protecting the environment?",
  },
  {
    id: "gap-year",
    label: "Taking a Gap Year",
    tier: "broader",
    prompt: "Is taking a year off before university or work a good use of time?",
  },
  {
    id: "fame",
    label: "Fame & Celebrity",
    tier: "broader",
    prompt: "Does fame do more harm than good to the people who have it?",
  },
  {
    id: "volunteering",
    label: "Volunteering",
    tier: "broader",
    prompt: "Should people be required to do community service at some point in their lives?",
  },
  {
    id: "competition",
    label: "Competition vs Cooperation",
    tier: "broader",
    prompt: "Is competition generally good for society, or does it cause more harm than good?",
  },
  {
    id: "media-trust",
    label: "Trusting the Media",
    tier: "broader",
    prompt: "Can people still trust what they read or watch in the news?",
  },

  // ── Abstract (9) — AI switches to one of these at B2+ ─────────────────
  {
    id: "ai-regulation",
    label: "AI & Society",
    tier: "abstract",
    prompt: "Should governments regulate artificial intelligence more strictly?",
  },
  {
    id: "privacy-security",
    label: "Privacy vs Security",
    tier: "abstract",
    prompt: "Is it acceptable to sacrifice some privacy for greater security?",
  },
  {
    id: "equality",
    label: "Equality",
    tier: "abstract",
    prompt: "Can true equality ever be achieved in society?",
  },
  {
    id: "progress-cost",
    label: "The Cost of Progress",
    tier: "abstract",
    prompt: "Is rapid technological and economic progress worth the social costs it creates?",
  },
  {
    id: "freedom-responsibility",
    label: "Freedom vs Responsibility",
    tier: "abstract",
    prompt: "Where should the boundary be between individual freedom and social responsibility?",
  },
  {
    id: "globalisation",
    label: "Globalisation",
    tier: "abstract",
    prompt: "Has globalisation been more beneficial or more harmful for most people in the world?",
  },
  {
    id: "art-value",
    label: "The Value of Art",
    tier: "abstract",
    prompt: "Should governments fund the arts, or should art survive on what people choose to pay for it?",
  },
  {
    id: "meritocracy",
    label: "Meritocracy",
    tier: "abstract",
    prompt: "Is it realistic to believe that hard work alone determines success in life?",
  },
  {
    id: "tradition-change",
    label: "Tradition vs Change",
    tier: "abstract",
    prompt: "How much should societies try to preserve traditions in a rapidly changing world?",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// GSE MICRO DESCRIPTORS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [
  { id: "w3-gse-30-e", gse: 30, fn: "Expressing", text: "Can express simple opinions using basic fixed expressions." },
  { id: "w3-gse-34-e", gse: 34, fn: "Expressing", text: "Can write about likes and dislikes." },
  { id: "w3-gse-40-e", gse: 40, fn: "Expressing", text: "Can express preferences in writing with simple reasons." },
  { id: "w3-gse-45-e", gse: 45, fn: "Expressing", text: "Can express opinions using simple language." },
  { id: "w3-gse-49-e", gse: 49, fn: "Expressing", text: "Can give or seek personal views on topics of interest." },
  { id: "w3-gse-55-e", gse: 55, fn: "Expressing", text: "Can express views and opinions with supporting arguments." },
  { id: "w3-gse-65-e", gse: 65, fn: "Expressing", text: "Can express nuanced opinions with appropriate hedging." },
  { id: "w3-gse-75-e", gse: 75, fn: "Expressing", text: "Can formulate ideas and opinions with precision." },
  { id: "w3-gse-43-a", gse: 43, fn: "Arguing",   text: "Can give simple reasons to justify a viewpoint." },
  { id: "w3-gse-50-a", gse: 50, fn: "Arguing",   text: "Can give reasons for and against something." },
  { id: "w3-gse-58-a", gse: 58, fn: "Arguing",   text: "Can develop an argument, giving reasons for and against." },
  { id: "w3-gse-62-a", gse: 62, fn: "Arguing",   text: "Can construct a chain of reasoned argument." },
  { id: "w3-gse-70-a", gse: 70, fn: "Arguing",   text: "Can develop a clear argument with supporting evidence." },
  { id: "w3-gse-80-a", gse: 80, fn: "Arguing",   text: "Can construct a sophisticated argument, acknowledging counterpoints." },
];


// ═════════════════════════════════════════════════════════════════════════════
// AZE MACRO DESCRIPTORS (unchanged — topic-agnostic)
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [
  {
    azeId: "W3-F1",
    claim: "Can state a like, dislike, or simple preference",
    fn: "Expressing",
    level: "A1",
    microIds: ["w3-gse-30-e", "w3-gse-34-e"],
    signals: [
      "States a preference: I like X, I don't like Y, X is good/bad",
      "Simple opinion expressed even if not elaborated",
      "Clear which side they are on",
    ],
    notes: "At this level, 'I like it' or 'I think yes' is sufficient.",
  },
  {
    azeId: "W3-F2",
    claim: "Can give a simple reason for a preference or opinion",
    fn: "Arguing",
    level: "A2",
    microIds: ["w3-gse-40-e", "w3-gse-43-a"],
    signals: [
      "Opinion + because/so + reason",
      "Reason is relevant even if simple",
      "Goes beyond just stating — explains why",
    ],
  },
  {
    azeId: "W3-F3",
    claim: "Can express opinions on familiar topics with basic justification",
    fn: "Expressing",
    level: "A2_PLUS",
    microIds: ["w3-gse-45-e"],
    signals: [
      "States an opinion clearly (not just preference — a position)",
      "Provides at least one supporting point",
      "Can respond to a direct question about their view",
    ],
  },
  {
    azeId: "W3-F4",
    claim: "Can give reasons for and against a position",
    fn: "Arguing",
    level: "B1",
    microIds: ["w3-gse-49-e", "w3-gse-50-a"],
    signals: [
      "Acknowledges more than one side (on one hand / but also / however)",
      "Gives reasons FOR their position",
      "Shows awareness that others might think differently",
    ],
    notes: "Key B1 differentiator: not just one-sided. Shows they can see both sides.",
  },
  {
    azeId: "W3-F5",
    claim: "Can respond to a challenge or counter-argument",
    fn: "Arguing",
    level: "B1_PLUS",
    microIds: ["w3-gse-55-e", "w3-gse-58-a"],
    signals: [
      "When AI pushes back, candidate addresses the challenge (not ignores it)",
      "Defends position with new or elaborated reasoning",
      "Doesn't just repeat — adapts or extends their argument",
    ],
  },
  {
    azeId: "W3-F6",
    claim: "Can express views with supporting arguments",
    fn: "Expressing",
    level: "B1_PLUS",
    microIds: ["w3-gse-55-e"],
    signals: [
      "Opinion is backed by developed reasoning, not just assertions",
      "Multiple supporting points or examples",
      "Argument has some depth — not surface level",
    ],
  },
  {
    azeId: "W3-F7",
    claim: "Can construct a reasoned argument with logical structure",
    fn: "Arguing",
    level: "B2",
    microIds: ["w3-gse-62-a"],
    signals: [
      "Argument follows a logical progression (not random points)",
      "Points build on each other",
      "Reader can follow the reasoning without effort",
    ],
  },
  {
    azeId: "W3-F8",
    claim: "Can acknowledge opposing views while maintaining their position",
    fn: "Expressing",
    level: "B2",
    microIds: ["w3-gse-65-e"],
    signals: [
      "Explicitly acknowledges the other side (I understand that... / It's true that...)",
      "But still maintains and defends their own position",
      "Nuanced — not black and white",
    ],
  },
  {
    azeId: "W3-F9",
    claim: "Can develop a clear argument with supporting evidence and examples",
    fn: "Arguing",
    level: "B2_PLUS",
    microIds: ["w3-gse-70-a"],
    signals: [
      "Uses concrete examples or evidence to support abstract claims",
      "Argument is developed, not just asserted",
      "Demonstrates depth of reasoning",
    ],
  },
  {
    azeId: "W3-F10",
    claim: "Can construct a sophisticated argument with precise language and hedging",
    fn: "Arguing",
    level: "C1",
    microIds: ["w3-gse-75-e", "w3-gse-80-a"],
    signals: [
      "Uses hedging and qualifying language (tends to, arguably, it could be said)",
      "Argument is nuanced and avoids oversimplification",
      "Counterpoints are incorporated and strengthened, not just acknowledged",
      "Full control of argumentative discourse",
    ],
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// LEVEL CLUSTERS + THRESHOLDS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "A1",
    label: "A1",
    gseRange: [22, 29],
    macroIds: ["W3-F1"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A1. Probe A2.",
    levelDescription: "States simple likes, dislikes, preferences.",
  },
  {
    level: "A2",
    label: "A2",
    gseRange: [30, 35],
    macroIds: ["W3-F2"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A2. Probe A2+.",
    levelDescription: "Gives simple reasons for opinions.",
  },
  {
    level: "A2_PLUS",
    label: "A2+",
    gseRange: [36, 42],
    macroIds: ["W3-F3"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A2+. Probe B1.",
    levelDescription: "Expresses opinions on familiar topics with justification.",
  },
  {
    level: "B1",
    label: "B1",
    gseRange: [43, 50],
    macroIds: ["W3-F4"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B1. Probe B1+.",
    levelDescription: "Gives reasons for and against. Sees both sides.",
  },
  {
    level: "B1_PLUS",
    label: "B1+",
    gseRange: [51, 58],
    macroIds: ["W3-F5", "W3-F6"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed B1+. Probe B2. Switch topic.",
    levelDescription: "Responds to challenges. Supports views with developed arguments.",
  },
  {
    level: "B2",
    label: "B2",
    gseRange: [59, 66],
    macroIds: ["W3-F7", "W3-F8"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed B2. Probe B2+.",
    levelDescription: "Reasoned argument with structure. Acknowledges opposing views.",
  },
  {
    level: "B2_PLUS",
    label: "B2+",
    gseRange: [67, 75],
    macroIds: ["W3-F9"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B2+. Probe C1.",
    levelDescription: "Developed argument with evidence and examples.",
  },
  {
    level: "C1",
    label: "C1",
    gseRange: [76, 84],
    macroIds: ["W3-F10"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed C1. Ceiling for Task 3.",
    levelDescription: "Sophisticated argument with hedging and precision.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const WRITING_TASK3: WritingTask3Config = {
  meta,
  principles,
  topicOptions,
  gseMicro,
  azeMacro,
  levelClusters,
};

export default WRITING_TASK3;