import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { WRITING_TASK5, StimulusSet } from "../../writing/writing-task5-descriptors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: "assistant" | "user";
  content: string;
};


// ─────────────────────────────────────────────────────────────────────────────
// STIMULUS SELECTION
//
// Maps candidate level → tier, then picks a random set from that tier.
// Uses a fallback chain so edge levels always get something appropriate.
//
// Tier map:
//   Pre-A1 / A1 / A2   → simple
//   A2+    / B1         → everyday
//   B1+    / B2         → detailed
//   B2+    / C1         → complex
// ─────────────────────────────────────────────────────────────────────────────

type Tier = StimulusSet["tier"];

function getTier(level: string): Tier {
  const map: Record<string, Tier> = {
    "Pre-A1": "simple",
    "A1":     "simple",
    "A2":     "simple",
    "A2+":    "everyday",
    "B1":     "everyday",
    "B1+":    "detailed",
    "B2":     "detailed",
    "B2+":    "complex",
    "C1":     "complex",
  };
  return map[level] ?? "everyday";
}

function pickRandomSet(level: string): StimulusSet {
  const tier = getTier(level);
  const pool = WRITING_TASK5.stimulusSets.filter(s => s.tier === tier);

  // Fallback: if tier pool is somehow empty, use all sets
  const candidates = pool.length > 0 ? pool : WRITING_TASK5.stimulusSets;
  return candidates[Math.floor(Math.random() * candidates.length)];
}


// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSIS MACRO BLOCK
// ─────────────────────────────────────────────────────────────────────────────

const diagnosisMacroBlock = WRITING_TASK5.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = WRITING_TASK5.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        const sigList = m.signals.map((s) => `      - ${s}`).join("\n");
        return `  ${m.azeId} (${cluster.label}, ${m.fn}): ${m.claim}\n    Signals:\n${sigList}`;
      })
      .filter(Boolean)
      .join("\n\n");
    return `── ${cluster.label} — Threshold: ${cluster.confirmThreshold}/${cluster.totalMacros} CAN to confirm ──\n${macros}`;
  })
  .join("\n\n");


// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION PROMPT BUILDER
// Card content injected so the AI knows exactly what the candidate can see.
// ─────────────────────────────────────────────────────────────────────────────

function buildConversationPrompt(stimSet: StimulusSet | null): string {
  const cardDesc = (card: StimulusSet["cardA"]) =>
    `${card.name} (${card.rating}★, ${card.price} ${card.priceNote ?? ""}): ` +
    card.features.map(f => `${f.label}: ${f.value}`).join(" | ");

  const cardBlock = stimSet
    ? `═══ THE CANDIDATE CAN SEE THESE TWO CARDS ═══\n\n` +
      `Option A: ${cardDesc(stimSet.cardA)}\n` +
      `Option B: ${cardDesc(stimSet.cardB)}\n\n` +
      `Suggested situations (use as inspiration — vary wording each time):\n` +
      stimSet.situations.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : "No card data available.";

  return `You are an AI examiner for the AZE Writing Test — Task 5: Compare & Advise.

YOUR ROLE: The candidate can see two option cards on their screen. You ask situational questions that require them to mediate — relay information from the cards to match specific needs.

${cardBlock}

═══ RULES ═══

1. ONE question at a time. Never ask two things.
2. Maximum 2 sentences per turn.
3. Be warm and conversational — like a friend asking for advice.
4. Start by asking them to describe the main differences.
5. Then introduce situations: "My friend needs X. Which would you recommend?"
6. After they answer, CHANGE the situation: "But what if they also need Y?"
7. Push for reasons: "Why that one?" / "The other has X — doesn't that matter?"
8. If they struggle on TWO consecutive questions, you have found their ceiling.

═══ PROBING STRATEGY ═══

- Exchange 1–2: "What are the main differences?" (basic comparison → W5-F1, W5-F2)
- Exchange 3–4: "Which for [person with need A]?" (simple recommendation → W5-F3, W5-F4)
- Exchange 5–6: "But what about [complication]?" (trade-off weighing → W5-F5, W5-F6)
- Exchange 7–8: "Now imagine [different person]" (scenario switch → W5-F7)
- Exchange 9+: "They also need [conflicting requirement]" (synthesis → W5-F8)

═══ DONE SIGNAL ═══

At the end of EVERY response, add:
<ceiling>true</ceiling> — you believe you've found the candidate's ceiling
<ceiling>false</ceiling> — you want to keep probing`;
}


// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSIS PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const diagnosisPrompt = `You are a CEFR assessment specialist analysing Writing Task 5: Compare & Advise.

═══ CONTEXT ═══

The candidate could see two option cards and had a written chat where the AI asked situational questions. The candidate had to relay information from the cards, recommend options, and adapt advice as situations changed.

This tests MEDIATION: the ability to bridge between a source (the cards) and a person with specific needs.
The topic (hotels, phones, jobs, etc.) is irrelevant to scoring — assess FUNCTION, not content.

═══ CRITICAL SCORING PRINCIPLE ═══

Score what the candidate DEMONSTRATED. If they showed they could weigh trade-offs, mark that CAN even if the topic was simple. Function is topic-agnostic.

═══ MACROS TO ASSESS ═══

${diagnosisMacroBlock}

═══ SCORING RULES ═══

1. CAN = clear evidence the candidate achieved this mediating function.
2. NOT_YET = attempted but did not clearly achieve it.
3. NOT_TESTED = the conversation did not create conditions (use sparingly).
4. Be conservative: mixed evidence = NOT_YET.
5. A single clear instance IS sufficient for CAN.
6. Higher-level demonstration overrides lower-level gaps.
7. Look for evidence across the ENTIRE conversation, not just one exchange.

IMPORTANT: Score EVERY macro. The system calculates the level from your scores.

═══ OUTPUT FORMAT ═══

Respond ONLY with valid JSON:
{
  "results": [
    {
      "azeId": "W5-F1",
      "claim": "Can identify and state basic facts from a visual source",
      "level": "A1",
      "fn": "Informing",
      "result": "CAN|NOT_YET|NOT_TESTED",
      "rationale": "Short explanation (1 sentence)",
      "evidence": "Direct quote from the transcript"
    }
  ]
}`;


// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE ANALYSIS PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const languageAnalysisPrompt = `You are a CEFR-trained language analyst. Analyse the candidate's written messages from a mediation/advising task.

═══ CONTEXT ═══

The candidate looked at two option cards and chatted about them, making recommendations for different situations. Assess their language quality.

═══ DIMENSIONS ═══

For each dimension, provide a CEFR band, descriptor, and 1-2 examples:

1. GRAMMAR (Range & Accuracy)
2. VOCABULARY (Range & Precision) — especially advisory and comparative language
3. COHERENCE & COHESION — logical flow of recommendations
4. SPELLING & MECHANICS
5. COMMUNICATIVE EFFECTIVENESS — does the advice actually help?

═══ OUTPUT FORMAT ═══

Respond ONLY with valid JSON:
{
  "overallFormLevel": "B1",
  "overallFormSummary": "2-sentence summary",
  "dimensions": [
    {
      "dimension": "Grammar",
      "level": "B1",
      "descriptor": "One sentence",
      "examples": ["quote 1", "quote 2"]
    }
  ]
}`;


// ─────────────────────────────────────────────────────────────────────────────
// API HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, messages, exchangeCount, wrapUp, stimulusSetId, prevLevel } = body;


    // ── Select stimulus set ────────────────────────────────────────────
    // Called once at session start. Returns a random set for the level.
    // Frontend stores the set id and sends it back on every subsequent request.
    if (action === "get-stimulus") {
      const stimulusSet = pickRandomSet(prevLevel || "B1");
      return NextResponse.json({ stimulusSet });
    }


    // ── Conversation turn ──────────────────────────────────────────────
    if (action === "chat") {
      const stimSet = WRITING_TASK5.stimulusSets.find(s => s.id === stimulusSetId) ?? null;
      const conversationPrompt = buildConversationPrompt(stimSet);
      let prompt = conversationPrompt;

      if (exchangeCount === 0) {
        prompt +=
          `\n\nThis is the START. Greet warmly and ask: ` +
          `"Take a look at these two options. What are the main differences you can see?"`;
      } else if (wrapUp) {
        prompt +=
          "\n\nThis is the final exchange. Thank the candidate briefly in 1 sentence. " +
          "Add <ceiling>true</ceiling>.";
      } else {
        prompt +=
          `\n\nThis is exchange ${exchangeCount} of up to ${WRITING_TASK5.meta.maxExchanges}. ` +
          `Ask the next situational question or probe their last answer.`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: prompt },
          ...(messages || []),
        ],
        max_tokens: 150,
      });

      const rawMessage = response.choices[0].message.content || "";
      const ceilingMatch = rawMessage.match(/<ceiling>(true|false)<\/ceiling>/);
      const ceilingReached = ceilingMatch ? ceilingMatch[1] === "true" : false;
      const aiMessage = rawMessage
        .replace(/<ceiling>(true|false)<\/ceiling>/g, "")
        .trim();

      return NextResponse.json({ message: aiMessage, ceilingReached });
    }


    // ── Diagnosis ──────────────────────────────────────────────────────
    if (action === "diagnose") {
      const transcript = (messages || [])
        .map((m: Message) => `${m.role === "assistant" ? "AI" : "Candidate"}: ${m.content}`)
        .join("\n");

      const [functionRes, formRes] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: diagnosisPrompt },
            { role: "user", content: `Here is the full transcript:\n\n${transcript}` },
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: languageAnalysisPrompt },
            { role: "user", content: `Here is the full transcript:\n\n${transcript}` },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      ]);

      const funcRaw = functionRes.choices[0].message.content || "";
      const funcCleaned = funcRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const formRaw = formRes.choices[0].message.content || "";
      const formCleaned = formRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      try {
        const diagnosis = JSON.parse(funcCleaned);

        const resultsMap = new Map(
          (diagnosis.results || []).map((r: { azeId: string; result: string }) => [r.azeId, r])
        );

        let calculatedLevel = "Below A1";
        const levelResults: {
          level: string;
          confirmed: boolean;
          canCount: number;
          threshold: string;
        }[] = [];

        for (const lc of WRITING_TASK5.levelClusters) {
          const canCount = lc.macroIds.filter((id) => {
            const r = resultsMap.get(id);
            return r && (r as { result: string }).result === "CAN";
          }).length;
          const confirmed = canCount >= lc.confirmThreshold;
          levelResults.push({
            level: lc.level,
            confirmed,
            canCount,
            threshold: `${lc.confirmThreshold}/${lc.totalMacros}`,
          });
          if (confirmed) calculatedLevel = lc.label;
        }

        diagnosis.diagnosedLevel = calculatedLevel;
        diagnosis.levelResults = levelResults;

        let formAnalysis = null;
        try { formAnalysis = JSON.parse(formCleaned); } catch { /* skip */ }

        return NextResponse.json({ diagnosis, formAnalysis });
      } catch {
        return NextResponse.json(
          { error: "Failed to parse diagnosis", raw: funcRaw },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Writing Task 5 API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}