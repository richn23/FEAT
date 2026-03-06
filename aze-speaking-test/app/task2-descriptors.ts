// ─────────────────────────────────────────────────────────────────────────────
// task2-descriptors.ts — Single source of truth for Task 2: This or That
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// Sources:
//   • GSE Speaking LO Functional Analysis (Jan 6 spreadsheet)
//   • AZE Speaking Test Specification v2 (Feb 2026)
//   • AZE Task 2 Mapping Document (Feb 2026)
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

export type FunctionType = "Expressing" | "Arguing" | "Mediating";

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
  probes: string[];
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

export interface Task2Config {
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
    /** Task 2 includes a summary phase — Mediating is scored from summary */
    summaryPhaseRequired: boolean;
    /** AI generates options based on diagnosed level — not hardcoded */
    optionsAreGenerated: boolean;
  };
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. TASK METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: Task2Config["meta"] = {
  taskId: "task-2",
  title: "This or That",
  functions: ["Expressing", "Arguing", "Mediating"],
  maxExchanges: 15,
  description:
    "Candidate compares two options, discusses preferences, justifies choices, " +
    "and summarises the discussion. AI generates level-appropriate options, " +
    "challenges reasoning, then asks for a summary. Everyone takes this task. " +
    "Duration: 3–4 minutes.",
};


// ═════════════════════════════════════════════════════════════════════════════
// 3. SCORING PRINCIPLES
// ═════════════════════════════════════════════════════════════════════════════

const principles: Task2Config["principles"] = {
  responseDefinesEvidence: true,
  higherOverridesLowerGaps: true,
  singleClearInstanceSufficient: true,
  weakInstancesDoNotCombine: true,
  summaryPhaseRequired: true,
  optionsAreGenerated: true,
};


// ═════════════════════════════════════════════════════════════════════════════
// 4. GSE MICRO DESCRIPTORS (the evidence layer)
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [

  // ── Pre-A1 ────────────────────────────────────────────────────────────────
  { id: "gse-16-e-1", gse: 16, fn: "Expressing", text: "Can give very limited personal information using basic fixed expressions." },

  // ── A1 ────────────────────────────────────────────────────────────────────
  { id: "gse-25-e-1", gse: 25, fn: "Expressing", text: "Can recognise when people disagree or when someone has a problem and can use memorised, simple expressions (e.g. \"I understand\" or \"Are you okay?\") to indicate sympathy." },
  { id: "gse-25-e-2", gse: 25, fn: "Expressing", text: "Can express an idea and ask what others think, using very simple expressions, provided they can prepare in advance." },
  { id: "gse-27-e-1", gse: 27, fn: "Expressing", text: "Can express ability or lack of ability with regard to basic activities using 'can' or 'can't'." },
  { id: "gse-27-e-2", gse: 27, fn: "Expressing", text: "Can ask for help using basic fixed expressions." },
  { id: "gse-27-e-3", gse: 27, fn: "Expressing", text: "Can accept offers using basic fixed expressions." },
  { id: "gse-28-e-1", gse: 28, fn: "Expressing", text: "Can express how they are feeling using very basic fixed expressions." },
  { id: "gse-28-e-2", gse: 28, fn: "Expressing", text: "Can describe a person's likes and dislikes using simple language." },

  // ── A2 ────────────────────────────────────────────────────────────────────
  { id: "gse-30-e-1", gse: 30, fn: "Expressing", text: "Can express basic intentions with simple time markers (e.g. 'tomorrow')." },
  { id: "gse-31-e-1", gse: 31, fn: "Expressing", text: "Can express their likes and dislikes in relation to familiar topics using simple language." },
  { id: "gse-32-e-1", gse: 32, fn: "Expressing", text: "Can recognise when people disagree or when difficulties occur in interaction and adapt memorised, simple phrases to seek compromise and agreement." },
  { id: "gse-32-e-2", gse: 32, fn: "Expressing", text: "Can express agreement using simple fixed expressions." },
  { id: "gse-33-e-1", gse: 33, fn: "Expressing", text: "Can make excuses using basic fixed expressions." },
  { id: "gse-34-e-1", gse: 34, fn: "Expressing", text: "Can express general preferences using basic fixed expressions." },
  { id: "gse-34-e-2", gse: 34, fn: "Expressing", text: "Can give simple opinions using basic fixed expressions." },
  { id: "gse-35-e-1", gse: 35, fn: "Expressing", text: "Can express their reactions to a work, reporting their feelings and ideas in simple language." },
  { id: "gse-35-e-2", gse: 35, fn: "Expressing", text: "Can use a limited range of fixed expressions to describe objects, possessions, or products." },

  // ── A2+ ───────────────────────────────────────────────────────────────────
  { id: "gse-37-e-1", gse: 37, fn: "Expressing", text: "Can describe what something is used for, using basic fixed expressions." },
  { id: "gse-38-e-1", gse: 38, fn: "Expressing", text: "Can express how they feel in simple terms." },
  { id: "gse-38-e-2", gse: 38, fn: "Expressing", text: "Can talk about an event in the past using fixed expressions, given a model." },
  { id: "gse-39-e-1", gse: 39, fn: "Expressing", text: "Can give simple reasons to explain preferences, given a model." },
  { id: "gse-39-e-2", gse: 39, fn: "Expressing", text: "Can use simple language to describe people's personality and emotions." },
  { id: "gse-40-e-1", gse: 40, fn: "Expressing", text: "Can express enthusiasm and excitement in a limited way." },
  { id: "gse-42-e-1", gse: 42, fn: "Expressing", text: "Can express regret using simple language." },

  // ── B1 ────────────────────────────────────────────────────────────────────
  { id: "gse-43-e-1", gse: 43, fn: "Expressing", text: "Can describe future plans and intentions using fixed expressions." },
  { id: "gse-44-e-1", gse: 44, fn: "Expressing", text: "Can react appropriately to good and bad news using fixed expressions." },
  { id: "gse-45-e-1", gse: 45, fn: "Expressing", text: "Can express opinions using simple language." },
  { id: "gse-46-e-1", gse: 46, fn: "Expressing", text: "Can give or seek personal views and opinions in discussing topics of interest." },
  { id: "gse-47-e-1", gse: 47, fn: "Expressing", text: "Can express attitudes using simple language." },
  { id: "gse-48-e-1", gse: 48, fn: "Expressing", text: "Can describe dreams, hopes and ambitions." },
  { id: "gse-49-e-1", gse: 49, fn: "Expressing", text: "Can give detailed accounts of experiences, describing feelings and reactions." },
  { id: "gse-50-e-1", gse: 50, fn: "Expressing", text: "Can discuss films, books or plays in simple terms, using fixed expressions." },
  { id: "gse-50-a-1", gse: 50, fn: "Arguing", text: "Can give simple reasons to justify a viewpoint on a familiar topic." },
  { id: "gse-43-m-1", gse: 43, fn: "Mediating", text: "Can paraphrase a simple factual statement related to a familiar topic." },
  { id: "gse-48-m-1", gse: 48, fn: "Mediating", text: "Can paraphrase short passages in a simple fashion, using the original order of the text." },

  // ── B1+ ───────────────────────────────────────────────────────────────────
  { id: "gse-51-e-1", gse: 51, fn: "Expressing", text: "Can report the opinions of others, using simple language." },
  { id: "gse-51-e-2", gse: 51, fn: "Expressing", text: "Can express opinions as regards possible solutions, giving brief reasons and explanations." },
  { id: "gse-52-e-1", gse: 52, fn: "Expressing", text: "Can express opinions and attitudes using a range of basic expressions and sentences." },
  { id: "gse-54-e-1", gse: 54, fn: "Expressing", text: "Can support communication across cultures by initiating conversation, showing interest and empathy by asking and answering simple questions, and expressing agreement and understanding." },
  { id: "gse-55-e-1", gse: 55, fn: "Expressing", text: "Can express their thoughts in some detail on cultural topics (e.g. music, films)." },
  { id: "gse-56-e-1", gse: 56, fn: "Expressing", text: "Can give an opinion on practical problems, with support when necessary." },
  { id: "gse-56-e-2", gse: 56, fn: "Expressing", text: "Can express approval and appreciation of other people's ideas in a discussion." },
  { id: "gse-58-e-1", gse: 58, fn: "Expressing", text: "Can express support in a manner that shows they were actively listening to the other person." },
  { id: "gse-58-e-2", gse: 58, fn: "Expressing", text: "Can express disagreement in a manner that shows they were actively listening to the other person." },
  { id: "gse-58-e-3", gse: 58, fn: "Expressing", text: "Can report the opinions of others." },
  { id: "gse-51-a-1", gse: 51, fn: "Arguing", text: "Can briefly give reasons and explanations for opinions, plans and actions." },
  { id: "gse-53-a-1", gse: 53, fn: "Arguing", text: "Can compare and contrast alternatives about what to do, where to go, etc." },
  { id: "gse-53-a-2", gse: 53, fn: "Arguing", text: "Can ask parties in a disagreement to explain their point of view, and can respond briefly to their explanations, provided the topic is familiar to them and the parties express themselves clearly." },
  { id: "gse-53-m-1", gse: 53, fn: "Mediating", text: "Can ask someone to paraphrase a specific point or idea." },
  { id: "gse-56-m-1", gse: 56, fn: "Mediating", text: "Can summarise and give opinions on issues and stories and answer questions in detail." },

  // ── B2 ────────────────────────────────────────────────────────────────────
  { id: "gse-59-e-1", gse: 59, fn: "Expressing", text: "Can describe people's personality and emotions in some detail." },
  { id: "gse-60-e-1", gse: 60, fn: "Expressing", text: "Can express an inference or assumption about a person's mood or emotional state." },
  { id: "gse-61-e-1", gse: 61, fn: "Expressing", text: "Can present their ideas in a group and pose questions that invite reactions from other group members' perspectives." },
  { id: "gse-61-e-2", gse: 61, fn: "Expressing", text: "Can express feelings (e.g. sympathy, surprise, interest) with confidence, using a range of expressions." },
  { id: "gse-61-e-3", gse: 61, fn: "Expressing", text: "Can express their opinions in discussions on contemporary social issues and current affairs." },
  { id: "gse-61-e-4", gse: 61, fn: "Expressing", text: "Can show degrees of agreement using a range of language." },
  { id: "gse-62-e-1", gse: 62, fn: "Expressing", text: "Can use a range of language to express degrees of enthusiasm." },
  { id: "gse-64-e-1", gse: 64, fn: "Expressing", text: "Can further develop other people's ideas and opinions." },
  { id: "gse-65-e-1", gse: 65, fn: "Expressing", text: "Can use a range of language to express degrees of reluctance." },
  { id: "gse-65-e-2", gse: 65, fn: "Expressing", text: "Can describe goals using a range of expressions." },
  { id: "gse-65-e-3", gse: 65, fn: "Expressing", text: "Can express opinions about news stories using a wide range of everyday language." },
  { id: "gse-60-a-1", gse: 60, fn: "Arguing", text: "Can give the advantages and disadvantages of various options on a topical issue." },
  { id: "gse-60-a-2", gse: 60, fn: "Arguing", text: "Can justify a viewpoint on a topical issue by discussing pros and cons of various options." },
  { id: "gse-60-a-3", gse: 60, fn: "Arguing", text: "Can justify and sustain views clearly by providing relevant explanations and arguments." },
  { id: "gse-61-a-1", gse: 61, fn: "Arguing", text: "Can consider two different sides of an issue, giving arguments for and against, and propose a solution or compromise." },
  { id: "gse-62-a-1", gse: 62, fn: "Arguing", text: "Can justify the reasons for a particular decision or course of action." },
  { id: "gse-62-a-2", gse: 62, fn: "Arguing", text: "Can construct a chain of reasoned argument." },
  { id: "gse-62-a-3", gse: 62, fn: "Arguing", text: "Can recommend a course of action, giving reasons." },
  { id: "gse-64-a-1", gse: 64, fn: "Arguing", text: "Can express views clearly and evaluate hypothetical proposals in informal discussions." },
  { id: "gse-66-a-1", gse: 66, fn: "Arguing", text: "Can formulate questions and feedback to encourage people to expand on their thinking and justify or clarify their opinions." },
  { id: "gse-60-m-1", gse: 60, fn: "Mediating", text: "Can paraphrase in simpler terms what someone else has said." },
  { id: "gse-66-m-1", gse: 66, fn: "Mediating", text: "Can summarise the statements made by the two sides, highlighting areas of agreement and obstacles to agreement." },

  // ── B2+ ───────────────────────────────────────────────────────────────────
  { id: "gse-69-e-1", gse: 69, fn: "Expressing", text: "Can precisely express the potential consequences of actions or events." },
  { id: "gse-69-e-2", gse: 69, fn: "Expressing", text: "Can express an attitude, opinion or idea using idiomatic language." },
  { id: "gse-75-e-1", gse: 75, fn: "Expressing", text: "Can express attitudes using linguistically complex language." },
  { id: "gse-75-e-2", gse: 75, fn: "Expressing", text: "Can elicit possible solutions from parties in disagreement in order to help them to reach consensus, formulating open-ended, neutral questions to minimise embarrassment or offence." },
  { id: "gse-75-e-3", gse: 75, fn: "Expressing", text: "Can help the parties in a disagreement better understand each other by restating and reframing their positions more clearly and by prioritising needs and goals." },
  { id: "gse-70-a-1", gse: 70, fn: "Arguing", text: "Can compare the advantages and disadvantages of possible approaches and solutions to an issue or problem." },
  { id: "gse-70-a-2", gse: 70, fn: "Arguing", text: "Can present their ideas with precision and respond to complex lines of argument convincingly." },
  { id: "gse-70-a-3", gse: 70, fn: "Arguing", text: "Can compare and evaluate different ideas using a range of linguistic devices." },
  { id: "gse-72-a-1", gse: 72, fn: "Arguing", text: "Can evaluate problems, challenges and proposals in a collaborative discussion in order to decide on the way forward." },
  { id: "gse-72-a-2", gse: 72, fn: "Arguing", text: "Can make a complicated issue easier to understand by presenting the components of the argument separately." },
  { id: "gse-73-a-1", gse: 73, fn: "Arguing", text: "Can evaluate arguments in a debate or discussion and justify the evaluation." },
  { id: "gse-73-a-2", gse: 73, fn: "Arguing", text: "Can negotiate a solution to a dispute (e.g. an undeserved traffic ticket, blame for an accident)." },
  { id: "gse-73-a-3", gse: 73, fn: "Arguing", text: "Can put forward a smoothly flowing and logical structured argument, highlighting significant points." },
  { id: "gse-74-a-1", gse: 74, fn: "Arguing", text: "Can give a detailed response to a counter-argument presented by someone else during a discussion." },
  { id: "gse-74-a-2", gse: 74, fn: "Arguing", text: "Can make a clear strong argument during a formal discussion." },
  { id: "gse-69-m-1", gse: 69, fn: "Mediating", text: "Can paraphrase an idea using a range of linguistic devices." },
  { id: "gse-70-m-1", gse: 70, fn: "Mediating", text: "Can formulate a clear and accurate summary of what has been agreed and what is expected from each of the parties." },
  { id: "gse-73-m-1", gse: 73, fn: "Mediating", text: "Can use circumlocution and paraphrase to cover gaps in vocabulary and structure." },
  { id: "gse-73-m-2", gse: 73, fn: "Mediating", text: "Can make a verbal summary to confirm their understanding of a linguistically complex discourse." },

  // ── C1 ────────────────────────────────────────────────────────────────────
  { id: "gse-80-e-1", gse: 80, fn: "Expressing", text: "Can spontaneously pose a series of questions to encourage people to think about their prior knowledge of an abstract issue and to help them establish a link to what is going to be explained." },
  { id: "gse-77-a-1", gse: 77, fn: "Arguing", text: "Can justify a point of view using linguistically complex language." },
  { id: "gse-78-a-1", gse: 78, fn: "Arguing", text: "Can give reasons and explanations for their opinions using linguistically complex language." },
  { id: "gse-78-a-2", gse: 78, fn: "Arguing", text: "Can conclude a discursive argument using a range of linguistic devices." },
  { id: "gse-80-a-1", gse: 80, fn: "Arguing", text: "Can ask a series of open questions that build on different contributions in order to stimulate logical reasoning (e.g. hypothesising, inferring, analysing, justifying and predicting)." },
  { id: "gse-76-m-1", gse: 76, fn: "Mediating", text: "Can demonstrate sensitivity to different viewpoints, using repetition and paraphrase to demonstrate a detailed understanding of each party's requirements for an agreement." },
  { id: "gse-80-m-1", gse: 80, fn: "Mediating", text: "Can participate in discussions using linguistically complex language to compare, contrast and summarise information." },
  { id: "gse-83-m-1", gse: 83, fn: "Mediating", text: "Can summarise group discussions on a wide range of linguistically complex topics." },

  // ── C2 ────────────────────────────────────────────────────────────────────
  { id: "gse-87-a-1", gse: 87, fn: "Arguing", text: "Can confidently take a firm but diplomatic stance over an issue of principle, while showing respect for the viewpoints of others." },
  { id: "gse-87-m-1", gse: 87, fn: "Mediating", text: "Can summarise, evaluate and link the various contributions in order to facilitate agreement for a solution or way forward." },
];


// ═════════════════════════════════════════════════════════════════════════════
// 5. AZE MACRO DESCRIPTORS (the assessable layer)
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [

  // ── Pre-A1 (GSE 10–21) ─────────────────────────────────────────────────
  {
    azeId: "EXP-1",
    claim: "Can indicate a basic preference using single words or fixed phrases",
    fn: "Expressing",
    level: "PRE_A1",
    microIds: ["gse-16-e-1"],
    probes: [
      "Show two pictures: 'This one or this one?'",
      "Point and say: 'You like?'",
    ],
    notes: "At Pre-A1, accept pointing + single word ('this', 'yes'). Any indication of choice counts.",
  },

  // ── A1 (GSE 22–29) ────────────────────────────────────────────────────
  {
    azeId: "EXP-2",
    claim: "Can express simple preferences, likes/dislikes, and feelings using basic fixed expressions",
    fn: "Expressing",
    level: "A1",
    microIds: ["gse-25-e-1", "gse-25-e-2", "gse-28-e-1", "gse-28-e-2"],
    probes: [
      "'Which do you like? Why?' — listen for 'I like...', 'I don't like...'",
      "'How do you feel about this one?' — listen for basic feeling words",
    ],
    notes: "Expect memorised phrases. 'I like' + noun is sufficient.",
  },
  {
    azeId: "EXP-3",
    claim: "Can express basic ability and respond to simple offers using fixed expressions",
    fn: "Expressing",
    level: "A1",
    microIds: ["gse-27-e-1", "gse-27-e-2", "gse-27-e-3"],
    probes: [
      "'Can you [do X]?' — listen for 'I can' / 'I can't'",
      "'Do you want me to help?' — listen for acceptance/refusal",
    ],
    notes: "Tests whether candidate can respond to AI's offers and express ability.",
  },

  // ── A2 (GSE 30–35) ────────────────────────────────────────────────────
  {
    azeId: "EXP-4",
    claim: "Can express preferences, opinions, and agreement/disagreement using simple language",
    fn: "Expressing",
    level: "A2",
    microIds: ["gse-31-e-1", "gse-32-e-1", "gse-32-e-2", "gse-34-e-1", "gse-34-e-2"],
    probes: [
      "'Which do you prefer — X or Y?' — listen for preference + simple reason",
      "State an opinion, see if they agree or disagree: 'I think X is better.'",
    ],
  },
  {
    azeId: "EXP-5",
    claim: "Can describe things, express intentions, and react to ideas using simple expressions",
    fn: "Expressing",
    level: "A2",
    microIds: ["gse-30-e-1", "gse-33-e-1", "gse-35-e-1", "gse-35-e-2"],
    probes: [
      "'What would you do with this one?' — listen for basic intentions",
      "'What do you think about this?' — listen for simple reactions",
    ],
  },

  // ── A2+ (GSE 36–42) ──────────────────────────────────────────────────
  {
    azeId: "EXP-6",
    claim: "Can give simple reasons for preferences and express feelings with some range",
    fn: "Expressing",
    level: "A2_PLUS",
    microIds: ["gse-37-e-1", "gse-38-e-1", "gse-38-e-2", "gse-39-e-1", "gse-39-e-2", "gse-40-e-1", "gse-42-e-1"],
    probes: [
      "'Why do you prefer that one?' — listen for 'because...' with a reason",
      "'Have you tried something like this before?' — listen for past reference",
      "'How does that make you feel?' — listen for feeling words beyond 'good/bad'",
    ],
    notes: "The step up from A2: they give REASONS, not just state preferences. 'I like X because...' is the marker.",
  },

  // ── B1 (GSE 43–50) ────────────────────────────────────────────────────
  {
    azeId: "EXP-7",
    claim: "Can express opinions, attitudes, and personal views on topics of interest",
    fn: "Expressing",
    level: "B1",
    microIds: ["gse-43-e-1", "gse-44-e-1", "gse-45-e-1", "gse-46-e-1", "gse-47-e-1", "gse-48-e-1", "gse-49-e-1", "gse-50-e-1"],
    probes: [
      "'What's your view on X?' — listen for opinion + reasoning",
      "'Would you change anything about this?' — listen for attitude expression",
      "'Tell me about an experience related to this.' — listen for detailed account with feelings",
    ],
  },
  {
    azeId: "ARG-1",
    claim: "Can give simple reasons to justify a viewpoint on a familiar topic",
    fn: "Arguing",
    level: "B1",
    microIds: ["gse-50-a-1"],
    probes: [
      "'But why is that better?' — listen for viewpoint + justification",
      "'Some people would disagree. What would you say?' — listen for basic defence",
    ],
    notes: "First appearance of Arguing. A simple 'because + reason' supporting an opinion counts.",
  },
  {
    azeId: "MED-1",
    claim: "Can paraphrase simple statements in their own words",
    fn: "Mediating",
    level: "B1",
    microIds: ["gse-43-m-1", "gse-48-m-1"],
    probes: [
      "'Can you explain what we just discussed, in your own words?' — listen for paraphrase, not repetition",
    ],
    notes: "First appearance of Mediating. During summary phase. Accept simple restatement in own words.",
  },

  // ── B1+ (GSE 51–58) ──────────────────────────────────────────────────
  {
    azeId: "EXP-8",
    claim: "Can express opinions with reasons, respond to others' views, and show agreement/disagreement with active listening",
    fn: "Expressing",
    level: "B1_PLUS",
    microIds: ["gse-51-e-1", "gse-51-e-2", "gse-52-e-1", "gse-54-e-1", "gse-55-e-1", "gse-56-e-1", "gse-56-e-2", "gse-58-e-1", "gse-58-e-2", "gse-58-e-3"],
    probes: [
      "'I actually think Y is much better. What's your reaction?' — listen for active disagreement, not just 'no'",
      "'That's an interesting view. Can you say more?' — listen for elaboration on opinion",
      "'What would someone who disagrees with you say?' — listen for reporting others' views",
    ],
    notes: "The step up from B1: they RESPOND to what was said, not just state their own opinion. Active listening markers.",
  },
  {
    azeId: "ARG-2",
    claim: "Can compare and contrast alternatives and give brief reasons for opinions",
    fn: "Arguing",
    level: "B1_PLUS",
    microIds: ["gse-51-a-1", "gse-53-a-1", "gse-53-a-2"],
    probes: [
      "'What are the main differences between these two?' — listen for structured comparison",
      "'Which is better and why? Give me two reasons.' — listen for multiple reasons",
    ],
  },
  {
    azeId: "MED-2",
    claim: "Can summarise a discussion and give opinions on what was discussed",
    fn: "Mediating",
    level: "B1_PLUS",
    microIds: ["gse-53-m-1", "gse-56-m-1"],
    probes: [
      "'Now, summarise what we discussed and what you decided.' — listen for summary + opinion",
    ],
    notes: "Summary phase. They should cover both options, their reasons, and their conclusion.",
  },

  // ── B2 (GSE 59–66) ────────────────────────────────────────────────────
  {
    azeId: "EXP-9",
    claim: "Can express nuanced opinions, show degrees of agreement, and develop others' ideas",
    fn: "Expressing",
    level: "B2",
    microIds: ["gse-59-e-1", "gse-60-e-1", "gse-61-e-1", "gse-61-e-2", "gse-61-e-3", "gse-61-e-4", "gse-62-e-1", "gse-64-e-1", "gse-65-e-1", "gse-65-e-2", "gse-65-e-3"],
    probes: [
      "'I partly agree with you but...' — see if they pick up the nuance and respond with degrees, not absolutes",
      "'What would you add to what I just said?' — listen for building on ideas",
      "Present a controversial opinion — listen for nuanced agreement/disagreement, not just yes/no",
    ],
  },
  {
    azeId: "ARG-3",
    claim: "Can argue pros and cons, justify decisions, and construct reasoned arguments",
    fn: "Arguing",
    level: "B2",
    microIds: ["gse-60-a-1", "gse-60-a-2", "gse-60-a-3", "gse-61-a-1", "gse-62-a-1", "gse-62-a-2", "gse-62-a-3", "gse-64-a-1", "gse-66-a-1"],
    probes: [
      "'Give me the pros and cons of each option.' — listen for structured argument",
      "'I disagree completely. Convince me.' — listen for sustained justification",
      "'What if the situation were different — say [hypothetical]?' — listen for evaluating proposals",
    ],
  },
  {
    azeId: "MED-3",
    claim: "Can paraphrase others' views and summarise both sides of a discussion",
    fn: "Mediating",
    level: "B2",
    microIds: ["gse-60-m-1", "gse-66-m-1"],
    probes: [
      "'Summarise both sides of what we discussed — where did we agree and disagree?' — listen for balanced summary",
    ],
    notes: "Summary phase. They should explicitly identify areas of agreement AND disagreement.",
  },

  // ── B2+ (GSE 67–75) ──────────────────────────────────────────────────
  {
    azeId: "EXP-10",
    claim: "Can express consequences, attitudes, and ideas using idiomatic and linguistically complex language",
    fn: "Expressing",
    level: "B2_PLUS",
    microIds: ["gse-69-e-1", "gse-69-e-2", "gse-75-e-1", "gse-75-e-2", "gse-75-e-3"],
    probes: [
      "'What would happen if we went with option X?' — listen for precise expression of consequences",
      "'How would you frame this to someone who strongly disagrees?' — listen for restating/reframing",
    ],
    notes: "Listen for idiomatic language, hedging, and diplomatic framing — not just content accuracy.",
  },
  {
    azeId: "ARG-4",
    claim: "Can present structured arguments with precision, respond to counter-arguments, and evaluate competing positions",
    fn: "Arguing",
    level: "B2_PLUS",
    microIds: ["gse-70-a-1", "gse-70-a-2", "gse-70-a-3", "gse-72-a-1", "gse-72-a-2", "gse-73-a-1", "gse-73-a-2", "gse-73-a-3", "gse-74-a-1", "gse-74-a-2"],
    probes: [
      "'I have a strong counter-argument: [X]. Respond.' — listen for detailed, structured response",
      "'Break down the key components of your argument.' — listen for logical decomposition",
      "'Which of these arguments is weakest and why?' — listen for evaluation of arguments",
    ],
  },
  {
    azeId: "MED-4",
    claim: "Can paraphrase using range of devices and formulate accurate summaries of agreements and expectations",
    fn: "Mediating",
    level: "B2_PLUS",
    microIds: ["gse-69-m-1", "gse-70-m-1", "gse-73-m-1", "gse-73-m-2"],
    probes: [
      "'Summarise what we agreed, what's still unresolved, and what each side needs to do.' — listen for precision and completeness",
    ],
    notes: "Summary phase. Expect clear distinction between agreed/unresolved points and next steps.",
  },

  // ── C1 (GSE 76–84) ────────────────────────────────────────────────────
  {
    azeId: "EXP-11",
    claim: "Can pose questions that probe abstract reasoning and help establish links between ideas",
    fn: "Expressing",
    level: "C1",
    microIds: ["gse-80-e-1"],
    probes: [
      "'What underlying assumptions are we making here?' — see if they probe back with equally abstract questions",
    ],
    notes: "At C1, the candidate should be able to steer the discussion, not just respond. Listen for initiative.",
  },
  {
    azeId: "ARG-5",
    claim: "Can justify and conclude arguments using linguistically complex language and logical devices",
    fn: "Arguing",
    level: "C1",
    microIds: ["gse-77-a-1", "gse-78-a-1", "gse-78-a-2", "gse-80-a-1"],
    probes: [
      "'Bring your argument to a conclusion — what's the bottom line?' — listen for discursive closure with linguistic sophistication",
      "'Challenge my reasoning on this.' — listen for open questions that stimulate logical thinking",
    ],
  },
  {
    azeId: "MED-5",
    claim: "Can summarise complex discussions with sensitivity to viewpoints and linguistically complex language",
    fn: "Mediating",
    level: "C1",
    microIds: ["gse-76-m-1", "gse-80-m-1", "gse-83-m-1"],
    probes: [
      "'Summarise this discussion as if briefing someone who wasn't here — capture the nuances, not just the facts.' — listen for sensitivity to viewpoints and complex language",
    ],
    notes: "Summary phase. Expect sophisticated paraphrasing that captures nuance, not just main points.",
  },

  // ── C2 (GSE 85–90) ────────────────────────────────────────────────────
  {
    azeId: "ARG-6",
    claim: "Can take a firm but diplomatic stance on principle while respecting opposing viewpoints",
    fn: "Arguing",
    level: "C2",
    microIds: ["gse-87-a-1"],
    probes: [
      "'Take the strongest possible position on this — but without alienating the other side.' — listen for diplomatic firmness",
    ],
    notes: "Near-native sophistication. They can be forceful AND respectful simultaneously.",
  },
  {
    azeId: "MED-6",
    claim: "Can synthesise, evaluate, and link contributions to facilitate agreement or resolution",
    fn: "Mediating",
    level: "C2",
    microIds: ["gse-87-m-1"],
    probes: [
      "'Pull everything together — what's the way forward that accounts for everything we discussed?' — listen for synthesis, not just summary",
    ],
    notes: "Beyond summarising: they evaluate relative weight of arguments and propose a path forward.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 6. LEVEL CLUSTERS (routing + threshold rules)
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "PRE_A1",
    label: "Pre-A1",
    gseRange: [10, 21],
    macroIds: ["EXP-1"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed Pre-A1 floor. Probe A1.",
    levelDescription: "Can point at or name a preference. Single words or gestures accepted.",
  },
  {
    level: "A1",
    label: "A1",
    gseRange: [22, 29],
    macroIds: ["EXP-2", "EXP-3"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed A1. Probe A2.",
    levelDescription: "Can express simple likes/dislikes and feelings using memorised phrases. 'I like X', 'X is good'.",
  },
  {
    level: "A2",
    label: "A2",
    gseRange: [30, 35],
    macroIds: ["EXP-4", "EXP-5"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed A2. Probe A2+.",
    levelDescription: "Can express preferences and simple opinions. Can agree/disagree. Can describe things simply.",
  },
  {
    level: "A2_PLUS",
    label: "A2+",
    gseRange: [36, 42],
    macroIds: ["EXP-6"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A2+. Probe B1.",
    levelDescription: "Can give simple REASONS for preferences. 'I prefer X because...' is the step up from A2.",
  },
  {
    level: "B1",
    label: "B1",
    gseRange: [43, 50],
    macroIds: ["EXP-7", "ARG-1", "MED-1"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B1. Probe B1+.",
    levelDescription: "Can express opinions and attitudes. First appearance of justification (Arguing) and paraphrasing (Mediating). Summary phase begins.",
  },
  {
    level: "B1_PLUS",
    label: "B1+",
    gseRange: [51, 58],
    macroIds: ["EXP-8", "ARG-2", "MED-2"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B1+. Probe B2.",
    levelDescription: "Can compare alternatives, give multiple reasons, and actively listen/respond. Summary includes opinion.",
  },
  {
    level: "B2",
    label: "B2",
    gseRange: [59, 66],
    macroIds: ["EXP-9", "ARG-3", "MED-3"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B2. Probe B2+.",
    levelDescription: "Can argue pros/cons, construct reasoned arguments, show degrees of agreement. Summary covers both sides with agreement/disagreement.",
  },
  {
    level: "B2_PLUS",
    label: "B2+",
    gseRange: [67, 75],
    macroIds: ["EXP-10", "ARG-4", "MED-4"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B2+. Probe C1.",
    levelDescription: "Structured, precise argumentation. Responds to counter-arguments in detail. Summary distinguishes agreed/unresolved.",
  },
  {
    level: "C1",
    label: "C1",
    gseRange: [76, 84],
    macroIds: ["EXP-11", "ARG-5", "MED-5"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed C1. Probe C2.",
    levelDescription: "Linguistically complex argumentation with discursive closure. Summary captures nuance and viewpoint sensitivity.",
  },
  {
    level: "C2",
    label: "C2",
    gseRange: [85, 90],
    macroIds: ["ARG-6", "MED-6"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "C2 confirmed. Maximum level.",
    levelDescription: "Diplomatic firmness. Synthesis, not just summary. Near-native sophistication in argumentation and mediation.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 7. EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const TASK2: Task2Config = {
  meta,
  principles,
  gseMicro,
  azeMacro,
  levelClusters,
};
