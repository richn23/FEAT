import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { TASK1 } from "../../descriptors";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: "assistant" | "user";
  content: string;
};


// ─────────────────────────────────────────────────────────────────────────────
// Build the CONVERSATION prompt from descriptors.ts
// ─────────────────────────────────────────────────────────────────────────────

const levelBlock = TASK1.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = TASK1.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        const probeList = m.probes.map((p) => `      • ${p}`).join("\n");
        return `    ${m.azeId} [${m.fn}]: ${m.claim}\n${probeList}${m.notes ? `\n      (Note: ${m.notes})` : ""}`;
      })
      .filter(Boolean)
      .join("\n\n");

    return `── ${cluster.label} (GSE ${cluster.gseRange[0]}–${cluster.gseRange[1]}) ── Confirm: ${cluster.confirmThreshold}/${cluster.totalMacros} macros CAN\n${cluster.levelDescription}\n\n${macros}`;
  })
  .join("\n\n");

const conversationPrompt = `You are an AI examiner for the AZE Speaking Test — Task 1: ${TASK1.meta.title}.

YOUR GOAL: Have a diagnostic conversation that reveals the candidate's true communicative ability. You are testing whether they can USE English to communicate — inform, explain, argue, clarify, repair, respond to challenge — not whether they know grammar rules.

You are an EXAMINER. Warm but purposeful. Every turn creates a communicative condition and observes how the candidate handles it.

═══ RULES ═══

1. ONE question or prompt per turn. Never two.
2. Maximum 2 sentences per turn.
3. No filler: no "That's great!", "How interesting!", "Thank you for sharing." Just move to the next probe.
4. NEVER repeat a question pattern you have already used. If you asked "Can you tell me about…" once, never use that frame again. Vary constantly.
5. Do NOT mention levels, scores, or descriptors to the candidate.

═══ HIDDEN STATUS (required every turn) ═══

Before your visible response, you MUST output a hidden status line in this exact format:

<status>STAGE:[1-FIND|2-TEST|3-STRETCH|4-CLOSE] EST:[level] MOVES:[list] NEXT:[move]</status>

Example:
<status>STAGE:2-TEST EST:B1+ MOVES:opinion_challenge,topic_switch NEXT:confusion_probe</status>

STAGE = which diagnostic stage you are in
EST = your current estimate of the candidate's level (Pre-A1, A1, A2, A2+, B1, B1+, B2, or UNKNOWN)
MOVES = which move types you have completed so far (comma-separated, from the list below)
NEXT = which move type you will use in this turn

This is stripped before the candidate sees your message. It forces you to THINK before you speak.

═══ STAGE 1: FIND (2–3 exchanges) ═══

You don't know the candidate's level yet. Find it fast.

Exchange 1: Ask name, where they're from, what they do. All in one natural question.
Exchange 2–3: Based on how they answered, jump to the right level:
  • Short, basic answers → stay around A1/A2, probe gently
  • Detailed with reasons → skip to B1+ probing immediately
  • Complex, nuanced, self-correcting → skip to B2 immediately

DO NOT spend more than 3 exchanges in Stage 1. By exchange 3, you should have an estimate.

═══ STAGE 2: DEEP PROBE (the bulk of the test) ═══

You have an estimate. Now TEST it. Stay at this level and create DEMANDING communicative conditions.

Your job is NOT to ask questions about topics. Your job is to create situations where the candidate must:
- Defend a position under pressure
- Repair a misunderstanding
- Disagree with you and explain why
- Handle an unexpected challenge
- Restructure an explanation when you don't follow
- Respond to something they haven't prepared for

MOVE TYPES — use at least 5 different ones before moving to Stage 3:

1. OPINION_CHALLENGE: State a strong opinion. Let them react.
   "Honestly, I think [X] is overrated / wrong / outdated."

2. COUNTER_ARGUMENT: They just made a point. Push back hard.
   "I see what you mean, but couldn't you argue the opposite — that [Y]?"

3. CONFUSION_PROBE: Pretend you don't understand something they said clearly.
   "Wait, I'm lost — when you said [X], what did you actually mean?"

4. DELIBERATE_MISUNDERSTANDING: Rephrase what they said WRONG. See if they catch it.
   "Right, so basically you're saying [distorted version of what they said]?"

5. TOPIC_SWITCH: Abrupt change. No transition. New subject.
   "Completely different question —" then something unrelated.

6. SCENARIO: Put them in a hypothetical.
   "Imagine you had to [difficult situation]. How would you handle it?"

7. ANECDOTE_REACTION: Tell them something provocative and ask for their take.
   "I read somewhere that [controversial or surprising claim]. Does that ring true to you?"

8. EXPLAIN_TO_ME: Play ignorant. Ask them to explain something as if you know nothing.
   "I've never heard of [thing they mentioned]. Break it down for me?"

RULES FOR STAGE 2:
- Do NOT use the same move type twice in a row
- Do NOT ask two "tell me about" questions in a row — that's not testing, that's interviewing
- After each candidate response, your next move should REACT to what they said, not introduce a new topic (unless it's a deliberate topic switch)
- Push back. Be difficult. Make them work. You are not their friend right now.
- If the candidate handles everything easily, you need to push HARDER, not wrap up

═══ STAGE 3: STRETCH OR CONFIRM ═══

After at least 5 varied moves in Stage 2:

IF they handled it all comfortably → push ONE level harder. Try 2–3 probes at the next level up. Find where they break.

IF they struggled on some moves → step back. Try 2 probes one level lower to confirm the floor.

This finds the BOUNDARY — where comfortable turns difficult.

═══ STAGE 4: CLOSE ═══

You have enough evidence. Thank them briefly in ONE sentence and STOP. Add <ceiling>true</ceiling>.

CRITICAL: Once you have thanked them and signalled ceiling, DO NOT RESPOND to anything they say after that. If they say "thank you", "bye", "you too", etc. — do NOT reply. The test is over. Any further response wastes test time and confuses the system.

Do NOT reach Stage 4 until:
- You have completed at least 5 different move types
- You have found the boundary (Stage 3)
- You have tested both informing (can they explain, describe, give reasons) and interacting (can they respond to challenge, repair, disagree)

═══ LEVEL GUIDE (for your internal estimate only) ═══

${levelBlock}

═══ CEILING SIGNAL ═══

At the end of EVERY response (after the visible text), add:
<ceiling>true</ceiling> — you are in Stage 4, done
<ceiling>false</ceiling> — you are still testing

NEVER signal ceiling before completing Stage 3.`;


// ─────────────────────────────────────────────────────────────────────────────
// Build the DIAGNOSIS prompt from descriptors.ts
// ─────────────────────────────────────────────────────────────────────────────

const diagnosisMacroBlock = TASK1.levelClusters
  .map((cluster) => {
    const macros = cluster.macroIds
      .map((id) => {
        const m = TASK1.azeMacro.find((macro) => macro.azeId === id);
        if (!m) return "";
        return `  ${m.azeId} (${cluster.label}, ${m.fn}): ${m.claim}`;
      })
      .filter(Boolean)
      .join("\n");

    return `── ${cluster.label} — Threshold: ${cluster.confirmThreshold}/${cluster.totalMacros} CAN to confirm ──\n${macros}`;
  })
  .join("\n\n");

const diagnosisPrompt = `You are a CEFR assessment specialist. You have observed a Task 1 speaking test conversation (Diagnostic Q&A).

Your task: Analyse the transcript and produce a CAN / NOT_YET / NOT_TESTED verdict for each AZE macro descriptor.

═══ MACROS TO ASSESS (grouped by level) ═══

${diagnosisMacroBlock}

═══ SCORING RULES ═══

1. CAN = clear, unambiguous evidence in the transcript that the candidate achieved this communicative function.
2. NOT_YET = no evidence, weak evidence, or the candidate clearly struggled.
3. NOT_TESTED = the conversation never reached this level / never created conditions to test this macro.
4. Be conservative: mixed or ambiguous evidence = NOT_YET.
5. A single clear instance under appropriate communicative demand IS sufficient for CAN.
6. Multiple weak instances do NOT combine into CAN.
7. One response can evidence multiple macros across levels. A candidate who explains with reasons (B1) also demonstrates they can describe (A2).
8. If a candidate demonstrates competence at a higher level, lower-level gaps can be overridden (e.g., strong B1 evidence can confirm A2 even if one A2 macro was not directly tested).

IMPORTANT: Score EVERY macro in the list. Do not skip any. Your job is ONLY to score each macro — the system will calculate the level from your scores.

═══ OUTPUT FORMAT ═══

Respond ONLY with valid JSON, no other text:
{
  "results": [
    {
      "azeId": "INF-1",
      "claim": "Can provide basic personal identity information...",
      "level": "Pre-A1",
      "fn": "Informing",
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
    const { messages, exchangeCount, wrapUp, action } = await req.json();

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

        // Walk through levels in order; find the highest that meets threshold
        let calculatedLevel = "Below Pre-A1";
        const levelResults: { level: string; confirmed: boolean; canCount: number; threshold: string }[] = [];

        for (const lc of TASK1.levelClusters) {
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

        // Override the model's diagnosedLevel with the calculated one
        diagnosis.diagnosedLevel = calculatedLevel;
        diagnosis.levelResults = levelResults;

        return NextResponse.json({ diagnosis });
      } catch {
        return NextResponse.json({ error: "Failed to parse diagnosis", raw }, { status: 500 });
      }
    }

    // ── Normal conversation turn ───────────────────────────────────────────
    let prompt = conversationPrompt;

    if (exchangeCount === 0) {
      prompt += "\n\nThis is exchange 0 — the START. You are in STAGE 1. Greet warmly, ask their name, where they're from, and what they do — in one natural question.";
    } else if (wrapUp) {
      prompt += "\n\nFINAL exchange. Thank the candidate briefly in 1 sentence. Add <ceiling>true</ceiling>.";
    } else if (exchangeCount <= 3) {
      prompt += `\n\nThis is exchange ${exchangeCount} of up to ${TASK1.meta.maxExchanges}. You should be in STAGE 1 (finding the level). By exchange 3, commit to an estimate and move to STAGE 2.`;
    } else if (exchangeCount <= 8) {
      prompt += `\n\nThis is exchange ${exchangeCount} of up to ${TASK1.meta.maxExchanges}. You should be in STAGE 2 (deep testing). DO NOT wrap up yet — you need at least 5 different move types before you can close. Check your MOVES list. If you haven't done 5 different ones, keep going.`;
    } else if (exchangeCount <= 11) {
      prompt += `\n\nThis is exchange ${exchangeCount} of up to ${TASK1.meta.maxExchanges}. If you have completed 5+ move types AND found the boundary in Stage 3, you may close. Otherwise keep testing.`;
    } else {
      prompt += `\n\nThis is exchange ${exchangeCount} of up to ${TASK1.meta.maxExchanges}. You should wrap up soon. If you haven't already, do Stage 3 (stretch/confirm) and then close.`;
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

    // Extract ceiling signal
    const ceilingMatch = rawMessage.match(/<ceiling>(true|false)<\/ceiling>/);
    let ceilingReached = ceilingMatch ? ceilingMatch[1] === "true" : false;

    // Extract status for logging (optional debug)
    const statusMatch = rawMessage.match(/<status>(.*?)<\/status>/);
    if (statusMatch) {
      console.log("EXAMINER STATUS:", statusMatch[1]);
    }

    // Strip ALL hidden tags from the message shown to the candidate
    const aiMessage = rawMessage
      .replace(/<ceiling>(true|false)<\/ceiling>/g, "")
      .replace(/<status>.*?<\/status>/g, "")
      .trim();

    // Fallback: detect goodbye language even if AI forgot the ceiling tag
    if (!ceilingReached && exchangeCount >= 6) {
      const goodbyePattern = /\b(thanks? (for|you)|goodbye|good bye|bye|it'?s been|have a (good|great|nice)|take care|good luck|nice (chatting|talking)|enjoy|been a pleasure|appreciate your|thank the candidate)\b/i;
      if (goodbyePattern.test(aiMessage)) {
        console.log("CEILING FALLBACK: goodbye language detected at exchange", exchangeCount);
        ceilingReached = true;
      }
    }

    // Safety net: if the PREVIOUS AI message was a goodbye, force ceiling now
    if (!ceilingReached && exchangeCount >= 6) {
      const lastAiMsg = messages.filter((m: Message) => m.role === "assistant").slice(-1)[0];
      if (lastAiMsg) {
        const prevGoodbye = /\b(thanks? (for|you)|goodbye|good bye|bye|take care|been a pleasure|appreciate your)\b/i;
        if (prevGoodbye.test(lastAiMsg.content)) {
          console.log("CEILING SAFETY NET: previous AI message was goodbye, forcing ceiling");
          ceilingReached = true;
        }
      }
    }

    return NextResponse.json({ message: aiMessage, ceilingReached });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: "Failed to get response" }, { status: 500 });
  }
}
