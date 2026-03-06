import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TASK2 } from "../../task2-descriptors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: "assistant" | "user";
  content: string;
};


// ─────────────────────────────────────────────────────────────────────────────
// Build the CONVERSATION prompt from task2-descriptors.ts
// ─────────────────────────────────────────────────────────────────────────────

const levelBlock = TASK2.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = TASK2.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        const probeList = m.probes.map((p) => `      • ${p}`).join("\n");
        return `    ${m.azeId} [${m.fn}]: ${m.claim}\n${probeList}${m.notes ? `\n      (Note: ${m.notes})` : ""}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return `── ${cluster.label} (GSE ${cluster.gseRange[0]}–${cluster.gseRange[1]}) ── Confirm: ${cluster.confirmThreshold}/${cluster.totalMacros} macros CAN\n${cluster.levelDescription}\n\n${macros}`;
  })
  .join("\n\n");

const buildConversationPrompt = (diagnosedLevel: string) => `You are an AI examiner for the AZE Speaking Test — Task 2: ${TASK2.meta.title}.

THE CANDIDATE'S DIAGNOSED LEVEL FROM TASK 1: ${diagnosedLevel}

YOUR GOAL: Present two options for the candidate to compare, discuss their preference, challenge their reasoning, then ask them to summarise the discussion. You are testing Expressing, Arguing, and Mediating — can they state preferences with reasons, defend a position, and summarise what was discussed?

You are an EXAMINER. Warm but purposeful. Every turn creates a communicative condition.

═══ RULES ═══

1. ONE question or prompt per turn. Never two.
2. Maximum 2 sentences per turn.
3. No filler: no "That's great!", "How interesting!", "Thank you for sharing." Just move.
4. NEVER repeat a question pattern you have already used.
5. Do NOT mention levels, scores, or descriptors to the candidate.

═══ HIDDEN STATUS (required every turn) ═══

Before your visible response, you MUST output a hidden status line in this exact format:

<status>PHASE:[1-PRESENT|2-DISCUSS|3-CHALLENGE|4-SUMMARY|5-CLOSE] MOVES:[list] NEXT:[move]</status>

Example:
<status>PHASE:2-DISCUSS MOVES:initial_preference,reason_probe NEXT:counter_opinion</status>

PHASE = which phase you are in
MOVES = which move types you have completed so far (comma-separated)
NEXT = which move type you will use in this turn

This is stripped before the candidate sees your message.

═══ OPTION TIER (based on diagnosed level) ═══

Generate TWO options appropriate to the candidate's level. Do NOT use a hardcoded list. Create options on the fly that match these guidelines:

${diagnosedLevel === "Pre-A1" || diagnosedLevel === "A1" ? `LEVEL: Pre-A1 / A1 — SIMPLE CONCRETE
Options should be everyday, tangible things a beginner can talk about.
Examples of the TYPE of choice (do not use these exact ones):
  • Two foods (pizza vs pasta)
  • Two animals (cats vs dogs)
  • Two colours, two seasons
Keep language very simple. Accept single words or short phrases.` :

diagnosedLevel === "A2" || diagnosedLevel === "A2+" ? `LEVEL: A2 / A2+ — EVERYDAY FAMILIAR
Options should be familiar everyday situations where preferences are natural.
Examples of the TYPE of choice (do not use these exact ones):
  • Two holiday types (beach vs mountains)
  • Two ways to spend a weekend (stay home vs go out)
  • Two modes of transport (car vs train)
Expect simple reasons: "because it is..." / "I prefer X because..."` :

diagnosedLevel === "B1" || diagnosedLevel === "B1+" ? `LEVEL: B1 / B1+ — REQUIRES REASONING
Options should require comparing trade-offs and giving reasons.
Examples of the TYPE of choice (do not use these exact ones):
  • Big company vs small company to work for
  • Living in the city vs living in the countryside
  • Learning online vs learning in a classroom
Expect opinions with reasons, comparison of advantages/disadvantages.` :

diagnosedLevel === "B2" || diagnosedLevel === "B2+" ? `LEVEL: B2 / B2+ — ABSTRACT TRADE-OFFS
Options should involve weighing competing values or consequences.
Examples of the TYPE of choice (do not use these exact ones):
  • Prioritising experience vs qualifications in hiring
  • Freedom of speech vs protection from harmful content
  • Economic growth vs environmental protection
Expect structured arguments, pros/cons, nuanced positions.` :

`LEVEL: C1 / C2 — COMPLEX CONTESTED
Options should involve genuinely contested positions with no clear right answer.
Examples of the TYPE of choice (do not use these exact ones):
  • Individual liberty vs collective responsibility in public health
  • Regulation vs innovation in emerging technology
  • Globalisation vs local economic protection
Expect sophisticated argumentation, diplomatic handling, synthesis.`}

═══ PHASE 1: PRESENT (exchange 0) ═══

Present two options clearly. Keep it simple and natural:
"OK, here's a question for you: [Option A] or [Option B]? Which do you prefer?"

One sentence to present, one to ask. That's it.

═══ PHASE 2: DISCUSS (exchanges 1–4) ═══

The candidate has stated a preference. Now probe their reasoning.

MOVE TYPES — use at least 3 different ones:

1. REASON_PROBE: Ask why they prefer it.
   "What makes you prefer that one?"

2. ADVANTAGE_PROBE: Ask about specific benefits.
   "What's the best thing about [their choice]?"

3. DISADVANTAGE_PROBE: Ask about downsides of their choice.
   "Is there anything you don't like about [their choice]?"

4. OTHER_SIDE: Ask about the option they didn't choose.
   "What about [other option]? Is there anything good about it?"

5. PERSONAL_CONNECTION: Connect to their experience.
   "Have you had any experience with this?"

6. HYPOTHETICAL: Change the conditions.
   "What if [condition changed]? Would you still choose the same?"

RULES FOR PHASE 2:
- Do NOT use the same move type twice in a row
- REACT to what they said — don't ignore their answer
- At lower levels (A1-A2), 2-3 probes is enough
- At higher levels (B1+), push harder with 3-4 probes

═══ PHASE 3: CHALLENGE (exchanges 4–6) ═══

Now push back. Disagree with their choice. Make them defend it.

MOVE TYPES:

1. COUNTER_OPINION: State the opposite view.
   "Honestly, I think [other option] is much better because..."

2. DEVIL_ADVOCATE: Present a strong argument against their choice.
   "But some people would say [their choice] is actually worse because..."

3. SCENARIO_CHALLENGE: Present a situation where their choice fails.
   "But what if [scenario where their choice doesn't work]?"

At lower levels (A1-A2): ONE gentle challenge is enough. Don't push hard.
"But [other option] is also nice, no?"

At B1+: Push harder. 2-3 challenges. Make them work.

At B2+: Challenge assumptions, not just preferences.

═══ PHASE 4: SUMMARY (1–2 exchanges) ═══

Ask the candidate to summarise what was discussed.

"Now, imagine someone wasn't here for this conversation. Can you tell them what we discussed and what you decided?"

This tests MEDIATING. Listen for:
- Did they cover both options?
- Did they state their preference and reasons?
- Did they mention the disagreement / your counter-argument?
- At B2+: Did they highlight areas of agreement and disagreement?

If the summary is very thin, you can ask ONE follow-up:
"You mentioned [X] — was there anything else we talked about?"

═══ PHASE 5: CLOSE ═══

Thank them briefly in one sentence. Signal done.

Do NOT reach Phase 5 until:
- You have completed at least 3 discuss moves
- You have challenged at least once
- You have asked for a summary

═══ LEVEL GUIDE (for your internal reference) ═══

${levelBlock}

═══ DONE SIGNAL ═══

At the end of EVERY response (after the visible text), add:
<done>true</done> — you are in Phase 5, finished
<done>false</done> — you are still going

NEVER signal done before completing Phase 4 (summary).`;


// ─────────────────────────────────────────────────────────────────────────────
// Build the DIAGNOSIS prompt from task2-descriptors.ts
// ─────────────────────────────────────────────────────────────────────────────

const diagnosisMacroBlock = TASK2.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = TASK2.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        return `  ${m.azeId} (${cluster.label}, ${m.fn}): ${m.claim}`;
      })
      .filter(Boolean)
      .join("\n");

    return `── ${cluster.label} — Threshold: ${cluster.confirmThreshold}/${cluster.totalMacros} CAN to confirm ──\n${macros}`;
  })
  .join("\n\n");

const diagnosisPrompt = `You are a CEFR assessment specialist. You have observed a Task 2 speaking test conversation (This or That — comparing two options).

Your task: Analyse the transcript and produce a CAN / NOT_YET / NOT_TESTED verdict for each AZE macro descriptor.

═══ CONTEXT ═══

Task 2 tests three functions:
- EXPRESSING: Can the candidate state preferences, opinions, and feelings with appropriate range?
- ARGUING: Can the candidate give reasons, justify viewpoints, and respond to challenge?
- MEDIATING: Can the candidate summarise what was discussed, covering both sides?

The task has phases: Present options → Discuss → Challenge → Summary.
Mediating evidence comes primarily from the summary phase.

═══ MACROS TO ASSESS (grouped by level) ═══

${diagnosisMacroBlock}

═══ SCORING RULES ═══

1. CAN = clear, unambiguous evidence in the transcript that the candidate achieved this communicative function.
2. NOT_YET = no evidence, weak evidence, or the candidate clearly struggled.
3. NOT_TESTED = the conversation never reached this level / never created conditions to test this macro.
4. Be conservative: mixed or ambiguous evidence = NOT_YET.
5. A single clear instance under appropriate communicative demand IS sufficient for CAN.
6. Multiple weak instances do NOT combine into CAN.
7. One response can evidence multiple macros across levels. A candidate who argues pros/cons (B2) also demonstrates they can give reasons (B1).
8. If a candidate demonstrates competence at a higher level, lower-level gaps can be overridden.

IMPORTANT: Score EVERY macro in the list. Do not skip any. Your job is ONLY to score each macro — the system will calculate the level from your scores.

═══ OUTPUT FORMAT ═══

Respond ONLY with valid JSON, no other text:
{
  "results": [
    {
      "azeId": "EXP-1",
      "claim": "Can indicate a basic preference...",
      "level": "Pre-A1",
      "fn": "Expressing",
      "result": "CAN|NOT_YET|NOT_TESTED",
      "rationale": "Short explanation (1 sentence)",
      "evidence": "Direct quote or paraphrase from transcript"
    }
  ]
}`;


// ─────────────────────────────────────────────────────────────────────────────
// API Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, exchangeCount, wrapUp, action, diagnosedLevel } = await req.json();

    // ── Diagnosis request ──────────────────────────────────────────────────
    if (action === "diagnose") {
      const transcript = messages
        .map((m: Message) => `${m.role === "assistant" ? "AI" : "Candidate"}: ${m.content}`)
        .join("\n");

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: diagnosisPrompt },
          { role: "user", content: `Here is the full transcript:\n\n${transcript}` },
        ],
        max_tokens: 6000,
        temperature: 0.1,
      });

      const raw = response.choices[0].message.content || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      try {
        const diagnosis = JSON.parse(cleaned);

        // ── Calculate diagnosedLevel from evidence, not from model opinion ──
        const resultsMap = new Map(
          (diagnosis.results || []).map((r: { azeId: string; result: string }) => [r.azeId, r])
        );

        let calculatedLevel = "Below Pre-A1";
        const levelResults: { level: string; confirmed: boolean; canCount: number; threshold: string }[] = [];

        for (const lc of TASK2.levelClusters) {
          const canCount = lc.macroIds.filter((id) => {
            const r = resultsMap.get(id);
            return r && r.result === "CAN";
          }).length;
          const confirmed = canCount >= lc.confirmThreshold;
          levelResults.push({
            level: lc.level,
            confirmed,
            canCount,
            threshold: `${lc.confirmThreshold}/${lc.totalMacros}`,
          });
          if (confirmed) {
            calculatedLevel = lc.label;
          }
        }

        diagnosis.diagnosedLevel = calculatedLevel;
        diagnosis.levelResults = levelResults;

        return NextResponse.json({ diagnosis });
      } catch {
        return NextResponse.json({ error: "Failed to parse diagnosis", raw }, { status: 500 });
      }
    }

    // ── Normal conversation turn ───────────────────────────────────────────
    const level = diagnosedLevel || "B1";
    let prompt = buildConversationPrompt(level);

    if (exchangeCount === 0) {
      prompt += "\n\nThis is exchange 0 — the START. You are in PHASE 1. Present two options appropriate to the candidate's level and ask which they prefer. Keep it natural.";
    } else if (wrapUp) {
      prompt += "\n\nFINAL exchange. Thank the candidate briefly in 1 sentence. Add <done>true</done>.";
    } else {
      prompt += `\n\nThis is exchange ${exchangeCount} of up to ${TASK2.meta.maxExchanges}. Review your status, decide your phase, and act.`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      max_tokens: 250,
    });

    const rawMessage = response.choices[0].message.content || "";

    // Extract done signal
    const doneMatch = rawMessage.match(/<done>(true|false)<\/done>/);
    const taskDone = doneMatch ? doneMatch[1] === "true" : false;

    // Extract status for logging
    const statusMatch = rawMessage.match(/<status>(.*?)<\/status>/);
    if (statusMatch) {
      console.log("TASK2 EXAMINER STATUS:", statusMatch[1]);
    }

    // Strip ALL hidden tags from the message shown to the candidate
    const aiMessage = rawMessage
      .replace(/<done>(true|false)<\/done>/g, "")
      .replace(/<status>.*?<\/status>/g, "")
      .trim();

    return NextResponse.json({ message: aiMessage, taskDone });
  } catch (error) {
    console.error("Task2 API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
