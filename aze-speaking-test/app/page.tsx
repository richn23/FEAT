"use client";

import { useState, useRef, useEffect } from "react";

/* ═══════════════════════════════════════════════════════════════════════════
   Types — aligned to descriptors.ts (Task1Config)
   ═══════════════════════════════════════════════════════════════════════════ */

type FunctionType = "Informing" | "Interacting";

type Message = {
  role: "assistant" | "user";
  content: string;
};

type LevelCluster = {
  level: string;
  label: string;
  gseRange: [number, number];
  macroIds: string[];
  confirmThreshold: number;
  totalMacros: number;
  onConfirm: string;
  levelDescription: string;
};

type AzeMacro = {
  azeId: string;
  claim: string;
  fn: FunctionType;
  level: string;
  microIds: string[];
  probes: string[];
  notes?: string;
};

type Task1Config = {
  meta: {
    taskId: string;
    title: string;
    functions: FunctionType[];
    maxExchanges: number;
    description: string;
  };
  principles: Record<string, unknown>;
  gseMicro: unknown[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
};

/* Diagnosis response from the chat API */
type MacroResult = {
  azeId: string;
  claim: string;
  level: string;
  fn: string;
  result: "CAN" | "NOT_YET" | "NOT_TESTED";
  rationale: string;
  evidence: string;
};

type LevelResult = {
  level: string;
  confirmed: boolean;
  canCount: number;
  threshold: string;
};

type Diagnosis = {
  diagnosedLevel: string;
  levelResults: LevelResult[];
  results: MacroResult[];
};

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const LEVEL_LABELS: Record<string, string> = {
  PRE_A1: "Pre-A1",
  A1: "A1",
  A2: "A2",
  A2_PLUS: "A2+",
  B1: "B1",
  B1_PLUS: "B1+",
  B2: "B2",
};

function levelLabel(level: string) {
  return LEVEL_LABELS[level] ?? level;
}

const MIN_EXCHANGES = 5;

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function TestPage() {
  const [phase, setPhase] = useState<
    "loading" | "briefing" | "conversation" | "diagnosing" | "results"
  >("loading");
  const [config, setConfig] = useState<Task1Config | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exchangeCount, setExchangeCount] = useState(0);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [expandedLevels, setExpandedLevels] = useState<Set<string>>(new Set());
  const [showTranscript, setShowTranscript] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  /* ── Load config ───────────────────────────────────────────────────────── */

  useEffect(() => {
    fetch("/api/descriptors")
      .then((r) => r.json())
      .then((data: Task1Config) => {
        setConfig(data);
        setPhase("briefing");
      });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isProcessing]);

  /* ── TTS ────────────────────────────────────────────────────────────────── */

  const speakText = async (text: string): Promise<void> =>
    new Promise((resolve) => {
      fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })
        .then((r) => r.blob())
        .then((blob) => {
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => resolve();
          audio.play().catch(() => resolve());
        })
        .catch(() => resolve());
    });

  /* ── Start conversation ─────────────────────────────────────────────────── */

  const startConversation = async () => {
    setPhase("conversation");
    setIsProcessing(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], exchangeCount: 0 }),
    });
    const data = await res.json();
    const aiMsg: Message = { role: "assistant", content: data.message };
    setMessages([aiMsg]);
    setIsProcessing(false);
    await speakText(data.message);
  };

  /* ── Recording ──────────────────────────────────────────────────────────── */

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        await processAudio(blob);
      };

      recorder.start();
      setIsRecording(true);
    } catch {
      alert("Could not access microphone");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  /* ── Process a recorded turn ────────────────────────────────────────────── */

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);

    // Transcribe
    const fd = new FormData();
    fd.append("audio", blob, "audio.webm");
    const txRes = await fetch("/api/transcribe", { method: "POST", body: fd });
    const { text } = await txRes.json();
    if (!text) {
      setIsProcessing(false);
      return;
    }

    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);

    const nextCount = exchangeCount + 1;
    setExchangeCount(nextCount);

    if (!config) return;

    // Hard max → wrap up
    if (nextCount >= config.meta.maxExchanges) {
      await finishTask(newMsgs, nextCount);
      return;
    }

    // Normal turn
    const chatRes = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMsgs, exchangeCount: nextCount }),
    });
    const data = await chatRes.json();

    const aiMsg: Message = { role: "assistant", content: data.message };
    const updated = [...newMsgs, aiMsg];
    setMessages(updated);

    // Ceiling found?
    if (data.ceilingReached && nextCount >= MIN_EXCHANGES) {
      setIsProcessing(false);
      await speakText(data.message);
      await runDiagnosis(updated);
      return;
    }

    setIsProcessing(false);
    await speakText(data.message);
  };

  /* ── Finish / wrap-up ───────────────────────────────────────────────────── */

  const finishTask = async (msgs: Message[], count: number) => {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: msgs, exchangeCount: count, wrapUp: true }),
    });
    const data = await res.json();
    const aiMsg: Message = { role: "assistant", content: data.message };
    const all = [...msgs, aiMsg];
    setMessages(all);
    setIsProcessing(false);
    await speakText(data.message);
    await runDiagnosis(all);
  };

  /* ── Diagnosis ──────────────────────────────────────────────────────────── */

  const runDiagnosis = async (finalMsgs: Message[]) => {
    setPhase("diagnosing");
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: finalMsgs, action: "diagnose" }),
    });
    const data = await res.json();
    if (data.diagnosis) {
      setDiagnosis(data.diagnosis);
      setPhase("results");
    } else {
      console.error("Diagnosis failed:", data);
      setPhase("results");
    }
  };

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Loading
     ═══════════════════════════════════════════════════════════════════════════ */

  if (phase === "loading" || !config) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </main>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Briefing
     ═══════════════════════════════════════════════════════════════════════════ */

  if (phase === "briefing") {
    return (
      <main className="min-h-screen p-5 md:p-10 flex items-center justify-center">
        <div className="max-w-lg w-full animate-fade-up">
          <div className="card">
            {/* Header */}
            <div className="mb-6">
              <span className="task-badge mb-2">Task 1 of 4</span>
              <h1
                className="text-[1.625rem] font-bold tracking-tight mt-2.5"
                style={{ letterSpacing: "-0.035em" }}
              >
                Diagnostic Q&amp;A
              </h1>
              <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                AI-led conversation · Informing &amp; Interacting · 3–4 minutes
              </p>
            </div>

            {/* What the learner will do */}
            <div className="info-block mb-3">
              <h3>What the learner will do</h3>
              <p>
                Have a natural conversation with an AI examiner. It starts simple —
                name, where you're from, what you do — and gets progressively harder
                based on how you respond. You just talk; the AI decides where to go next.
              </p>
            </div>

            {/* How the AI will act */}
            <div className="info-block mb-3">
              <h3>How the AI will act</h3>
              <p>
                The AI is an examiner, not a chatbot. It probes upward when
                you're comfortable, stays or goes easier when you struggle, and
                creates specific conditions to test interaction — stating opinions
                for you to agree or disagree with, saying something unclear to see
                if you ask for clarification. It stops probing when it finds your ceiling.
              </p>
            </div>

            {/* How communication is assessed */}
            <div className="info-block mb-3">
              <h3>How communication is assessed</h3>
              <p>
                The test checks communicative functions — can you inform, can you
                interact — not grammar or vocabulary directly. Each CEFR level
                has a set of descriptors (e.g. "Can give reasons and explanations").
                After the conversation, the system scores each descriptor as
                <span
                  className="level-badge can mx-1"
                  style={{ display: "inline-flex", verticalAlign: "middle" }}
                >
                  CAN
                </span>
                or
                <span
                  className="level-badge not-yet mx-1"
                  style={{ display: "inline-flex", verticalAlign: "middle" }}
                >
                  NOT YET
                </span>
                based on evidence from the transcript. Your level is the highest
                where you meet enough descriptors.
              </p>
            </div>

            {/* Level overview */}
            <div className="info-block mb-6">
              <h3>Levels being assessed</h3>
              <div className="mt-2 space-y-2">
                {config.levelClusters.map((lc) => (
                  <div key={lc.level} className="flex items-center gap-2.5">
                    <span
                      className="level-badge not-tested shrink-0"
                      style={{ minWidth: "3rem", justifyContent: "center" }}
                    >
                      {lc.label}
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {lc.macroIds.length} descriptors · need {lc.confirmThreshold} to confirm
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={startConversation} className="btn-primary w-full">
              Begin Conversation
            </button>
          </div>
        </div>
      </main>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Diagnosing
     ═══════════════════════════════════════════════════════════════════════════ */

  if (phase === "diagnosing") {
    return (
      <main className="min-h-screen flex items-center justify-center p-5">
        <div className="card max-w-xs w-full text-center py-10 animate-fade-up">
          <div className="spinner mb-5" />
          <h2 className="text-base font-semibold tracking-tight mb-1">
            Analysing conversation
          </h2>
          <p className="text-xs" style={{ color: "var(--text-tertiary)" }}>
            Scoring transcript against {config.azeMacro.length} descriptors
          </p>
        </div>
      </main>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Results
     ═══════════════════════════════════════════════════════════════════════════ */

  if (phase === "results") {
    const resultsMap = new Map(diagnosis?.results.map((r) => [r.azeId, r]));

    const toggleLevel = (level: string) => {
      setExpandedLevels((prev) => {
        const next = new Set(prev);
        next.has(level) ? next.delete(level) : next.add(level);
        return next;
      });
    };

    return (
      <main className="min-h-screen p-5 md:p-10">
        <div className="max-w-2xl mx-auto">

          {/* ── Diagnosed Level ──────────────────────────────────────────── */}
          <div className="card mb-4 animate-fade-up">
            <div className="mb-5">
              <span className="task-badge mb-2">Task 1 — Report</span>
              <h1
                className="text-[1.625rem] font-bold tracking-tight mt-2.5"
                style={{ letterSpacing: "-0.035em" }}
              >
                Diagnostic Q&amp;A
              </h1>
              <p className="text-sm mt-0.5" style={{ color: "var(--text-secondary)" }}>
                Communicative Function Report — What you can do
              </p>
            </div>

            {diagnosis?.diagnosedLevel && (
              <div
                className="rounded-2xl p-5 text-center"
                style={{ background: "var(--blue-bg-solid)" }}
              >
                <p
                  className="text-[0.6875rem] font-semibold uppercase tracking-widest mb-1"
                  style={{ color: "var(--blue)" }}
                >
                  Diagnosed Level
                </p>
                <p
                  className="text-4xl font-bold tracking-tight"
                  style={{ color: "var(--blue)", letterSpacing: "-0.04em" }}
                >
                  {levelLabel(diagnosis.diagnosedLevel)}
                </p>
              </div>
            )}
          </div>

          {/* ── Level-by-level breakdown ──────────────────────────────────── */}
          {config.levelClusters.map((lc, idx) => {
            const macros = lc.macroIds
              .map((id) => ({
                macro: config.azeMacro.find((m) => m.azeId === id),
                result: resultsMap.get(id),
              }))
              .filter((x) => x.macro);

            const canCount = macros.filter((x) => x.result?.result === "CAN").length;
            const isConfirmed = canCount >= lc.confirmThreshold;
            const isExpanded = expandedLevels.has(lc.level);
            const fillPct = Math.round((canCount / lc.totalMacros) * 100);
            const fillClass = isConfirmed ? "confirmed" : canCount > 0 ? "partial" : "none";

            return (
              <div
                key={lc.level}
                className="card mb-3 animate-fade-up"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Level header */}
                <button
                  onClick={() => toggleLevel(lc.level)}
                  className="w-full text-left"
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`level-badge ${isConfirmed ? "can" : canCount > 0 ? "not-yet" : "not-tested"}`}
                        style={{ minWidth: "3rem", justifyContent: "center", fontSize: "0.75rem" }}
                      >
                        {lc.label}
                      </span>
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        {canCount}/{lc.totalMacros} descriptors
                      </span>
                      {isConfirmed && (
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "var(--green-text)" }}
                        >
                          ✓ Confirmed
                        </span>
                      )}
                    </div>
                    <span
                      className={`chevron ${isExpanded ? "open" : ""}`}
                      style={{
                        color: "var(--text-tertiary)",
                        fontSize: "0.75rem",
                        transition: "transform 0.2s ease",
                        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                      }}
                    >
                      ▼
                    </span>
                  </div>

                  {/* Threshold bar */}
                  <div className="confirm-track">
                    <div
                      className={`confirm-fill ${fillClass}`}
                      style={{ width: `${fillPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-[0.6875rem]" style={{ color: "var(--text-tertiary)" }}>
                      Need {lc.confirmThreshold} to confirm
                    </span>
                    <span className="text-[0.6875rem]" style={{ color: "var(--text-tertiary)" }}>
                      GSE {lc.gseRange[0]}–{lc.gseRange[1]}
                    </span>
                  </div>
                </button>

                {/* Expanded macros */}
                {isExpanded && (
                  <div className="mt-4 pt-3" style={{ borderTop: "0.5px solid var(--separator)" }}>
                    {macros.map(({ macro, result }) => {
                      if (!macro) return null;
                      const verdict = result?.result ?? "NOT_TESTED";
                      const badgeClass =
                        verdict === "CAN"
                          ? "can"
                          : verdict === "NOT_YET"
                          ? "not-yet"
                          : "not-tested";

                      return (
                        <div key={macro.azeId} className="result-item">
                          <div className="flex items-start gap-2.5">
                            <span className={`level-badge ${badgeClass} mt-0.5 shrink-0`}>
                              {verdict === "CAN"
                                ? "CAN"
                                : verdict === "NOT_YET"
                                ? "NOT YET"
                                : "—"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-[0.8125rem] font-medium" style={{ color: "var(--text-primary)" }}>
                                  {macro.claim}
                                </p>
                                <span
                                  className="text-[0.625rem] shrink-0 mt-0.5"
                                  style={{
                                    color: "var(--text-tertiary)",
                                    fontFamily: "ui-monospace, monospace",
                                  }}
                                >
                                  {macro.azeId}
                                </span>
                              </div>
                              <p
                                className="text-[0.75rem] mt-1"
                                style={{ color: "var(--text-secondary)" }}
                              >
                                {macro.fn}
                              </p>
                              {result?.rationale && (
                                <p
                                  className="text-[0.75rem] mt-1.5"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {result.rationale}
                                </p>
                              )}
                              {result?.evidence && (
                                <p
                                  className="text-[0.75rem] mt-1 italic"
                                  style={{ color: "var(--text-tertiary)" }}
                                >
                                  &ldquo;{result.evidence}&rdquo;
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* ── Transcript ───────────────────────────────────────────────── */}
          <div className="card mt-4 animate-fade-up" style={{ animationDelay: "400ms" }}>
            <button
              onClick={() => setShowTranscript(!showTranscript)}
              className="descriptor-toggle"
            >
              <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                Full Transcript
              </h2>
              <span className={`chevron ${showTranscript ? "open" : ""}`}>▼</span>
            </button>

            {showTranscript && (
              <div
                className="mt-4 pt-3 space-y-3 max-h-80 overflow-y-auto pr-1"
                style={{ borderTop: "0.5px solid var(--separator)" }}
              >
                {messages.map((msg, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span
                      className="font-semibold shrink-0 w-6"
                      style={{
                        color: msg.role === "assistant" ? "var(--blue)" : "var(--text-tertiary)",
                      }}
                    >
                      {msg.role === "assistant" ? "AI" : "You"}
                    </span>
                    <span style={{ color: "var(--text-secondary)", lineHeight: 1.5 }}>
                      {msg.content}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  /* ═══════════════════════════════════════════════════════════════════════════
     RENDER — Conversation
     ═══════════════════════════════════════════════════════════════════════════ */

  const progressPct = Math.min((exchangeCount / config.meta.maxExchanges) * 100, 100);

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--bg)" }}>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="bar-frosted sticky top-0 z-10 px-5 pt-3 pb-2.5">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="task-badge">Task 1</span>
            <span
              className="text-[0.6875rem]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {exchangeCount} / {config.meta.maxExchanges}
            </span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      </div>

      {/* ── Chat area ────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="max-w-2xl mx-auto space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-up`}
            >
              <div className={msg.role === "user" ? "bubble-user" : "bubble-ai"}>
                {msg.content}
              </div>
            </div>
          ))}

          {isProcessing && (
            <div className="flex justify-start">
              <div className="bubble-ai" style={{ color: "var(--text-tertiary)" }}>
                <span className="inline-flex gap-0.5 text-lg">
                  <span className="animate-bounce" style={{ animationDelay: "0ms" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "150ms" }}>·</span>
                  <span className="animate-bounce" style={{ animationDelay: "300ms" }}>·</span>
                </span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>
      </div>

      {/* ── Mic area ─────────────────────────────────────────────────────── */}
      <div
        className="bar-frosted border-t-0 px-5 py-5"
        style={{ borderTop: "0.5px solid var(--separator)" }}
      >
        <div className="max-w-2xl mx-auto flex flex-col items-center">
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            disabled={isProcessing}
            className={`mic-btn ${
              isRecording ? "recording" : isProcessing ? "waiting" : "idle"
            }`}
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="1" width="6" height="14" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="17" x2="12" y2="21" />
              <line x1="8" y1="21" x2="16" y2="21" />
            </svg>
          </button>
          <p
            className="text-center text-xs mt-3 tracking-wide"
            style={{ color: "var(--text-tertiary)" }}
          >
            {isRecording
              ? "Release to send"
              : isProcessing
              ? "Processing…"
              : "Hold to speak"}
          </p>
        </div>
      </div>
    </main>
  );
}
