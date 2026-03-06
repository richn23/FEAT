import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { WRITING_TASK3, TopicOption } from "../../writing/writing-task3-descriptors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: "assistant" | "user";
  content: string;
};


// ─────────────────────────────────────────────────────────────────────────────
// TOPIC HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Returns n random topics from a given tier
function pickRandomTopics(tier: TopicOption["tier"], n: number): TopicOption[] {
  const pool = WRITING_TASK3.topicOptions.filter((t) => t.tier === tier);
  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// Returns one random topic from a tier, excluding any already used this session
function pickSwitchTopic(tier: TopicOption["tier"], excludeId?: string): TopicOption {
  const pool = WRITING_TASK3.topicOptions.filter(
    (t) => t.tier === tier && t.id !== excludeId
  );
  return pool[Math.floor(Math.random() * pool.length)];
}


// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildLevelBlock(): string {
  return WRITING_TASK3.levelClusters
    .map((cluster) => {
      const macros = cluster.macroIds
        .map((id) => {
          const m = WRITING_TASK3.azeMacro.find((macro) => macro.azeId === id);
          if (!m) return "";
          const sigList = m.signals.map((s) => `      - ${s}`).join("\n");
          return `  ${m.azeId} (${cluster.label}, ${m.fn}): ${m.claim}\n    Signals:\n${sigList}`;
        })
        .filter(Boolean)
        .join("\n\n");
      return `── ${cluster.label} — Threshold: ${cluster.confirmThreshold}/${cluster.totalMacros} ──\n${cluster.levelDescription}\n\n${macros}`;
    })
    .join("\n\n");
}

function buildConversationPrompt(
  chosenTopic: TopicOption,
  switchTopic: TopicOption | null,
  prevLevel: string
): string {
  const levelBlock = buildLevelBlock();
  const activeTopic = switchTopic ?? chosenTopic;

  return `You are an AI examiner for the AZE Writing Test — Task 3: Express & Argue.

YOUR ROLE: You are a debate partner. Your job is to get the candidate to express opinions and argue/justify them in writing. You challenge, disagree, play devil's advocate, and ask why.

This is NOT a friendly chat. This is a structured debate. Warm but persistent.

═══ CANDIDATE CONTEXT ═══

Estimated level from previous tasks: ${prevLevel}
${switchTopic
  ? `CURRENT TOPIC (switched): ${activeTopic.label}\nQuestion: ${activeTopic.prompt}`
  : `CHOSEN TOPIC: ${chosenTopic.label}\nQuestion: ${chosenTopic.prompt}`
}

═══ RULES ═══

1. ONE question or challenge per turn. Never ask two things.
2. Maximum 2 sentences per turn.
3. Be warm but challenging — like a good teacher who pushes.
4. When they give an opinion, CHALLENGE it. Ask why. Disagree. Give a counter-example.
5. If they defend well, push harder with a deeper challenge.
6. If they struggle, simplify your challenge or rephrase.
7. NEVER agree with them easily. Your job is to make them argue.
8. If they struggle on TWO consecutive challenges at the same level, you have found their ceiling.

═══ PROBING STRATEGY BY LEVEL ═══

- A1–A2: "Do you like X or Y?" / "Why?" / "But some people think..."
- A2+–B1: "What do you think about X?" / "But what about the other side?" / "Can you give an example?"
- B1+: Challenge reasoning: "But doesn't that ignore..." / "What would you say to someone who thinks..."
- B2+: Challenge assumptions: "That assumes..." / "But from another perspective..."
- C1: "Could you be more precise about..." / "How would you respond to the criticism that..."

═══ TOPIC SWITCH RULE ═══

If the candidate is handling the discussion comfortably at B1+ level (giving reasons for both sides, defending against challenges), you should switch topic.

${switchTopic
  ? `The topic has ALREADY been switched to: ${switchTopic.label}. Continue probing on this topic.`
  : `When you judge the candidate is at B1+ and handling well: say "OK, let me ask you about something different." Then introduce the switch topic. The route will provide the switch topic when you signal readiness.`
}

═══ LEVEL GUIDE ═══

${levelBlock}

═══ DONE SIGNAL ═══

At the end of EVERY response, add:
<ceiling>true</ceiling> — you believe you've found the candidate's ceiling
<ceiling>false</ceiling> — you want to keep probing

If you think the candidate is ready for a topic switch (B1+ confirmed, not yet switched), add:
<switch_ready>true</switch_ready>
Otherwise omit this tag.`;
}


// ─────────────────────────────────────────────────────────────────────────────
// DIAGNOSIS PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const diagnosisMacroBlock = WRITING_TASK3.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = WRITING_TASK3.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        const sigList = m.signals.map((s) => `      - ${s}`).join("\n");
        return `  ${m.azeId} (${cluster.label}, ${m.fn}): ${m.claim}\n    Signals:\n${sigList}`;
      })
      .filter(Boolean)
      .join("\n\n");
    return `── ${cluster.label} — Threshold: ${cluster.confirmThreshold}/${cluster.totalMacros} CAN to confirm ──\n${macros}`;
  })
  .join("\n\n");

const diagnosisPrompt = `You are a CEFR assessment specialist. You are analysing a candidate's written chat from Writing Task 3: Express & Argue.

═══ CONTEXT ═══

The candidate had a written debate with an AI examiner. The AI challenged their opinions and pushed them to justify their views. You are assessing the candidate's messages only.

Task 3 tests two functions:
- EXPRESSING: Can the candidate state and develop opinions in writing?
- ARGUING: Can the candidate justify, defend, and reason in writing?

The conversation may have covered multiple topics (familiar → broader → abstract).
The topic is irrelevant to scoring — assess FUNCTION, not content.

═══ CRITICAL SCORING PRINCIPLE ═══

Score what the candidate DEMONSTRATED — not what the topic was about.
If the candidate demonstrated a function, mark CAN — even if it was on a simple topic.
Higher-level demonstration overrides lower-level gaps.

═══ MACROS TO ASSESS ═══

${diagnosisMacroBlock}

═══ SCORING RULES ═══

1. CAN = clear evidence in the writing that the candidate achieved this function.
2. NOT_YET = the writing attempted this function but did not achieve it clearly.
3. NOT_TESTED = the conversation had no opportunity to demonstrate this (use sparingly).
4. Be conservative: mixed evidence = NOT_YET.
5. A single clear instance IS sufficient for CAN.
6. Multiple weak instances do NOT combine into CAN.
7. Higher-level demonstration overrides lower-level gaps.

IMPORTANT: Score EVERY macro. The system calculates the level from your scores.

═══ OUTPUT FORMAT ═══

Respond ONLY with valid JSON:
{
  "results": [
    {
      "azeId": "W3-F1",
      "claim": "Can state a like, dislike, or simple preference",
      "level": "A1",
      "fn": "Expressing",
      "result": "CAN|NOT_YET|NOT_TESTED",
      "rationale": "Short explanation (1 sentence)",
      "evidence": "Direct quote from the transcript"
    }
  ]
}`;


// ─────────────────────────────────────────────────────────────────────────────
// LANGUAGE ANALYSIS PROMPT
// ─────────────────────────────────────────────────────────────────────────────

const languageAnalysisPrompt = `You are a CEFR-trained language analyst. Analyse the candidate's written messages from a debate/argument task.

═══ CONTEXT ═══

The candidate had a written debate with an AI. Assess the language quality of the candidate's messages only.

═══ DIMENSIONS ═══

For each dimension, provide a CEFR band, descriptor, and 1-2 examples:

1. GRAMMAR (Range & Accuracy) — structures used, accuracy, control
2. VOCABULARY (Range & Precision) — breadth, appropriacy, precision of argumentative language
3. COHERENCE & COHESION — logical flow, linking, argument structure
4. SPELLING & MECHANICS — accuracy, impact on communication
5. COMMUNICATIVE EFFECTIVENESS — does the writing achieve its argumentative purpose?

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
    const {
      action,
      messages,
      exchangeCount,
      wrapUp,
      chosenTopicId,
      switchTopicId,
      task1Level,
      task2Level,
    } = body;

    // ── Get topic choices (called before candidate picks) ──────────────
    // Returns 3 random familiar topics for the frontend to display.
    if (action === "get-topics") {
      const choices = pickRandomTopics(
        "familiar",
        WRITING_TASK3.principles.familiarTopicsShownToCandidate
      );
      return NextResponse.json({ choices });
    }


    // ── Conversation turn ──────────────────────────────────────────────
    if (action === "chat") {
      const prevLevel = task2Level || task1Level || "unknown";

      // Resolve topics from IDs
      const chosenTopic =
        WRITING_TASK3.topicOptions.find((t) => t.id === chosenTopicId) ??
        WRITING_TASK3.topicOptions.find((t) => t.tier === "familiar")!;

      const switchTopic = switchTopicId
        ? WRITING_TASK3.topicOptions.find((t) => t.id === switchTopicId) ?? null
        : null;

      const conversationPrompt = buildConversationPrompt(chosenTopic, switchTopic, prevLevel);
      let prompt = conversationPrompt;

      if (exchangeCount === 0) {
        prompt +=
          `\n\nThis is the START. Introduce the topic warmly and ask their opinion: ` +
          `"${chosenTopic.prompt}" — keep it short and chat-like.`;
      } else if (wrapUp) {
        prompt +=
          "\n\nThis is the final exchange. Thank the candidate briefly in 1 sentence. " +
          "Add <ceiling>true</ceiling>.";
      } else {
        prompt +=
          `\n\nThis is exchange ${exchangeCount} of up to ${WRITING_TASK3.meta.maxExchanges}. ` +
          `Challenge their last response or probe deeper.`;
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

      const switchReadyMatch = rawMessage.match(/<switch_ready>true<\/switch_ready>/);
      const switchReady = !!switchReadyMatch;

      const aiMessage = rawMessage
        .replace(/<ceiling>(true|false)<\/ceiling>/g, "")
        .replace(/<switch_ready>true<\/switch_ready>/g, "")
        .trim();

      // If AI signals switch ready and no switch has happened yet,
      // pick a switch topic and return it — frontend stores and sends back
      let nextSwitchTopic: TopicOption | null = null;
      if (switchReady && !switchTopicId) {
        // Use broader tier first; if candidate is already on broader, use abstract
        const switchTier = switchTopic?.tier === "broader" ? "abstract" : "broader";
        nextSwitchTopic = pickSwitchTopic(switchTier, chosenTopicId);
      }

      return NextResponse.json({
        message: aiMessage,
        ceilingReached,
        switchReady,
        switchTopic: nextSwitchTopic,
      });
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
            { role: "user", content: `Here is the full transcript (candidate messages only):\n\n${transcript}` },
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

        for (const lc of WRITING_TASK3.levelClusters) {
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

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Writing Task 3 API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}