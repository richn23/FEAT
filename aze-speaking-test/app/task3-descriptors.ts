// ─────────────────────────────────────────────────────────────────────────────
// task3-descriptors.ts — Single source of truth for Task 3: Visual Explanation
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// Sources:
//   • GSE Speaking LO Functional Analysis (Jan 6 spreadsheet)
//   • AZE Speaking Test Specification v2 (Feb 2026)
//   • AZE Task 3 Mapping Document (Feb 2026)
// ─────────────────────────────────────────────────────────────────────────────


// ═════════════════════════════════════════════════════════════════════════════
// 1. TYPES
// ═════════════════════════════════════════════════════════════════════════════

export type CefrLevel =
  | "B1"
  | "B1_PLUS"
  | "B2"
  | "B2_PLUS"
  | "C1"
  | "C2";

export type FunctionType = "Directing" | "Mediating" | "Presenting";

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

export interface Task3Config {
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
    /** The confusion/repair phase is the key diagnostic differentiator */
    repairPhaseIsDiagnostic: boolean;
    /** Same visual for all levels — level shows in how they explain it */
    visualIsLevelNeutral: boolean;
  };
  visuals: {
    id: string;
    title: string;
    filename: string;
    description: string;
  }[];
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// 2. TASK METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: Task3Config["meta"] = {
  taskId: "task-3",
  title: "Visual Explanation",
  functions: ["Directing", "Mediating", "Presenting"],
  maxExchanges: 12,
  description:
    "Candidate explains a process shown in an infographic. AI asks follow-ups, " +
    "feigns confusion, candidate repairs explanation. B1+ only — A2 and below " +
    "stop after Task 2. Duration: 2–3 minutes.",
};


// ═════════════════════════════════════════════════════════════════════════════
// 3. SCORING PRINCIPLES
// ═════════════════════════════════════════════════════════════════════════════

const principles: Task3Config["principles"] = {
  responseDefinesEvidence: true,
  higherOverridesLowerGaps: true,
  singleClearInstanceSufficient: true,
  weakInstancesDoNotCombine: true,
  repairPhaseIsDiagnostic: true,
  visualIsLevelNeutral: true,
};


// ═════════════════════════════════════════════════════════════════════════════
// 4. AVAILABLE VISUALS
// ═════════════════════════════════════════════════════════════════════════════

const visuals: Task3Config["visuals"] = [
  {
    id: "visa-process",
    title: "How to Apply for a Travel Visa",
    filename: "image1.png",
    description: "5-step process with decision point: Fill Out Application → Gather Documents → Documents Complete? (Yes → Submit, No → Fix & Submit) → Attend Appointment → Get Your Visa",
  },
  {
    id: "complaint-process",
    title: "How Customer Complaints Are Processed",
    filename: "image2.png",
    description: "Process with escalation decision: Complaint Received → Acknowledge Complaint → Escalate? (No → Investigate & Resolve, Yes → Escalate Issue) → Resolved",
  },
  {
    id: "apartment-process",
    title: "How to Rent an Apartment",
    filename: "image3.png",
    description: "5-step process with approval decision: Search Listings → Visit Apartments → Approved? (Yes → Sign Lease → Move In, No → Find Another)",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 5. GSE MICRO DESCRIPTORS (the evidence layer)
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [

  // ── B1 (GSE 43–50) ────────────────────────────────────────────────────
  { id: "gse-45-d-1", gse: 45, fn: "Directing", text: "Can make simple recommendations for a course of action in familiar everyday situations." },
  { id: "gse-47-d-1", gse: 47, fn: "Directing", text: "Can show how new information is related to what people are familiar with by asking simple questions." },
  { id: "gse-48-d-1", gse: 48, fn: "Directing", text: "Can give simple, clear instructions to organise an activity." },
  { id: "gse-50-d-1", gse: 50, fn: "Directing", text: "Can make a set of instructions easier to understand by uttering them slowly, a few words/signs at a time, employing verbal and non-verbal emphasis to facilitate understanding." },
  { id: "gse-43-m-1", gse: 43, fn: "Mediating", text: "Can paraphrase a simple factual statement related to a familiar topic." },
  { id: "gse-48-m-1", gse: 48, fn: "Mediating", text: "Can paraphrase short passages in a simple fashion, using the original order of the text." },
  { id: "gse-44-p-1", gse: 44, fn: "Presenting", text: "Can give a short talk about a familiar topic, with visual support." },

  // ── B1+ (GSE 51–58) ──────────────────────────────────────────────────
  { id: "gse-55-d-1", gse: 55, fn: "Directing", text: "Can explain how something works by providing examples that draw on people's everyday experiences." },
  { id: "gse-56-d-1", gse: 56, fn: "Directing", text: "Can express and comment on ideas and suggestions in informal discussions." },
  { id: "gse-56-d-2", gse: 56, fn: "Directing", text: "Can make a short instructional or informational text easier to understand by presenting it as a list of separate points." },
  { id: "gse-53-m-1", gse: 53, fn: "Mediating", text: "Can ask someone to paraphrase a specific point or idea." },
  { id: "gse-56-m-1", gse: 56, fn: "Mediating", text: "Can summarise and give opinions on issues and stories and answer questions in detail." },
  { id: "gse-53-p-1", gse: 53, fn: "Presenting", text: "Can develop an argument using common fixed expressions." },

  // ── B2 (GSE 59–66) ────────────────────────────────────────────────────
  { id: "gse-59-d-1", gse: 59, fn: "Directing", text: "Can give basic technical instructions in their field of specialisation." },
  { id: "gse-60-d-1", gse: 60, fn: "Directing", text: "Can suggest solutions to problems and explain why they would work." },
  { id: "gse-61-d-1", gse: 61, fn: "Directing", text: "Can refocus a discussion by suggesting what to consider next, and how to proceed." },
  { id: "gse-62-d-1", gse: 62, fn: "Directing", text: "Can describe how to do something, giving detailed instructions." },
  { id: "gse-65-d-1", gse: 65, fn: "Directing", text: "Can ask people to explain how an idea fits with the main topic under discussion." },
  { id: "gse-66-d-1", gse: 66, fn: "Directing", text: "Can give advice on a wide range of subjects." },
  { id: "gse-60-m-1", gse: 60, fn: "Mediating", text: "Can paraphrase in simpler terms what someone else has said." },
  { id: "gse-66-m-1", gse: 66, fn: "Mediating", text: "Can summarise the statements made by the two sides, highlighting areas of agreement and obstacles to agreement." },
  { id: "gse-66-m-2", gse: 66, fn: "Mediating", text: "Can summarise a wide range of texts, discussing contrasting points and main themes." },
  { id: "gse-59-p-1", gse: 59, fn: "Presenting", text: "Can describe objects, possessions and products in detail, including their characteristics and special features." },
  { id: "gse-60-p-1", gse: 60, fn: "Presenting", text: "Can describe future plans and intentions in detail, giving degrees of probability." },
  { id: "gse-63-p-1", gse: 63, fn: "Presenting", text: "Can develop an argument giving reasons in support of or against a particular point of view." },
  { id: "gse-64-p-1", gse: 64, fn: "Presenting", text: "Can compare and contrast situations in some detail and speculate about the reasons for the current situation." },
  { id: "gse-64-p-2", gse: 64, fn: "Presenting", text: "Can speculate about causes, consequences or hypothetical situations." },
  { id: "gse-65-p-1", gse: 65, fn: "Presenting", text: "Can outline the main points in a disagreement with reasonable precision and explain the positions of the parties involved." },
  { id: "gse-66-p-1", gse: 66, fn: "Presenting", text: "Can speculate about a future event using a range of linguistic devices." },
  { id: "gse-66-p-2", gse: 66, fn: "Presenting", text: "Can develop a clear argument with supporting subsidiary points and relevant examples." },
  { id: "gse-66-p-3", gse: 66, fn: "Presenting", text: "Can develop an argument well enough to be followed without difficulty most of the time." },

  // ── B2+ (GSE 67–75) ──────────────────────────────────────────────────
  { id: "gse-73-d-1", gse: 73, fn: "Directing", text: "Can give detailed technical instructions in their field of specialisation." },
  { id: "gse-75-d-1", gse: 75, fn: "Directing", text: "Can intervene supportively in order to focus people's attention on aspects of the task by asking targeted questions and inviting suggestions." },
  { id: "gse-69-m-1", gse: 69, fn: "Mediating", text: "Can paraphrase an idea using a range of linguistic devices." },
  { id: "gse-70-m-1", gse: 70, fn: "Mediating", text: "Can formulate a clear and accurate summary of what has been agreed and what is expected from each of the parties." },
  { id: "gse-73-m-1", gse: 73, fn: "Mediating", text: "Can use circumlocution and paraphrase to cover gaps in vocabulary and structure." },
  { id: "gse-73-m-2", gse: 73, fn: "Mediating", text: "Can make a verbal summary to confirm their understanding of a linguistically complex discourse." },
  { id: "gse-67-p-1", gse: 67, fn: "Presenting", text: "Can speculate about the causes of an issue or problem." },
  { id: "gse-69-p-1", gse: 69, fn: "Presenting", text: "Can talk about trends in detail." },
  { id: "gse-72-p-1", gse: 72, fn: "Presenting", text: "Can describe places in detail using linguistically complex language." },

  // ── C1 (GSE 76–84) ────────────────────────────────────────────────────
  { id: "gse-76-m-1", gse: 76, fn: "Mediating", text: "Can demonstrate sensitivity to different viewpoints, using repetition and paraphrase to demonstrate a detailed understanding of each party's requirements for an agreement." },
  { id: "gse-76-m-2", gse: 76, fn: "Mediating", text: "Can paraphrase and interpret complex, technical texts, using suitably non-technical language for a recipient who does not have specialist knowledge." },
  { id: "gse-80-m-1", gse: 80, fn: "Mediating", text: "Can participate in discussions using linguistically complex language to compare, contrast and summarise information." },
  { id: "gse-83-m-1", gse: 83, fn: "Mediating", text: "Can summarise group discussions on a wide range of linguistically complex topics." },
  { id: "gse-76-p-1", gse: 76, fn: "Presenting", text: "Can answer questions about abstract topics clearly and in detail." },
  { id: "gse-78-p-1", gse: 78, fn: "Presenting", text: "Can give a detailed account of a complex subject, ending with a clear conclusion." },

  // ── C2 (GSE 85–90) ────────────────────────────────────────────────────
  { id: "gse-87-m-1", gse: 87, fn: "Mediating", text: "Can summarise, evaluate and link the various contributions in order to facilitate agreement for a solution or way forward." },
];


// ═════════════════════════════════════════════════════════════════════════════
// 6. AZE MACRO DESCRIPTORS (the assessable layer)
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [

  // ── B1 (GSE 43–50) ────────────────────────────────────────────────────
  {
    azeId: "DIR-1",
    claim: "Can give simple instructions and make recommendations about a familiar process",
    fn: "Directing",
    level: "B1",
    microIds: ["gse-45-d-1", "gse-47-d-1", "gse-48-d-1", "gse-50-d-1"],
    probes: [
      "'Walk me through this step by step.' — listen for sequential instructions",
      "'What should someone do first?' — listen for clear recommendation",
      "'I don't understand that step — can you make it simpler?' — listen for slowing down, breaking into smaller parts",
    ],
    notes: "At B1, expect step-by-step description following the visual order. Repair = repeating more slowly or breaking into smaller chunks.",
  },
  {
    azeId: "MED-7",
    claim: "Can paraphrase simple statements about a process in their own words",
    fn: "Mediating",
    level: "B1",
    microIds: ["gse-43-m-1", "gse-48-m-1"],
    probes: [
      "AI feigns confusion: 'Sorry, I didn't follow that. Can you say it differently?' — listen for restatement in own words, not just repetition",
    ],
    notes: "Key repair diagnostic. If they just repeat the same words louder/slower = NOT_YET. If they find different words = CAN.",
  },
  {
    azeId: "PRE-1",
    claim: "Can give a short explanation of a familiar process using visual support",
    fn: "Presenting",
    level: "B1",
    microIds: ["gse-44-p-1"],
    probes: [
      "'Tell me what this shows.' — listen for coherent overview of the process",
    ],
    notes: "The initial explanation phase. Accept short, ordered descriptions. They don't need to go deep — just cover the main steps.",
  },

  // ── B1+ (GSE 51–58) ──────────────────────────────────────────────────
  {
    azeId: "DIR-2",
    claim: "Can explain how a process works using everyday examples and break it into clear steps",
    fn: "Directing",
    level: "B1_PLUS",
    microIds: ["gse-55-d-1", "gse-56-d-1", "gse-56-d-2"],
    probes: [
      "'Can you give me an example of how this step works in real life?' — listen for concrete example from everyday experience",
      "'That's quite complicated — can you break it down for me?' — listen for restructuring into simpler list of points",
    ],
    notes: "Step up from B1: they connect the process to real-world examples, not just describe what's on screen.",
  },
  {
    azeId: "MED-8",
    claim: "Can summarise and comment on the process, answering follow-up questions in detail",
    fn: "Mediating",
    level: "B1_PLUS",
    microIds: ["gse-53-m-1", "gse-56-m-1"],
    probes: [
      "'So what's the most important step and why?' — listen for summary + opinion",
      "'Can you explain that part again in a different way?' — listen for rephrasing, not repetition",
    ],
    notes: "They should add commentary and opinion, not just describe. 'I think the hardest part is X because...'",
  },
  {
    azeId: "PRE-2",
    claim: "Can develop an explanation with supporting points using common expressions",
    fn: "Presenting",
    level: "B1_PLUS",
    microIds: ["gse-53-p-1"],
    probes: [
      "'Why does this step come before that one?' — listen for logical reasoning about sequence",
    ],
    notes: "Beyond description: they explain WHY the process works this way, not just WHAT the steps are.",
  },

  // ── B2 (GSE 59–66) ────────────────────────────────────────────────────
  {
    azeId: "DIR-3",
    claim: "Can give detailed instructions, suggest solutions to problems, and refocus an explanation when needed",
    fn: "Directing",
    level: "B2",
    microIds: ["gse-59-d-1", "gse-60-d-1", "gse-61-d-1", "gse-62-d-1", "gse-65-d-1", "gse-66-d-1"],
    probes: [
      "'What happens if something goes wrong at this step?' — listen for problem-solving with explanation",
      "'I'm confused — I thought step 3 came before step 2?' — listen for refocusing: 'Actually, let me explain it differently...'",
      "'What advice would you give someone about to go through this?' — listen for practical, detailed guidance",
    ],
    notes: "At B2, they should be able to handle disruptions to their explanation — AI deliberately confuses the order or misunderstands, and they recover smoothly.",
  },
  {
    azeId: "MED-9",
    claim: "Can paraphrase in simpler terms and summarise contrasting points within the process",
    fn: "Mediating",
    level: "B2",
    microIds: ["gse-60-m-1", "gse-66-m-1", "gse-66-m-2"],
    probes: [
      "AI feigns confusion with wrong paraphrase: 'So you're saying X?' (where X is wrong) — listen for correction that paraphrases simply",
      "'What's the difference between the two paths in this diagram?' — listen for clear contrast of alternatives",
    ],
    notes: "Repair at B2 = not just finding different words, but simplifying the whole explanation for the listener. They adapt to what the AI didn't understand.",
  },
  {
    azeId: "PRE-3",
    claim: "Can develop clear explanations with speculation, comparison, and supporting examples",
    fn: "Presenting",
    level: "B2",
    microIds: ["gse-59-p-1", "gse-60-p-1", "gse-63-p-1", "gse-64-p-1", "gse-64-p-2", "gse-65-p-1", "gse-66-p-1", "gse-66-p-2", "gse-66-p-3"],
    probes: [
      "'What do you think would happen if someone skipped this step?' — listen for speculation about consequences",
      "'How does this compare to how it works in your country?' — listen for comparison with reasoning",
      "'Is there a better way to do this?' — listen for argument with supporting points",
    ],
    notes: "B2 Presenting is rich — they should speculate, compare, argue. Not just describe but analyse the process.",
  },

  // ── B2+ (GSE 67–75) ──────────────────────────────────────────────────
  {
    azeId: "DIR-4",
    claim: "Can give detailed technical explanations and focus attention on key aspects through targeted questions",
    fn: "Directing",
    level: "B2_PLUS",
    microIds: ["gse-73-d-1", "gse-75-d-1"],
    probes: [
      "'Explain the decision point in this process as if I need to make this decision tomorrow.' — listen for precise, technical detail",
      "'What questions would you ask someone to check they understood this process?' — listen for targeted comprehension questions",
    ],
    notes: "At B2+, they should be able to teach this process, not just describe it. Listen for instructional sophistication.",
  },
  {
    azeId: "MED-10",
    claim: "Can paraphrase using a range of linguistic devices and summarise complex information precisely",
    fn: "Mediating",
    level: "B2_PLUS",
    microIds: ["gse-69-m-1", "gse-70-m-1", "gse-73-m-1", "gse-73-m-2"],
    probes: [
      "AI feigns confusion at a conceptual level: 'But I don't see why this step is necessary at all?' — listen for varied paraphrasing strategies (circumlocution, analogy, reformulation)",
      "'Can you sum up the whole process in two sentences?' — listen for precise, complete summary",
    ],
    notes: "Repair at B2+ = multiple paraphrasing strategies, not just one. They use analogy, circumlocution, restructuring flexibly.",
  },
  {
    azeId: "PRE-4",
    claim: "Can speculate about causes, discuss trends, and describe in linguistically complex language",
    fn: "Presenting",
    level: "B2_PLUS",
    microIds: ["gse-67-p-1", "gse-69-p-1", "gse-72-p-1"],
    probes: [
      "'Why do you think this process exists? What problem does it solve?' — listen for speculation about underlying causes",
      "'Has this kind of process changed over time?' — listen for discussion of trends with linguistic complexity",
    ],
  },

  // ── C1 (GSE 76–84) ────────────────────────────────────────────────────
  {
    azeId: "MED-11",
    claim: "Can paraphrase complex content for non-specialist audiences with sensitivity to different perspectives",
    fn: "Mediating",
    level: "C1",
    microIds: ["gse-76-m-1", "gse-76-m-2", "gse-80-m-1", "gse-83-m-1"],
    probes: [
      "AI plays confused non-expert: 'I've never done anything like this before — can you explain it as if I'm completely new to this?' — listen for register shift to non-technical language",
      "'Different people might see this process differently — a customer vs the company, for example. Can you explain both perspectives?' — listen for sensitivity to viewpoints",
    ],
    notes: "C1 Mediating = they adjust register, show awareness that different audiences need different explanations, and restructure the whole explanation for the listener's needs.",
  },
  {
    azeId: "PRE-5",
    claim: "Can give a detailed account of a complex process, answering abstract questions with a clear conclusion",
    fn: "Presenting",
    level: "C1",
    microIds: ["gse-76-p-1", "gse-78-p-1"],
    probes: [
      "'What does this process tell us about how [systems/organisations/societies] work?' — listen for abstract reasoning grounded in the concrete process",
      "'Give me a complete explanation from start to finish, ending with your overall assessment.' — listen for structured account with clear conclusion",
    ],
    notes: "C1 Presenting = they go beyond the visual to abstract principles. The process becomes a case study for broader discussion.",
  },

  // ── C2 (GSE 85–90) ────────────────────────────────────────────────────
  {
    azeId: "MED-12",
    claim: "Can synthesise, evaluate, and link different aspects of the process to facilitate understanding",
    fn: "Mediating",
    level: "C2",
    microIds: ["gse-87-m-1"],
    probes: [
      "'Pull together everything we've discussed — the process, the problems, the different perspectives — and tell me what matters most.' — listen for synthesis, evaluation, and linking, not just summary",
    ],
    notes: "C2 = near-native sophistication. They evaluate relative importance, link disparate points, and propose insights. Beyond summarising to synthesising.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 7. LEVEL CLUSTERS (routing + threshold rules)
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "B1",
    label: "B1",
    gseRange: [43, 50],
    macroIds: ["DIR-1", "MED-7", "PRE-1"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B1. Probe B1+.",
    levelDescription: "Can describe a process step by step following the visual. When confused, can repeat more slowly or break into smaller parts. Basic paraphrase in own words.",
  },
  {
    level: "B1_PLUS",
    label: "B1+",
    gseRange: [51, 58],
    macroIds: ["DIR-2", "MED-8", "PRE-2"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B1+. Probe B2.",
    levelDescription: "Can explain with real-world examples, break complex info into clear steps, and add commentary/opinion. Repair = rephrase, not just repeat.",
  },
  {
    level: "B2",
    label: "B2",
    gseRange: [59, 66],
    macroIds: ["DIR-3", "MED-9", "PRE-3"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B2. Probe B2+.",
    levelDescription: "Can give detailed instructions, handle disruptions to explanation, suggest solutions. Speculates, compares, argues about the process. Repair = simplifies for the listener.",
  },
  {
    level: "B2_PLUS",
    label: "B2+",
    gseRange: [67, 75],
    macroIds: ["DIR-4", "MED-10", "PRE-4"],
    confirmThreshold: 2,
    totalMacros: 3,
    onConfirm: "Confirmed B2+. Probe C1.",
    levelDescription: "Can teach the process with instructional sophistication. Multiple paraphrasing strategies. Discusses causes and trends with linguistic complexity.",
  },
  {
    level: "C1",
    label: "C1",
    gseRange: [76, 84],
    macroIds: ["MED-11", "PRE-5"],
    confirmThreshold: 2,
    totalMacros: 2,
    onConfirm: "Confirmed C1. Probe C2.",
    levelDescription: "Can adjust register for non-specialist audiences. Shows awareness of different perspectives. Abstracts from the specific process to broader principles.",
  },
  {
    level: "C2",
    label: "C2",
    gseRange: [85, 90],
    macroIds: ["MED-12"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "C2 confirmed. Maximum level.",
    levelDescription: "Synthesises and evaluates, not just summarises. Links disparate aspects to facilitate understanding. Near-native sophistication.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// 8. EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const TASK3: Task3Config = {
  meta,
  principles,
  visuals,
  gseMicro,
  azeMacro,
  levelClusters,
};
