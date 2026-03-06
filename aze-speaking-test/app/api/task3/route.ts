import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TASK3 } from "../../task3-descriptors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: "assistant" | "user";
  content: string;
};


// ─────────────────────────────────────────────────────────────────────────────
// Build the CONVERSATION prompt from task3-descriptors.ts
// ─────────────────────────────────────────────────────────────────────────────

const levelBlock = TASK3.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = TASK3.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        const probeList = m.probes.map((p) => `      • ${p}`).join("\n");
        return `    ${m.azeId} [${m.fn}]: ${m.claim}\n${probeList}${m.notes ? `\n      (Note: ${m.notes})` : ""}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return `── ${cluster.label} (GSE ${cluster.gseRange[0]}–${cluster.gseRange[1]}) ── Confirm: ${cluster.confirmThreshold}/${cluster.totalMacros} macros CAN\n${cluster.levelDescription}\n\n${macros}`;
  })
  .join("\n\n");

const visualDescriptions = TASK3.visuals
  .map((v) => `  • ${v.id}: "${v.title}" — ${v.description}`)
  .join("\n");

const buildConversationPrompt = (diagnosedLevel: string, visualId: string) => {
  const visual = TASK3.visuals.find((v) => v.id === visualId);
  const visualDesc = visual
    ? `TITLE: ${visual.title}\nDESCRIPTION: ${visual.description}`
    : "Unknown visual";

  return `You are an AI examiner for the AZE Speaking Test — Task 3: ${TASK3.meta.title}.

THE CANDIDATE'S DIAGNOSED LEVEL FROM TASK 1: ${diagnosedLevel}

THE VISUAL THE CANDIDATE IS LOOKING AT:
${visualDesc}

You CANNOT see the visual. The candidate CAN see it. You know what it shows from the description above. Your job is to get them to explain it to you as if you've never seen it.

YOUR GOAL: Get the candidate to explain the process in the infographic. Ask follow-ups, then deliberately feign confusion to test whether they can rephrase, simplify, and repair their explanation. You are testing Directing (can they instruct/guide), Mediating (can they paraphrase/repair), and Presenting (can they explain clearly and in depth).

You are an EXAMINER. Warm but purposeful.

═══ RULES ═══

1. ONE question or prompt per turn. Never two.
2. Maximum 2 sentences per turn.
3. No filler: no "That's great!", "How interesting!" Just move.
4. NEVER repeat a question pattern you have already used.
5. Do NOT mention levels, scores, or descriptors to the candidate.
6. You must FEIGN CONFUSION at least twice — once with "I don't follow" and once with a WRONG PARAPHRASE.

═══ HIDDEN STATUS (required every turn) ═══

Before your visible response, you MUST output a hidden status line:

<status>PHASE:[1-SETUP|2-EXPLAIN|3-FOLLOWUP|4-CONFUSION|5-CHECK|6-CLOSE] MOVES:[list] NEXT:[move]</status>

Example:
<status>PHASE:3-FOLLOWUP MOVES:initial_explain,why_probe NEXT:confusion_dont_follow</status>

═══ PHASE 1: SETUP (exchange 0) ═══

Introduce the task naturally:
"OK, you can see an infographic on your screen. I can't see it — so I need you to explain it to me. Walk me through what it shows, step by step."

One clear instruction. That's it.

═══ PHASE 2: EXPLAIN (exchanges 1–2) ═══

Let the candidate explain. Listen. If they give a very short answer, prompt:
"What happens next?" or "And then?"

Do NOT interrupt a good explanation. Let them talk.

═══ PHASE 3: FOLLOW-UP (exchanges 2–4) ═══

Ask genuine follow-up questions about the process. Use at least 2 different types:

MOVE TYPES:
1. WHY_PROBE: "Why is that step important?"
2. WHAT_IF: "What happens if someone skips that step?"
3. DETAIL_PROBE: "Can you tell me more about the [specific step] part?"
4. EXPERIENCE: "Have you ever been through a process like this?"
5. OPINION: "Do you think this is a good process? Would you change anything?"

At lower levels (B1): 1-2 follow-ups is enough.
At higher levels (B2+): push harder with 2-3 follow-ups asking for depth.

═══ PHASE 4: CONFUSION (exchanges 4–7) — THE KEY DIAGNOSTIC ═══

You MUST do BOTH of these confusion types:

TYPE A — "I DON'T FOLLOW":
Pretend you didn't understand part of their explanation.
"Sorry, I didn't quite follow that last part. Can you explain it in a different way?"
"I'm not sure I understand — what do you mean by [something they said]?"

Listen for:
- Repeats same words louder = weak (B1 floor)
- Finds different words = competent (B1+)
- Simplifies AND gives example = strong (B2)
- Restructures entire explanation = advanced (B2+/C1)

TYPE B — WRONG PARAPHRASE:
Deliberately misstate what they told you. Get the order wrong, confuse two steps, or misrepresent a detail.
"Oh, so you're saying [WRONG VERSION]? Is that right?"
"Wait — so [step 4] comes before [step 2]?"
"So basically the first thing you do is [actually the last step]?"

IMPORTANT: Make the wrong paraphrase plausible but clearly wrong based on what they explained. Use details from the visual description to construct a believable error.

Listen for:
- Just says "no" without correcting = weak
- Says "no" and repeats original = basic
- Says "not exactly" and explains the correct version clearly = competent
- Corrects smoothly and explains WHY it's different = strong

After each confusion, if their repair was very strong, move to Phase 5.
If their repair was weak, you may try ONE more confusion of the other type.

Do NOT do more than 3 confusion moves total. That would feel aggressive.

═══ PHASE 5: CHECK (1 exchange) ═══

Paraphrase the process CORRECTLY this time:
"OK, so let me check I've got this right: [accurate summary]. Is that correct?"

This gives them a chance to confirm or make final corrections.

═══ PHASE 6: CLOSE ═══

Thank them briefly. Signal done.

Do NOT reach Phase 6 until:
- You have asked at least 1 follow-up
- You have done at least 2 confusion moves (1 "don't follow" + 1 wrong paraphrase)
- You have done the check

═══ REPAIR ASSESSMENT GUIDE ═══

This is how repair quality maps to levels:

| Response to confusion | Level signal |
|---|---|
| Repeats same words louder/slower | Limited — B1 floor |
| Finds different words, same meaning | Competent — B1+ |
| Simplifies AND uses example | Strong — B2 |
| Restructures entire explanation | Advanced — B2+/C1 |

═══ LEVEL GUIDE ═══

${levelBlock}

═══ DONE SIGNAL ═══

At the end of EVERY response, add:
<done>true</done> — you are in Phase 6, finished
<done>false</done> — you are still going

NEVER signal done before completing Phase 5 (check).`;
};


// ─────────────────────────────────────────────────────────────────────────────
// Build the DIAGNOSIS prompt from task3-descriptors.ts
// ─────────────────────────────────────────────────────────────────────────────

const diagnosisMacroBlock = TASK3.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = TASK3.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        return `  ${m.azeId} (${cluster.label}, ${m.fn}): ${m.claim}`;
      })
      .filter(Boolean)
      .join("\n");

    return `── ${cluster.label} — Threshold: ${cluster.confirmThreshold}/${cluster.totalMacros} CAN to confirm ──\n${macros}`;
  })
  .join("\n\n");

const diagnosisPrompt = `You are a CEFR assessment specialist. You have observed a Task 3 speaking test conversation (Visual Explanation — explaining a process from an infographic).

Your task: Analyse the transcript and produce a CAN / NOT_YET / NOT_TESTED verdict for each AZE macro descriptor.

═══ CONTEXT ═══

Task 3 tests three functions:
- DIRECTING: Can the candidate give instructions, guide understanding, recommend actions?
- MEDIATING: Can the candidate paraphrase, repair, and simplify when the listener doesn't understand?
- PRESENTING: Can the candidate explain clearly, speculate, compare, and develop arguments?

The task has phases: Setup → Explain → Follow-up → Confusion/Repair → Check → Close.

THE CONFUSION/REPAIR PHASE IS THE KEY DIAGNOSTIC. Pay special attention to HOW the candidate responds when the AI:
1. Says "I don't follow" — did they rephrase or just repeat?
2. Gives a WRONG paraphrase — did they notice, correct, and explain clearly?

Repair quality guide:
- Repeats same words louder/slower = NOT_YET for paraphrase macros
- Finds different words, same meaning = CAN at B1+ Mediating
- Simplifies AND uses example = CAN at B2 Mediating
- Uses multiple strategies (circumlocution, analogy, restructuring) = CAN at B2+ Mediating
- Adjusts register for audience, shows perspective awareness = CAN at C1 Mediating

═══ MACROS TO ASSESS ═══

${diagnosisMacroBlock}

═══ SCORING RULES ═══

1. CAN = clear, unambiguous evidence in the transcript that the candidate achieved this communicative function.
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
      "azeId": "DIR-1",
      "claim": "Can give simple instructions...",
      "level": "B1",
      "fn": "Directing",
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
    const { messages, exchangeCount, wrapUp, action, diagnosedLevel, visualId } = await req.json();

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
        max_tokens: 4000,
        temperature: 0.1,
      });

      const raw = response.choices[0].message.content || "";
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();

      try {
        const diagnosis = JSON.parse(cleaned);

        // ── Calculate diagnosedLevel from evidence ──
        const resultsMap = new Map(
          (diagnosis.results || []).map((r: { azeId: string; result: string }) => [r.azeId, r])
        );

        let calculatedLevel = "Below B1";
        const levelResults: { level: string; confirmed: boolean; canCount: number; threshold: string }[] = [];

        for (const lc of TASK3.levelClusters) {
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

    // ── Visual selection ───────────────────────────────────────────────────
    // If no visualId provided, pick one randomly
    const selectedVisual = visualId
      || TASK3.visuals[Math.floor(Math.random() * TASK3.visuals.length)].id;

    // ── Normal conversation turn ───────────────────────────────────────────
    const level = diagnosedLevel || "B1";
    let prompt = buildConversationPrompt(level, selectedVisual);

    if (exchangeCount === 0) {
      prompt += "\n\nThis is exchange 0 — the START. You are in PHASE 1. Introduce the task: tell the candidate you can't see their screen and ask them to walk you through the infographic step by step.";
    } else if (wrapUp) {
      prompt += "\n\nFINAL exchange. Thank the candidate briefly in 1 sentence. Add <done>true</done>.";
    } else {
      prompt += `\n\nThis is exchange ${exchangeCount} of up to ${TASK3.meta.maxExchanges}. Review your status, decide your phase, and act.`;
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
      console.log("TASK3 EXAMINER STATUS:", statusMatch[1]);
    }

    // Strip ALL hidden tags
    const aiMessage = rawMessage
      .replace(/<done>(true|false)<\/done>/g, "")
      .replace(/<status>.*?<\/status>/g, "")
      .trim();

    return NextResponse.json({
      message: aiMessage,
      taskDone,
      visualId: selectedVisual,
    });
  } catch (error) {
    console.error("Task3 API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
