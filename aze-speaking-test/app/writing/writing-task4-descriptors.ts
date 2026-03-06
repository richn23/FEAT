// ─────────────────────────────────────────────────────────────────────────────
// writing-task4-descriptors.ts — Single source of truth for Writing Task 4
//
// PURE CONFIG. No API routes. No OpenAI calls. No UI components.
//
// Task 4: Rephrase & Adjust
// Format: Series of short stimulus → rewrite challenges
// Functions tested: MEDIATING (paraphrasing, simplifying, adjusting register)
// Who: Everyone
//
// CHANGES v2:
//   • Stimulus pool rebuilt on FAIR MEDIATION PRINCIPLE:
//       simple concept + complex language = fair task
//     Sources: corporate announcements, government notices, policy statements,
//     bureaucratic instructions, legal-style wording.
//     Avoids: domain knowledge, statistics, technical expertise.
//   • Pool expanded to 21 items (3 per level band)
//   • Route picks 3-4 items per session based on diagnosed level
//
// DIFFICULTY PROGRESSION (B1 → C1):
//   B1:    Single sentence. Simple concept. Dense but not technical vocabulary.
//          Candidate rewrites meaning in own words.
//   B1+:   Short paragraph. Bureaucratic/formal register.
//          Candidate shifts to casual/friendly while keeping meaning.
//   B2:    2-3 sentences. Corporate or policy language.
//          Candidate simplifies for a general reader — structure must change.
//   B2+:   Paragraph. Dense formal language, simple idea.
//          Candidate rewrites for a specific stated audience.
//   C1:    Full paragraph. Multiple register layers.
//          Candidate does full pragmatic transformation — no trace of source register.
// ─────────────────────────────────────────────────────────────────────────────

export type CefrLevel =
  | "A2" | "A2_PLUS"
  | "B1" | "B1_PLUS"
  | "B2" | "B2_PLUS" | "C1";

export type FunctionType = "Mediating";
export type MacroVerdict = "CAN" | "NOT_YET" | "NOT_TESTED";
export type ChallengeType = "simplify" | "formalise" | "audience" | "tone";

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

export interface StimulusItem {
  id: string;
  level: CefrLevel;
  type: ChallengeType;
  label: string;
  instruction: string;
  stimulus: string;
  targetMacroIds: string[];
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

export interface WritingTask4Config {
  meta: {
    taskId: string;
    title: string;
    functions: FunctionType[];
    description: string;
  };
  principles: {
    stimulusProvided: boolean;
    transformationNotCreation: boolean;
    functionAndFormSeparate: boolean;
    macrosAreTopicAgnostic: boolean;
    adaptiveStimulus: boolean;
    fairMediationPrinciple: string;
    itemsServedPerSession: number;
  };
  stimulusItems: StimulusItem[];
  gseMicro: GseMicro[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
}


// ═════════════════════════════════════════════════════════════════════════════
// METADATA
// ═════════════════════════════════════════════════════════════════════════════

const meta: WritingTask4Config["meta"] = {
  taskId: "w-task-4",
  title: "Rephrase & Adjust",
  functions: ["Mediating"],
  description:
    "Series of short stimulus-response challenges. Candidate reads a text and rewrites it " +
    "for a different audience, register, or level of complexity. Tests pragmatic competence: " +
    "paraphrasing, simplifying, formalising, and audience adjustment. " +
    "All stimulus texts follow the fair mediation principle: simple concept + complex language.",
};

const principles: WritingTask4Config["principles"] = {
  stimulusProvided: true,
  transformationNotCreation: true,
  functionAndFormSeparate: true,
  macrosAreTopicAgnostic: true,
  adaptiveStimulus: true,
  fairMediationPrinciple:
    "Stimulus texts must contain simple concepts expressed in complex language. " +
    "Candidates should never need domain knowledge, statistics, or technical expertise. " +
    "Use: corporate announcements, government notices, policy statements, bureaucratic instructions.",
  itemsServedPerSession: 3,
};


// ═════════════════════════════════════════════════════════════════════════════
// STIMULUS POOL (21 items — 3 per level band)
//
// All texts follow: simple concept + complex language.
// Route picks 3 items per session based on diagnosed level from previous tasks.
// Every session gets different texts — reduces memorisation risk.
//
// Selection logic (in route):
//   - 1 item at candidate's level (core diagnostic)
//   - 1 item one level below (build confidence)
//   - 1 item one level above (stretch)
// ═════════════════════════════════════════════════════════════════════════════

const stimulusItems: StimulusItem[] = [

  // ── A2 — single sentence, word-level substitution ──────────────────────
  // Concept: simple. Language: slightly formal. Candidate swaps words.
  {
    id: "a2-1",
    level: "A2",
    type: "simplify",
    label: "Make it simpler",
    instruction: "Rewrite this sentence using simpler, everyday words.",
    stimulus: "The accommodation was satisfactory and the cuisine was exceptional.",
    targetMacroIds: ["W4-F1"],
    notes: "Tests basic word substitution. 'Accommodation' → 'hotel/room', 'cuisine' → 'food'.",
  },
  {
    id: "a2-2",
    level: "A2",
    type: "simplify",
    label: "Make it simpler",
    instruction: "Rewrite this sentence using simpler, everyday words.",
    stimulus: "Your request has been received and is currently under consideration.",
    targetMacroIds: ["W4-F1"],
    notes: "Concept: we got your message and we're thinking about it.",
  },
  {
    id: "a2-3",
    level: "A2",
    type: "simplify",
    label: "Make it simpler",
    instruction: "Rewrite this sentence using simpler, everyday words.",
    stimulus: "Attendance at the orientation session is mandatory for all new personnel.",
    targetMacroIds: ["W4-F1"],
    notes: "Concept: new staff must come to the introductory meeting.",
  },

  // ── A2+ — single sentence, full restatement in own words ───────────────
  // Concept: simple. Language: formal notice style. Candidate restates whole sentence.
  {
    id: "a2p-1",
    level: "A2_PLUS",
    type: "simplify",
    label: "Say it differently",
    instruction: "Rewrite this sentence in your own words. Keep the same meaning.",
    stimulus: "Passengers are reminded that the consumption of food and beverages is prohibited in designated areas.",
    targetMacroIds: ["W4-F2"],
    notes: "Concept: don't eat or drink in certain areas.",
  },
  {
    id: "a2p-2",
    level: "A2_PLUS",
    type: "simplify",
    label: "Say it differently",
    instruction: "Rewrite this sentence in your own words. Keep the same meaning.",
    stimulus: "The premises will be temporarily inaccessible during scheduled maintenance works.",
    targetMacroIds: ["W4-F2"],
    notes: "Concept: the building will be closed while repairs are done.",
  },
  {
    id: "a2p-3",
    level: "A2_PLUS",
    type: "simplify",
    label: "Say it differently",
    instruction: "Rewrite this sentence in your own words. Keep the same meaning.",
    stimulus: "Residents are advised that waste collection services will be suspended on public holidays.",
    targetMacroIds: ["W4-F2"],
    notes: "Concept: bins won't be collected on public holidays.",
  },

  // ── B1 — short text, main idea paraphrased in own language ─────────────
  // Concept: simple (meeting moved, policy change, announcement).
  // Language: formal notice style. Candidate captures main point in own words.
  {
    id: "b1-1",
    level: "B1",
    type: "tone",
    label: "Make it friendly",
    instruction: "Rewrite this as a casual message to a colleague — like a text or short chat message.",
    stimulus: "Please be advised that the scheduled team meeting has been relocated to Conference Room B and the commencement time has been amended to 15:00.",
    targetMacroIds: ["W4-F3"],
    notes: "Concept: meeting moved to a different room, starts at 3pm.",
  },
  {
    id: "b1-2",
    level: "B1",
    type: "tone",
    label: "Make it friendly",
    instruction: "Rewrite this as a casual message to a friend — like a WhatsApp message.",
    stimulus: "I regret to inform you that I am unable to attend the forthcoming social engagement due to a prior commitment that was not previously communicated.",
    targetMacroIds: ["W4-F3"],
    notes: "Concept: sorry I can't come — I forgot I had something else on.",
  },
  {
    id: "b1-3",
    level: "B1",
    type: "tone",
    label: "Make it friendly",
    instruction: "Rewrite this notice as a friendly message from a manager to their team.",
    stimulus: "Staff are reminded that the submission deadline for the quarterly performance documentation is Friday of the current week.",
    targetMacroIds: ["W4-F3"],
    notes: "Concept: reports are due this Friday.",
  },

  // ── B1+ — short paragraph, register shift (casual → formal or vice versa)
  // Candidate must change both vocabulary AND sentence structure.
  {
    id: "b1p-1",
    level: "B1_PLUS",
    type: "formalise",
    label: "Make it formal",
    instruction: "Rewrite this casual message as a formal email to your manager.",
    stimulus: "Hey, just wanted to let you know I can't make it tomorrow. Got a doctor's appointment I totally forgot about. Can we move our catch-up to next week? Sorry about that!",
    targetMacroIds: ["W4-F4"],
    notes: "Concept: can't attend tomorrow, asking to reschedule.",
  },
  {
    id: "b1p-2",
    level: "B1_PLUS",
    type: "formalise",
    label: "Make it formal",
    instruction: "Rewrite this text message as a formal complaint email to a company.",
    stimulus: "Hi, I bought something from your shop last week and it's totally broken already. Really not happy about this. Can someone sort this out for me?",
    targetMacroIds: ["W4-F4"],
    notes: "Concept: product is defective, requesting resolution.",
  },
  {
    id: "b1p-3",
    level: "B1_PLUS",
    type: "tone",
    label: "Make it warmer",
    instruction: "Rewrite this notice so it sounds warmer and more human — like it was written by a person, not a department.",
    stimulus: "Employees are advised that all annual leave requests must be submitted via the designated HR portal no less than four weeks prior to the intended commencement of leave.",
    targetMacroIds: ["W4-F4"],
    notes: "Concept: book your holiday at least 4 weeks in advance through the HR system.",
  },

  // ── B2 — 2-3 sentences, complex language, simple concept
  // Candidate must simplify structure AND vocabulary. General reader target.
  {
    id: "b2-1",
    level: "B2",
    type: "simplify",
    label: "Simplify for a general reader",
    instruction: "Rewrite this so that any adult could understand it easily. Change the structure as well as the words.",
    stimulus: "The organisation has undertaken a comprehensive review of its operational expenditure and, following consultation with relevant stakeholders, has determined that a reduction in discretionary spending across all departments is necessary with immediate effect.",
    targetMacroIds: ["W4-F5"],
    notes: "Concept: after a review, we're cutting non-essential spending everywhere, starting now.",
  },
  {
    id: "b2-2",
    level: "B2",
    type: "simplify",
    label: "Simplify for a general reader",
    instruction: "Rewrite this government notice so that any member of the public could understand it immediately.",
    stimulus: "Pursuant to amendments to existing legislative frameworks, residents will be required to demonstrate compliance with revised waste segregation protocols in accordance with updated municipal guidelines, effective from the first day of the forthcoming calendar month.",
    targetMacroIds: ["W4-F5"],
    notes: "Concept: new recycling rules start next month and residents must follow them.",
  },
  {
    id: "b2-3",
    level: "B2",
    type: "simplify",
    label: "Simplify for a general reader",
    instruction: "Rewrite this policy statement so that a new employee with no experience of corporate language could understand it.",
    stimulus: "In the interest of maintaining organisational integrity, all personnel are required to exercise due diligence in the appropriate classification and secure handling of commercially sensitive documentation, in line with prevailing data governance policies.",
    targetMacroIds: ["W4-F5"],
    notes: "Concept: keep confidential documents safe and handle them carefully.",
  },

  // ── B2+ — paragraph, audience-specific rewrite
  // Candidate adapts vocabulary, examples, and framing for a stated audience.
  {
    id: "b2p-1",
    level: "B2_PLUS",
    type: "audience",
    label: "Change the audience",
    instruction: "Rewrite this for a parent explaining it to a 10-year-old child.",
    stimulus: "Access to the residential premises will be temporarily suspended during the scheduled infrastructure maintenance period. Occupants are advised to make alternative arrangements for the duration of the disruption, which is anticipated to extend over a 48-hour period commencing Thursday.",
    targetMacroIds: ["W4-F6"],
    notes: "Concept: we can't go home for two days from Thursday because of repairs.",
  },
  {
    id: "b2p-2",
    level: "B2_PLUS",
    type: "audience",
    label: "Change the audience",
    instruction: "Rewrite this as a post for a neighbourhood community social media group.",
    stimulus: "The local authority wishes to advise residents that construction activities pertaining to the planned road resurfacing project will commence on Monday and are expected to result in temporary traffic management measures along the affected route for a period of up to three weeks.",
    targetMacroIds: ["W4-F6"],
    notes: "Concept: road works start Monday, expect traffic disruption for up to 3 weeks.",
  },
  {
    id: "b2p-3",
    level: "B2_PLUS",
    type: "audience",
    label: "Change the audience",
    instruction: "Rewrite this for a new staff member on their first day — make it welcoming and easy to understand.",
    stimulus: "All employees are required to complete mandatory compliance training modules via the designated e-learning platform within 30 days of commencement of employment, in accordance with organisational policy and applicable regulatory requirements.",
    targetMacroIds: ["W4-F6"],
    notes: "Concept: you have 30 days to complete some online training — it's required.",
  },

  // ── C1 — full paragraph, complete pragmatic transformation
  // No trace of source register in the output. Natural in the target register.
  {
    id: "c1-1",
    level: "C1",
    type: "tone",
    label: "Professional to personal",
    instruction: "This is from a company's official statement. Rewrite it as if the CEO were explaining the same thing honestly and personally in a blog post.",
    stimulus: "Following a comprehensive strategic review, the organisation has determined that a restructuring of operational divisions is necessary to ensure long-term sustainability. This will regrettably necessitate a reduction in workforce of approximately 15%, effective Q2. Affected employees will be provided with comprehensive transition support packages.",
    targetMacroIds: ["W4-F6", "W4-F7"],
    notes: "Concept: company is cutting 15% of staff. CEO explains this personally and honestly.",
  },
  {
    id: "c1-2",
    level: "C1",
    type: "audience",
    label: "Formal to honest",
    instruction: "This is from a politician's official statement. Rewrite it as if they were explaining the same decision honestly to a friend over coffee.",
    stimulus: "The government has carefully considered all available evidence and has concluded, following extensive cross-departmental consultation, that the implementation of the proposed policy initiative at the current juncture would not be in the best interests of the wider public, and has therefore elected to defer consideration of the matter to a subsequent legislative cycle.",
    targetMacroIds: ["W4-F7"],
    notes: "Concept: we decided not to do it right now — we're pushing it to later.",
  },
  {
    id: "c1-3",
    level: "C1",
    type: "tone",
    label: "Corporate to human",
    instruction: "This is an automated customer service response. Rewrite it as if a real, empathetic person were responding to the complaint.",
    stimulus: "We acknowledge receipt of your communication regarding your recent service experience. Your feedback has been logged and will be escalated to the relevant department for investigation. A representative will contact you within 5-7 business days. We apologise for any inconvenience this matter may have caused.",
    targetMacroIds: ["W4-F7"],
    notes: "Concept: we got your complaint, someone will look into it and call you back.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// GSE MICRO DESCRIPTORS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const gseMicro: GseMicro[] = [
  { id: "w4-gse-36", gse: 36, fn: "Mediating", text: "Can paraphrase short simple statements using basic vocabulary." },
  { id: "w4-gse-43", gse: 43, fn: "Mediating", text: "Can paraphrase a simple factual statement." },
  { id: "w4-gse-49", gse: 49, fn: "Mediating", text: "Can summarise or paraphrase the main points of a short text." },
  { id: "w4-gse-55", gse: 55, fn: "Mediating", text: "Can adapt language to make a text suitable for a different audience." },
  { id: "w4-gse-62", gse: 62, fn: "Mediating", text: "Can rephrase complex information in a simpler form." },
  { id: "w4-gse-65", gse: 65, fn: "Mediating", text: "Can adjust register and tone to suit different contexts." },
  { id: "w4-gse-70", gse: 70, fn: "Mediating", text: "Can simplify a source text while retaining essential meaning." },
  { id: "w4-gse-76", gse: 76, fn: "Mediating", text: "Can reformulate complex texts, adapting register and style." },
  { id: "w4-gse-82", gse: 82, fn: "Mediating", text: "Can mediate between different registers with full pragmatic control." },
];


// ═════════════════════════════════════════════════════════════════════════════
// AZE MACRO DESCRIPTORS (unchanged — topic-agnostic)
// ═════════════════════════════════════════════════════════════════════════════

const azeMacro: AzeMacro[] = [
  {
    azeId: "W4-F1",
    claim: "Can replace words with simpler alternatives",
    fn: "Mediating",
    level: "A2",
    microIds: ["w4-gse-36"],
    signals: [
      "Swaps individual words for simpler ones",
      "Core meaning is preserved",
      "Even if clumsy, the intent to simplify is clear",
    ],
    notes: "Word-level swaps count. Full restructuring not expected.",
  },
  {
    azeId: "W4-F2",
    claim: "Can restate a simple sentence in different words",
    fn: "Mediating",
    level: "A2_PLUS",
    microIds: ["w4-gse-43"],
    signals: [
      "Rewrites a sentence — not just swaps one word",
      "Meaning is preserved",
      "Uses their own phrasing, not copied from stimulus",
    ],
  },
  {
    azeId: "W4-F3",
    claim: "Can paraphrase the main idea of a short text",
    fn: "Mediating",
    level: "B1",
    microIds: ["w4-gse-49"],
    signals: [
      "Captures the main point, not just individual sentences",
      "Uses own language throughout — not patch-and-replace",
      "Reader gets the same message from a clearly different text",
    ],
  },
  {
    azeId: "W4-F4",
    claim: "Can adjust tone or formality level",
    fn: "Mediating",
    level: "B1_PLUS",
    microIds: ["w4-gse-55"],
    signals: [
      "Shifts register — informal becomes formal or vice versa",
      "Not just word swaps — sentence structure changes too",
      "The tone shift is noticeable and appropriate",
    ],
  },
  {
    azeId: "W4-F5",
    claim: "Can simplify complex information while keeping essential meaning",
    fn: "Mediating",
    level: "B2",
    microIds: ["w4-gse-62", "w4-gse-70"],
    signals: [
      "Complex input becomes genuinely simpler output",
      "Key information is preserved — nothing essential lost",
      "Structural changes, not just vocabulary swaps",
      "A less proficient reader could understand the result",
    ],
  },
  {
    azeId: "W4-F6",
    claim: "Can rewrite for a specific audience with clear adaptation",
    fn: "Mediating",
    level: "B2_PLUS",
    microIds: ["w4-gse-65"],
    signals: [
      "Output is clearly written FOR the target audience",
      "Vocabulary, structure, and examples adapt to the reader",
      "Not just simpler — audience-appropriate",
    ],
  },
  {
    azeId: "W4-F7",
    claim: "Can fully reformulate a text with pragmatic control across registers",
    fn: "Mediating",
    level: "C1",
    microIds: ["w4-gse-76", "w4-gse-82"],
    signals: [
      "Complete pragmatic transformation — not partial adjustment",
      "Register, style, and structure all shift coherently",
      "Result reads naturally in the target register",
      "Nothing sounds 'translated' or forced",
    ],
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// LEVEL CLUSTERS + THRESHOLDS (unchanged)
// ═════════════════════════════════════════════════════════════════════════════

const levelClusters: LevelCluster[] = [
  {
    level: "A2",
    label: "A2",
    gseRange: [30, 35],
    macroIds: ["W4-F1"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A2. Probe A2+.",
    levelDescription: "Can replace words with simpler alternatives.",
  },
  {
    level: "A2_PLUS",
    label: "A2+",
    gseRange: [36, 42],
    macroIds: ["W4-F2"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed A2+. Probe B1.",
    levelDescription: "Can restate a simple sentence in different words.",
  },
  {
    level: "B1",
    label: "B1",
    gseRange: [43, 50],
    macroIds: ["W4-F3"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B1. Probe B1+.",
    levelDescription: "Can paraphrase the main idea of a short text.",
  },
  {
    level: "B1_PLUS",
    label: "B1+",
    gseRange: [51, 58],
    macroIds: ["W4-F4"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B1+. Probe B2.",
    levelDescription: "Can adjust tone or formality level.",
  },
  {
    level: "B2",
    label: "B2",
    gseRange: [59, 66],
    macroIds: ["W4-F5"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B2. Probe B2+.",
    levelDescription: "Can simplify complex information while keeping meaning.",
  },
  {
    level: "B2_PLUS",
    label: "B2+",
    gseRange: [67, 75],
    macroIds: ["W4-F6"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed B2+. Probe C1.",
    levelDescription: "Can rewrite for a specific audience with clear adaptation.",
  },
  {
    level: "C1",
    label: "C1",
    gseRange: [76, 84],
    macroIds: ["W4-F7"],
    confirmThreshold: 1,
    totalMacros: 1,
    onConfirm: "Confirmed C1. Ceiling for Task 4.",
    levelDescription: "Full pragmatic reformulation with register control.",
  },
];


// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

export const WRITING_TASK4: WritingTask4Config = {
  meta,
  principles,
  stimulusItems,
  gseMicro,
  azeMacro,
  levelClusters,
};

export default WRITING_TASK4;