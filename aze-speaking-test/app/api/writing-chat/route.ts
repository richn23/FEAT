import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { WRITING_TASK1, Topic } from "../../writing/writing-descriptors";
import { buildLanguageAnalysisPrompt } from "../../writing/language-rubric";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: "assistant" | "user";
  content: string;
};


// ─────────────────────────────────────────────────────────────────────────────
// TOPIC SELECTION
// Picks one topic at random from the pool.
// Called once at session start — the topic is passed in from the frontend
// and stored in state so it stays consistent across the session.
// ─────────────────────────────────────────────────────────────────────────────

function pickRandomTopic(): Topic {
  const idx = Math.floor(Math.random() * WRITING_TASK1.topics.length);
  return WRITING_TASK1.topics[idx];
}


// ─────────────────────────────────────────────────────────────────────────────
// BUILD LEVEL BLOCK
// Converts macro descriptors into the prompt block the AI reads.
// Uses probeGuidance (not fixed questions) so the AI generates
// topic-appropriate questions at runtime.
// ─────────────────────────────────────────────────────────────────────────────

function buildLevelBlock(): string {
  return WRITING_TASK1.levelClusters
    .map((cluster) => {
      const macros = cluster.macroIds
        .map((id) => {
          const m = WRITING_TASK1.azeMacro.find((macro) => macro.azeId === id);
          if (!m) return "";
          const guidanceList = m.probeGuidance
            .map((g) => `      • ${g}`)
            .join("\n");
          return (
            `    ${m.azeId} [${m.fn}]: ${m.claim}\n` +
            `      Probe guidance (generate a question that does this):\n` +
            `${guidanceList}` +
            (m.notes ? `\n      Note: ${m.notes}` : "")
          );
        })
        .filter(Boolean)
        .join("\n\n");

      return (
        `── ${cluster.label} (GSE ${cluster.gseRange[0]}–${cluster.gseRange[1]}) ──` +
        ` Confirm: ${cluster.confirmThreshold}/${cluster.totalMacros} macros CAN\n` +
        `${cluster.levelDescription}\n\n${macros}`
      );
    })
    .join("\n\n");
}


// ─────────────────────────────────────────────────────────────────────────────
// BUILD CONVERSATION PROMPT
// Topic is injected here — the AI knows the session topic and generates
// questions around it rather than using fixed probe sentences.
// ─────────────────────────────────────────────────────────────────────────────

function buildConversationPrompt(topic: Topic): string {
  const levelBlock = buildLevelBlock();

  return `You are an AI examiner for the AZE Writing Test — Task 1: ${WRITING_TASK1.meta.title}.

THIS IS A WRITTEN TEST. The candidate is TYPING their responses in a WhatsApp-style chat. You are also typing. There is NO audio, NO speaking.

YOUR GOAL: Find the candidate's WRITTEN CEFR level through a natural text chat by probing their ability to interact and inform in writing.

You are an EXAMINER, not a chatbot. Warm but purposeful. Every turn creates a communicative condition that reveals what the candidate can do in writing.

═══ SESSION TOPIC ═══

Today's topic: ${topic.label}
${topic.seedPrompt}

IMPORTANT — how the topic works:
- Exchanges 1–2: ALWAYS start with the anchor (name, where they're from, what they do). Do not introduce the topic yet.
- Exchange 3 onwards: naturally steer the conversation toward the session topic.
- Generate your questions by combining the PROBE GUIDANCE below with the session topic.
- Example: if the topic is "Hobbies" and the guidance says "ask them to describe something connected to the topic in detail" → ask something like "What do you enjoy most about [hobby]? Tell me a bit more about it."
- Do NOT mention the topic label explicitly (don't say "today we're talking about hobbies"). Let it emerge naturally.

═══ RULES ═══

1. ONE question or prompt per turn. Never two.
2. Maximum 2 sentences per turn. Keep it chat-like — short and natural.
3. Be warm and encouraging but don't waste turns on filler.
4. Start at the lowest level (name, country, what they do).
5. If the candidate writes easily with detail → probe UPWARD (harder question).
6. If the candidate gives very short answers or struggles → stay or probe DOWNWARD.
7. Do NOT test grammar or vocabulary directly. Test communicative functions in writing.
8. If the candidate struggles on TWO consecutive questions at the same level, you have found their ceiling. Do not push further.
9. Write like a person texting — natural, informal. Not like a formal exam.

═══ WHAT TO LOOK FOR IN WRITTEN RESPONSES ═══

You are assessing WRITTEN communicative competence:
- Can they convey information in writing? (Informing)
- Can they manage a written exchange? (Interactional)

NOT grammar accuracy. NOT vocabulary range. Those are scored separately.
Focus on: Can they DO the communicative thing in writing?

═══ LEVEL GUIDE ═══

For each level below, use the PROBE GUIDANCE to generate a question that fits the session topic.
Do not copy the guidance literally — turn it into a natural chat message about ${topic.label}.

${levelBlock}

═══ PROBING STRATEGY ═══

After each response, decide: did they handle it comfortably IN WRITING?
- If YES → move to the next level up
- If NO → stay or go easier
- If they struggle TWICE in a row → you've found the ceiling
- You do NOT need to test every macro. Stop probing up once you find the ceiling.

═══ DONE SIGNAL ═══

At the end of EVERY response, add:
<ceiling>true</ceiling> — you believe you've found the ceiling
<ceiling>false</ceiling> — you want to keep probing`;
}


// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSIS PROMPT (unchanged — topic doesn't affect scoring logic)
// ─────────────────────────────────────────────────────────────────────────────

function buildDiagnosisPrompt(): string {
  const diagnosisMacroBlock = WRITING_TASK1.levelClusters
    .map((cluster) => {
      const macros = cluster.macroIds
        .map((id) => {
          const m = WRITING_TASK1.azeMacro.find((macro) => macro.azeId === id);
          if (!m) return "";
          return `  ${m.azeId} (${cluster.label}, ${m.fn}): ${m.claim}`;
        })
        .filter(Boolean)
        .join("\n");

      return (
        `── ${cluster.label} — Threshold: ${cluster.confirmThreshold}/${cluster.totalMacros} CAN to confirm ──\n` +
        macros
      );
    })
    .join("\n\n");

  return `You are a CEFR assessment specialist. You have observed a Writing Task 1 text chat conversation (Diagnostic Chat).

Your task: Analyse the transcript and produce a CAN / NOT_YET / NOT_TESTED verdict for each AZE macro descriptor.

═══ CONTEXT ═══

This was a WhatsApp-style text chat. The candidate TYPED all responses. This is a WRITING test, not a speaking test.

Task 1 tests two functions:
- INTERACTIONAL: Can the candidate manage a written exchange? (respond, clarify, engage)
- INFORMING: Can the candidate convey information in writing? (describe, recount, explain)

The conversation may have been about any topic (hobbies, food, travel, etc.).
The topic is irrelevant to scoring — assess FUNCTION, not content.

═══ MACROS TO ASSESS (grouped by level) ═══

${diagnosisMacroBlock}

═══ SCORING RULES ═══

1. CAN = clear, unambiguous evidence in the transcript that the candidate achieved this communicative function IN WRITING.
2. NOT_YET = no evidence, weak evidence, or the candidate clearly struggled.
3. NOT_TESTED = the conversation never reached this level / never created conditions to test this macro.
4. Be conservative: mixed or ambiguous evidence = NOT_YET.
5. A single clear instance under appropriate communicative demand IS sufficient for CAN.
6. Multiple weak instances do NOT combine into CAN.
7. One response can evidence multiple macros across levels.
8. If a candidate demonstrates competence at a higher level, lower-level gaps can be overridden.

IMPORTANT: Score EVERY macro in the list. Do not skip any.

═══ OUTPUT FORMAT ═══

Respond ONLY with valid JSON, no other text:
{
  "results": [
    {
      "azeId": "W-INT-1",
      "claim": "Can exchange basic personal info in writing",
      "level": "Pre-A1",
      "fn": "Interactional",
      "result": "CAN|NOT_YET|NOT_TESTED",
      "rationale": "Short explanation (1 sentence)",
      "evidence": "Direct quote or paraphrase from transcript"
    }
  ]
}`;
}


// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE ANALYSIS PROMPT (unchanged)
// ─────────────────────────────────────────────────────────────────────────────

const languageAnalysisPrompt = buildLanguageAnalysisPrompt("chat");


// ─────────────────────────────────────────────────────────────────────────────
// SCORE MAPPING
// Converts CEFR level label → 1–10 progress bar value
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_MAP: Record<string, number> = {
  "Pre-A1": 2,
  "A1":     4,
  "A2":     5,
  "A2+":    6,
  "B1":     8,
  "B1+":    10,
  "B2+":    10, // ceiling — shown as 10 but flagged as above test range
};

function levelToScore(label: string): number {
  return SCORE_MAP[label] ?? 1;
}


// ─────────────────────────────────────────────────────────────────────────────
// API HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages, exchangeCount, wrapUp, action, topic: topicFromClient } = await req.json();

    // ── Topic resolution ───────────────────────────────────────────────────
    // On exchange 0, the frontend sends no topic — we pick one and return it.
    // On subsequent exchanges, the frontend sends the topic back so we use the same one.
    const topic: Topic = topicFromClient ?? pickRandomTopic();


    // ── Diagnosis ──────────────────────────────────────────────────────────
    if (action === "diagnose") {
      const transcript = messages
        .map((m: Message) => `${m.role === "assistant" ? "AI" : "Candidate"}: ${m.content}`)
        .join("\n");

      const candidateOnly = messages
        .filter((m: Message) => m.role === "user")
        .map((m: Message) => m.content)
        .join("\n");

      const [functionRes, formRes] = await Promise.all([
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: buildDiagnosisPrompt() },
            { role: "user", content: `Here is the full transcript:\n\n${transcript}` },
          ],
          max_tokens: 4000,
          temperature: 0.1,
        }),
        openai.chat.completions.create({
          model: "gpt-4o",
          messages: [
            { role: "system", content: languageAnalysisPrompt },
            {
              role: "user",
              content:
                `Here is the full transcript:\n\n${transcript}\n\n---\n\n` +
                `Candidate messages only (for focused analysis):\n\n${candidateOnly}`,
            },
          ],
          max_tokens: 2000,
          temperature: 0.1,
        }),
      ]);

      // Parse function diagnosis
      const funcRaw = functionRes.choices[0].message.content || "";
      const funcCleaned = funcRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      // Parse form analysis
      const formRaw = formRes.choices[0].message.content || "";
      const formCleaned = formRaw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      try {
        const diagnosis = JSON.parse(funcCleaned);

        // Calculate level from evidence — system decides, not AI
        const resultsMap = new Map(
          (diagnosis.results || []).map((r: { azeId: string; result: string }) => [r.azeId, r])
        );

        let calculatedLevel = "Below Pre-A1";
        const levelResults: {
          level: string;
          confirmed: boolean;
          canCount: number;
          threshold: string;
        }[] = [];

        for (const lc of WRITING_TASK1.levelClusters) {
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
        diagnosis.score = levelToScore(calculatedLevel);
        diagnosis.topic = topic;

        // Parse form analysis
        let formAnalysis = null;
        try {
          formAnalysis = JSON.parse(formCleaned);
        } catch {
          console.error("Failed to parse form analysis:", formCleaned);
        }

        return NextResponse.json({ diagnosis, formAnalysis });
      } catch {
        return NextResponse.json(
          { error: "Failed to parse diagnosis", raw: funcRaw },
          { status: 500 }
        );
      }
    }


    // ── Normal conversation turn ───────────────────────────────────────────
    const conversationPrompt = buildConversationPrompt(topic);
    let prompt = conversationPrompt;

    if (exchangeCount === 0) {
      prompt +=
        "\n\nThis is the START. Greet warmly and ask for their name. " +
        "Keep it short and chat-like. Do NOT introduce the session topic yet. " +
        "Add <ceiling>false</ceiling>.";
    } else if (exchangeCount < WRITING_TASK1.principles.topicDivergesAfterExchange) {
      prompt +=
        `\n\nThis is exchange ${exchangeCount}. Still in the ANCHOR phase. ` +
        `Ask about where they're from or what they do. ` +
        `Do not introduce the session topic yet.`;
    } else if (wrapUp) {
      prompt +=
        "\n\nThis is the final exchange. Thank the candidate briefly in 1 sentence. " +
        "Add <ceiling>true</ceiling>.";
    } else {
      prompt +=
        `\n\nThis is exchange ${exchangeCount} of up to ${WRITING_TASK1.meta.maxExchanges}. ` +
        `The anchor phase is complete — you should now be exploring the session topic (${topic.label}). ` +
        `Based on their responses so far, generate the next appropriate probe using the level guide above.`;
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: prompt },
        ...messages,
      ],
      max_tokens: 150,
    });

    const rawMessage = response.choices[0].message.content || "";

    const ceilingMatch = rawMessage.match(/<ceiling>(true|false)<\/ceiling>/);
    const ceilingReached = ceilingMatch ? ceilingMatch[1] === "true" : false;

    const aiMessage = rawMessage
      .replace(/<ceiling>(true|false)<\/ceiling>/g, "")
      .trim();

    // Return topic alongside message so frontend can persist it
    return NextResponse.json({ message: aiMessage, ceilingReached, topic });

  } catch (error) {
    console.error("Writing Chat API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}