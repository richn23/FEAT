// ─────────────────────────────────────────────────────────────────────────────
// writing-task2-descriptors.ts — Single source of truth for Writing Task 2
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// CHANGES v2:
//   • Topic pool added (20 prompts across 3 categories)
//   • Topic type added — each topic has level-appropriate writing prompts
//   • promptGuidance on levelClusters simplified — topic pool handles variety
//   • Scaffolding chat uses topic to warm up; writing prompt drawn from same topic
//
// DESIGN PRINCIPLE: Macros are TOPIC-AGNOSTIC. They describe what the writing
// DOES functionally — not what it's about. A candidate writing about their
// apartment, a trip, or their job should be scored the same way if they
// demonstrate the same communicative functions.
//
// Functions tested: INFORMING + NARRATING
// Who: Everyone
// ─────────────────────────────────────────────────────────────────────────────

export type CefrLevel =
  | "A1" | "A2" | "A2_PLUS"
  | "B1" | "B1_PLUS"
  | "B2" | "B2_PLUS" | "C1";

export type FunctionType = "Informing" | "Narrating";
export type MacroVerdict = "CAN" | "NOT_YET" | "NOT_TESTED";
export type TopicCategory = "personal_experiences" | "everyday_life" | "events";

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
  promptGuidance: {
    // What kind of writing to elicit at this level
    instruction: string;
    wordRange: [number, number];
  };
}

// Each topic has level-banded writing prompts so the route can pick
// the right prompt for the candidate's Task 1 level.
export interface Topic {
  id: string;
  label: string;
  category: TopicCategory;
  // Scaffolding chat seed — what the AI talks about to warm the candidate up
  scaffoldSeed: string;
  // Writing prompts by level band — route picks based on Task 1 result
  writingPrompts: {
    low: string;    // A1–A2 — simple, concrete, personal
    mid: string;    // A2+–B1+ — some detail, past/future, personal response
    high: string;   // B2–C1 — structured, abstract, multi-perspective
  };
}

export interface WritingTask2Config {
  meta: {
    taskId: string;
    title: string;
    functions: FunctionType[];
    scaffoldingExchanges: number;
    description: string;
  };
  principles: {
    scaffoldingNotAssessed: boolean;
    promptAdaptsToTask1Level: boolean;
    singleExtendedResponse: boolean;
    functionAndFormSeparate: boolean;
    macrosAreTopicAgnostic: boolean;
    topicDivergesAfterExchange: number;
  };
  topics: Topic[];
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: WritingTask2Config["meta"] = {
  taskId: "w-task-2",
  title: "Inform & Narrate",
  functions: ["Informing", "Narrating"],
  scaffoldingExchanges: 4,
  description:
    "Two-phase task. Phase 1: scaffolding chat (NOT assessed) — AI warms candidate " +
    "up on the topic. Phase 2: extended writing — candidate writes a response to a " +
    "prompt drawn from the same topic, calibrated to their Task 1 level. " +
    "Macros are topic-agnostic — they test what the writing DOES, not what it's about.",
};

const principles: WritingTask2Config["principles"] = {
  scaffoldingNotAssessed: true,
  promptAdaptsToTask1Level: true,
  singleExtendedResponse: true,
  functionAndFormSeparate: true,
  macrosAreTopicAgnostic: true,
  topicDivergesAfterExchange: 0, // scaffolding is always on-topic from the start
};


// ═════════════════════════════════════════════════════════════════════════════
// TOPIC POOL (20 prompts)
//
// Route picks one at random per session.
// Topics satisfy: LOW knowledge requirement + HIGH language potential.
//
// Each topic has:
//   scaffoldSeed   — what the AI chats about in the scaffolding phase
//   writingPrompts — three level-banded prompts (low / mid / high)
//                    route picks based on Task 1 diagnosed level
// ═════════════════════════════════════════════════════════════════════════════

const topics: Topic[] = [

  // ── Personal Experiences (7 topics) ───────────────────────────────────
  {
    id: "learning-skill",
    label: "Learning a new skill",
    category: "personal_experiences",
    scaffoldSeed: "Chat about something the candidate has learned how to do. Ask what it was, how they learned it, whether it was difficult, and whether they still do it.",
    writingPrompts: {
      low:  "Write about something you learned to do. What is it? Do you like it?",
      mid:  "Write about a time you learned something new. How did you learn it? Was it easy or difficult? How did you feel?",
      high: "Write about learning a new skill or ability. What challenges did you face, and what did the experience teach you about yourself?",
    },
  },
  {
    id: "memorable-day",
    label: "A memorable day",
    category: "personal_experiences",
    scaffoldSeed: "Chat about a day the candidate remembers well — happy, funny, or surprising. Ask what happened, who was there, and why they remember it.",
    writingPrompts: {
      low:  "Write about a day you remember. What happened? Who was there?",
      mid:  "Write about a day that was special or memorable for you. What happened and how did you feel?",
      high: "Write about a day that stayed with you. Describe what happened and explain why it was significant.",
    },
  },
  {
    id: "difficult-decision",
    label: "A difficult decision",
    category: "personal_experiences",
    scaffoldSeed: "Chat about a decision the candidate found difficult to make. Ask what the options were, what they chose, and whether they think it was the right choice.",
    writingPrompts: {
      low:  "Write about a choice you made. What did you choose? Was it easy?",
      mid:  "Write about a decision that was hard to make. What were your options and what did you decide? How do you feel about it now?",
      high: "Write about a difficult decision you faced. Explain the factors involved, what you decided, and what you learned from the experience.",
    },
  },
  {
    id: "mistake",
    label: "A mistake you made",
    category: "personal_experiences",
    scaffoldSeed: "Chat about a mistake the candidate once made — nothing too serious, just something they learned from. Ask what happened and what they did afterwards.",
    writingPrompts: {
      low:  "Write about a mistake you made. What happened? What did you do?",
      mid:  "Write about a mistake you made and what happened as a result. What did you learn from it?",
      high: "Write about a mistake you made and how it affected you. What did it teach you, and would you do anything differently?",
    },
  },
  {
    id: "achievement",
    label: "Something you are proud of",
    category: "personal_experiences",
    scaffoldSeed: "Chat about something the candidate has achieved or done that made them feel proud. Ask what it was, how they did it, and how it felt.",
    writingPrompts: {
      low:  "Write about something you did that made you happy or proud. What was it?",
      mid:  "Write about something you achieved that you are proud of. How did you do it and how did it make you feel?",
      high: "Write about an achievement that matters to you. Describe how you got there, what obstacles you overcame, and why it is significant.",
    },
  },
  {
    id: "change",
    label: "A change in your life",
    category: "personal_experiences",
    scaffoldSeed: "Chat about a change the candidate has experienced — moving, a new job, a new chapter. Ask what changed, how they felt, and whether it was positive.",
    writingPrompts: {
      low:  "Write about something that changed in your life. What was different? How did you feel?",
      mid:  "Write about an important change in your life. What happened and how did it affect you?",
      high: "Write about a significant change you experienced. Describe what changed, how you adapted, and what the long-term effect has been.",
    },
  },
  {
    id: "person-influenced",
    label: "Someone who influenced you",
    category: "personal_experiences",
    scaffoldSeed: "Chat about a person who has had a positive influence on the candidate — a teacher, family member, friend, or colleague. Ask who they are and what they did.",
    writingPrompts: {
      low:  "Write about someone important to you. Who are they and why do you like them?",
      mid:  "Write about someone who has influenced you. Who are they and how did they affect your life?",
      high: "Write about a person who has had a significant influence on you. Describe who they are, what they did, and how they shaped your thinking or choices.",
    },
  },

  // ── Everyday Life (7 topics) ───────────────────────────────────────────
  {
    id: "typical-weekend",
    label: "A typical weekend",
    category: "everyday_life",
    scaffoldSeed: "Chat about what the candidate usually does at weekends. Ask about Saturday and Sunday routines, and whether weekends feel different from weekdays.",
    writingPrompts: {
      low:  "Write about your weekend. What do you usually do on Saturday and Sunday?",
      mid:  "Write about a typical weekend for you. What do you do and what do you enjoy most about it?",
      high: "Write about how you spend your weekends. Describe your typical routine and explain what weekends mean to you compared to the working week.",
    },
  },
  {
    id: "how-you-relax",
    label: "How you relax",
    category: "everyday_life",
    scaffoldSeed: "Chat about how the candidate switches off and relaxes after a busy day or week. Ask what activities help them unwind and why.",
    writingPrompts: {
      low:  "Write about how you relax. What do you do when you are tired?",
      mid:  "Write about how you relax after a busy day or week. What activities help you and why do you enjoy them?",
      high: "Write about the ways you relax and recharge. Explain what works for you and why you think rest and leisure are important.",
    },
  },
  {
    id: "favourite-place",
    label: "A place you enjoy visiting",
    category: "everyday_life",
    scaffoldSeed: "Chat about a place the candidate likes to go — a café, a park, a city, or somewhere they return to often. Ask what it is like and why they like it.",
    writingPrompts: {
      low:  "Write about a place you like. Where is it? What is it like?",
      mid:  "Write about a place you enjoy visiting. Describe it and explain why it is special to you.",
      high: "Write about a place that is meaningful to you. Describe what it is like and explain why you return to it — what does it give you that other places don't?",
    },
  },
  {
    id: "food-cooking",
    label: "Food and cooking",
    category: "everyday_life",
    scaffoldSeed: "Chat about the candidate's relationship with food. Do they cook? What do they like to eat? Is there a dish they always return to?",
    writingPrompts: {
      low:  "Write about food you like. What is your favourite food and why?",
      mid:  "Write about your relationship with food or cooking. What do you enjoy eating or making and why?",
      high: "Write about the role food plays in your life. Consider cooking, eating with others, cultural traditions, or what food means to you beyond just eating.",
    },
  },
  {
    id: "exercise-health",
    label: "Exercise and staying healthy",
    category: "everyday_life",
    scaffoldSeed: "Chat about how the candidate approaches exercise and health. Do they play sport, go to the gym, or walk? How important is staying healthy to them?",
    writingPrompts: {
      low:  "Write about exercise or sport. Do you exercise? What do you do?",
      mid:  "Write about how you stay active and healthy. What do you do and how does it make you feel?",
      high: "Write about your approach to health and exercise. Explain what you do, why you do it, and what role physical wellbeing plays in your life.",
    },
  },
  {
    id: "technology-daily",
    label: "Technology in daily life",
    category: "everyday_life",
    scaffoldSeed: "Chat about how the candidate uses technology day to day. Which devices or apps do they use most? Has technology changed how they live?",
    writingPrompts: {
      low:  "Write about technology you use every day. What do you use and why?",
      mid:  "Write about how technology is part of your daily life. What do you use it for and how has it changed things for you?",
      high: "Write about the role technology plays in your life. Consider both the benefits and the downsides, and explain how you feel about your relationship with it.",
    },
  },
  {
    id: "work-study-life",
    label: "Work or study",
    category: "everyday_life",
    scaffoldSeed: "Chat about what the candidate does for work or study. What is a typical day like? What do they enjoy or find challenging?",
    writingPrompts: {
      low:  "Write about your work or studies. What do you do every day?",
      mid:  "Write about your work or studies. What do you enjoy about it and what do you find difficult?",
      high: "Write about your experience of work or study. Describe what it involves, what you find rewarding or challenging, and how it fits into your life overall.",
    },
  },

  // ── Events (6 topics) ─────────────────────────────────────────────────
  {
    id: "celebration",
    label: "A celebration or special occasion",
    category: "events",
    scaffoldSeed: "Chat about a celebration or special occasion the candidate attended or organised — a birthday, wedding, festival, or other event. Ask what happened and what made it memorable.",
    writingPrompts: {
      low:  "Write about a celebration you went to. What was it? Who was there?",
      mid:  "Write about a celebration or special occasion you attended. What happened and what made it special?",
      high: "Write about a celebration or special occasion that stands out in your memory. Describe what happened and explain why it was meaningful.",
    },
  },
  {
    id: "surprising-moment",
    label: "A surprising moment",
    category: "events",
    scaffoldSeed: "Chat about something that surprised the candidate — good or bad. Ask what happened, whether they expected it, and how they reacted.",
    writingPrompts: {
      low:  "Write about something that surprised you. What happened?",
      mid:  "Write about a moment that surprised you. What happened and how did you feel?",
      high: "Write about an unexpected moment that affected you. Describe what happened and explain how it changed your thinking or plans.",
    },
  },
  {
    id: "last-holiday",
    label: "A trip or holiday",
    category: "events",
    scaffoldSeed: "Chat about a trip or holiday the candidate has taken. Ask where they went, what they did, and what they most enjoyed or found difficult.",
    writingPrompts: {
      low:  "Write about a trip you took. Where did you go? What did you do?",
      mid:  "Write about a trip or holiday you took. Describe what happened and what you enjoyed or found difficult.",
      high: "Write about a trip that was significant for you. Describe the experience and explain what it gave you — new perspectives, challenges, or memories.",
    },
  },
  {
    id: "meeting-someone",
    label: "Meeting someone interesting",
    category: "events",
    scaffoldSeed: "Chat about a time the candidate met someone interesting or unexpected. Ask where they met, what the person was like, and whether they stayed in contact.",
    writingPrompts: {
      low:  "Write about someone you met. Who were they? Where did you meet?",
      mid:  "Write about meeting someone interesting or unexpected. Who were they and what happened?",
      high: "Write about an encounter with someone who made an impression on you. Describe who they were, how you met, and what effect the meeting had.",
    },
  },
  {
    id: "future-plans",
    label: "Future plans or dreams",
    category: "events",
    scaffoldSeed: "Chat about the candidate's plans for the future — near or distant. Ask about something they want to do, achieve, or change.",
    writingPrompts: {
      low:  "Write about something you want to do in the future. What is it?",
      mid:  "Write about your plans or hopes for the future. What do you want to do and why?",
      high: "Write about your plans or ambitions for the future. Explain what you hope to achieve, why it matters to you, and what steps you are taking.",
    },
  },
  {
    id: "local-event",
    label: "Something happening in your area",
    category: "events",
    scaffoldSeed: "Chat about something that has been happening recently in the candidate's city, neighbourhood, or community — a new development, event, or change.",
    writingPrompts: {
      low:  "Write about something happening near where you live. What is it?",
      mid:  "Write about something that has been happening in your area recently. What is it and what do you think about it?",
      high: "Write about a recent development or event in your area. Describe what is happening, different perspectives on it, and your own view.",
    },
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// GSE MICRO DESCRIPTORS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [
  { id: "w2-gse-27",  gse: 27, fn: "Informing",  text: "Can write short, simple sentences about their family, where they live and what they do." },
  { id: "w2-gse-29",  gse: 29, fn: "Informing",  text: "Can write short sentences to describe familiar objects." },
  { id: "w2-gse-31",  gse: 31, fn: "Informing",  text: "Can describe a room, house, or workplace." },
  { id: "w2-gse-34",  gse: 34, fn: "Informing",  text: "Can write about likes and dislikes using basic fixed expressions." },
  { id: "w2-gse-35",  gse: 35, fn: "Narrating",  text: "Can write short descriptions of events using simple past forms." },
  { id: "w2-gse-39",  gse: 39, fn: "Narrating",  text: "Can write about past events and everyday experiences." },
  { id: "w2-gse-40",  gse: 40, fn: "Informing",  text: "Can write about a future trip or plans." },
  { id: "w2-gse-47a", gse: 47, fn: "Informing",  text: "Can write connected text on topics of personal interest in some detail." },
  { id: "w2-gse-47b", gse: 47, fn: "Informing",  text: "Can write connected text from short, simple elements into a connected sequence." },
  { id: "w2-gse-50",  gse: 50, fn: "Narrating",  text: "Can write personal online postings about experiences, feelings and events." },
  { id: "w2-gse-53",  gse: 53, fn: "Narrating",  text: "Can write a description of a real or imagined event." },
  { id: "w2-gse-55a", gse: 55, fn: "Narrating",  text: "Can report recent events in some detail in writing." },
  { id: "w2-gse-55b", gse: 55, fn: "Informing",  text: "Can write descriptions emphasising the most important points." },
  { id: "w2-gse-62",  gse: 62, fn: "Informing",  text: "Can write structured text with main points and supporting details." },
  { id: "w2-gse-65",  gse: 65, fn: "Narrating",  text: "Can write a narrative with supporting detail that engages the reader." },
  { id: "w2-gse-70",  gse: 70, fn: "Informing",  text: "Can write about abstract and concrete topics, presenting different perspectives." },
  { id: "w2-gse-74",  gse: 74, fn: "Informing",  text: "Can describe a complex process in writing with clear structure." },
  { id: "w2-gse-76",  gse: 76, fn: "Informing",  text: "Can write essays or reports that synthesise information from multiple sources." },
  { id: "w2-gse-84",  gse: 84, fn: "Informing",  text: "Can present complex information clearly with appropriate register and style." },
];


// ═════════════════════════════════════════════════════════════════════════════
// AZE MACRO DESCRIPTORS (unchanged — macros are topic-agnostic)
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [
  {
    azeId: "W2-F1",
    claim: "Can produce simple factual statements in writing",
    fn: "Informing",
    level: "A1",
    microIds: ["w2-gse-27", "w2-gse-29"],
    signals: [
      "Writing contains basic factual sentences (X is Y, I have X)",
      "Conveys at least one piece of concrete information",
      "Reader can understand what is being described",
    ],
    notes: "Isolated sentences are fine. No need for linking or flow. Any topic.",
  },
  {
    azeId: "W2-F2",
    claim: "Can describe with some detail beyond single facts",
    fn: "Informing",
    level: "A2",
    microIds: ["w2-gse-31", "w2-gse-34"],
    signals: [
      "Goes beyond naming — adds detail, description, or elaboration",
      "Expresses preferences, likes/dislikes, or simple opinions",
      "More than one sentence about the same thing",
    ],
  },
  {
    azeId: "W2-F3",
    claim: "Can refer to different times (past, present, or future)",
    fn: "Narrating",
    level: "A2",
    microIds: ["w2-gse-35", "w2-gse-39", "w2-gse-40"],
    signals: [
      "Uses or attempts past, present, AND/OR future reference",
      "Shows awareness that time matters (yesterday, now, next week, since, etc.)",
      "Not stuck in one tense throughout",
    ],
    notes: "Function over form — look for the attempt, not accuracy.",
  },
  {
    azeId: "W2-F4",
    claim: "Can give reasons for preferences, choices, or situations",
    fn: "Informing",
    level: "A2_PLUS",
    microIds: ["w2-gse-34", "w2-gse-40"],
    signals: [
      "States a preference or fact AND explains why",
      "Uses because, so, since, or equivalent logic",
      "Reader understands the reason, not just the statement",
    ],
  },
  {
    azeId: "W2-F5",
    claim: "Can produce connected writing that flows logically",
    fn: "Informing",
    level: "B1",
    microIds: ["w2-gse-47a", "w2-gse-47b"],
    signals: [
      "Sentences connect to each other — not isolated statements",
      "Uses linking words or logical sequencing (also, however, then, because of this)",
      "Writing has a sense of direction — not random",
      "Multiple sentences build on the same idea",
    ],
  },
  {
    azeId: "W2-F6",
    claim: "Can include personal response — feelings, reactions, or reflection",
    fn: "Narrating",
    level: "B1",
    microIds: ["w2-gse-50"],
    signals: [
      "Goes beyond factual reporting to personal reaction",
      "Includes how they feel, what they think, what surprised them",
      "Shows the writer's perspective — not just description",
    ],
    notes: "This is the key B1 differentiator. Pure description without personal response = A2.",
  },
  {
    azeId: "W2-F7",
    claim: "Can prioritise and emphasise what matters most",
    fn: "Informing",
    level: "B1_PLUS",
    microIds: ["w2-gse-55b"],
    signals: [
      "Not just listing — selects and highlights what's important",
      "Uses emphasis (especially, the most important thing, what I really...)",
      "Reader can tell what the main point is vs supporting detail",
    ],
  },
  {
    azeId: "W2-F8",
    claim: "Can write with enough detail that the reader gets a clear picture",
    fn: "Narrating",
    level: "B1_PLUS",
    microIds: ["w2-gse-53", "w2-gse-55a"],
    signals: [
      "Writing creates a clear picture — reader can visualise or understand",
      "Specific details included (not vague generalities)",
      "Enough detail to be informative, not so much it's unfocused",
    ],
  },
  {
    azeId: "W2-F9",
    claim: "Can structure writing with clear organisation",
    fn: "Informing",
    level: "B2",
    microIds: ["w2-gse-62"],
    signals: [
      "Writing has discernible structure — beginning, development, conclusion (implied or explicit)",
      "Main points are supported by examples or evidence",
      "Ideas are grouped logically, not scattered",
    ],
  },
  {
    azeId: "W2-F10",
    claim: "Can engage the reader through writing choices",
    fn: "Narrating",
    level: "B2",
    microIds: ["w2-gse-65"],
    signals: [
      "Writing holds attention — not just functional, but engaging",
      "Uses descriptive language, scene-setting, or rhetorical choices",
      "Reader wants to keep reading",
    ],
  },
  {
    azeId: "W2-F11",
    claim: "Can present complex or abstract ideas clearly",
    fn: "Informing",
    level: "B2_PLUS",
    microIds: ["w2-gse-70", "w2-gse-74"],
    signals: [
      "Handles abstract concepts — not just concrete description",
      "Can present multiple angles or perspectives",
      "Complex ideas are clear on first reading",
    ],
  },
  {
    azeId: "W2-F12",
    claim: "Can write with full control of register, style, and extended discourse",
    fn: "Informing",
    level: "C1",
    microIds: ["w2-gse-76", "w2-gse-84"],
    signals: [
      "Sustained control across extended writing",
      "Appropriate register and style throughout",
      "Synthesises information — not just reports it",
      "Linguistically complex but clear",
    ],
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// LEVEL CLUSTERS + THRESHOLDS
// promptGuidance simplified — topic pool now handles variety
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "A1",
    label: "A1",
    gseRange: [22, 29],
    macroIds: ["W2-F1"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A1. Probe A2.",
    levelDescription: "Produces simple factual statements.",
    promptGuidance: {
      instruction: "Simple, concrete, personal. Ask for basic facts about themselves or a familiar topic.",
      wordRange: [30, 100],
    },
  },
  {
    level: "A2",
    label: "A2",
    gseRange: [30, 35],
    macroIds: ["W2-F2", "W2-F3"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed A2. Probe A2+.",
    levelDescription: "Describes with detail. Refers to different times.",
    promptGuidance: {
      instruction: "Ask for description with some detail. Should naturally require past or future reference.",
      wordRange: [50, 150],
    },
  },
  {
    level: "A2_PLUS",
    label: "A2+",
    gseRange: [36, 42],
    macroIds: ["W2-F4"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A2+. Probe B1.",
    levelDescription: "Gives reasons for preferences and choices.",
    promptGuidance: {
      instruction: "Ask for preferences or choices with reasons. Should naturally invite 'because' responses.",
      wordRange: [60, 150],
    },
  },
  {
    level: "B1",
    label: "B1",
    gseRange: [43, 50],
    macroIds: ["W2-F5", "W2-F6"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed B1. Probe B1+.",
    levelDescription: "Connected writing with personal response.",
    promptGuidance: {
      instruction: "Ask for connected writing about an experience. Should invite personal reaction and feelings.",
      wordRange: [80, 200],
    },
  },
  {
    level: "B1_PLUS",
    label: "B1+",
    gseRange: [51, 58],
    macroIds: ["W2-F7", "W2-F8"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed B1+. Probe B2.",
    levelDescription: "Prioritises what matters. Clear detail.",
    promptGuidance: {
      instruction: "Ask for focused writing that requires selecting what matters most and providing specific detail.",
      wordRange: [100, 200],
    },
  },
  {
    level: "B2",
    label: "B2",
    gseRange: [59, 66],
    macroIds: ["W2-F9", "W2-F10"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed B2. Probe B2+.",
    levelDescription: "Structured, organised writing that engages the reader.",
    promptGuidance: {
      instruction: "Ask for structured, detailed writing on a significant experience. Should invite engagement and organisation.",
      wordRange: [120, 250],
    },
  },
  {
    level: "B2_PLUS",
    label: "B2+",
    gseRange: [67, 75],
    macroIds: ["W2-F11"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B2+. Probe C1.",
    levelDescription: "Presents complex or abstract ideas clearly.",
    promptGuidance: {
      instruction: "Ask for writing that requires abstract thinking or multiple perspectives.",
      wordRange: [150, 300],
    },
  },
  {
    level: "C1",
    label: "C1",
    gseRange: [76, 84],
    macroIds: ["W2-F12"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed C1. Ceiling for Task 2.",
    levelDescription: "Full control of register, style, extended discourse.",
    promptGuidance: {
      instruction: "Ask for extended, analytical writing that synthesises multiple aspects of the topic.",
      wordRange: [200, 400],
    },
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const WRITING_TASK2: WritingTask2Config = {
  meta,
  principles,
  topics,
  gseMicro,
  azeMacro,
  levelClusters,
};

export default WRITING_TASK2;