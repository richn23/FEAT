// ─────────────────────────────────────────────────────────────────────────────
// descriptors.ts — Single source of truth for Task 1: Diagnostic Q&A
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// Defines what we measure and when we stop — not how the UI looks or how
// the API responds. Other files import from here.
//
// Sources:
//   • GSE Speaking LO Functional Analysis (Jan 6 spreadsheet)
//   • AZE Speaking Test Specification v2 (Feb 2026)
//   • AZE Task 1 Mapping Document (Feb 2026)
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
  | "B2"
  | "B2_PLUS"
  | "C1"
  | "C2";

export type FunctionType = "Informing" | "Interacting";

export type MacroVerdict = "CAN" | "NOT_YET" | "NOT_TESTED";

export interface GseMicro {
  /** Stable ID — format: "gse-{score}-{fn initial}-{sequence}" */
  id: string;
  /** GSE score (10–90) */
  gse: number;
  /** Communicative function */
  fn: FunctionType;
  /** Verbatim GSE descriptor text */
  text: string;
}

export interface AzeMacro {
  /** Stable ID — format: "INF-{n}" or "INT-{n}" */
  azeId: string;
  /** The assessable claim: "Can ..." */
  claim: string;
  /** Communicative function */
  fn: FunctionType;
  /** CEFR level this macro belongs to */
  level: CefrLevel;
  /** IDs of the GSE micro descriptors underneath */
  microIds: string[];
  /** 1–3 example probes that can elicit evidence for this macro */
  probes: string[];
  /** Optional notes for scoring / AI behaviour */
  notes?: string;
}

export interface LevelCluster {
  level: CefrLevel;
  /** Human-readable label */
  label: string;
  /** GSE range for this band */
  gseRange: [number, number];
  /** AZE macro IDs included at this level */
  macroIds: string[];
  /** How many macros must be CAN to confirm this level */
  confirmThreshold: number;
  /** Total macros at this level (denominator) */
  totalMacros: number;
  /** What happens when threshold is met */
  onConfirm: string;
  /** Brief description of what this level looks like */
  levelDescription: string;
}

export interface Task1Config {
  meta: {
    taskId: string;
    title: string;
    functions: FunctionType[];
    maxExchanges: number;
    /** Summary of what this task does */
    description: string;
  };
  principles: {
    /** Evidence comes from candidate responses, not initiation */
    responseDefinesEvidence: boolean;
    /** If candidate shows B1 competence, unconfirmed A2 gaps don't block */
    higherOverridesLowerGaps: boolean;
    /** Task 1 interaction is response-based (AI drives) */
    task1InteractionIsResponseBased: boolean;
    /** Stop probing upward after this many consecutive NOT_YET at a level */
    stopAfterConsecutiveNotYet: number;
    /** A single clear instance under demand is enough for CAN */
    singleClearInstanceSufficient: boolean;
    /** Multiple weak/ambiguous instances do NOT combine into CAN */
    weakInstancesDoNotCombine: boolean;
  };
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. TASK METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: Task1Config["meta"] = {
  taskId: "task-1",
  title: "Diagnostic Q&A",
  functions: ["Informing", "Interacting"],
  maxExchanges: 20,
  description:
    "AI-led conversation probing up/down to find level. Starts simple, adapts. " +
    "Everyone takes this task. Duration: 3–4 minutes.",
};


// ═════════════════════════════════════════════════════════════════════════════
// 3. SCORING PRINCIPLES
// ═════════════════════════════════════════════════════════════════════════════

const principles: Task1Config["principles"] = {
  responseDefinesEvidence: true,
  higherOverridesLowerGaps: true,
  task1InteractionIsResponseBased: true,
  stopAfterConsecutiveNotYet: 2,
  singleClearInstanceSufficient: true,
  weakInstancesDoNotCombine: true,
};


// ═════════════════════════════════════════════════════════════════════════════
// 4. GSE MICRO DESCRIPTORS (evidence layer)
//
// Every "Can ..." statement from the GSE spreadsheet that is mapped into
// an AZE macro for Task 1. These are what you LISTEN for.
//
// ID format: gse-{score}-{i|x}-{seq}
//   i = Informing, x = Interacting
//   seq = unique within that GSE score + function combo
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [

  // ── Pre-A1 (GSE 10–21) ──────────────────────────────────────────────────

  // INF-1 micros
  { id: "gse-10-i-1",  gse: 10, fn: "Informing",    text: "Can say their name." },
  { id: "gse-12-i-1",  gse: 12, fn: "Informing",    text: "Can recognise and say the name of their own country, nationality and language." },
  { id: "gse-18-i-1",  gse: 18, fn: "Informing",    text: "Can say their own age." },
  { id: "gse-19-i-1",  gse: 19, fn: "Informing",    text: "Can say what they do (e.g. name of their job, student)." },
  { id: "gse-20-i-1",  gse: 20, fn: "Informing",    text: "Can give a date of birth." },
  { id: "gse-12-x-1",  gse: 12, fn: "Interacting",  text: "Can introduce themselves using a basic phrase (e.g. \u2018My name\u2019s \u2026\u2019)." },

  // INF-2 micros
  { id: "gse-16-i-1",  gse: 16, fn: "Informing",    text: "Can tell the time of day in full hours." },
  { id: "gse-17-i-1",  gse: 17, fn: "Informing",    text: "Can ask for and give a phone number." },
  { id: "gse-19-i-2",  gse: 19, fn: "Informing",    text: "Can ask for and give the day and date." },

  // INF-3 micros
  { id: "gse-17-i-2",  gse: 17, fn: "Informing",    text: "Can use some very basic words to ask for food and drink." },
  { id: "gse-18-i-2",  gse: 18, fn: "Informing",    text: "Can use a few simple words to describe objects (e.g. colour, number), if supported by pictures." },
  { id: "gse-15-i-1",  gse: 15, fn: "Informing",    text: "Can say other people\u2019s nationalities." },
  { id: "gse-21-i-1",  gse: 21, fn: "Informing",    text: "Can ask and answer simple questions about things they have in a limited way." },

  // INT-1 micros
  { id: "gse-12-x-2",  gse: 12, fn: "Interacting",  text: "Can greet people using a few basic fixed expressions." },
  { id: "gse-12-x-3",  gse: 12, fn: "Interacting",  text: "Can use a few basic words and phrases to show politeness (e.g. \u2018please\u2019, \u2018thank you\u2019)." },
  { id: "gse-19-x-1",  gse: 19, fn: "Interacting",  text: "Can establish basic social contacts with simple, polite greetings and farewells." },
  { id: "gse-21-i-2",  gse: 21, fn: "Informing",    text: "Can ask very simply for repetition when they don\u2019t understand." },


  // ── A1 (GSE 22–29) ─────────────────────────────────────────────────────

  // INF-4 micros
  { id: "gse-22-i-1",  gse: 22, fn: "Informing",    text: "Can ask and answer basic questions about family and friends in a limited way." },
  { id: "gse-26-i-1",  gse: 26, fn: "Informing",    text: "Can describe where they live." },
  { id: "gse-27-i-1",  gse: 27, fn: "Informing",    text: "Can say what someone\u2019s job is, using familiar common job names." },
  { id: "gse-28-i-1",  gse: 28, fn: "Informing",    text: "Can exchange personal details (e.g. where they live, things they have)." },
  { id: "gse-29-i-1",  gse: 29, fn: "Informing",    text: "Can talk about the family in a basic way, given prompts." },
  { id: "gse-28-i-2",  gse: 28, fn: "Informing",    text: "Can ask and answer simple questions about people they know in a limited way." },

  // INF-5 micros
  { id: "gse-22-i-2",  gse: 22, fn: "Informing",    text: "Can answer simple questions about objects (e.g. colour, size)." },
  { id: "gse-23-i-1",  gse: 23, fn: "Informing",    text: "Can describe the position of something in a very basic way." },
  { id: "gse-24-i-1",  gse: 24, fn: "Informing",    text: "Can describe objects in a basic way (e.g. colour, size)." },
  { id: "gse-28-i-3",  gse: 28, fn: "Informing",    text: "Can use basic words to describe common weather conditions." },
  { id: "gse-28-i-4",  gse: 28, fn: "Informing",    text: "Can answer simple questions about the location of people or things in a limited way." },
  { id: "gse-29-i-2",  gse: 29, fn: "Informing",    text: "Can describe an object using simple language." },

  // INF-6 micros
  { id: "gse-25-i-1",  gse: 25, fn: "Informing",    text: "Can ask and answer simple questions in areas of immediate need or on very familiar topics." },
  { id: "gse-28-i-5",  gse: 28, fn: "Informing",    text: "Can answer simple questions about their daily activities or routines, given a model." },
  { id: "gse-29-i-3",  gse: 29, fn: "Informing",    text: "Can answer simple questions about habits and routines." },
  { id: "gse-29-i-4",  gse: 29, fn: "Informing",    text: "Can say who something belongs to." },
  { id: "gse-29-i-5",  gse: 29, fn: "Informing",    text: "Can use simple words/signs to state how a work made them feel." },

  // INF-7 micros
  { id: "gse-22-i-3",  gse: 22, fn: "Informing",    text: "Can tell the time of day to within five minutes." },
  { id: "gse-24-i-2",  gse: 24, fn: "Informing",    text: "Can tell the time of day to the quarter hour." },
  { id: "gse-24-i-3",  gse: 24, fn: "Informing",    text: "Can give dates using standard formats (day and month)." },
  { id: "gse-25-i-2",  gse: 25, fn: "Informing",    text: "Can indicate time by such phrases as \u2018next week\u2019, \u2018last Friday\u2019, \u2018in November\u2019, \u2018three o\u2019clock\u2019." },

  // INT-2 micros
  { id: "gse-22-x-1",  gse: 22, fn: "Interacting",  text: "Can introduce themselves in a basic way, giving some information about where they live, their family etc." },
  { id: "gse-23-x-1",  gse: 23, fn: "Interacting",  text: "Can give key information to introduce themselves (e.g. name, age, where they are from)." },
  { id: "gse-24-x-1",  gse: 24, fn: "Interacting",  text: "Can greet people, ask how they are and react to news." },
  { id: "gse-26-x-1",  gse: 26, fn: "Interacting",  text: "Can introduce someone in a basic way, giving their name and job title." },
  { id: "gse-26-x-2",  gse: 26, fn: "Interacting",  text: "Can introduce themselves, their hobbies and interests in a basic way." },
  { id: "gse-28-x-1",  gse: 28, fn: "Interacting",  text: "Can make an introduction and use basic greeting and leave-taking expressions." },
  { id: "gse-29-x-1",  gse: 29, fn: "Interacting",  text: "Can respond politely when introduced to someone, using a few basic fixed expressions." },


  // ── A2 (GSE 30–35) ─────────────────────────────────────────────────────

  // INF-8 micros
  { id: "gse-30-i-1",  gse: 30, fn: "Informing",    text: "Can give a short description of their home, family and job, given some help with vocabulary." },
  { id: "gse-31-i-1",  gse: 31, fn: "Informing",    text: "Can talk about everyday things (e.g. people, places, job, study) in a basic way." },
  { id: "gse-32-i-1",  gse: 32, fn: "Informing",    text: "Can give a simple description of their school or workplace." },
  { id: "gse-33-i-1",  gse: 33, fn: "Informing",    text: "Can describe their family, living conditions, education and present or most recent job." },
  { id: "gse-33-i-2",  gse: 33, fn: "Informing",    text: "Can talk about their life (e.g. family, home, job), using simple language." },
  { id: "gse-33-i-3",  gse: 33, fn: "Informing",    text: "Can describe their home town or city using simple language." },
  { id: "gse-35-i-1",  gse: 35, fn: "Informing",    text: "Can ask and answer questions about what they do at work and in their free time." },

  // INF-9 micros
  { id: "gse-30-i-2",  gse: 30, fn: "Informing",    text: "Can describe a person\u2019s hobbies and activities using simple language." },
  { id: "gse-31-i-2",  gse: 31, fn: "Informing",    text: "Can describe their daily routines in a simple way." },
  { id: "gse-33-i-4",  gse: 33, fn: "Informing",    text: "Can describe skills and abilities using simple language." },
  { id: "gse-34-i-1",  gse: 34, fn: "Informing",    text: "Can use simple language to describe people\u2019s appearance." },
  { id: "gse-34-i-2",  gse: 34, fn: "Informing",    text: "Can describe people\u2019s everyday lives using a short series of simple phrases and sentences." },
  { id: "gse-34-i-3",  gse: 34, fn: "Informing",    text: "Can say what they like and dislike." },

  // INF-10 micros
  { id: "gse-30-i-3",  gse: 30, fn: "Informing",    text: "Can talk about familiar topics using a few basic words and phrases." },
  { id: "gse-33-i-5",  gse: 33, fn: "Informing",    text: "Can make simple remarks and pose occasional questions to indicate that they are following." },
  { id: "gse-34-i-4",  gse: 34, fn: "Informing",    text: "Can exchange simple information on everyday topics, provided the other person speaks slowly and clearly and is prepared to help." },
  { id: "gse-34-i-5",  gse: 34, fn: "Informing",    text: "Can answer simple questions in a face-to-face survey." },
  { id: "gse-35-i-2",  gse: 35, fn: "Informing",    text: "Can check that someone has understood information, using simple language." },
  { id: "gse-35-i-3",  gse: 35, fn: "Informing",    text: "Can state whether they liked a work or not and explain why in simple language." },

  // INF-11 micros
  { id: "gse-31-i-3",  gse: 31, fn: "Informing",    text: "Can ask about the location of places in a town, using simple language." },
  { id: "gse-31-i-4",  gse: 31, fn: "Informing",    text: "Can describe common everyday objects using simple language." },
  { id: "gse-32-i-2",  gse: 32, fn: "Informing",    text: "Can give simple directions using a map or plan." },
  { id: "gse-33-i-6",  gse: 33, fn: "Informing",    text: "Can give the order of things using simple language (e.g. \u2018first\u2019, \u2018second\u2019, \u2018third\u2019)." },
  { id: "gse-33-i-7",  gse: 33, fn: "Informing",    text: "Can make simple references to the past using \u2018was/were\u2019." },
  { id: "gse-34-i-6",  gse: 34, fn: "Informing",    text: "Can give simple directions from X to Y on foot or by public transport." },

  // INT-3 micros
  { id: "gse-30-x-1",  gse: 30, fn: "Interacting",  text: "Can ask for repetition and clarification when they don\u2019t understand, using basic fixed expressions." },
  { id: "gse-30-x-2",  gse: 30, fn: "Interacting",  text: "Can initiate and respond to simple statements on very familiar topics." },
  { id: "gse-32-x-1",  gse: 32, fn: "Interacting",  text: "Can collaborate in simple, practical tasks, asking what others think, making suggestions and understanding responses, provided they can ask for repetition or reformulation from time to time." },
  { id: "gse-34-x-1",  gse: 34, fn: "Interacting",  text: "Can show understanding using a limited range of fixed expressions." },
  { id: "gse-34-x-2",  gse: 34, fn: "Interacting",  text: "Can take part in a very simple conversation on a familiar topic if the other speaker repeats questions and answers as necessary and speaks slowly and clearly." },

  // INT-4 micros
  { id: "gse-31-x-1",  gse: 31, fn: "Interacting",  text: "Can make and accept a simple apology." },
  { id: "gse-31-x-2",  gse: 31, fn: "Interacting",  text: "Can make simple invitations using basic fixed expressions." },
  { id: "gse-33-x-1",  gse: 33, fn: "Interacting",  text: "Can decline offers using basic fixed expressions." },
  { id: "gse-34-x-3",  gse: 34, fn: "Interacting",  text: "Can respond to suggestions to do something using basic fixed expressions." },
  { id: "gse-34-x-4",  gse: 34, fn: "Interacting",  text: "Can agree or refuse to lend things using basic fixed expressions." },
  { id: "gse-35-x-1",  gse: 35, fn: "Interacting",  text: "Can refuse requests politely, using simple language." },


  // ── A2+ (GSE 36–42) ────────────────────────────────────────────────────

  // INF-12 micros
  { id: "gse-38-i-1",  gse: 38, fn: "Informing",    text: "Can describe very basic events in the past using simple linking words (e.g. \u2018then\u2019, \u2018next\u2019)." },
  { id: "gse-38-i-2",  gse: 38, fn: "Informing",    text: "Can ask and answer questions about basic plans and intentions." },
  { id: "gse-39-i-1",  gse: 39, fn: "Informing",    text: "Can talk about plans for the near future in a simple way." },
  { id: "gse-39-i-2",  gse: 39, fn: "Informing",    text: "Can describe plans and arrangements." },
  { id: "gse-40-i-1",  gse: 40, fn: "Informing",    text: "Can ask and answer questions about past times and past activities." },
  { id: "gse-42-i-1",  gse: 42, fn: "Informing",    text: "Can make simple predictions about the future." },
  { id: "gse-42-i-2",  gse: 42, fn: "Informing",    text: "Can make simple future arrangements and plans with reference to a diary or schedule." },

  // INF-13 micros
  { id: "gse-37-i-1",  gse: 37, fn: "Informing",    text: "Can make simple, direct comparisons between two people or things using common adjectives." },
  { id: "gse-40-i-2",  gse: 40, fn: "Informing",    text: "Can explain what they like or dislike about something." },
  { id: "gse-40-i-3",  gse: 40, fn: "Informing",    text: "Can say how they or someone else feels, giving brief reasons." },
  { id: "gse-41-i-1",  gse: 41, fn: "Informing",    text: "Can give the reasons for a choice, using simple language." },
  { id: "gse-42-i-3",  gse: 42, fn: "Informing",    text: "Can give a short, basic description of events and activities." },

  // INF-14 micros
  { id: "gse-37-i-2",  gse: 37, fn: "Informing",    text: "Can describe everyday activities in town (e.g. buying food at the supermarket, borrowing a book from the library) using simple language." },
  { id: "gse-38-i-3",  gse: 38, fn: "Informing",    text: "Can describe habits and routines." },
  { id: "gse-38-i-4",  gse: 38, fn: "Informing",    text: "Can ask and answer questions about habits and routines." },
  { id: "gse-40-i-4",  gse: 40, fn: "Informing",    text: "Can give a simple description of how to carry out an everyday process (e.g. a recipe)." },
  { id: "gse-41-i-2",  gse: 41, fn: "Informing",    text: "Can answer simple questions about work experience or education using simple language." },
  { id: "gse-36-i-1",  gse: 36, fn: "Informing",    text: "Can communicate in routine tasks requiring simple, direct exchanges of information." },

  // INT-5 micros
  { id: "gse-36-x-1",  gse: 36, fn: "Interacting",  text: "Can make small talk using simple language, given a model." },
  { id: "gse-37-x-1",  gse: 37, fn: "Interacting",  text: "Can answer simple questions and respond to simple statements in an interview." },
  { id: "gse-37-x-2",  gse: 37, fn: "Interacting",  text: "Can confirm information using some simple fixed expressions." },
  { id: "gse-40-x-1",  gse: 40, fn: "Interacting",  text: "Can ask for clarification about key words not understood, using fixed expressions." },
  { id: "gse-41-x-1",  gse: 41, fn: "Interacting",  text: "Can show interest in conversation using fixed expressions." },
  { id: "gse-41-x-2",  gse: 41, fn: "Interacting",  text: "Can participate in short conversations in routine contexts on topics of interest." },
  { id: "gse-41-x-3",  gse: 41, fn: "Interacting",  text: "Can check or clarify information using some simple fixed expressions." },

  // INT-6 micros
  { id: "gse-36-x-2",  gse: 36, fn: "Interacting",  text: "Can use simple, everyday polite forms of greeting and address." },
  { id: "gse-37-x-3",  gse: 37, fn: "Interacting",  text: "Can make an invitation including information about the time and location." },
  { id: "gse-40-x-2",  gse: 40, fn: "Interacting",  text: "Can respond to excuses using basic fixed expressions." },
  { id: "gse-40-x-3",  gse: 40, fn: "Interacting",  text: "Can ask for and give or refuse permission." },
  { id: "gse-41-x-4",  gse: 41, fn: "Interacting",  text: "Can make and respond to suggestions." },


  // ── B1 (GSE 43–50) ─────────────────────────────────────────────────────

  // INF-15 micros
  { id: "gse-43-i-1",  gse: 43, fn: "Informing",    text: "Can ask why someone thinks something, or how they think something would work." },
  { id: "gse-45-i-1",  gse: 45, fn: "Informing",    text: "Can give brief reasons and explanations, using simple language." },
  { id: "gse-45-i-2",  gse: 45, fn: "Informing",    text: "Can convey simple relevant information emphasising the most important point." },
  { id: "gse-45-i-3",  gse: 45, fn: "Informing",    text: "Can explain the meaning of a word or phrase using simple language." },
  { id: "gse-46-i-1",  gse: 46, fn: "Informing",    text: "Can make an aspect of an everyday topic clearer by providing simple examples." },
  { id: "gse-47-i-1",  gse: 47, fn: "Informing",    text: "Can ask a group member to give the reason(s) for their views." },

  // INF-16 micros
  { id: "gse-47-i-2",  gse: 47, fn: "Informing",    text: "Can enter unprepared into conversation on familiar topics (e.g. family, hobbies, work)." },
  { id: "gse-47-i-3",  gse: 47, fn: "Informing",    text: "Can describe events, real or imagined." },
  { id: "gse-47-i-4",  gse: 47, fn: "Informing",    text: "Can give straightforward descriptions on a variety of familiar subjects." },
  { id: "gse-48-i-1",  gse: 48, fn: "Informing",    text: "Can introduce a conversation topic with the present perfect and provide details in the past." },
  { id: "gse-50-i-1",  gse: 50, fn: "Informing",    text: "Can explain in some detail which character they most identified with and why." },
  { id: "gse-50-i-2",  gse: 50, fn: "Informing",    text: "Can explain why certain parts or aspects of a work especially interested them." },

  // INF-17 micros
  { id: "gse-46-i-2",  gse: 46, fn: "Informing",    text: "Can initiate, maintain and close simple, face-to-face conversations on familiar topics." },
  { id: "gse-46-i-3",  gse: 46, fn: "Informing",    text: "Can invite others to give their views on what to do next." },
  { id: "gse-47-i-5",  gse: 47, fn: "Informing",    text: "Can begin to use a repertoire of common idiomatic phrases in routine situations." },
  { id: "gse-47-i-6",  gse: 47, fn: "Informing",    text: "Can define the task in basic terms in a discussion and ask others to contribute their expertise and experience." },
  { id: "gse-49-i-1",  gse: 49, fn: "Informing",    text: "Can discuss everyday, practical issues when the conversation is conducted slowly and clearly." },
  { id: "gse-50-i-3",  gse: 50, fn: "Informing",    text: "Can carry out a simple informal interview." },

  // INF-18 micros
  { id: "gse-47-i-7",  gse: 47, fn: "Informing",    text: "Can invite other people in a group to contribute their views." },
  { id: "gse-49-i-2",  gse: 49, fn: "Informing",    text: "Can respond in a simple way to verbal challenge or aggression." },
  { id: "gse-50-i-4",  gse: 50, fn: "Informing",    text: "Can take some initiative in an interview, but is generally very dependent on interviewer." },
  { id: "gse-45-i-4",  gse: 45, fn: "Informing",    text: "Can convey simple information of immediate relevance and emphasise the main point." },

  // INT-7 micros
  { id: "gse-45-x-1",  gse: 45, fn: "Interacting",  text: "Can give an opinion when asked directly, provided they can ask for repetition." },
  { id: "gse-45-x-2",  gse: 45, fn: "Interacting",  text: "Can express belief, opinion, agreement and disagreement politely." },
  { id: "gse-45-x-3",  gse: 45, fn: "Interacting",  text: "Can respond to an offer or suggestion, expressing enthusiasm." },
  { id: "gse-45-x-4",  gse: 45, fn: "Interacting",  text: "Can make an apology with brief excuses or reasons." },
  { id: "gse-44-x-1",  gse: 44, fn: "Interacting",  text: "Can collaborate in simple, shared tasks and work towards a common goal in a group by asking and answering straightforward questions." },
  { id: "gse-48-x-1",  gse: 48, fn: "Interacting",  text: "Can make an invitation using formal language." },

  // INT-8 micros
  { id: "gse-44-x-2",  gse: 44, fn: "Interacting",  text: "Can use fixed expressions to keep a conversation going (e.g. \u2018I see.\u2019, \u2018right\u2019)." },
  { id: "gse-50-x-1",  gse: 50, fn: "Interacting",  text: "Can demonstrate their understanding of the key issues in a disagreement on a topic familiar to them and make simple requests for confirmation and/or clarification." },
  { id: "gse-50-x-2",  gse: 50, fn: "Interacting",  text: "Can ask someone to clarify or elaborate what they have just said." },
  { id: "gse-50-x-3",  gse: 50, fn: "Interacting",  text: "Can repeat part of what someone has said to confirm mutual understanding and help keep the development of ideas on course." },


  // ── B1+ (GSE 51–58) ────────────────────────────────────────────────────

  // INF-19 micros
  { id: "gse-52-i-1",  gse: 52, fn: "Informing",    text: "Can discuss the main points of news stories about familiar topics." },
  { id: "gse-52-i-2",  gse: 52, fn: "Informing",    text: "Can speak in general terms about environmental problems." },
  { id: "gse-55-i-1",  gse: 55, fn: "Informing",    text: "Can explain why something is a problem." },
  { id: "gse-55-i-2",  gse: 55, fn: "Informing",    text: "Can explain the main points in an idea or problem with reasonable precision." },
  { id: "gse-55-i-3",  gse: 55, fn: "Informing",    text: "Can report factual information given by other people." },
  { id: "gse-56-i-1",  gse: 56, fn: "Informing",    text: "Can give brief comments on the views of others." },

  // INF-20 micros
  { id: "gse-53-i-1",  gse: 53, fn: "Informing",    text: "Can define the features of something concrete for which they can\u2019t remember the word." },
  { id: "gse-54-i-1",  gse: 54, fn: "Informing",    text: "Can make an aspect of an everyday topic clearer and more explicit by conveying the main information in another way." },
  { id: "gse-55-i-4",  gse: 55, fn: "Informing",    text: "Can use synonyms to describe or gloss an unknown word." },
  { id: "gse-58-i-1",  gse: 58, fn: "Informing",    text: "Can ask a question in a different way if misunderstood." },
  { id: "gse-56-i-2",  gse: 56, fn: "Informing",    text: "Can use questions, comments and simple reformulations to maintain the focus of a discussion." },

  // INF-21 micros
  { id: "gse-52-i-3",  gse: 52, fn: "Informing",    text: "Can use a suitable phrase to invite others into a discussion." },
  { id: "gse-53-i-2",  gse: 53, fn: "Informing",    text: "Can use a basic repertoire of conversation strategies to maintain a discussion." },
  { id: "gse-56-i-3",  gse: 56, fn: "Informing",    text: "Can organise the work in a straightforward collaborative task by stating the aim and explaining in a simple manner the main issue that needs to be resolved." },
  { id: "gse-57-i-1",  gse: 57, fn: "Informing",    text: "Can ask people to elaborate on specific points they made in their initial explanation." },
  { id: "gse-58-i-2",  gse: 58, fn: "Informing",    text: "Can tell someone about a discussion or conversation in some detail." },

  // INT-9 micros
  { id: "gse-51-x-1",  gse: 51, fn: "Interacting",  text: "Can express and respond to feelings (e.g. surprise, happiness, interest, indifference)." },
  { id: "gse-51-x-2",  gse: 51, fn: "Interacting",  text: "Can respond to opinions expressed by others." },
  { id: "gse-51-x-3",  gse: 51, fn: "Interacting",  text: "Can express opinions and react to practical suggestions of where to go, what to do, etc." },
  { id: "gse-54-x-1",  gse: 54, fn: "Interacting",  text: "Can make excuses using a range of polite forms." },
  { id: "gse-55-x-1",  gse: 55, fn: "Interacting",  text: "Can respond to ideas and suggestions in informal discussions." },
  { id: "gse-55-x-2",  gse: 55, fn: "Interacting",  text: "Can politely interrupt during a formal conversation, using fixed expressions." },
  { id: "gse-56-x-1",  gse: 56, fn: "Interacting",  text: "Can decline offers politely using a range of formal and informal expressions." },

  // INT-10 micros
  { id: "gse-52-x-1",  gse: 52, fn: "Interacting",  text: "Can repeat back what is said to confirm understanding and keep a discussion on course." },
  { id: "gse-55-x-3",  gse: 55, fn: "Interacting",  text: "Can ask appropriate questions to check understanding of concepts that have been explained." },
  { id: "gse-55-x-4",  gse: 55, fn: "Interacting",  text: "Can generally follow most of what is said and repeat back details to confirm understanding." },
  { id: "gse-55-x-5",  gse: 55, fn: "Interacting",  text: "Can ask for clarification of an unknown acronym or technical term used in conversation." },
  { id: "gse-56-x-2",  gse: 56, fn: "Interacting",  text: "Can ask for confirmation of understanding during a live discussion or presentation." },
  { id: "gse-57-x-1",  gse: 57, fn: "Interacting",  text: "Can carry out a prepared interview, checking and confirming information as necessary." },
  { id: "gse-58-x-1",  gse: 58, fn: "Interacting",  text: "Can ask questions to invite people to clarify their reasoning." },


  // ── B2+ (GSE 67–75) ────────────────────────────────────────────────────

  // INF-26 micros
  { id: "gse-69-i-1",  gse: 69, fn: "Informing",    text: "Can present factual information in an objective way in extended spoken discourse." },
  { id: "gse-70-i-1",  gse: 70, fn: "Informing",    text: "Can talk about hypothetical events and actions, and their possible consequences." },
  { id: "gse-70-i-2",  gse: 70, fn: "Informing",    text: "Can ask detailed questions in discussions on contemporary social issues and current affairs." },
  { id: "gse-70-i-3",  gse: 70, fn: "Informing",    text: "Can state clearly the limits to a concession." },
  { id: "gse-74-i-1",  gse: 74, fn: "Informing",    text: "Can answer questions in a survey using linguistically complex language." },

  // INF-27 micros
  { id: "gse-68-i-1",  gse: 68, fn: "Informing",    text: "Can emphasise a point in a conversation using rhetorical questions." },
  { id: "gse-69-i-2",  gse: 69, fn: "Informing",    text: "Can use hyperbole to emphasise a point (e.g. \u2018It\u2019s going to take me years to do this.\u2019)." },
  { id: "gse-70-i-4",  gse: 70, fn: "Informing",    text: "Can make a specific, complex piece of information in their field clearer and more explicit for others by paraphrasing it in simpler language." },
  { id: "gse-72-i-1",  gse: 72, fn: "Informing",    text: "Can shift between formal and informal registers as and when required." },
  { id: "gse-73-i-1",  gse: 73, fn: "Informing",    text: "Can explain technical topics within their field, using suitably non-technical language for a recipient who does not have specialist knowledge." },

  // INF-28 micros
  { id: "gse-67-i-1",  gse: 67, fn: "Informing",    text: "Can use a suitable phrase to intervene in a discussion on a familiar topic." },
  { id: "gse-67-i-2",  gse: 67, fn: "Informing",    text: "Can adjust to the changes of direction, style and emphasis normally found in conversation." },
  { id: "gse-67-i-3",  gse: 67, fn: "Informing",    text: "Can encourage members of a group to describe and elaborate on their thinking." },
  { id: "gse-67-i-4",  gse: 67, fn: "Informing",    text: "Can highlight the main issue that needs to be resolved in a complex task and the important aspects that need to be taken into account." },
  { id: "gse-69-i-3",  gse: 69, fn: "Informing",    text: "Can encourage members of a group to build on one another\u2019s information and ideas to come up with a concept or solution." },
  { id: "gse-69-i-4",  gse: 69, fn: "Informing",    text: "Can comment tactfully on other people\u2019s contributions to a discussion." },
  { id: "gse-75-i-1",  gse: 75, fn: "Informing",    text: "Can manage discussions to ensure that they are based on facts and evidence rather than speculation." },

  // INT-13 micros
  { id: "gse-68-x-1",  gse: 68, fn: "Interacting",  text: "Can initiate, maintain and end discourse naturally with effective turn-taking." },
  { id: "gse-69-x-1",  gse: 69, fn: "Interacting",  text: "Can politely avoid answering a question without making it obvious to the listener." },
  { id: "gse-70-x-1",  gse: 70, fn: "Interacting",  text: "Can politely bring a discussion back to the main point when the participants have gone off topic." },

  // INT-14 micros
  { id: "gse-69-x-2",  gse: 69, fn: "Interacting",  text: "Can clarify misunderstandings and misinterpretations during intercultural encounters, suggesting how things were actually meant in order to clear the air and move the discussion forward." },
  { id: "gse-73-x-1",  gse: 73, fn: "Interacting",  text: "Can contribute to collaborative decision making and problem solving, expressing and co-developing ideas, explaining details and making suggestions for future action." },


  // ── C1 (GSE 76–84) ─────────────────────────────────────────────────────

  // INF-29 micros
  { id: "gse-79-i-1",  gse: 79, fn: "Informing",    text: "Can contribute fluently and naturally to a conversation about a complex or abstract topic." },
  { id: "gse-81-i-1",  gse: 81, fn: "Informing",    text: "Can join a conversation already in progress between fluent speakers on complex topics." },
  { id: "gse-81-i-2",  gse: 81, fn: "Informing",    text: "Can manage the participants in a fast-moving discussion to keep it on course." },
  { id: "gse-77-i-1",  gse: 77, fn: "Informing",    text: "Can comment on and discuss a linguistically complex text." },

  // INF-30 micros
  { id: "gse-76-i-1",  gse: 76, fn: "Informing",    text: "Can explain technical terminology and difficult concepts when communicating with non-experts about matters within their field of specialisation." },
  { id: "gse-76-i-2",  gse: 76, fn: "Informing",    text: "Can make the main points contained in a complex text more accessible to the target audience by adding redundancy, explaining and modifying style and register." },
  { id: "gse-79-i-2",  gse: 79, fn: "Informing",    text: "Can facilitate understanding of a complex issue by highlighting and categorising the main points, presenting them in a logically connected pattern, and reinforcing the message by repeating the key aspects in different ways." },
  { id: "gse-82-i-1",  gse: 82, fn: "Informing",    text: "Can adapt their language (e.g. syntax, idiomaticity, jargon) in order to make a complex specialist topic accessible to recipients who are not familiar with it." },
  { id: "gse-83-i-1",  gse: 83, fn: "Informing",    text: "Can make complex, challenging content more accessible by explaining difficult aspects more explicitly and adding helpful detail." },

  // INF-31 micros
  { id: "gse-79-i-3",  gse: 79, fn: "Informing",    text: "Can highlight inconsistencies in thinking, and challenge others\u2019 ideas in the process of trying to reach a consensus." },
  { id: "gse-80-i-1",  gse: 80, fn: "Informing",    text: "Can use a wide range of persuasive techniques in presentations and discussions to encourage others to take a course of action." },
  { id: "gse-80-i-2",  gse: 80, fn: "Informing",    text: "Can develop the interaction and tactfully help steer it towards a conclusion." },
  { id: "gse-82-i-2",  gse: 82, fn: "Informing",    text: "Can intervene diplomatically in order to redirect discussion, prevent one person dominating or confront disruptive behaviour." },
  { id: "gse-83-i-2",  gse: 83, fn: "Informing",    text: "Can recognise undercurrents in interaction and take appropriate steps to guide the direction of discussion." },

  // INF-32 micros
  { id: "gse-76-i-3",  gse: 76, fn: "Informing",    text: "Can substitute an equivalent term for a word they can\u2019t recall so smoothly that it isn\u2019t noticeable." },
  { id: "gse-76-i-4",  gse: 76, fn: "Informing",    text: "Can describe the details of problem-solution relationships using a range of linguistic devices." },
  { id: "gse-79-i-4",  gse: 79, fn: "Informing",    text: "Can frame a discussion to decide on a course of action with a partner or group, reporting on what others have said, summarising, elaborating and weighing up multiple points of view." },

  // INT-15 micros
  { id: "gse-76-x-1",  gse: 76, fn: "Interacting",  text: "Can contribute to group discussions even when speech is fast and colloquial." },
  { id: "gse-77-x-1",  gse: 77, fn: "Interacting",  text: "Can rephrase controversial statements into more neutral language." },
  { id: "gse-79-x-1",  gse: 79, fn: "Interacting",  text: "Can participate in linguistically complex discussions about attitudes and opinions." },
  { id: "gse-80-x-1",  gse: 80, fn: "Interacting",  text: "Can reformulate what they want to say during a conversation or discussion using linguistically complex language." },
  { id: "gse-80-x-2",  gse: 80, fn: "Interacting",  text: "Can participate in a fast-paced conversation with fluent speakers." },


  // ── C2 (GSE 85–90) ─────────────────────────────────────────────────────

  // INF-33 micros
  { id: "gse-85-i-1",  gse: 85, fn: "Informing",    text: "Can give detailed advice on a wide range of subjects using linguistically complex language." },
  { id: "gse-86-i-1",  gse: 86, fn: "Informing",    text: "Can talk about an industry using technical terms and linguistically complex language." },
  { id: "gse-86-i-2",  gse: 86, fn: "Informing",    text: "Can introduce complex concepts (e.g. scientific notions) by providing extended definitions and explanations that draw on assumed previous knowledge." },
  { id: "gse-87-i-1",  gse: 87, fn: "Informing",    text: "Can convey finer shades of meaning precisely by accurately using a wide range of modification devices." },
  { id: "gse-90-i-1",  gse: 90, fn: "Informing",    text: "Can recognise the finer subtleties of nuanced language, rhetorical effect and stylistic language use (e.g. metaphors, abnormal syntax, ambiguity), interpreting and \u201Cunpacking\u201D meanings and connotations." },

  // INF-34 micros
  { id: "gse-85-i-2",  gse: 85, fn: "Informing",    text: "Can guide a sensitive discussion effectively, identifying nuances and undercurrents." },
  { id: "gse-85-i-3",  gse: 85, fn: "Informing",    text: "Can take on different roles according to the needs of the participants and requirements of the activity (resource person, mediator, supervisor, etc.) and provide appropriate individualised support." },
  { id: "gse-87-i-2",  gse: 87, fn: "Informing",    text: "Can effectively lead the development of ideas in a discussion of complex abstract topics, giving direction by targeting questions and encouraging others to elaborate on their reasoning." },
  { id: "gse-90-i-2",  gse: 90, fn: "Informing",    text: "Can deal tactfully with a disruptive participant, framing any remarks diplomatically in relation to the situation and cultural perceptions." },
  { id: "gse-90-i-3",  gse: 90, fn: "Informing",    text: "Can facilitate understanding of a complex issue by explaining the relationship of parts to the whole and encourage different ways of approaching it." },

  // INT-16 micros
  { id: "gse-87-x-1",  gse: 87, fn: "Interacting",  text: "Can take part in discussions on political or social issues using linguistically complex language." },
  { id: "gse-88-x-1",  gse: 88, fn: "Interacting",  text: "Can clarify points they are trying to make in an academic discussion, using linguistically complex language." },


  // ── B2 (GSE 59–66) ─────────────────────────────────────────────────────

  // INF-22 micros
  { id: "gse-59-i-1",  gse: 59, fn: "Informing",    text: "Can discuss options and possible actions." },
  { id: "gse-59-i-2",  gse: 59, fn: "Informing",    text: "Can exchange information on a wide range of topics within their field with some confidence." },
  { id: "gse-59-i-3",  gse: 59, fn: "Informing",    text: "Can describe the plot of a book or film in some detail." },
  { id: "gse-60-i-1",  gse: 60, fn: "Informing",    text: "Can bring relevant personal experiences into a conversation to illustrate a point." },
  { id: "gse-61-i-1",  gse: 61, fn: "Informing",    text: "Can engage in extended conversation in a clearly participatory fashion on most general topics." },
  { id: "gse-61-i-2",  gse: 61, fn: "Informing",    text: "Can give detailed answers to questions in a face-to-face survey." },

  // INF-23 micros
  { id: "gse-63-i-1",  gse: 63, fn: "Informing",    text: "Can give a clear, detailed spoken description of how to carry out a procedure." },
  { id: "gse-64-i-1",  gse: 64, fn: "Informing",    text: "Can make a complicated process easier to understand by breaking it down into a series of smaller steps." },
  { id: "gse-66-i-1",  gse: 66, fn: "Informing",    text: "Can explain a new concept or procedure by comparing and contrasting it to one that people are already familiar with." },
  { id: "gse-66-i-2",  gse: 66, fn: "Informing",    text: "Can make concepts on subjects in their fields of interest more accessible by giving concrete examples, recapitulating step by step and repeating the main points." },
  { id: "gse-66-i-3",  gse: 66, fn: "Informing",    text: "Can give clear, detailed descriptions on a wide range of familiar subjects." },

  // INF-24 micros
  { id: "gse-63-i-2",  gse: 63, fn: "Informing",    text: "Can introduce a new perspective on the topic of a discussion." },
  { id: "gse-63-i-3",  gse: 63, fn: "Informing",    text: "Can introduce a new topic during a formal discussion." },
  { id: "gse-66-i-4",  gse: 66, fn: "Informing",    text: "Can build on people\u2019s ideas and link them into coherent lines of thinking." },
  { id: "gse-66-i-5",  gse: 66, fn: "Informing",    text: "Can outline an issue or problem clearly." },
  { id: "gse-66-i-6",  gse: 66, fn: "Informing",    text: "Can introduce new information during a formal discussion or presentation." },
  { id: "gse-62-i-1",  gse: 62, fn: "Informing",    text: "Can ask questions to stimulate discussion on how to organise collaborative work." },

  // INF-25 micros
  { id: "gse-60-i-2",  gse: 60, fn: "Informing",    text: "Can make new information more accessible by using repetition and adding illustrations." },
  { id: "gse-60-i-3",  gse: 60, fn: "Informing",    text: "Can correct mistakes if they have led to misunderstandings." },
  { id: "gse-64-i-2",  gse: 64, fn: "Informing",    text: "Can fluently substitute an equivalent term for a word they can\u2019t recall." },
  { id: "gse-64-i-3",  gse: 64, fn: "Informing",    text: "Can use stock phrases to gain time and keep the turn whilst formulating what to say." },
  { id: "gse-64-i-4",  gse: 64, fn: "Informing",    text: "Can plan what is to be said and the means to say it, considering the effect on the recipient." },
  { id: "gse-65-i-1",  gse: 65, fn: "Informing",    text: "Can make accessible for others the main contents of a text on a subject of interest (e.g. an essay, a forum discussion, a presentation) by paraphrasing in simpler language." },

  // INT-11 micros
  { id: "gse-60-x-1",  gse: 60, fn: "Interacting",  text: "Can take part in routine formal discussions conducted in clear standard speech in which factual information is exchanged." },
  { id: "gse-60-x-2",  gse: 60, fn: "Interacting",  text: "Can show interest and appreciation in conversation using a range of expressions." },
  { id: "gse-65-x-1",  gse: 65, fn: "Interacting",  text: "Can manage discussion on familiar topics confirming comprehension, inviting others in, etc." },
  { id: "gse-66-x-1",  gse: 66, fn: "Interacting",  text: "Can contribute to a conversation fluently and naturally, provided the topic is not too abstract or complex." },

  // INT-12 micros
  { id: "gse-61-x-1",  gse: 61, fn: "Interacting",  text: "Can respond to clearly expressed questions on a presentation they have given." },
  { id: "gse-61-x-2",  gse: 61, fn: "Interacting",  text: "Can describe what they would do and how they would react to situations in a text." },
  { id: "gse-62-x-1",  gse: 62, fn: "Interacting",  text: "Can encourage discussion by inviting others to join in, say what they think, etc." },
  { id: "gse-62-x-2",  gse: 62, fn: "Interacting",  text: "Can make a formal apology with detailed excuses or reasons." },
];


// ═════════════════════════════════════════════════════════════════════════════
// 5. AZE MACRO DESCRIPTORS (assessable layer)
//
// These are what you actually SCORE as CAN / NOT_YET / NOT_TESTED.
// Each macro bundles several GSE micros and has example probes.
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [

  // ── Pre-A1 ──────────────────────────────────────────────────────────────

  {
    azeId: "INF-1",
    claim: "Can provide basic personal identity information when asked simple direct questions",
    fn: "Informing",
    level: "PRE_A1",
    microIds: ["gse-10-i-1", "gse-12-i-1", "gse-18-i-1", "gse-19-i-1", "gse-20-i-1", "gse-12-x-1"],
    probes: [
      "What is your name?",
      "Where are you from?",
      "What do you do?",
    ],
    notes: "Response-based only. AI asks direct questions; candidate responds with isolated words or memorised phrases.",
  },
  {
    azeId: "INF-2",
    claim: "Can provide basic factual information involving numbers, times, and dates",
    fn: "Informing",
    level: "PRE_A1",
    microIds: ["gse-16-i-1", "gse-17-i-1", "gse-19-i-2"],
    probes: [
      "What time is it now?",
      "What is your phone number?",
      "What is today\u2019s date?",
    ],
  },
  {
    azeId: "INF-3",
    claim: "Can use basic vocabulary to identify, name, and describe familiar things",
    fn: "Informing",
    level: "PRE_A1",
    microIds: ["gse-17-i-2", "gse-18-i-2", "gse-15-i-1", "gse-21-i-1"],
    probes: [
      "What can you see in this picture?",
      "What things do you have in your bag?",
      "What would you like to eat or drink?",
    ],
  },
  {
    azeId: "INT-1",
    claim: "Can manage basic social interaction using greetings, politeness, and simple repair",
    fn: "Interacting",
    level: "PRE_A1",
    microIds: ["gse-12-x-2", "gse-12-x-3", "gse-19-x-1", "gse-21-i-2"],
    probes: [
      "Hello, how are you today?",
      "AI speaks too fast or unclearly to test repair",
    ],
    notes: "Observe greeting behaviour, politeness markers, and whether candidate asks for repetition when needed.",
  },

  // ── A1 ──────────────────────────────────────────────────────────────────

  {
    azeId: "INF-4",
    claim: "Can describe themselves, their family, and people they know using simple phrases",
    fn: "Informing",
    level: "A1",
    microIds: ["gse-22-i-1", "gse-26-i-1", "gse-27-i-1", "gse-28-i-1", "gse-29-i-1", "gse-28-i-2"],
    probes: [
      "Tell me about your family.",
      "Where do you live? What is it like?",
      "Do you have brothers or sisters? What do they do?",
    ],
  },
  {
    azeId: "INF-5",
    claim: "Can describe familiar objects, places, and surroundings using basic language",
    fn: "Informing",
    level: "A1",
    microIds: ["gse-22-i-2", "gse-23-i-1", "gse-24-i-1", "gse-28-i-3", "gse-28-i-4", "gse-29-i-2"],
    probes: [
      "What is the weather like today?",
      "Can you describe your home?",
      "What is on the table in front of you?",
    ],
  },
  {
    azeId: "INF-6",
    claim: "Can answer simple questions about daily life, habits, and routines",
    fn: "Informing",
    level: "A1",
    microIds: ["gse-25-i-1", "gse-28-i-5", "gse-29-i-3", "gse-29-i-4", "gse-29-i-5"],
    probes: [
      "What do you do every morning?",
      "What do you like to do on the weekend?",
      "What is your favourite thing?",
    ],
  },
  {
    azeId: "INF-7",
    claim: "Can give basic time and date information with some detail",
    fn: "Informing",
    level: "A1",
    microIds: ["gse-22-i-3", "gse-24-i-2", "gse-24-i-3", "gse-25-i-2"],
    probes: [
      "When is your birthday?",
      "What time do you usually wake up?",
      "When did you last go on holiday?",
    ],
  },
  {
    azeId: "INT-2",
    claim: "Can introduce themselves and others, and manage basic social exchanges",
    fn: "Interacting",
    level: "A1",
    microIds: ["gse-22-x-1", "gse-23-x-1", "gse-24-x-1", "gse-26-x-1", "gse-26-x-2", "gse-28-x-1", "gse-29-x-1"],
    probes: [
      "Nice to meet you. Can you tell me about yourself?",
      "Imagine your friend is here. Can you introduce them to me?",
    ],
  },

  // ── A2 ──────────────────────────────────────────────────────────────────

  {
    azeId: "INF-8",
    claim: "Can describe their life, home, work, and education using simple connected language",
    fn: "Informing",
    level: "A2",
    microIds: ["gse-30-i-1", "gse-31-i-1", "gse-32-i-1", "gse-33-i-1", "gse-33-i-2", "gse-33-i-3", "gse-35-i-1"],
    probes: [
      "Tell me about where you grew up.",
      "Can you describe your home?",
      "What is your workplace or school like?",
    ],
  },
  {
    azeId: "INF-9",
    claim: "Can describe people, appearance, and everyday activities in simple terms",
    fn: "Informing",
    level: "A2",
    microIds: ["gse-30-i-2", "gse-31-i-2", "gse-33-i-4", "gse-34-i-1", "gse-34-i-2", "gse-34-i-3"],
    probes: [
      "Can you describe your best friend?",
      "What does a typical day look like for you?",
      "What are you good at?",
    ],
  },
  {
    azeId: "INF-10",
    claim: "Can exchange simple information and respond to straightforward questions on familiar topics",
    fn: "Informing",
    level: "A2",
    microIds: ["gse-30-i-3", "gse-33-i-5", "gse-34-i-4", "gse-34-i-5", "gse-35-i-2", "gse-35-i-3"],
    probes: [
      "What do you think about \u2026?",
      "Did you enjoy that? Why or why not?",
      "Can you tell me more about \u2026?",
    ],
  },
  {
    azeId: "INF-11",
    claim: "Can give simple descriptions of places and basic directions",
    fn: "Informing",
    level: "A2",
    microIds: ["gse-31-i-3", "gse-31-i-4", "gse-32-i-2", "gse-33-i-6", "gse-33-i-7", "gse-34-i-6"],
    probes: [
      "How do you get from your home to work or school?",
      "Can you describe your neighbourhood?",
      "What did you do yesterday?",
    ],
  },
  {
    azeId: "INT-3",
    claim: "Can manage simple conversational exchanges including clarification and repair",
    fn: "Interacting",
    level: "A2",
    microIds: ["gse-30-x-1", "gse-30-x-2", "gse-32-x-1", "gse-34-x-1", "gse-34-x-2"],
    probes: [
      "AI deliberately speaks slightly unclear to test repair",
      "What do you think we should do?",
    ],
    notes: "Observe whether candidate asks for clarification, shows understanding, and can respond to simple statements.",
  },
  {
    azeId: "INT-4",
    claim: "Can handle basic social functions: invitations, apologies, offers, and refusals",
    fn: "Interacting",
    level: "A2",
    microIds: ["gse-31-x-1", "gse-31-x-2", "gse-33-x-1", "gse-34-x-3", "gse-34-x-4", "gse-35-x-1"],
    probes: [
      "Would you like to come to a party on Saturday?",
      "Can I borrow your pen?",
      "I\u2019m sorry I was late. (observe response)",
    ],
  },

  // ── A2+ ─────────────────────────────────────────────────────────────────

  {
    azeId: "INF-12",
    claim: "Can describe past events and future plans using simple language with basic linking",
    fn: "Informing",
    level: "A2_PLUS",
    microIds: ["gse-38-i-1", "gse-38-i-2", "gse-39-i-1", "gse-39-i-2", "gse-40-i-1", "gse-42-i-1", "gse-42-i-2"],
    probes: [
      "What did you do last weekend?",
      "What are your plans for the holidays?",
      "What do you think will happen next year?",
    ],
  },
  {
    azeId: "INF-13",
    claim: "Can make simple comparisons and give reasons for choices and preferences",
    fn: "Informing",
    level: "A2_PLUS",
    microIds: ["gse-37-i-1", "gse-40-i-2", "gse-40-i-3", "gse-41-i-1", "gse-42-i-3"],
    probes: [
      "Which do you prefer, X or Y? Why?",
      "Why did you choose to study/work in \u2026?",
      "How did that make you feel?",
    ],
  },
  {
    azeId: "INF-14",
    claim: "Can describe everyday processes, habits, and routines with some detail",
    fn: "Informing",
    level: "A2_PLUS",
    microIds: ["gse-37-i-2", "gse-38-i-3", "gse-38-i-4", "gse-40-i-4", "gse-41-i-2", "gse-36-i-1"],
    probes: [
      "How do you usually spend your evenings?",
      "Can you explain how to make your favourite food?",
      "What is your work or study experience?",
    ],
  },
  {
    azeId: "INT-5",
    claim: "Can maintain a simple conversation, including small talk, clarification, and responding to others",
    fn: "Interacting",
    level: "A2_PLUS",
    microIds: ["gse-36-x-1", "gse-37-x-1", "gse-37-x-2", "gse-40-x-1", "gse-41-x-1", "gse-41-x-2", "gse-41-x-3"],
    probes: [
      "Nice weather today, isn\u2019t it?",
      "AI uses an unfamiliar word to test clarification",
    ],
    notes: "Observe small talk ability, interest signals (oh really?, that\u2019s nice), and clarification requests.",
  },
  {
    azeId: "INT-6",
    claim: "Can manage social functions: permissions, invitations, suggestions, and confirmations",
    fn: "Interacting",
    level: "A2_PLUS",
    microIds: ["gse-36-x-2", "gse-37-x-3", "gse-40-x-2", "gse-40-x-3", "gse-41-x-4"],
    probes: [
      "Can I use your phone for a moment?",
      "I\u2019m sorry, I can\u2019t come because \u2026 (observe response)",
      "What should we do this evening?",
    ],
  },

  // ── B1 ──────────────────────────────────────────────────────────────────

  {
    azeId: "INF-15",
    claim: "Can give reasons and explanations for opinions and actions using simple language",
    fn: "Informing",
    level: "B1",
    microIds: ["gse-43-i-1", "gse-45-i-1", "gse-45-i-2", "gse-45-i-3", "gse-46-i-1", "gse-47-i-1"],
    probes: [
      "Why do you think that is?",
      "Can you give me an example?",
      "What do you mean by \u2026?",
    ],
  },
  {
    azeId: "INF-16",
    claim: "Can describe events and give straightforward descriptions on familiar subjects",
    fn: "Informing",
    level: "B1",
    microIds: ["gse-47-i-2", "gse-47-i-3", "gse-47-i-4", "gse-48-i-1", "gse-50-i-1", "gse-50-i-2"],
    probes: [
      "Tell me about something interesting that happened to you recently.",
      "What\u2019s the last film you watched? What was it about?",
      "AI switches topic unexpectedly to test unprepared conversation",
    ],
  },
  {
    azeId: "INF-17",
    claim: "Can initiate and maintain a face-to-face conversation on familiar topics",
    fn: "Informing",
    level: "B1",
    microIds: ["gse-46-i-2", "gse-46-i-3", "gse-47-i-5", "gse-47-i-6", "gse-49-i-1", "gse-50-i-3"],
    probes: [
      "What would you like to talk about?",
      "What do you think we should do about \u2026?",
      "AI pauses to see if candidate initiates",
    ],
    notes: "This macro tests whether the candidate can drive conversation, not just respond. Look for initiative.",
  },
  {
    azeId: "INF-18",
    claim: "Can respond to challenge and use appropriate tense forms to connect past and present",
    fn: "Informing",
    level: "B1",
    microIds: ["gse-47-i-7", "gse-49-i-2", "gse-50-i-4", "gse-45-i-4"],
    probes: [
      "But don\u2019t you think that \u2026?",
      "Some people would say the opposite. What do you think?",
      "How has that changed since you started?",
    ],
  },
  {
    azeId: "INT-7",
    claim: "Can express and respond to opinions, agreement, and disagreement politely",
    fn: "Interacting",
    level: "B1",
    microIds: ["gse-45-x-1", "gse-45-x-2", "gse-45-x-3", "gse-45-x-4", "gse-44-x-1", "gse-48-x-1"],
    probes: [
      "AI states an opinion for candidate to react to",
      "I think X is better than Y. Do you agree?",
      "Would you like to join us for dinner on Friday?",
    ],
  },
  {
    azeId: "INT-8",
    claim: "Can confirm understanding, request clarification, and keep a conversation on track",
    fn: "Interacting",
    level: "B1",
    microIds: ["gse-44-x-2", "gse-50-x-1", "gse-50-x-2", "gse-50-x-3"],
    probes: [
      "AI gives a complex statement to test comprehension checks",
      "AI says something slightly confusing to test clarification",
    ],
    notes: "Observe discourse markers (I see, right, so you mean\u2026), clarification requests, and echoing.",
  },

  // ── B1+ ─────────────────────────────────────────────────────────────────

  {
    azeId: "INF-19",
    claim: "Can explain problems, ideas, and main points with reasonable precision",
    fn: "Informing",
    level: "B1_PLUS",
    microIds: ["gse-52-i-1", "gse-52-i-2", "gse-55-i-1", "gse-55-i-2", "gse-55-i-3", "gse-56-i-1"],
    probes: [
      "What do you think is the biggest problem facing your city?",
      "Can you explain what the main issue is?",
      "Someone told me that \u2026 \u2014 what do you think about that?",
    ],
  },
  {
    azeId: "INF-20",
    claim: "Can rephrase, reformulate, and use synonyms to maintain communication when faced with gaps",
    fn: "Informing",
    level: "B1_PLUS",
    microIds: ["gse-53-i-1", "gse-54-i-1", "gse-55-i-4", "gse-58-i-1", "gse-56-i-2"],
    probes: [
      "AI pretends not to understand to test rephrasing",
      "What\u2019s another way to say that?",
      "I\u2019m not sure what you mean. Can you explain it differently?",
    ],
    notes: "Key diagnostic for B1+ vs B1. Look for paraphrase, circumlocution, and flexible reformulation.",
  },
  {
    azeId: "INF-21",
    claim: "Can report on discussions, maintain focus, and organise collaborative tasks",
    fn: "Informing",
    level: "B1_PLUS",
    microIds: ["gse-52-i-3", "gse-53-i-2", "gse-56-i-3", "gse-57-i-1", "gse-58-i-2"],
    probes: [
      "Can you tell me about a discussion you had recently?",
      "How would you organise this activity for a group?",
      "Can you explain that point in more detail?",
    ],
  },
  {
    azeId: "INT-9",
    claim: "Can express and respond to feelings, opinions, and suggestions in discussion",
    fn: "Interacting",
    level: "B1_PLUS",
    microIds: ["gse-51-x-1", "gse-51-x-2", "gse-51-x-3", "gse-54-x-1", "gse-55-x-1", "gse-55-x-2", "gse-56-x-1"],
    probes: [
      "How did that make you feel?",
      "I suggest we do X. What do you think?",
      "Actually, I don\u2019t think that\u2019s quite right \u2014 (observe reaction)",
    ],
  },
  {
    azeId: "INT-10",
    claim: "Can check understanding, ask for clarification, and confirm information during conversation",
    fn: "Interacting",
    level: "B1_PLUS",
    microIds: ["gse-52-x-1", "gse-55-x-3", "gse-55-x-4", "gse-55-x-5", "gse-56-x-2", "gse-57-x-1", "gse-58-x-1"],
    probes: [
      "AI uses a technical term or acronym to test clarification request",
      "AI gives a complex explanation to test whether candidate confirms understanding",
    ],
    notes: "Observe: \u2018So you\u2019re saying\u2026\u2019, \u2018What does X mean?\u2019, \u2018Let me check I understand\u2026\u2019",
  },

  // ── B2 ──────────────────────────────────────────────────────────────────

  {
    azeId: "INF-22",
    claim: "Can engage in extended conversation and exchange information confidently on a wide range of topics",
    fn: "Informing",
    level: "B2",
    microIds: ["gse-59-i-1", "gse-59-i-2", "gse-59-i-3", "gse-60-i-1", "gse-61-i-1", "gse-61-i-2"],
    probes: [
      "Let\u2019s talk about \u2026. What are the options?",
      "Can you tell me about a book or film you enjoyed? What happened in it?",
      "Can you give me an example from your own experience?",
    ],
  },
  {
    azeId: "INF-23",
    claim: "Can give clear, detailed descriptions and break down complex information for others",
    fn: "Informing",
    level: "B2",
    microIds: ["gse-63-i-1", "gse-64-i-1", "gse-66-i-1", "gse-66-i-2", "gse-66-i-3"],
    probes: [
      "Can you explain how \u2026 works, step by step?",
      "How would you explain that to someone who doesn\u2019t know anything about it?",
      "How is X different from Y?",
    ],
  },
  {
    azeId: "INF-24",
    claim: "Can introduce new topics and perspectives into a discussion and build on others\u2019 ideas",
    fn: "Informing",
    level: "B2",
    microIds: ["gse-63-i-2", "gse-63-i-3", "gse-66-i-4", "gse-66-i-5", "gse-66-i-6", "gse-62-i-1"],
    probes: [
      "That\u2019s an interesting point. Is there another way to look at it?",
      "What about \u2026 \u2014 how does that connect?",
      "Can you outline the main issue here?",
    ],
  },
  {
    azeId: "INF-25",
    claim: "Can use communication strategies fluently: paraphrasing, illustrating, and self-correcting",
    fn: "Informing",
    level: "B2",
    microIds: ["gse-60-i-2", "gse-60-i-3", "gse-64-i-2", "gse-64-i-3", "gse-64-i-4", "gse-65-i-1"],
    probes: [
      "AI pretends not to understand to test fluent rephrasing",
      "Can you put that another way?",
    ],
    notes: "Key distinction from B1+ INF-20: at B2, rephrasing is fluent and natural, not effortful.",
  },
  {
    azeId: "INT-11",
    claim: "Can participate in formal and informal discussions fluently and naturally",
    fn: "Interacting",
    level: "B2",
    microIds: ["gse-60-x-1", "gse-60-x-2", "gse-65-x-1", "gse-66-x-1"],
    probes: [
      "AI shifts register from informal to more formal to test adaptation",
      "What are your thoughts on this?",
    ],
    notes: "Observe fluency, natural turn-taking, and ability to shift between formal and informal registers.",
  },
  {
    azeId: "INT-12",
    claim: "Can encourage and steer discussion, respond to questions, and handle formal social functions",
    fn: "Interacting",
    level: "B2",
    microIds: ["gse-61-x-1", "gse-61-x-2", "gse-62-x-1", "gse-62-x-2"],
    probes: [
      "Can you tell me what you would do in this situation?",
      "How would you encourage someone to share their opinion?",
    ],
  },

  // ── B2+ ─────────────────────────────────────────────────────────────────

  {
    azeId: "INF-26",
    claim: "Can discuss hypothetical situations and contemporary issues with detail and nuance",
    fn: "Informing",
    level: "B2_PLUS",
    microIds: ["gse-69-i-1", "gse-70-i-1", "gse-70-i-2", "gse-70-i-3", "gse-74-i-1"],
    probes: [
      "What would happen if \u2026 ?",
      "What\u2019s your view on [current social issue]?",
      "You said you\u2019d accept X \u2014 but would you accept Y as well, or is that too far?",
    ],
  },
  {
    azeId: "INF-27",
    claim: "Can adapt register, use rhetorical devices, and explain complex information in accessible terms",
    fn: "Informing",
    level: "B2_PLUS",
    microIds: ["gse-68-i-1", "gse-69-i-2", "gse-70-i-4", "gse-72-i-1", "gse-73-i-1"],
    probes: [
      "Can you explain that as if I knew nothing about the topic?",
      "AI shifts to a more formal register to test adaptation",
      "How would you explain [technical concept from their field] to a child?",
    ],
    notes: "Key distinction from B2 INF-25: at B2+ the candidate uses rhetorical devices deliberately and shifts register naturally.",
  },
  {
    azeId: "INF-28",
    claim: "Can manage and steer group discussions effectively, including intervening, redirecting, and encouraging elaboration",
    fn: "Informing",
    level: "B2_PLUS",
    microIds: ["gse-67-i-1", "gse-67-i-2", "gse-67-i-3", "gse-67-i-4", "gse-69-i-3", "gse-69-i-4", "gse-75-i-1"],
    probes: [
      "If you were chairing a meeting and someone went off topic, what would you do?",
      "How would you handle a team member who keeps speculating instead of sticking to facts?",
    ],
    notes: "Evidence may come from how the candidate manages the AI interaction itself \u2014 redirecting, building on ideas, intervening.",
  },
  {
    azeId: "INT-13",
    claim: "Can maintain natural discourse with effective turn-taking and diplomatic handling of difficult moments",
    fn: "Interacting",
    level: "B2_PLUS",
    microIds: ["gse-68-x-1", "gse-69-x-1", "gse-70-x-1"],
    probes: [
      "AI deliberately goes off topic to test whether candidate redirects",
      "AI asks a personal or awkward question to test diplomatic avoidance",
    ],
    notes: "Observe: natural turn-taking, ability to deflect gracefully, ability to steer back to topic.",
  },
  {
    azeId: "INT-14",
    claim: "Can contribute to collaborative decision-making and resolve misunderstandings across perspectives",
    fn: "Interacting",
    level: "B2_PLUS",
    microIds: ["gse-69-x-2", "gse-73-x-1"],
    probes: [
      "AI presents a misunderstanding of something the candidate said, to test clarification and repair",
      "Let\u2019s figure this out together \u2014 what would you suggest?",
    ],
  },

  // ── C1 ──────────────────────────────────────────────────────────────────

  {
    azeId: "INF-29",
    claim: "Can engage fluently and naturally with complex and abstract topics, contributing to fast-moving discussion",
    fn: "Informing",
    level: "C1",
    microIds: ["gse-79-i-1", "gse-81-i-1", "gse-81-i-2", "gse-77-i-1"],
    probes: [
      "Let\u2019s talk about [abstract topic]. What\u2019s your take?",
      "AI introduces a complex, multi-layered question mid-conversation",
      "AI speeds up the pace of exchange to test fluency under pressure",
    ],
    notes: "At C1, the candidate contributes seamlessly to complex discussion \u2014 no hesitation, no reformulation pauses.",
  },
  {
    azeId: "INF-30",
    claim: "Can make complex content accessible by adapting language, adding detail, and restructuring for the audience",
    fn: "Informing",
    level: "C1",
    microIds: ["gse-76-i-1", "gse-76-i-2", "gse-79-i-2", "gse-82-i-1", "gse-83-i-1"],
    probes: [
      "Can you explain [specialist concept] so someone outside your field would understand?",
      "I\u2019m not following \u2014 can you break that down differently?",
      "How would you explain that to a group of non-experts?",
    ],
    notes: "Key distinction from B2+ INF-27: at C1 the adaptation is effortless and the restructuring is sophisticated, not just simplified.",
  },
  {
    azeId: "INF-31",
    claim: "Can use persuasion, challenge ideas, and steer interaction diplomatically towards conclusions",
    fn: "Informing",
    level: "C1",
    microIds: ["gse-79-i-3", "gse-80-i-1", "gse-80-i-2", "gse-82-i-2", "gse-83-i-2"],
    probes: [
      "AI presents a weak argument to see if candidate challenges it",
      "How would you convince someone who strongly disagrees with you?",
      "AI plays devil\u2019s advocate on a position the candidate holds",
    ],
    notes: "Look for: identifying logical flaws, persuasive techniques, diplomatic steering, not just disagreeing.",
  },
  {
    azeId: "INF-32",
    claim: "Can compensate for gaps invisibly and describe complex relationships with linguistic precision",
    fn: "Informing",
    level: "C1",
    microIds: ["gse-76-i-3", "gse-76-i-4", "gse-79-i-4"],
    probes: [
      "AI uses a technical term the candidate may not know, to test invisible compensation",
      "Can you describe the relationship between [X] and [Y] \u2014 how do they interact?",
    ],
    notes: "At C1, compensation is invisible. If the candidate visibly searches for words, that\u2019s B2-level behaviour.",
  },
  {
    azeId: "INT-15",
    claim: "Can participate in fast-paced, linguistically complex discussions and rephrase sensitively",
    fn: "Interacting",
    level: "C1",
    microIds: ["gse-76-x-1", "gse-77-x-1", "gse-79-x-1", "gse-80-x-1", "gse-80-x-2"],
    probes: [
      "AI uses colloquial or fast-paced language to test comprehension and participation",
      "AI makes a controversial statement to test whether candidate rephrases it neutrally",
    ],
    notes: "Observe: fluency in fast exchange, ability to rephrase sensitive content, linguistically complex reformulation.",
  },

  // ── C2 ──────────────────────────────────────────────────────────────────

  {
    azeId: "INF-33",
    claim: "Can convey finer shades of meaning with precision, using a wide range of linguistic devices including nuance, modification, and implicit meaning",
    fn: "Informing",
    level: "C2",
    microIds: ["gse-85-i-1", "gse-86-i-1", "gse-86-i-2", "gse-87-i-1", "gse-90-i-1"],
    probes: [
      "Can you explain the subtle difference between [X] and [Y]?",
      "AI uses a metaphor or understatement and asks candidate to unpack it",
      "Tell me about [their industry] \u2014 what are the key tensions?",
    ],
    notes: "At C2, the candidate uses modification devices naturally and unpacks implicit meaning without prompting.",
  },
  {
    azeId: "INF-34",
    claim: "Can lead, guide, and manage sophisticated discourse including sensitive discussions, disruption, and multi-role facilitation",
    fn: "Informing",
    level: "C2",
    microIds: ["gse-85-i-2", "gse-85-i-3", "gse-87-i-2", "gse-90-i-2", "gse-90-i-3"],
    probes: [
      "How would you handle a sensitive topic where people have very strong opposing views?",
      "If you were facilitating a meeting that got heated, what would you do?",
      "AI presents a complex issue and asks candidate to break it down into its component parts",
    ],
    notes: "At C2, the candidate doesn\u2019t just participate \u2014 they lead and facilitate with near-native sophistication.",
  },
  {
    azeId: "INT-16",
    claim: "Can engage in linguistically complex academic and political discussion, clarifying and elaborating with precision",
    fn: "Interacting",
    level: "C2",
    microIds: ["gse-87-x-1", "gse-88-x-1"],
    probes: [
      "What\u2019s your view on [political/social issue]? AI probes for nuance and precision",
      "AI challenges a point the candidate made and asks them to clarify their reasoning precisely",
    ],
    notes: "At C2, clarification is precise and linguistically sophisticated, not just \u2018what I mean is\u2019.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 6. LEVEL CLUSTERS + THRESHOLDS (routing rules)
//
// These tell the adaptive engine when to confirm a level and probe upward.
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "PRE_A1",
    label: "Pre-A1",
    gseRange: [10, 21],
    macroIds: ["INF-1", "INF-2", "INF-3", "INT-1"],
    confirmThreshold: 3,
    totalMacros: 4,
    onConfirm: "Confirmed Pre-A1 floor. Probe A1.",
    levelDescription:
      "Candidate produces basic personal information using isolated words and memorised phrases. " +
      "AI asks simple direct questions; candidate responds.",
  },
  {
    level: "A1",
    label: "A1",
    gseRange: [22, 29],
    macroIds: ["INF-4", "INF-5", "INF-6", "INF-7", "INT-2"],
    confirmThreshold: 4,
    totalMacros: 5,
    onConfirm: "Confirmed A1. Probe A2.",
    levelDescription:
      "Candidate moves beyond isolated words to simple phrases and short sentences. " +
      "Can describe themselves, family, and familiar surroundings. Key shift: naming to describing.",
  },
  {
    level: "A2",
    label: "A2",
    gseRange: [30, 35],
    macroIds: ["INF-8", "INF-9", "INF-10", "INF-11", "INT-3", "INT-4"],
    confirmThreshold: 5,
    totalMacros: 6,
    onConfirm: "Confirmed A2. Probe A2+.",
    levelDescription:
      "Candidate produces connected speech \u2014 short series of phrases and simple sentences. " +
      "Can describe their life, give directions, handle social functions. Key shift: phrases to connected description.",
  },
  {
    level: "A2_PLUS",
    label: "A2+",
    gseRange: [36, 42],
    macroIds: ["INF-12", "INF-13", "INF-14", "INT-5", "INT-6"],
    confirmThreshold: 4,
    totalMacros: 5,
    onConfirm: "Confirmed A2+. Probe B1.",
    levelDescription:
      "Candidate talks about past and future, makes comparisons, gives reasons. " +
      "Maintains conversation rather than just responding. Key shift: present to past/present/future with reasons.",
  },
  {
    level: "B1",
    label: "B1",
    gseRange: [43, 50],
    macroIds: ["INF-15", "INF-16", "INF-17", "INF-18", "INT-7", "INT-8"],
    confirmThreshold: 5,
    totalMacros: 6,
    onConfirm: "Confirmed B1. Probe B1+.",
    levelDescription:
      "Candidate gives reasons, explains things, enters unprepared conversation, handles opinions and " +
      "disagreement. No longer just describing \u2014 explaining and justifying. Key shift: describing to explaining.",
  },
  {
    level: "B1_PLUS",
    label: "B1+",
    gseRange: [51, 58],
    macroIds: ["INF-19", "INF-20", "INF-21", "INT-9", "INT-10"],
    confirmThreshold: 4,
    totalMacros: 5,
    onConfirm: "Confirmed B1+. Probe B2.",
    levelDescription:
      "Candidate shows precision and flexibility. Can explain problems clearly, rephrase when misunderstood, " +
      "use conversation strategies deliberately. Key shift: managing communication to controlling it.",
  },
  {
    level: "B2",
    label: "B2",
    gseRange: [59, 66],
    macroIds: ["INF-22", "INF-23", "INF-24", "INF-25", "INT-11", "INT-12"],
    confirmThreshold: 5,
    totalMacros: 6,
    onConfirm: "Confirmed B2. Probe B2+.",
    levelDescription:
      "Candidate communicates with confidence and fluency across a wide range of topics. " +
      "Engages in extended discussion, introduces perspectives, uses strategies fluently. " +
      "Key shift: controlled communication to confident, flexible, extended discourse.",
  },
  {
    level: "B2_PLUS",
    label: "B2+",
    gseRange: [67, 75],
    macroIds: ["INF-26", "INF-27", "INF-28", "INT-13", "INT-14"],
    confirmThreshold: 4,
    totalMacros: 5,
    onConfirm: "Confirmed B2+. Probe C1.",
    levelDescription:
      "Candidate shows rhetorical sophistication \u2014 hypothetical reasoning, register shifting, " +
      "tactful commentary, and managing group dynamics. They\u2019re not just participating, they\u2019re steering. " +
      "Key shift: confident discourse to rhetorically sophisticated steering.",
  },
  {
    level: "C1",
    label: "C1",
    gseRange: [76, 84],
    macroIds: ["INF-29", "INF-30", "INF-31", "INF-32", "INT-15"],
    confirmThreshold: 4,
    totalMacros: 5,
    onConfirm: "Confirmed C1. Probe C2.",
    levelDescription:
      "Candidate handles complex abstract topics fluently, challenges others\u2019 thinking, persuades, " +
      "and manages fast-paced interaction. Compensation strategies are invisible \u2014 gaps are filled " +
      "so smoothly they go unnoticed. Key shift: deliberate control to effortless mastery.",
  },
  {
    level: "C2",
    label: "C2",
    gseRange: [85, 90],
    macroIds: ["INF-33", "INF-34", "INT-16"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed C2.",
    levelDescription:
      "Candidate operates at near-native sophistication. They convey finer shades of meaning with " +
      "precision, lead and manage complex discourse including sensitive or contentious topics, and " +
      "adapt fluidly across roles. Key shift: effortless mastery to nuanced, near-native precision.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 7. EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const TASK1: Task1Config = {
  meta,
  principles,
  gseMicro,
  azeMacro,
  levelClusters,
};

export default TASK1;
