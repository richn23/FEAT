// ─────────────────────────────────────────────────────────────────────────────
// writing-descriptors.ts — Single source of truth for Writing Task 1: Diagnostic Chat
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// CHANGES v2:
//   • Topic pool added (30 topics across 4 categories)
//   • Probes replaced with probe GUIDANCE — what function to elicit, not fixed questions
//   • Opening anchor (name + daily life) separated from diverging topic
//   • Topic type added to WritingTask1Config
// ─────────────────────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════════════════════
// 1. TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type CefrLevel =
  | "PRE_A1"
  | "A1"
  | "A2"
  | "A2_PLUS"
  | "B1"
  | "B1_PLUS"
  | "B2_PLUS";

export type FunctionType = "Interactional" | "Informing";

export type MacroVerdict = "CAN" | "NOT_YET" | "NOT_TESTED";

export type TopicCategory = "personal" | "daily_life" | "experiences" | "preferences";

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
  // What communicative function to elicit at this level.
  // NOT fixed questions — the AI generates topic-appropriate questions from these.
  probeGuidance: string[];
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

export interface Topic {
  id: string;
  label: string;
  category: TopicCategory;
  // What the AI should ask about when this topic is selected.
  // Used to generate level-appropriate questions on this theme.
  seedPrompt: string;
}

export interface WritingTask1Config {
  meta: {
    taskId: string;
    title: string;
    functions: FunctionType[];
    maxExchanges: number;
    description: string;
  };
  principles: {
    responseDefinesEvidence: boolean;
    higherOverridesLowerGaps: boolean;
    singleClearInstanceSufficient: boolean;
    weakInstancesDoNotCombine: boolean;
    textInputOnly: boolean;
    aiDrivesConversation: boolean;
    stopAfterConsecutiveNotYet: number;
    openingAnchor: string;
    topicDivergesAfterExchange: number;
  };
  topics: Topic[];
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. TASK METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: WritingTask1Config["meta"] = {
  taskId: "w-task-1",
  title: "Diagnostic Chat",
  functions: ["Interactional", "Informing"],
  maxExchanges: 12,
  description:
    "WhatsApp-style chat where AI probes up/down to find the candidate's " +
    "writing level. 5–8 exchanges. Opens with name + daily life anchor, " +
    "then diverges into a randomly assigned topic. Tests written interaction " +
    "and baseline informing. Everyone takes this task. Duration: 3–4 minutes.",
};


// ═════════════════════════════════════════════════════════════════════════════
// 3. SCORING PRINCIPLES
// ═════════════════════════════════════════════════════════════════════════════

const principles: WritingTask1Config["principles"] = {
  responseDefinesEvidence: true,
  higherOverridesLowerGaps: true,
  singleClearInstanceSufficient: true,
  weakInstancesDoNotCombine: true,
  textInputOnly: true,
  aiDrivesConversation: true,
  stopAfterConsecutiveNotYet: 2,
  // Always start with name + where they're from + what they do
  openingAnchor: "name, country/city, work or studies",
  // After this exchange number, switch to the assigned topic
  topicDivergesAfterExchange: 2,
};


// ═════════════════════════════════════════════════════════════════════════════
// 4. TOPIC POOL (30 topics)
//
// The route picks one at random per session.
// Topics satisfy: LOW knowledge requirement + HIGH language potential.
// Avoid: politics requiring knowledge, technical fields, academic subjects.
//
// Opening (exchanges 1–2) is always the anchor: name + daily life.
// The assigned topic kicks in from exchange 3 onwards.
// ═════════════════════════════════════════════════════════════════════════════

const topics: Topic[] = [

  // ── Personal (8 topics) ────────────────────────────────────────────────
  {
    id: "hobbies",
    label: "Hobbies",
    category: "personal",
    seedPrompt: "Ask about what the candidate enjoys doing in their free time. What hobbies do they have? How long have they done this? Do they do it alone or with others?",
  },
  {
    id: "family",
    label: "Family",
    category: "personal",
    seedPrompt: "Ask about the candidate's family. How many people? Where do they live? What do family members do? Do they spend much time together?",
  },
  {
    id: "home",
    label: "Where they live",
    category: "personal",
    seedPrompt: "Ask about the candidate's home or neighbourhood. What is it like? What do they like or dislike about where they live?",
  },
  {
    id: "work-studies",
    label: "Work or studies",
    category: "personal",
    seedPrompt: "Ask about what the candidate does for work or study. What do they do? Do they enjoy it? What is a typical day like?",
  },
  {
    id: "languages",
    label: "Learning languages",
    category: "personal",
    seedPrompt: "Ask about the candidate's experience with languages. Which languages do they speak? How did they learn English? Do they find it difficult?",
  },
  {
    id: "friends",
    label: "Friends",
    category: "personal",
    seedPrompt: "Ask about the candidate's friendships. How do they spend time with friends? How did they meet their closest friends? What do they like doing together?",
  },
  {
    id: "free-time",
    label: "Free time",
    category: "personal",
    seedPrompt: "Ask what the candidate does when they have free time. How much free time do they have? What do they usually do? What is their ideal free day?",
  },
  {
    id: "daily-routine",
    label: "Daily routine",
    category: "personal",
    seedPrompt: "Ask about the candidate's typical day. When do they wake up? What do they do in the morning, afternoon, evening? Do they have a strict routine or is it flexible?",
  },

  // ── Daily Life (8 topics) ──────────────────────────────────────────────
  {
    id: "food",
    label: "Food and cooking",
    category: "daily_life",
    seedPrompt: "Ask about food. Does the candidate cook? What do they like to eat? Is there a dish they make often or a favourite restaurant they enjoy?",
  },
  {
    id: "exercise",
    label: "Exercise and health",
    category: "daily_life",
    seedPrompt: "Ask about the candidate's relationship with exercise or staying healthy. Do they play sport? Go to the gym? How important is this to them?",
  },
  {
    id: "weekend",
    label: "Weekends",
    category: "daily_life",
    seedPrompt: "Ask about what the candidate typically does at weekends. Is it different from weekdays? Do they have plans for this weekend?",
  },
  {
    id: "shopping",
    label: "Shopping",
    category: "daily_life",
    seedPrompt: "Ask about the candidate's shopping habits. Do they prefer shopping online or in shops? What do they buy most? Do they enjoy shopping?",
  },
  {
    id: "transport",
    label: "Getting around",
    category: "daily_life",
    seedPrompt: "Ask how the candidate gets around. Do they drive? Use public transport? Walk or cycle? How long does their commute take?",
  },
  {
    id: "technology",
    label: "Technology use",
    category: "daily_life",
    seedPrompt: "Ask about how the candidate uses technology day to day. Which apps or devices do they use most? How has technology changed their daily life?",
  },
  {
    id: "social-media",
    label: "Social media",
    category: "daily_life",
    seedPrompt: "Ask about the candidate's use of social media. Which platforms do they use? How much time do they spend on it? What do they use it for?",
  },
  {
    id: "music",
    label: "Music",
    category: "daily_life",
    seedPrompt: "Ask about music. What kind of music does the candidate like? Do they play an instrument? When do they listen to music most?",
  },

  // ── Experiences (7 topics) ─────────────────────────────────────────────
  {
    id: "last-holiday",
    label: "Last holiday",
    category: "experiences",
    seedPrompt: "Ask about the candidate's last holiday or trip. Where did they go? What did they do? What was the best or worst part?",
  },
  {
    id: "favourite-place",
    label: "A favourite place",
    category: "experiences",
    seedPrompt: "Ask the candidate about a place that is special to them. Where is it? Why do they like it? When did they last go there?",
  },
  {
    id: "recent-event",
    label: "Something that happened recently",
    category: "experiences",
    seedPrompt: "Ask the candidate about something that happened to them recently. Something interesting, surprising, or memorable. What happened? How did they feel?",
  },
  {
    id: "learning-skill",
    label: "Learning a new skill",
    category: "experiences",
    seedPrompt: "Ask if the candidate has ever learned something new — a skill, hobby, or subject. How did they learn it? Was it difficult? Are they still doing it?",
  },
  {
    id: "celebration",
    label: "A celebration or special occasion",
    category: "experiences",
    seedPrompt: "Ask about a celebration or special occasion the candidate has attended or organised. What was it? Who was there? What made it memorable?",
  },
  {
    id: "difficult-moment",
    label: "A challenge they faced",
    category: "experiences",
    seedPrompt: "Ask the candidate about a challenge or difficult moment they experienced. What happened? How did they deal with it? What did they learn?",
  },
  {
    id: "travel-plans",
    label: "Future travel plans",
    category: "experiences",
    seedPrompt: "Ask the candidate if they have any travel plans. Where would they like to go? Why? What would they do there?",
  },

  // ── Preferences (7 topics) ─────────────────────────────────────────────
  {
    id: "city-countryside",
    label: "City vs countryside",
    category: "preferences",
    seedPrompt: "Ask the candidate whether they prefer city life or countryside life. Why? What are the good and bad things about where they live now?",
  },
  {
    id: "online-inperson",
    label: "Online vs in-person",
    category: "preferences",
    seedPrompt: "Ask whether the candidate prefers doing things online or in person — shopping, socialising, working. What are the advantages and disadvantages for them?",
  },
  {
    id: "reading-watching",
    label: "Reading vs watching",
    category: "preferences",
    seedPrompt: "Ask whether the candidate prefers reading books or watching films/TV. What do they read or watch? Why do they prefer one over the other?",
  },
  {
    id: "working-hours",
    label: "Working hours and lifestyle",
    category: "preferences",
    seedPrompt: "Ask about the candidate's preferred working style. Do they prefer to start early or late? Work from home or an office? Do they separate work from personal life?",
  },
  {
    id: "indoor-outdoor",
    label: "Indoor vs outdoor activities",
    category: "preferences",
    seedPrompt: "Ask whether the candidate prefers indoor or outdoor activities in their free time. What do they enjoy most? Does this change with the weather or season?",
  },
  {
    id: "alone-together",
    label: "Alone vs with others",
    category: "preferences",
    seedPrompt: "Ask whether the candidate prefers spending time alone or with other people. Are they more introverted or extroverted? When do they need time alone?",
  },
  {
    id: "planning-spontaneous",
    label: "Planning vs being spontaneous",
    category: "preferences",
    seedPrompt: "Ask whether the candidate prefers planning things carefully or being spontaneous. Can they give an example of when each worked well or went wrong?",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 5. GSE MICRO DESCRIPTORS (evidence layer — unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [

  // ── Pre-A1 (GSE 10–21) ──────────────────────────────────────────────────
  { id: "wgse-10-i-1", gse: 10, fn: "Informing",      text: "Can write their name, address and nationality." },
  { id: "wgse-16-x-1", gse: 16, fn: "Interactional",  text: "Can post simple online greetings, using basic formulaic expressions and emoticons." },
  { id: "wgse-20-i-1", gse: 20, fn: "Informing",      text: "Can give personal information in written form (e.g. name, nationality, age, address)." },

  // ── A1 (GSE 22–29) ──────────────────────────────────────────────────────
  { id: "wgse-25-i-1", gse: 25, fn: "Informing",      text: "Can write short sentences about things people have." },
  { id: "wgse-27-i-1", gse: 27, fn: "Informing",      text: "Can write short, simple sentences about their family, where they live and what they do." },
  { id: "wgse-29-i-1", gse: 29, fn: "Informing",      text: "Can write short sentences to describe familiar objects." },
  { id: "wgse-25-x-1", gse: 25, fn: "Interactional",  text: "Can write very simple personal messages (e.g. thanks, sorry)." },
  { id: "wgse-27-x-1", gse: 27, fn: "Interactional",  text: "Can write a few sentences about themselves (e.g. family, interests)." },

  // ── A2 (GSE 30–35) ──────────────────────────────────────────────────────
  { id: "wgse-30-i-1", gse: 30, fn: "Informing",      text: "Can write about what people do for a living." },
  { id: "wgse-31-i-1", gse: 31, fn: "Informing",      text: "Can describe a room, house, or workplace." },
  { id: "wgse-32-i-1", gse: 32, fn: "Informing",      text: "Can write about feelings using basic fixed expressions." },
  { id: "wgse-34-i-1", gse: 34, fn: "Informing",      text: "Can write about likes and dislikes using basic fixed expressions." },
  { id: "wgse-30-x-1", gse: 30, fn: "Interactional",  text: "Can write short messages relating to matters of immediate need." },
  { id: "wgse-34-x-1", gse: 34, fn: "Interactional",  text: "Can exchange short messages about everyday matters using simple language." },

  // ── A2+ (GSE 36–42) ─────────────────────────────────────────────────────
  { id: "wgse-38-i-1", gse: 38, fn: "Informing",      text: "Can write short messages on everyday matters." },
  { id: "wgse-39-i-1", gse: 39, fn: "Informing",      text: "Can write about past events and everyday experiences." },
  { id: "wgse-40-i-1", gse: 40, fn: "Informing",      text: "Can write about a future trip or plans." },
  { id: "wgse-38-x-1", gse: 38, fn: "Interactional",  text: "Can ask and answer questions in short messages on everyday matters." },
  { id: "wgse-42-x-1", gse: 42, fn: "Interactional",  text: "Can introduce themselves and manage simple exchanges in writing." },
  { id: "wgse-42-x-2", gse: 42, fn: "Interactional",  text: "Can seek clarification in a simple written exchange." },

  // ── B1 (GSE 43–50) ──────────────────────────────────────────────────────
  { id: "wgse-47-i-1", gse: 47, fn: "Informing",      text: "Can write connected text about personal interests in some detail." },
  { id: "wgse-48-i-1", gse: 48, fn: "Informing",      text: "Can respond to instructions and ask clarifications in writing." },
  { id: "wgse-50-i-1", gse: 50, fn: "Informing",      text: "Can write personal online postings with some detail about experiences and feelings." },
  { id: "wgse-46-x-1", gse: 46, fn: "Interactional",  text: "Can express opinions in online postings with reasons." },
  { id: "wgse-48-x-1", gse: 48, fn: "Interactional",  text: "Can engage in online exchanges, responding to comments and explaining points." },
  { id: "wgse-50-x-1", gse: 50, fn: "Interactional",  text: "Can write connected responses with some detail in an ongoing exchange." },

  // ── B1+ (GSE 51–58) ─────────────────────────────────────────────────────
  { id: "wgse-53-x-1", gse: 53, fn: "Interactional",  text: "Can follow the thread of an online discussion and contribute relevant comments." },
  { id: "wgse-56-x-1", gse: 56, fn: "Interactional",  text: "Can participate in real-time online exchanges with multiple participants." },
  { id: "wgse-55-i-1", gse: 55, fn: "Informing",      text: "Can report recent events in some detail in writing." },

  // ── B2+ (GSE 67–75) ─────────────────────────────────────────────────────
  { id: "wgse-68-x-1", gse: 68, fn: "Interactional",  text: "Can deal with misunderstandings and disagreements in written exchanges." },
  { id: "wgse-71-x-1", gse: 71, fn: "Interactional",  text: "Can negotiate terms and conditions in writing." },
];


// ═════════════════════════════════════════════════════════════════════════════
// 6. AZE MACRO DESCRIPTORS
//
// probeGuidance replaces probes.
// These describe WHAT FUNCTION to elicit — not the exact question to ask.
// The route injects the session topic so the AI generates topic-appropriate
// questions that target the same communicative function.
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [

  // ── Pre-A1 ─────────────────────────────────────────────────────────────
  {
    azeId: "W-INT-1",
    claim: "Can exchange basic personal info in writing",
    fn: "Interactional",
    level: "PRE_A1",
    microIds: ["wgse-10-i-1", "wgse-16-x-1", "wgse-20-i-1"],
    probeGuidance: [
      "Ask for their name",
      "Ask where they are from",
      "Ask their age or what they do",
    ],
    notes:
      "This is the OPENING ANCHOR — always used regardless of topic. " +
      "Accept single words, fragments, or very short phrases. " +
      "Look for: name, country/nationality, age or occupation.",
  },

  // ── A1 ─────────────────────────────────────────────────────────────────
  {
    azeId: "W-INF-1",
    claim: "Can write simple sentences about self and others",
    fn: "Informing",
    level: "A1",
    microIds: ["wgse-25-i-1", "wgse-27-i-1", "wgse-29-i-1"],
    probeGuidance: [
      "Ask them to describe something simple related to the session topic (e.g. family member, a possession, their home)",
      "Ask what they have or own in relation to the topic",
      "Ask who is involved in their topic (e.g. who they do the hobby with)",
    ],
    notes:
      "Look for simple sentences — not just single words. " +
      "Subject + verb + object pattern. Topic gives the AI a theme to work with.",
  },
  {
    azeId: "W-INT-2",
    claim: "Can write very simple personal messages",
    fn: "Interactional",
    level: "A1",
    microIds: ["wgse-25-x-1", "wgse-27-x-1"],
    probeGuidance: [
      "Ask them to tell you a bit about themselves in relation to the topic",
      "Ask what they like or don't like about the topic area",
    ],
    notes:
      "Look for: attempts to write about self beyond just name/age. " +
      "Can they string 2–3 simple sentences together on the topic?",
  },

  // ── A2 ─────────────────────────────────────────────────────────────────
  {
    azeId: "W-INF-2",
    claim: "Can describe people, places, and routines in writing",
    fn: "Informing",
    level: "A2",
    microIds: ["wgse-30-i-1", "wgse-31-i-1", "wgse-32-i-1", "wgse-34-i-1"],
    probeGuidance: [
      "Ask them to describe something connected to the topic in more detail",
      "Ask what they like and dislike about the topic",
      "Ask them to describe their routine or habits around the topic",
    ],
    notes:
      "Step up from A1: descriptions with some detail, not just naming. " +
      "The topic should give natural content for description.",
  },
  {
    azeId: "W-INT-3",
    claim: "Can exchange everyday information in short messages",
    fn: "Interactional",
    level: "A2",
    microIds: ["wgse-30-x-1", "wgse-34-x-1"],
    probeGuidance: [
      "Ask what they did recently in relation to the topic",
      "Ask for their preference between two options in the topic area",
      "Add your own reaction and ask them to respond",
    ],
    notes:
      "Look for: back-and-forth flow. Can they respond AND add something? " +
      "AI should share a brief opinion to prompt genuine exchange.",
  },

  // ── A2+ ────────────────────────────────────────────────────────────────
  {
    azeId: "W-INF-3",
    claim: "Can write about events and experiences with time markers",
    fn: "Informing",
    level: "A2_PLUS",
    microIds: ["wgse-38-i-1", "wgse-39-i-1", "wgse-40-i-1"],
    probeGuidance: [
      "Ask them to describe something that happened related to the topic (past)",
      "Ask about their plans or hopes in the topic area (future)",
      "Ask what changed for them in relation to the topic over time",
    ],
    notes:
      "Key shift: past and future tense appear. Time markers (last week, tomorrow, since). " +
      "Function over form — look for the attempt, not accuracy.",
  },
  {
    azeId: "W-INT-4",
    claim: "Can manage simple written exchanges on familiar topics",
    fn: "Interactional",
    level: "A2_PLUS",
    microIds: ["wgse-38-x-1", "wgse-42-x-1", "wgse-42-x-2"],
    probeGuidance: [
      "Ask for clarification on something they said about the topic",
      "Say you didn't quite understand and ask them to explain differently",
      "Ask a follow-up that requires them to expand on a previous message",
    ],
    notes:
      "Look for: can they handle follow-ups? Can they clarify when asked? " +
      "AI should deliberately prompt repair to test this.",
  },

  // ── B1 ─────────────────────────────────────────────────────────────────
  {
    azeId: "W-INF-4",
    claim: "Can write connected text about interests and experiences with detail",
    fn: "Informing",
    level: "B1",
    microIds: ["wgse-47-i-1", "wgse-48-i-1", "wgse-50-i-1"],
    probeGuidance: [
      "Ask them to describe their experience with the topic in detail",
      "Ask them to explain why the topic matters to them",
      "Ask them to describe a specific moment or example from the topic area",
    ],
    notes:
      "Key shift: connected text, not isolated sentences. Multiple sentences that flow. " +
      "Look for linking words, logical sequence, and personal perspective.",
  },
  {
    azeId: "W-INT-5",
    claim: "Can engage in online exchanges with some detail and opinions",
    fn: "Interactional",
    level: "B1",
    microIds: ["wgse-46-x-1", "wgse-48-x-1", "wgse-50-x-1"],
    probeGuidance: [
      "Share a viewpoint about the topic and ask if they agree",
      "Disagree with something they said and ask them to respond",
      "Ask them to explain why they feel the way they do about the topic",
    ],
    notes:
      "Look for: opinions with reasons. Can they engage with a viewpoint? " +
      "AI should genuinely challenge — not just prompt.",
  },

  // ── B1+ ────────────────────────────────────────────────────────────────
  {
    azeId: "W-INT-6",
    claim: "Can participate in real-time exchanges recognising intent and thread",
    fn: "Interactional",
    level: "B1_PLUS",
    microIds: ["wgse-53-x-1", "wgse-56-x-1", "wgse-55-i-1"],
    probeGuidance: [
      "Shift the topic slightly and see if they follow and connect it to earlier messages",
      "Reference something they said earlier and ask how it connects to something new",
      "Ask them to summarise or reflect on what they've shared so far",
    ],
    notes:
      "Look for: following the thread across multiple exchanges. " +
      "Can they handle topic shifts and make cross-turn connections?",
  },

  // ── B2+ ────────────────────────────────────────────────────────────────
  {
    azeId: "W-INT-7",
    claim: "Can handle misunderstandings and negotiate in writing",
    fn: "Interactional",
    level: "B2_PLUS",
    microIds: ["wgse-68-x-1", "wgse-71-x-1"],
    probeGuidance: [
      "Deliberately misinterpret something they said and see if they correct it",
      "Make a strong claim about the topic and ask them to defend or challenge it",
      "Ask them to be more precise about something they stated loosely",
    ],
    notes:
      "Look for: repair of misunderstanding, diplomatic disagreement, precision in clarification. " +
      "AI must deliberately misinterpret to elicit this — it won't emerge naturally.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 7. LEVEL CLUSTERS + THRESHOLDS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "PRE_A1",
    label: "Pre-A1",
    gseRange: [10, 21],
    macroIds: ["W-INT-1"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed Pre-A1 floor. Probe A1.",
    levelDescription:
      "Candidate can type their name, country, and basic personal details. " +
      "Single words and very short fragments accepted.",
  },
  {
    level: "A1",
    label: "A1",
    gseRange: [22, 29],
    macroIds: ["W-INF-1", "W-INT-2"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed A1. Probe A2.",
    levelDescription:
      "Candidate writes simple sentences about themselves, family, and possessions. " +
      "Key shift: single words to simple sentences.",
  },
  {
    level: "A2",
    label: "A2",
    gseRange: [30, 35],
    macroIds: ["W-INF-2", "W-INT-3"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed A2. Probe A2+.",
    levelDescription:
      "Candidate describes people, places, routines, and likes/dislikes. " +
      "Key shift: sentences to connected descriptions.",
  },
  {
    level: "A2_PLUS",
    label: "A2+",
    gseRange: [36, 42],
    macroIds: ["W-INF-3", "W-INT-4"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed A2+. Probe B1.",
    levelDescription:
      "Candidate writes about past events and future plans with time markers. " +
      "Key shift: present only to past/future with interaction.",
  },
  {
    level: "B1",
    label: "B1",
    gseRange: [43, 50],
    macroIds: ["W-INF-4", "W-INT-5"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed B1. Probe B1+.",
    levelDescription:
      "Candidate writes connected text with detail, opinions, and reasons. " +
      "Key shift: describing to explaining.",
  },
  {
    level: "B1_PLUS",
    label: "B1+",
    gseRange: [51, 58],
    macroIds: ["W-INT-6"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B1+. Probe B2+.",
    levelDescription:
      "Candidate manages multi-turn exchanges, follows threads, handles topic shifts. " +
      "Key shift: responding to steering the conversation.",
  },
  {
    level: "B2_PLUS",
    label: "B2+",
    gseRange: [67, 75],
    macroIds: ["W-INT-7"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B2+. Ceiling for Task 1.",
    levelDescription:
      "Candidate handles misunderstandings diplomatically, negotiates meaning, " +
      "defends positions with precision. Key shift: participating to negotiating.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 8. EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const WRITING_TASK1: WritingTask1Config = {
  meta,
  principles,
  topics,
  gseMicro,
  azeMacro,
  levelClusters,
};

export default WRITING_TASK1;