"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { getTaskScore, getHighestConfirmedLevel, getTotalScore, getScoreLabel, TASK_NAMES, TASK_CEILINGS, type TaskKey } from "../writing/task-scoring";

/* ═══════════════════════════════════════════════════════════════════════════
   Types
   ═══════════════════════════════════════════════════════════════════════════ */

type FunctionType = "Interactional" | "Informing" | "Narrating";

type Message = { role: "assistant" | "user"; content: string };

type LevelCluster = {
  level: string; label: string; gseRange: [number, number];
  macroIds: string[]; confirmThreshold: number; totalMacros: number;
  onConfirm: string; levelDescription: string;
  promptGuidance?: { topic: string; wordRange: [number, number]; example: string };
};

type AzeMacro = {
  azeId: string; claim: string; fn: string; level: string;
  microIds: string[]; probes?: string[]; signals?: string[]; notes?: string;
};

type TaskConfig = {
  meta: { taskId: string; title: string; functions: string[]; maxExchanges?: number; scaffoldingExchanges?: number; description: string };
  principles: Record<string, unknown>;
  gseMicro: unknown[];
  azeMacro: AzeMacro[];
  levelClusters: LevelCluster[];
};

type MacroResult = {
  azeId: string; claim: string; level: string; fn: string;
  result: "CAN" | "NOT_YET" | "NOT_TESTED"; rationale: string; evidence: string;
};

type LevelResult = { level: string; confirmed: boolean; canCount: number; threshold: string };

type Diagnosis = { diagnosedLevel: string; levelResults: LevelResult[]; results: MacroResult[] };

type FormDimension = { dimension: string; level: string; descriptor: string; examples: string[] };
type FormAnalysis = { overallFormLevel: string; overallFormSummary: string; dimensions: FormDimension[] };

type WritingPrompt = { promptTitle: string; promptText: string; suggestedWords: [number, number]; topicSummary: string };

/* All possible phases across both tasks */
type Phase =
  | "loading" | "landing"
  | "t1-briefing" | "t1-conversation" | "t1-diagnosing" | "t1-results"
  | "t2-briefing" | "t2-scaffolding" | "t2-generating-prompt" | "t2-writing" | "t2-diagnosing" | "t2-results"
  | "t3-briefing" | "t3-topic-select" | "t3-conversation" | "t3-diagnosing" | "t3-results"
  | "t4-briefing" | "t4-loading-stimuli" | "t4-challenges" | "t4-diagnosing" | "t4-results"
  | "t5-briefing" | "t5-loading" | "t5-conversation" | "t5-diagnosing" | "t5-results"
  | "final-report";

/* Which screens are stakeholder vs candidate */
const isStakeholderPhase = (p: Phase) => ["landing", "t1-briefing", "t1-results", "t2-briefing", "t2-results", "t3-briefing", "t3-results", "t4-briefing", "t4-results", "t5-briefing", "t5-results", "final-report"].includes(p);
const isCandidatePhase = (p: Phase) => ["t1-conversation", "t2-scaffolding", "t2-writing", "t3-topic-select", "t3-conversation", "t4-challenges", "t5-conversation"].includes(p);

/* ═══════════════════════════════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════════════════════════════ */

const LEVEL_LABELS: Record<string, string> = {
  PRE_A1: "Pre-A1", A1: "A1", A2: "A2", A2_PLUS: "A2+",
  B1: "B1", B1_PLUS: "B1+", B2: "B2", B2_PLUS: "B2+", C1: "C1",
};

const levelLabel = (level: string) => LEVEL_LABELS[level] ?? level;

const levelToPercent = (lvl: string): number => {
  const map: Record<string, number> = {
    "Pre-A1": 8, "A1": 18, "A2": 30, "A2+": 40, "B1": 52, "B1+": 62,
    "B2": 72, "B2+": 80, "C1": 90, "C2": 98,
  };
  return map[lvl] ?? 30;
};

const barColor = (lvl: string): string => {
  const p = levelToPercent(lvl);
  if (p < 25) return "#ef4444";
  if (p < 45) return "#f59e0b";
  if (p < 65) return "#10b981";
  if (p < 80) return "#3b82f6";
  return "#6366f1";
};

const getTime = (i: number) => {
  const d = new Date(); d.setHours(10, 0, 0, 0); d.setMinutes(d.getMinutes() + i);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const MIN_EXCHANGES = 5;
const T1_API = "/api/writing-chat";
const T2_API = "/api/writing-task2-chat";
const T3_API = "/api/writing-task3-chat";
const T4_API = "/api/writing-task4-chat";
const T5_API = "/api/writing-task5-chat";

/* ═══════════════════════════════════════════════════════════════════════════
   Styles (same design system, extended for Task 2)
   ═══════════════════════════════════════════════════════════════════════════ */

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600;700&display=swap');

:root {
  --ink: #1a1a2e;
  --paper: #f0ece4;
  --accent: #2d6a4f;
  --accent-light: #d8f3dc;
  --blue: #1e3a5f;
  --blue-light: #dbeafe;
  --coral: #c44536;
  --coral-light: #fce4e1;
  --amber: #92400e;
  --amber-light: #fde68a;
  --muted: #6b7280;
  --warm: #e8e0d4;
  --separator: rgba(0,0,0,0.06);
  --glass: rgba(255,255,255,0.72);
  --glass-border: rgba(255,255,255,0.3);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 20px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.08);
  --shadow-xl: 0 20px 60px rgba(0,0,0,0.12);
  --chat-bg: #e5ddd5;
  --examiner-bubble: #ffffff;
  --candidate-bubble: #d9fdd3;
  --can: #2d6a4f; --can-light: #d8f3dc;
  --not-yet: #c44536; --not-yet-light: #fce4e1;
  --not-tested: #9ca3af; --not-tested-light: #f3f4f6;
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'DM Sans', sans-serif; background: var(--paper); color: var(--ink); min-height: 100vh; -webkit-font-smoothing: antialiased; }

@keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
@keyframes slideUp { from { opacity:0; transform:translateY(40px) } to { opacity:1; transform:translateY(0) } }
@keyframes typingDot { 0%,60%,100% { transform:translateY(0); opacity:.3 } 30% { transform:translateY(-4px); opacity:1 } }
@keyframes spin { to { transform:rotate(360deg) } }
@keyframes levelReveal { from { opacity:0; transform:scale(.85) } to { opacity:1; transform:scale(1) } }
@keyframes barGrow { from { width: 0 } }
.animate-fade-up { opacity:0; animation: fadeUp .5s ease forwards }
.animate-slide-up { opacity:0; animation: slideUp .6s ease forwards }
.spinner { width:32px; height:32px; border:2.5px solid var(--separator); border-top-color:var(--accent); border-radius:50%; animation:spin .8s linear infinite }

/* Briefing card */
.briefing-container { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:40px 20px; background: radial-gradient(ellipse at 20% 50%,rgba(45,106,79,.04) 0%,transparent 60%), radial-gradient(ellipse at 80% 20%,rgba(30,58,95,.03) 0%,transparent 50%), var(--paper) }
.briefing-card { max-width:520px; width:100%; background:var(--glass); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:24px; padding:40px 36px; box-shadow:var(--shadow-xl) }
.briefing-badge { display:inline-flex; align-items:center; gap:6px; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:var(--accent); background:var(--accent-light); padding:5px 12px; border-radius:20px }
.briefing-title { font-family:'DM Serif Display',serif; font-size:2rem; font-weight:400; letter-spacing:-.03em; color:var(--ink); margin-top:16px; line-height:1.15 }
.briefing-title em { color:var(--accent); font-style:italic }
.briefing-sub { font-size:.85rem; color:var(--muted); margin-top:6px }
.briefing-section { margin-top:20px; padding:20px; background:rgba(255,255,255,.5); border-radius:14px; border:1px solid rgba(0,0,0,.04) }
.briefing-section + .briefing-section { margin-top:12px }
.briefing-section h3 { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--ink); margin-bottom:8px }
.briefing-section p { font-size:.875rem; line-height:1.65; color:#4b5563 }
.btn-start { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; margin-top:28px; padding:16px 24px; font-family:'DM Sans',sans-serif; font-size:.95rem; font-weight:600; color:white; background:var(--accent); border:none; border-radius:14px; cursor:pointer; transition:all .2s ease; box-shadow:0 4px 14px rgba(45,106,79,.3) }
.btn-start:hover { background:#245a42; transform:translateY(-1px); box-shadow:0 6px 20px rgba(45,106,79,.35) }

/* Phone chat */
.chat-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 20px; background: radial-gradient(ellipse at 50% 0%,rgba(45,106,79,.05) 0%,transparent 50%), var(--paper) }
.phone-frame { width:100%; max-width:420px; height:85vh; max-height:740px; background:var(--chat-bg); border-radius:36px; box-shadow:var(--shadow-xl),0 0 0 1px rgba(0,0,0,.08),inset 0 0 0 1px rgba(255,255,255,.1); display:flex; flex-direction:column; overflow:hidden }
.phone-status-bar { height:44px; background:var(--accent); display:flex; align-items:flex-end; justify-content:center; padding-bottom:4px; flex-shrink:0 }
.phone-notch { width:120px; height:28px; background:#000; border-radius:0 0 18px 18px }
.chat-top-bar { background:var(--accent); padding:10px 16px 12px; display:flex; align-items:center; gap:12px; flex-shrink:0 }
.chat-avatar { width:38px; height:38px; border-radius:50%; background:rgba(255,255,255,.2); display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; color:white; flex-shrink:0 }
.chat-top-info h2 { font-size:.9rem; font-weight:600; color:white }
.chat-top-info span { font-size:.7rem; color:rgba(255,255,255,.65) }
.chat-progress-wrap { margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; gap:3px }
.chat-progress-label { font-size:.6rem; color:rgba(255,255,255,.5) }
.chat-progress-bar { width:48px; height:3px; background:rgba(255,255,255,.15); border-radius:2px; overflow:hidden }
.chat-progress-fill { height:100%; background:rgba(255,255,255,.7); border-radius:2px; transition:width .5s ease }
.chat-body { flex:1; overflow-y:auto; padding:16px 12px; display:flex; flex-direction:column; gap:3px; background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.02'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") }
.chat-body::-webkit-scrollbar { width:4px }
.chat-body::-webkit-scrollbar-thumb { background:rgba(0,0,0,.1); border-radius:2px }
.msg-row { display:flex; align-items:flex-end; gap:6px; max-width:85%; animation:fadeUp .3s ease forwards }
.msg-row.assistant { align-self:flex-start }
.msg-row.user { align-self:flex-end }
.msg-avatar-sm { width:26px; height:26px; border-radius:50%; background:var(--accent); display:flex; align-items:center; justify-content:center; font-size:.5rem; font-weight:700; color:white; flex-shrink:0 }
.msg-bubble { padding:9px 14px; font-size:.875rem; line-height:1.5; border-radius:18px; box-shadow:0 1px 2px rgba(0,0,0,.06) }
.msg-bubble.assistant { background:var(--examiner-bubble); color:var(--ink); border-bottom-left-radius:6px }
.msg-bubble.user { background:var(--candidate-bubble); color:var(--ink); border-bottom-right-radius:6px }
.msg-time { font-size:.6rem; color:rgba(0,0,0,.35); margin-top:3px; text-align:right }
.typing-row { display:flex; align-items:flex-end; gap:6px; align-self:flex-start }
.typing-bubble { background:var(--examiner-bubble); padding:12px 18px; border-radius:18px; border-bottom-left-radius:6px; display:flex; gap:4px; box-shadow:0 1px 2px rgba(0,0,0,.06) }
.typing-bubble .dot { width:7px; height:7px; background:#90a4ae; border-radius:50%; animation:typingDot 1.2s ease infinite }
.typing-bubble .dot:nth-child(2) { animation-delay:.15s }
.typing-bubble .dot:nth-child(3) { animation-delay:.3s }
.chat-input-area { padding:8px 10px; background:#f0f0f0; display:flex; align-items:flex-end; gap:8px; flex-shrink:0; border-top:1px solid rgba(0,0,0,.06) }
.chat-text-input { flex:1; padding:10px 16px; font-family:'DM Sans',sans-serif; font-size:.875rem; background:white; border:none; border-radius:18px; outline:none; color:var(--ink); resize:none; overflow-y:auto; max-height:120px; min-height:40px; line-height:1.4; display:block }
.chat-text-input::placeholder { color:#9ca3af }
.chat-text-input:disabled { opacity:.5; cursor:not-allowed }
.chat-send-btn { width:40px; height:40px; border-radius:50%; border:none; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all .15s ease; flex-shrink:0; color:white }
.chat-send-btn:disabled { opacity:.5; cursor:not-allowed }
.phone-home-bar { height:24px; background:#f0f0f0; display:flex; align-items:center; justify-content:center; flex-shrink:0 }
.home-indicator { width:120px; height:4px; background:rgba(0,0,0,.15); border-radius:2px }

/* Diagnosing */
.diagnosing-container { min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--paper) }
.diagnosing-inner { text-align:center }
.diagnosing-inner p { font-size:.9rem; color:var(--muted); margin-top:16px }

/* Results dashboard */
.results-page { min-height:100vh; background: radial-gradient(ellipse at 20% 10%,rgba(45,106,79,.03) 0%,transparent 50%), radial-gradient(ellipse at 80% 80%,rgba(30,58,95,.03) 0%,transparent 50%), var(--paper) }
.results-nav { position:sticky; top:0; z-index:50; padding:16px 40px; display:flex; justify-content:space-between; align-items:center; background:rgba(240,236,228,.85); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-bottom:1px solid var(--separator) }
.results-nav-logo { font-family:'DM Serif Display',serif; font-size:1.2rem; color:var(--ink) }
.results-nav-logo em { color:var(--accent); font-style:normal }
.results-nav-tag { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); background:var(--warm); padding:5px 12px; border-radius:16px }
.results-hero { padding:48px 40px 40px; max-width:1280px; margin:0 auto; display:flex; align-items:flex-end; gap:40px; border-bottom:1px solid var(--separator) }
.hero-left { flex:1 }
.hero-eyebrow { font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.14em; color:var(--accent) }
.hero-title { font-family:'DM Serif Display',serif; font-size:2.2rem; font-weight:400; letter-spacing:-.03em; color:var(--ink); margin-top:8px; line-height:1.15 }
.hero-title em { color:var(--accent); font-style:italic }
.hero-subtitle { font-size:.9rem; color:var(--muted); margin-top:6px; line-height:1.5 }
.hero-levels { display:flex; gap:20px; align-items:flex-end }
.hero-level-block { text-align:center }
.hero-level-label { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:6px }
.hero-level-value { font-family:'DM Serif Display',serif; font-size:3rem; font-weight:400; letter-spacing:-.04em; line-height:1; animation:levelReveal .6s ease forwards }
.hero-level-value.function-level { color:var(--accent) }
.hero-level-value.form-level { color:var(--blue) }
.hero-level-divider { width:1px; height:56px; background:var(--separator) }
.results-grid { max-width:1280px; margin:0 auto; padding:32px 40px 40px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:24px }
@media (max-width:1024px) { .results-grid { grid-template-columns:1fr } .results-hero { flex-direction:column; align-items:flex-start } }
.col-header { margin-bottom:20px }
.col-number { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); margin-bottom:4px }
.col-title { font-family:'DM Serif Display',serif; font-size:1.25rem; font-weight:400; color:var(--ink); letter-spacing:-.02em }
.col-subtitle { font-size:.8rem; color:var(--muted); margin-top:2px }
.glass-card { background:var(--glass); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid var(--glass-border); border-radius:18px; padding:22px; box-shadow:var(--shadow-sm); margin-bottom:14px; transition:box-shadow .2s ease }
.glass-card:hover { box-shadow:var(--shadow-md) }
.glass-card-label { font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:10px }
.summary-stat { display:flex; align-items:baseline; gap:10px; margin-bottom:12px }
.summary-stat-value { font-family:'DM Serif Display',serif; font-size:1.8rem; font-weight:400; color:var(--accent); letter-spacing:-.03em }
.summary-stat-label { font-size:.8rem; color:var(--muted) }
.summary-text { font-size:.85rem; line-height:1.7; color:#4b5563 }
.summary-text strong { color:var(--ink) }
.next-step-box { padding:18px; background:rgba(45,106,79,.06); border-radius:12px; border-left:3px solid var(--accent) }
.next-step-box h4 { font-size:.75rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; color:var(--accent); margin-bottom:6px }
.next-step-box p { font-size:.825rem; line-height:1.6; color:#4b5563 }
.cluster-row { display:flex; align-items:center; gap:12px; padding:12px 0; border-bottom:1px solid var(--separator); cursor:pointer }
.cluster-row:last-child { border-bottom:none }
.cluster-pill { font-family:'DM Serif Display',serif; font-size:.85rem; padding:3px 12px; border-radius:8px; min-width:48px; text-align:center }
.cluster-pill.confirmed { background:var(--can-light); color:var(--can) }
.cluster-pill.unconfirmed { background:var(--not-tested-light); color:var(--not-tested) }
.cluster-info { flex:1 }
.cluster-info-status { font-size:.8rem; font-weight:600; color:var(--ink) }
.cluster-info-threshold { font-size:.7rem; color:var(--muted) }
.cluster-chevron { font-size:.6rem; color:var(--muted); transition:transform .2s ease }
.cluster-chevron.open { transform:rotate(180deg) }
.macro-list { padding:10px 0 4px }
.macro-item { padding:10px 0; border-bottom:1px solid rgba(0,0,0,.03) }
.macro-item:last-child { border-bottom:none }
.macro-top-row { display:flex; align-items:flex-start; gap:8px }
.verdict-tag { font-size:.55rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; padding:2px 8px; border-radius:5px; flex-shrink:0; margin-top:2px }
.verdict-tag.can { background:var(--can-light); color:var(--can) }
.verdict-tag.not-yet { background:var(--not-yet-light); color:var(--not-yet) }
.verdict-tag.not-tested { background:var(--not-tested-light); color:var(--not-tested) }
.macro-claim-text { font-size:.8rem; font-weight:500; color:var(--ink); line-height:1.4 }
.macro-meta { display:flex; justify-content:space-between; margin-top:3px }
.macro-fn-tag { font-size:.65rem; color:var(--muted) }
.macro-id-tag { font-size:.6rem; font-family:ui-monospace,'SF Mono',monospace; color:var(--muted) }
.macro-rationale { font-size:.75rem; color:#4b5563; margin-top:6px; line-height:1.5 }
.macro-evidence { font-size:.725rem; color:var(--muted); font-style:italic; margin-top:3px; line-height:1.5 }
.form-overall { text-align:center; padding:8px 0 16px; border-bottom:1px solid var(--separator); margin-bottom:16px }
.form-overall-level { font-family:'DM Serif Display',serif; font-size:2.4rem; font-weight:400; color:var(--blue); letter-spacing:-.03em }
.form-overall-summary { font-size:.825rem; color:#4b5563; line-height:1.6; margin-top:6px }
.form-dimension { padding:14px 0; border-bottom:1px solid var(--separator) }
.form-dimension:last-child { border-bottom:none }
.form-dim-header { display:flex; align-items:center; justify-content:space-between }
.form-dim-name { font-size:.8rem; font-weight:600; color:var(--ink) }
.form-dim-level { font-size:.7rem; font-weight:700; color:var(--blue); background:var(--blue-light); padding:2px 10px; border-radius:6px }
.form-dim-bar-track { height:4px; background:rgba(0,0,0,.05); border-radius:2px; margin-top:8px; overflow:hidden }
.form-dim-bar-fill { height:100%; border-radius:2px; animation:barGrow .8s ease forwards }
.form-dim-descriptor { font-size:.775rem; color:#4b5563; margin-top:8px; line-height:1.5 }
.form-dim-example { font-size:.725rem; color:var(--muted); font-style:italic; margin-top:3px; line-height:1.4 }
.transcript-section { max-width:1280px; margin:0 auto; padding:0 40px 40px }
.transcript-card { background:var(--glass); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:1px solid var(--glass-border); border-radius:18px; box-shadow:var(--shadow-sm); overflow:hidden }
.transcript-toggle { display:flex; align-items:center; justify-content:space-between; padding:18px 22px; cursor:pointer; background:none; border:none; width:100%; font-family:'DM Sans',sans-serif }
.transcript-toggle h3 { font-size:.85rem; font-weight:600; color:var(--ink) }
.transcript-body { padding:0 22px 18px; border-top:1px solid var(--separator) }
.transcript-msg { padding:10px 0; border-bottom:1px solid var(--separator); display:flex; gap:10px; align-items:flex-start }
.transcript-msg:last-child { border-bottom:none }
.transcript-role { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.08em; min-width:24px; padding-top:2px }
.transcript-role.ai { color:var(--accent) }
.transcript-role.you { color:var(--blue) }
.transcript-text { font-size:.8rem; line-height:1.55; color:#374151 }

/* ── Task 2 Writing area ─────────────────────────────────────────── */
.writing-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 20px; background: radial-gradient(ellipse at 50% 30%,rgba(30,58,95,.04) 0%,transparent 50%), var(--paper) }
.writing-frame { width:100%; max-width:680px }
.writing-prompt-card { background:var(--glass); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; padding:32px; box-shadow:var(--shadow-lg); margin-bottom:20px }
.writing-prompt-tag { font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--blue); background:var(--blue-light); padding:4px 10px; border-radius:12px; display:inline-block; margin-bottom:12px }
.writing-prompt-title { font-family:'DM Serif Display',serif; font-size:1.5rem; font-weight:400; color:var(--ink); margin-bottom:8px }
.writing-prompt-text { font-size:.9rem; line-height:1.6; color:#4b5563 }
.writing-word-guide { display:inline-flex; align-items:center; gap:6px; font-size:.75rem; color:var(--muted); margin-top:12px; padding:6px 12px; background:rgba(0,0,0,.03); border-radius:8px }
.writing-textarea-wrap { background:var(--glass); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; box-shadow:var(--shadow-lg); overflow:hidden }
.writing-textarea { width:100%; min-height:300px; padding:28px; font-family:'DM Sans',sans-serif; font-size:.925rem; line-height:1.8; color:var(--ink); background:transparent; border:none; outline:none; resize:vertical }
.writing-textarea::placeholder { color:#9ca3af }
.writing-footer { display:flex; align-items:center; justify-content:space-between; padding:12px 28px 16px; border-top:1px solid var(--separator) }
.writing-word-count { font-size:.75rem; color:var(--muted) }
.writing-submit-btn { padding:10px 24px; font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:600; color:white; background:var(--accent); border:none; border-radius:12px; cursor:pointer; transition:all .2s ease }
.writing-submit-btn:hover { background:#245a42; transform:translateY(-1px) }
.writing-submit-btn:disabled { opacity:.5; cursor:not-allowed; transform:none }

/* Continue button on results */
.results-continue { max-width:1280px; margin:0 auto; padding:0 40px 60px }
.btn-continue { display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:18px 24px; font-family:'DM Sans',sans-serif; font-size:1rem; font-weight:600; color:white; background:var(--blue); border:none; border-radius:16px; cursor:pointer; transition:all .2s ease; box-shadow:0 4px 14px rgba(30,58,95,.3) }
.btn-continue:hover { background:#162e4a; transform:translateY(-1px) }

/* Scaffolding notice */
.scaffolding-notice { text-align:center; padding:8px; font-size:.65rem; font-weight:600; text-transform:uppercase; letter-spacing:.1em; color:var(--amber); background:var(--amber-light); flex-shrink:0 }

/* ── View badge ──────────────────────────────────────────────────── */
.view-badge { position:fixed; top:16px; right:16px; z-index:100; font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.14em; padding:6px 14px; border-radius:20px; backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px) }
.view-badge.stakeholder { background:rgba(30,41,59,.85); color:rgba(255,255,255,.8); border:1px solid rgba(255,255,255,.1) }
.view-badge.candidate { background:rgba(255,255,255,.7); color:var(--ink); border:1px solid rgba(0,0,0,.08) }

/* ── Stakeholder theme override ──────────────────────────────────── */
.stakeholder-theme { --s-bg: #1e293b; --s-bg2: #0f172a; --s-surface: rgba(30,41,59,.6); --s-surface-border: rgba(255,255,255,.06); --s-text: #e2e8f0; --s-text-muted: #94a3b8; --s-accent: #34d399; --s-accent-muted: rgba(52,211,153,.15) }
.stakeholder-theme .briefing-container { background: radial-gradient(ellipse at 20% 50%,rgba(52,211,153,.04) 0%,transparent 60%), radial-gradient(ellipse at 80% 20%,rgba(56,189,248,.03) 0%,transparent 50%), var(--s-bg) }
.stakeholder-theme .briefing-card { background:var(--s-surface); border-color:var(--s-surface-border); box-shadow:0 20px 60px rgba(0,0,0,.4) }
.stakeholder-theme .briefing-badge { background:var(--s-accent-muted); color:var(--s-accent) }
.stakeholder-theme .briefing-title { color:var(--s-text) }
.stakeholder-theme .briefing-title em { color:var(--s-accent) }
.stakeholder-theme .briefing-sub { color:var(--s-text-muted) }
.stakeholder-theme .briefing-section { background:rgba(255,255,255,.03); border-color:rgba(255,255,255,.04) }
.stakeholder-theme .briefing-section h3 { color:var(--s-text) }
.stakeholder-theme .briefing-section p { color:var(--s-text-muted) }
.stakeholder-theme .btn-start { background:var(--s-accent); color:#0f172a; box-shadow:0 4px 14px rgba(52,211,153,.25) }
.stakeholder-theme .btn-start:hover { background:#2dd4a8 }
.stakeholder-theme .results-page { background: radial-gradient(ellipse at 20% 10%,rgba(52,211,153,.03) 0%,transparent 50%), radial-gradient(ellipse at 80% 80%,rgba(56,189,248,.03) 0%,transparent 50%), var(--s-bg) }
.stakeholder-theme .results-nav { background:rgba(15,23,42,.85); border-bottom-color:rgba(255,255,255,.06) }
.stakeholder-theme .results-nav-logo { color:var(--s-text) }
.stakeholder-theme .results-nav-logo em { color:var(--s-accent) }
.stakeholder-theme .results-nav-tag { color:var(--s-text-muted); background:rgba(255,255,255,.06) }
.stakeholder-theme .results-hero { border-bottom-color:rgba(255,255,255,.06) }
.stakeholder-theme .hero-eyebrow { color:var(--s-accent) }
.stakeholder-theme .hero-title { color:var(--s-text) }
.stakeholder-theme .hero-title em { color:var(--s-accent) }
.stakeholder-theme .hero-subtitle { color:var(--s-text-muted) }
.stakeholder-theme .hero-level-label { color:var(--s-text-muted) }
.stakeholder-theme .hero-level-value.function-level { color:var(--s-accent) }
.stakeholder-theme .hero-level-value.form-level { color:#38bdf8 }
.stakeholder-theme .hero-level-divider { background:rgba(255,255,255,.08) }
.stakeholder-theme .col-number { color:var(--s-text-muted) }
.stakeholder-theme .col-title { color:var(--s-text) }
.stakeholder-theme .col-subtitle { color:var(--s-text-muted) }
.stakeholder-theme .glass-card { background:var(--s-surface); border-color:var(--s-surface-border); box-shadow:0 2px 8px rgba(0,0,0,.2) }
.stakeholder-theme .glass-card:hover { box-shadow:0 4px 16px rgba(0,0,0,.3) }
.stakeholder-theme .glass-card-label { color:var(--s-text-muted) }
.stakeholder-theme .summary-stat-value { color:var(--s-accent) }
.stakeholder-theme .summary-stat-label { color:var(--s-text-muted) }
.stakeholder-theme .summary-text { color:var(--s-text-muted) }
.stakeholder-theme .summary-text strong { color:var(--s-text) }
.stakeholder-theme .cluster-row { border-bottom-color:rgba(255,255,255,.04) }
.stakeholder-theme .cluster-info-status { color:var(--s-text) }
.stakeholder-theme .cluster-info-threshold { color:var(--s-text-muted) }
.stakeholder-theme .cluster-chevron { color:var(--s-text-muted) }
.stakeholder-theme .macro-item { border-bottom-color:rgba(255,255,255,.03) }
.stakeholder-theme .macro-claim-text { color:var(--s-text) }
.stakeholder-theme .macro-fn-tag { color:var(--s-text-muted) }
.stakeholder-theme .macro-id-tag { color:var(--s-text-muted) }
.stakeholder-theme .macro-rationale { color:var(--s-text-muted) }
.stakeholder-theme .macro-evidence { color:#64748b }
.stakeholder-theme .form-overall-level { color:#38bdf8 }
.stakeholder-theme .form-overall-summary { color:var(--s-text-muted) }
.stakeholder-theme .form-dim-name { color:var(--s-text) }
.stakeholder-theme .form-dim-level { color:#38bdf8; background:rgba(56,189,248,.1) }
.stakeholder-theme .form-dim-bar-track { background:rgba(255,255,255,.05) }
.stakeholder-theme .form-dimension { border-bottom-color:rgba(255,255,255,.04) }
.stakeholder-theme .form-dim-descriptor { color:var(--s-text-muted) }
.stakeholder-theme .form-dim-example { color:#64748b }
.stakeholder-theme .transcript-card { background:var(--s-surface); border-color:var(--s-surface-border) }
.stakeholder-theme .transcript-toggle h3 { color:var(--s-text) }
.stakeholder-theme .transcript-body { border-top-color:rgba(255,255,255,.04) }
.stakeholder-theme .transcript-msg { border-bottom-color:rgba(255,255,255,.04) }
.stakeholder-theme .transcript-text { color:var(--s-text-muted) }
.stakeholder-theme .next-step-box { background:rgba(52,211,153,.06); border-left-color:var(--s-accent) }
.stakeholder-theme .next-step-box h4 { color:var(--s-accent) }
.stakeholder-theme .next-step-box p { color:var(--s-text-muted) }
.stakeholder-theme .btn-continue { background:var(--s-accent); color:#0f172a; box-shadow:0 4px 14px rgba(52,211,153,.2) }
.stakeholder-theme .btn-continue:hover { background:#2dd4a8 }
.stakeholder-theme .results-continue { border-top-color:rgba(255,255,255,.04) }

/* ── Landing page ────────────────────────────────────────────────── */
.landing-container { min-height:100vh; background: radial-gradient(ellipse at 30% 20%,rgba(52,211,153,.04) 0%,transparent 50%), radial-gradient(ellipse at 70% 80%,rgba(56,189,248,.03) 0%,transparent 50%), var(--s-bg); display:flex; flex-direction:column; align-items:center; padding:60px 20px 80px }
.landing-header { text-align:center; max-width:720px; margin-bottom:48px }
.landing-logo { font-family:'DM Serif Display',serif; font-size:1.4rem; color:var(--s-text); margin-bottom:24px }
.landing-logo em { color:var(--s-accent); font-style:normal }
.landing-logo-sub { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:var(--s-text-muted); margin-top:4px }
.landing-title { font-family:'DM Serif Display',serif; font-size:2.8rem; font-weight:400; letter-spacing:-.03em; color:var(--s-text); line-height:1.15; margin-top:16px }
.landing-title em { color:var(--s-accent); font-style:italic }
.landing-subtitle { font-size:1rem; color:var(--s-text-muted); margin-top:12px; line-height:1.65 }
.landing-grid { max-width:960px; width:100%; display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-bottom:32px }
@media (max-width:768px) { .landing-grid { grid-template-columns:1fr } }
.landing-card { background:var(--s-surface); border:1px solid var(--s-surface-border); border-radius:18px; padding:28px; transition:box-shadow .2s ease }
.landing-card:hover { box-shadow:0 4px 20px rgba(0,0,0,.3) }
.landing-card-icon { font-size:1.4rem; margin-bottom:12px }
.landing-card h3 { font-family:'DM Serif Display',serif; font-size:1.1rem; font-weight:400; color:var(--s-text); margin-bottom:8px }
.landing-card p { font-size:.85rem; line-height:1.65; color:var(--s-text-muted) }
.landing-highlight { max-width:960px; width:100%; border-radius:18px; padding:32px 36px; margin-bottom:32px; border:1px solid rgba(52,211,153,.2); background:rgba(52,211,153,.05) }
.landing-highlight h3 { font-family:'DM Serif Display',serif; font-size:1.15rem; font-weight:400; color:var(--s-accent); margin-bottom:12px }
.landing-highlight p { font-size:.875rem; line-height:1.7; color:var(--s-text-muted) }
.landing-highlight strong { color:var(--s-text) }
.landing-structure { max-width:960px; width:100%; margin-bottom:40px }
.landing-structure h3 { font-family:'DM Serif Display',serif; font-size:1.3rem; font-weight:400; color:var(--s-text); text-align:center; margin-bottom:20px }
.landing-task-row { display:flex; gap:12px; margin-bottom:10px }
.landing-task-num { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:.7rem; font-weight:700; flex-shrink:0 }
.landing-task-num.t1 { background:rgba(52,211,153,.12); color:var(--s-accent) }
.landing-task-num.t2 { background:rgba(56,189,248,.12); color:#38bdf8 }
.landing-task-info h4 { font-size:.85rem; font-weight:600; color:var(--s-text) }
.landing-task-info p { font-size:.775rem; color:var(--s-text-muted); margin-top:2px }
.landing-cta { max-width:960px; width:100% }
.landing-cta .btn-start { background:var(--s-accent); color:#0f172a; box-shadow:0 4px 14px rgba(52,211,153,.25); font-size:1rem; padding:18px 24px; border-radius:16px }
.landing-cta .btn-start:hover { background:#2dd4a8 }
/* ── Topic selector ───────────────────────────────────────────────── */
.topic-page { min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px 20px; background: radial-gradient(ellipse at 50% 30%,rgba(196,69,54,.04) 0%,transparent 50%), var(--paper) }
.topic-frame { max-width:480px; width:100%; text-align:center }
.topic-frame h2 { font-family:'DM Serif Display',serif; font-size:1.6rem; font-weight:400; color:var(--ink); margin-bottom:6px }
.topic-frame p { font-size:.85rem; color:var(--muted); margin-bottom:24px }
.topic-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px }
.topic-btn { padding:20px 16px; background:var(--glass); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border:2px solid rgba(0,0,0,.06); border-radius:16px; font-family:'DM Sans',sans-serif; font-size:.9rem; font-weight:600; color:var(--ink); cursor:pointer; transition:all .2s ease; text-align:center }
.topic-btn:hover { border-color:var(--coral); color:var(--coral); transform:translateY(-2px); box-shadow:var(--shadow-md) }

/* Debate chat accent color */
.debate-accent .chat-top-bar { background:var(--coral) }
.debate-accent .chat-avatar { background:rgba(255,255,255,.2) }
.debate-accent .msg-avatar-sm { background:var(--coral) }
.debate-accent .chat-send-btn { background:var(--coral) !important }

/* ── Task 4: Challenge cards ─────────────────────────────────────── */
.challenge-page { min-height:100vh; padding:40px 20px 80px; background: radial-gradient(ellipse at 50% 20%,rgba(147,51,234,.04) 0%,transparent 50%), var(--paper) }
.challenge-header { text-align:center; max-width:640px; margin:0 auto 32px }
.challenge-header h2 { font-family:'DM Serif Display',serif; font-size:1.6rem; font-weight:400; color:var(--ink) }
.challenge-header p { font-size:.85rem; color:var(--muted); margin-top:6px }
.challenge-progress { display:flex; gap:8px; justify-content:center; margin-top:16px }
.challenge-dot { width:10px; height:10px; border-radius:50%; background:rgba(0,0,0,.08); transition:all .3s ease }
.challenge-dot.active { background:#7c3aed; transform:scale(1.3) }
.challenge-dot.done { background:#a78bfa }
.challenge-card { max-width:640px; margin:0 auto; background:var(--glass); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border:1px solid var(--glass-border); border-radius:20px; box-shadow:var(--shadow-lg); overflow:hidden; animation:fadeUp .4s ease forwards }
.challenge-type-tag { display:inline-flex; align-items:center; gap:6px; font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; padding:5px 12px; border-radius:12px; margin-bottom:12px }
.challenge-type-tag.simplify { background:rgba(16,185,129,.1); color:#059669 }
.challenge-type-tag.formalise { background:rgba(59,130,246,.1); color:#2563eb }
.challenge-type-tag.audience { background:rgba(245,158,11,.1); color:#d97706 }
.challenge-type-tag.tone { background:rgba(147,51,234,.1); color:#7c3aed }
.challenge-stimulus-area { padding:28px; border-bottom:1px solid var(--separator) }
.challenge-instruction { font-size:.95rem; font-weight:600; color:var(--ink); margin-bottom:16px }
.challenge-stimulus-box { padding:16px 20px; background:rgba(0,0,0,.03); border-radius:12px; border-left:3px solid #7c3aed }
.challenge-stimulus-label { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:6px }
.challenge-stimulus-text { font-size:.875rem; line-height:1.7; color:#374151; font-style:italic }
.challenge-response-area { padding:28px }
.challenge-response-label { font-size:.7rem; font-weight:700; text-transform:uppercase; letter-spacing:.1em; color:var(--muted); margin-bottom:8px }
.challenge-textarea { width:100%; min-height:120px; padding:16px; font-family:'DM Sans',sans-serif; font-size:.9rem; line-height:1.7; color:var(--ink); background:rgba(0,0,0,.02); border:1px solid rgba(0,0,0,.06); border-radius:12px; outline:none; resize:vertical; transition:border-color .2s ease }
.challenge-textarea:focus { border-color:#7c3aed }
.challenge-textarea::placeholder { color:#9ca3af }
.challenge-nav { display:flex; justify-content:space-between; padding:0 28px 24px }
.challenge-nav-btn { padding:10px 20px; font-family:'DM Sans',sans-serif; font-size:.85rem; font-weight:600; border:none; border-radius:12px; cursor:pointer; transition:all .2s ease }
.challenge-nav-btn.secondary { background:rgba(0,0,0,.05); color:var(--ink) }
.challenge-nav-btn.secondary:hover { background:rgba(0,0,0,.08) }
.challenge-nav-btn.primary { background:#7c3aed; color:white; box-shadow:0 4px 14px rgba(124,58,234,.25) }
.challenge-nav-btn.primary:hover { background:#6d28d9; transform:translateY(-1px) }
.challenge-nav-btn:disabled { opacity:.4; cursor:not-allowed; transform:none }

/* ── Task 5: Split screen — cards + chat ─────────────────────────── */
.t5-split { display:flex; flex-direction:column; min-height:100vh; background:var(--paper) }
.t5-cards-bar { flex-shrink:0; padding:12px 16px; display:flex; gap:12px; justify-content:center; background:rgba(255,255,255,.6); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); border-bottom:1px solid var(--separator); overflow-x:auto }
.t5-card { flex:0 0 280px; padding:16px; border-radius:14px; border:1px solid rgba(0,0,0,.06); background:white; box-shadow:0 2px 8px rgba(0,0,0,.04) }
.t5-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.t5-card-name { font-family:'DM Serif Display',serif; font-size:1rem; font-weight:400; color:var(--ink) }
.t5-card-stars { color:#f59e0b; font-size:.75rem; letter-spacing:1px }
.t5-card-tagline { font-size:.7rem; color:var(--muted); margin-bottom:10px; font-style:italic }
.t5-card-price { font-family:'DM Serif Display',serif; font-size:1.3rem; color:var(--ink); margin-bottom:2px }
.t5-card-price-note { font-size:.65rem; color:var(--muted); margin-bottom:10px }
.t5-card-features { display:flex; flex-direction:column; gap:5px }
.t5-card-feature { display:flex; align-items:center; gap:8px; font-size:.75rem; color:#4b5563 }
.t5-card-feature-icon { width:18px; text-align:center; flex-shrink:0 }
.t5-card-feature-label { font-weight:600; min-width:60px }
.t5-card-highlight { margin-top:10px; padding:6px 10px; background:rgba(52,211,153,.08); border-radius:8px; font-size:.7rem; font-weight:600; color:#059669; text-align:center }
.t5-chat-area { flex:1; display:flex; flex-direction:column; max-width:420px; margin:0 auto; width:100% }
@media (min-width:900px) {
  .t5-split { flex-direction:row }
  .t5-cards-bar { flex-direction:column; width:320px; border-bottom:none; border-right:1px solid var(--separator); padding:20px 16px; overflow-y:auto }
  .t5-card { flex:0 0 auto }
  .t5-chat-area { max-width:none; flex:1 }
}

/* T5 accent */
.t5-accent .chat-top-bar { background:#0891b2 }
.t5-accent .chat-avatar { background:rgba(255,255,255,.2) }
.t5-accent .msg-avatar-sm { background:#0891b2 }
.t5-accent .chat-send-btn { background:#0891b2 !important }

/* ── Final Report ────────────────────────────────────────────────── */
.report-page { min-height:100vh; background: radial-gradient(ellipse at 20% 10%,rgba(52,211,153,.03) 0%,transparent 50%), radial-gradient(ellipse at 80% 80%,rgba(56,189,248,.03) 0%,transparent 50%), var(--s-bg); padding:0 }
.report-nav { position:sticky; top:0; z-index:50; display:flex; align-items:center; justify-content:space-between; padding:14px 32px; background:rgba(15,23,42,.92); backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px); border-bottom:1px solid rgba(255,255,255,.06) }
.report-nav-logo { font-family:'DM Serif Display',serif; font-size:1rem; color:var(--s-text) }
.report-nav-logo em { color:var(--s-accent); font-style:normal }
.report-nav-tag { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--s-text-muted); background:rgba(255,255,255,.06); padding:4px 10px; border-radius:10px }
.report-hero { text-align:center; padding:48px 32px 40px; border-bottom:1px solid rgba(255,255,255,.06) }
.report-hero-eyebrow { font-size:.65rem; font-weight:700; text-transform:uppercase; letter-spacing:.16em; color:var(--s-accent); margin-bottom:8px }
.report-hero-title { font-family:'DM Serif Display',serif; font-size:2.4rem; font-weight:400; color:var(--s-text); letter-spacing:-.02em }
.report-hero-title em { color:var(--s-accent); font-style:italic }
.report-hero-sub { font-size:.9rem; color:var(--s-text-muted); margin-top:8px }
.report-overall { display:flex; gap:32px; justify-content:center; margin-top:28px; flex-wrap:wrap }
.report-overall-item { text-align:center }
.report-overall-label { font-size:.6rem; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:var(--s-text-muted); margin-bottom:4px }
.report-overall-value { font-family:'DM Serif Display',serif; font-size:2.2rem; font-weight:400 }
.report-overall-value.fn { color:var(--s-accent) }
.report-overall-value.form { color:#38bdf8 }
.report-divider { width:1px; background:rgba(255,255,255,.08); align-self:stretch }
.report-split { display:grid; grid-template-columns:1fr 1fr; gap:24px; max-width:1200px; margin:0 auto; padding:40px 32px 60px }
@media (max-width:860px) { .report-split { grid-template-columns:1fr; } }
.report-panel { background:var(--s-surface); border:1px solid var(--s-surface-border); border-radius:20px; padding:28px; box-shadow:0 2px 8px rgba(0,0,0,.15) }
.report-panel-header { display:flex; align-items:center; gap:10px; margin-bottom:20px; padding-bottom:14px; border-bottom:1px solid rgba(255,255,255,.06) }
.report-panel-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1rem; flex-shrink:0 }
.report-panel-icon.fn { background:rgba(52,211,153,.12); color:var(--s-accent) }
.report-panel-icon.form { background:rgba(56,189,248,.12); color:#38bdf8 }
.report-panel-title { font-family:'DM Serif Display',serif; font-size:1.15rem; font-weight:400; color:var(--s-text) }
.report-panel-sub { font-size:.7rem; color:var(--s-text-muted) }
.report-fn-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.04) }
.report-fn-row:last-child { border-bottom:none }
.report-fn-info { flex:1 }
.report-fn-name { font-size:.8rem; font-weight:600; color:var(--s-text) }
.report-fn-task { font-size:.65rem; color:var(--s-text-muted); margin-top:1px }
.report-fn-level { font-family:'DM Serif Display',serif; font-size:1.1rem; min-width:50px; text-align:right }
.report-fn-level.high { color:var(--s-accent) }
.report-fn-level.mid { color:#fbbf24 }
.report-fn-level.low { color:#f87171 }
.report-fn-level.na { color:var(--s-text-muted); font-size:.75rem; font-style:italic; font-family:'DM Sans',sans-serif }
.report-form-row { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid rgba(255,255,255,.04) }
.report-form-row:last-child { border-bottom:none }
.report-form-dim { flex:1 }
.report-form-dim-name { font-size:.8rem; font-weight:600; color:var(--s-text) }
.report-form-dim-desc { font-size:.7rem; color:var(--s-text-muted); margin-top:2px }
.report-form-level-tag { font-size:.75rem; font-weight:700; padding:4px 10px; border-radius:8px; background:rgba(56,189,248,.1); color:#38bdf8; min-width:36px; text-align:center }
.report-form-bar { flex:0 0 100px; height:6px; background:rgba(255,255,255,.05); border-radius:3px; overflow:hidden }
.report-form-bar-fill { height:100%; border-radius:3px; background:#38bdf8; transition:width .6s ease }
`;

/* ═══════════════════════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════════════════════ */

export default function WritingTestPage() {
  const [phase, setPhase] = useState<Phase>("loading");

  // Task 1 state
  const [t1Config, setT1Config] = useState<TaskConfig | null>(null);
  const [t1Messages, setT1Messages] = useState<Message[]>([]);
  const [t1Input, setT1Input] = useState("");
  const [t1Processing, setT1Processing] = useState(false);
  const [t1ExchangeCount, setT1ExchangeCount] = useState(0);
  const [taskScores, setTaskScores] = useState<Partial<Record<TaskKey, number>>>({});
  const [t1Diagnosis, setT1Diagnosis] = useState<Diagnosis | null>(null);
  const [t1Form, setT1Form] = useState<FormAnalysis | null>(null);
  const [t1Expanded, setT1Expanded] = useState<Set<string>>(new Set());
  const [t1ShowTranscript, setT1ShowTranscript] = useState(false);
  const t1DoneRef = useRef(false);

  // Task 2 state
  const [t2Config, setT2Config] = useState<TaskConfig | null>(null);
  const [t2ScaffoldMsgs, setT2ScaffoldMsgs] = useState<Message[]>([]);
  const [t2ScaffoldInput, setT2ScaffoldInput] = useState("");
  const [t2ScaffoldProcessing, setT2ScaffoldProcessing] = useState(false);
  const [t2ScaffoldCount, setT2ScaffoldCount] = useState(0);
  const t2ScaffoldDoneRef = useRef(false);
  const [t2Prompt, setT2Prompt] = useState<WritingPrompt | null>(null);
  const [t2WrittenText, setT2WrittenText] = useState("");
  const [t2Diagnosis, setT2Diagnosis] = useState<Diagnosis | null>(null);
  const [t2Form, setT2Form] = useState<FormAnalysis | null>(null);
  const [t2Expanded, setT2Expanded] = useState<Set<string>>(new Set());
  const [t2ShowTranscript, setT2ShowTranscript] = useState(false);
  const [t2ShowWriting, setT2ShowWriting] = useState(false);

  // Task 3 state
  const [t3Config, setT3Config] = useState<TaskConfig | null>(null);
  const [t3Messages, setT3Messages] = useState<Message[]>([]);
  const [t3Input, setT3Input] = useState("");
  const [t3Processing, setT3Processing] = useState(false);
  const [t3ExchangeCount, setT3ExchangeCount] = useState(0);
  const [t3ChosenTopic, setT3ChosenTopic] = useState<string | null>(null);
  const [t3SwitchTopic, setT3SwitchTopic] = useState<string | null>(null);
  const [t3Diagnosis, setT3Diagnosis] = useState<Diagnosis | null>(null);
  const [t3Form, setT3Form] = useState<FormAnalysis | null>(null);
  const [t3Expanded, setT3Expanded] = useState<Set<string>>(new Set());
  const [t3ShowTranscript, setT3ShowTranscript] = useState(false);
  const t3DoneRef = useRef(false);
  type TopicOption = { id: string; label: string; tier: string; prompt: string };

  // Task 4 state
  const [t4Config, setT4Config] = useState<TaskConfig | null>(null);
  type StimulusItem = { id: string; level: string; type: string; label: string; instruction: string; stimulus: string; targetMacroIds: string[] };
  const [t4Stimuli, setT4Stimuli] = useState<StimulusItem[]>([]);
  const [t4CurrentIdx, setT4CurrentIdx] = useState(0);
  const [t4Responses, setT4Responses] = useState<Record<string, string>>({});
  const [t4Diagnosis, setT4Diagnosis] = useState<Diagnosis | null>(null);
  const [t4Form, setT4Form] = useState<FormAnalysis | null>(null);
  const [t4Expanded, setT4Expanded] = useState<Set<string>>(new Set());
  const [t4ShowTranscript, setT4ShowTranscript] = useState(false);

  // Task 5 state
  const [t5Config, setT5Config] = useState<TaskConfig | null>(null);
  type StimulusCardType = { id: string; name: string; tagline: string; rating: number; price: string; priceNote?: string; features: { icon: string; label: string; value: string }[]; highlight?: string };
  type StimulusSetType = { id: string; category: string; categoryIcon: string; cardA: StimulusCardType; cardB: StimulusCardType };
  const [t5StimulusSet, setT5StimulusSet] = useState<StimulusSetType | null>(null);
  const [t5Messages, setT5Messages] = useState<Message[]>([]);
  const [t5Input, setT5Input] = useState("");
  const [t5Processing, setT5Processing] = useState(false);
  const [t5ExchangeCount, setT5ExchangeCount] = useState(0);
  const [t5Diagnosis, setT5Diagnosis] = useState<Diagnosis | null>(null);
  const [t5Form, setT5Form] = useState<FormAnalysis | null>(null);
  const [t5Expanded, setT5Expanded] = useState<Set<string>>(new Set());
  const [t5ShowTranscript, setT5ShowTranscript] = useState(false);
  const t5DoneRef = useRef(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  /* ── Load configs ──────────────────────────────────────────────────── */

  useEffect(() => {
    Promise.all([
      fetch("/api/writing-descriptors").then(r => r.json()),
      fetch("/api/writing-task2-descriptors").then(r => r.json()).catch(() => null),
      fetch("/api/writing-task3-descriptors").then(r => r.json()).catch(() => null),
      fetch("/api/writing-task4-descriptors").then(r => r.json()).catch(() => null),
      fetch("/api/writing-task5-descriptors").then(r => r.json()).catch(() => null),
    ]).then(([d1, d2, d3, d4, d5]) => {
      setT1Config(d1);
      if (d2) setT2Config(d2);
      if (d3) setT3Config(d3);
      if (d4) setT4Config(d4);
      if (d5) setT5Config(d5);
      setPhase("landing");
    });
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [t1Messages, t1Processing, t2ScaffoldMsgs, t2ScaffoldProcessing, t3Messages, t3Processing, t5Messages, t5Processing]);

  /* ── Task 1 helpers ────────────────────────────────────────────────── */

  const t1Transcript = useCallback(() =>
    t1Messages.map(m => `${m.role === "assistant" ? "AI" : "Candidate"}: ${m.content}`).join("\n"),
    [t1Messages]
  );

  const startT1 = async () => {
    t1DoneRef.current = false;
    setPhase("t1-conversation");
    setT1Processing(true);
    const res = await fetch(T1_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: [], exchangeCount: 0 }) });
    const data = await res.json();
    setT1Messages([{ role: "assistant", content: data.message }]);
    setT1Processing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendT1 = async () => {
    const text = t1Input.trim();
    if (!text || t1Processing || t1DoneRef.current) return;
    if (text.toLowerCase() === "exit please") { setT1Input(""); await finishT1([...t1Messages], t1ExchangeCount); return; }
    setT1Input(""); setT1Processing(true);
    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...t1Messages, userMsg];
    setT1Messages(newMsgs);
    const nextCount = t1ExchangeCount + 1;
    setT1ExchangeCount(nextCount);
    if (!t1Config) return;
    if (nextCount >= (t1Config.meta.maxExchanges || 12)) { await finishT1(newMsgs, nextCount); return; }
    const chatRes = await fetch(T1_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: newMsgs, exchangeCount: nextCount }) });
    const data = await chatRes.json();
    const updated = [...newMsgs, { role: "assistant" as const, content: data.message }];
    setT1Messages(updated);
    if (data.ceilingReached && nextCount >= MIN_EXCHANGES) { t1DoneRef.current = true; setT1Processing(false); await runT1Diagnosis(updated); return; }
    setT1Processing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const finishT1 = async (msgs: Message[], count: number) => {
    t1DoneRef.current = true;
    const res = await fetch(T1_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: msgs, exchangeCount: count, wrapUp: true }) });
    const data = await res.json();
    const all = [...msgs, { role: "assistant" as const, content: data.message }];
    setT1Messages(all); setT1Processing(false);
    await runT1Diagnosis(all);
  };

  const runT1Diagnosis = async (finalMsgs: Message[]) => {
    setPhase("t1-diagnosing");
    try {
      const res = await fetch(T1_API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: finalMsgs, action: "diagnose" }) });
      const data = await res.json();
      if (data.diagnosis) { setT1Diagnosis(data.diagnosis); if (data.formAnalysis) setT1Form(data.formAnalysis); setTaskScores(prev => ({ ...prev, task1: getTaskScore("task1", data.diagnosis.diagnosedLevel) })); }
      setPhase("t1-results");
    } catch { setPhase("t1-results"); }
  };

  /* ── Task 2 helpers ────────────────────────────────────────────────── */

  const startT2Scaffolding = async () => {
    t2ScaffoldDoneRef.current = false;
    setPhase("t2-scaffolding");
    setT2ScaffoldProcessing(true);
    const res = await fetch(T2_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "scaffold", messages: [], exchangeCount: 0, task1Transcript: t1Transcript(), task1Level: t1Diagnosis?.diagnosedLevel }),
    });
    const data = await res.json();
    setT2ScaffoldMsgs([{ role: "assistant", content: data.message }]);
    setT2ScaffoldProcessing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendT2Scaffold = async () => {
    const text = t2ScaffoldInput.trim();
    if (!text || t2ScaffoldProcessing || t2ScaffoldDoneRef.current) return;
    if (text.toLowerCase() === "exit please") { setT2ScaffoldInput(""); setPhase("t2-generating-prompt"); return; }
    setT2ScaffoldInput(""); setT2ScaffoldProcessing(true);
    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...t2ScaffoldMsgs, userMsg];
    setT2ScaffoldMsgs(newMsgs);
    const nextCount = t2ScaffoldCount + 1;
    setT2ScaffoldCount(nextCount);
    const res = await fetch(T2_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "scaffold", messages: newMsgs, exchangeCount: nextCount, task1Transcript: t1Transcript(), task1Level: t1Diagnosis?.diagnosedLevel }),
    });
    const data = await res.json();
    const updated = [...newMsgs, { role: "assistant" as const, content: data.message }];
    setT2ScaffoldMsgs(updated);
    if (data.scaffoldingDone || nextCount >= 4) {
      t2ScaffoldDoneRef.current = true;
      setT2ScaffoldProcessing(false);
      await generateT2Prompt(updated);
      return;
    }
    setT2ScaffoldProcessing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const generateT2Prompt = async (scaffoldMsgs: Message[]) => {
    setPhase("t2-generating-prompt");
    try {
      const res = await fetch(T2_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-prompt", messages: scaffoldMsgs, task1Level: t1Diagnosis?.diagnosedLevel }),
      });
      const data = await res.json();
      if (data.prompt) setT2Prompt(data.prompt);
      setPhase("t2-writing");
      setTimeout(() => textareaRef.current?.focus(), 200);
    } catch { setPhase("t2-writing"); }
  };

  const submitT2Writing = async () => {
    if (!t2WrittenText.trim()) return;
    setPhase("t2-diagnosing");
    try {
      const res = await fetch(T2_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diagnose", writtenText: t2WrittenText }),
      });
      const data = await res.json();
      if (data.diagnosis) { setT2Diagnosis(data.diagnosis); if (data.formAnalysis) setT2Form(data.formAnalysis); setTaskScores(prev => ({ ...prev, task2: getTaskScore("task2", data.diagnosis.diagnosedLevel) })); }
      setPhase("t2-results");
    } catch { setPhase("t2-results"); }
  };

  /* ── Task 3 helpers ────────────────────────────────────────────────── */

  const startT3 = async (topicId: string) => {
    t3DoneRef.current = false;
    setT3ChosenTopic(topicId);

    // Pick a switch topic (different tier, not the chosen one)
    const prevLevel = t2Diagnosis?.diagnosedLevel || t1Diagnosis?.diagnosedLevel || "A2";
    const levelNum = levelToPercent(prevLevel);
    const switchTier = levelNum >= 72 ? "abstract" : "broader";
    const options = (t3Config as unknown as { topicOptions?: TopicOption[] })?.topicOptions ?? [];
    const switchOptions = options.filter(
      (t: TopicOption) => t.tier === switchTier && t.id !== topicId
    );
    const picked = switchOptions.length > 0
      ? switchOptions[Math.floor(Math.random() * switchOptions.length)]
      : null;
    if (picked) setT3SwitchTopic(picked.id);

    setPhase("t3-conversation");
    setT3Processing(true);
    const res = await fetch(T3_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat", messages: [], exchangeCount: 0,
        chosenTopic: topicId,
        task1Level: t1Diagnosis?.diagnosedLevel,
        task2Level: t2Diagnosis?.diagnosedLevel,
      }),
    });
    const data = await res.json();
    setT3Messages([{ role: "assistant", content: data.message }]);
    setT3Processing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendT3 = async () => {
    const text = t3Input.trim();
    if (!text || t3Processing || t3DoneRef.current) return;
    if (text.toLowerCase() === "exit please") { setT3Input(""); await finishT3([...t3Messages], t3ExchangeCount); return; }
    setT3Input(""); setT3Processing(true);
    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...t3Messages, userMsg];
    setT3Messages(newMsgs);
    const nextCount = t3ExchangeCount + 1;
    setT3ExchangeCount(nextCount);

    const maxEx = t3Config?.meta?.maxExchanges || 14;
    if (nextCount >= maxEx) { await finishT3(newMsgs, nextCount); return; }

    // Determine if topic switch should happen (around exchange 6-7 if doing well)
    const shouldSwitch = t3SwitchTopic && nextCount >= 6 && nextCount <= 8;

    const chatRes = await fetch(T3_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "chat", messages: newMsgs, exchangeCount: nextCount,
        chosenTopic: t3ChosenTopic,
        switchTopic: shouldSwitch ? t3SwitchTopic : undefined,
        task1Level: t1Diagnosis?.diagnosedLevel,
        task2Level: t2Diagnosis?.diagnosedLevel,
      }),
    });
    const data = await chatRes.json();
    const updated = [...newMsgs, { role: "assistant" as const, content: data.message }];
    setT3Messages(updated);
    if (data.ceilingReached && nextCount >= MIN_EXCHANGES) {
      t3DoneRef.current = true; setT3Processing(false);
      await runT3Diagnosis(updated); return;
    }
    setT3Processing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const finishT3 = async (msgs: Message[], count: number) => {
    t3DoneRef.current = true;
    const res = await fetch(T3_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", messages: msgs, exchangeCount: count, wrapUp: true, chosenTopic: t3ChosenTopic }),
    });
    const data = await res.json();
    const all = [...msgs, { role: "assistant" as const, content: data.message }];
    setT3Messages(all); setT3Processing(false);
    await runT3Diagnosis(all);
  };

  const runT3Diagnosis = async (finalMsgs: Message[]) => {
    setPhase("t3-diagnosing");
    try {
      const res = await fetch(T3_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: finalMsgs, action: "diagnose" }),
      });
      const data = await res.json();
      if (data.diagnosis) { setT3Diagnosis(data.diagnosis); if (data.formAnalysis) setT3Form(data.formAnalysis); setTaskScores(prev => ({ ...prev, task3: getTaskScore("task3", data.diagnosis.diagnosedLevel) })); }
      setPhase("t3-results");
    } catch { setPhase("t3-results"); }
  };

  /* ── Task 4 helpers ────────────────────────────────────────────────── */

  const startT4 = async () => {
    setPhase("t4-loading-stimuli");
    const prevLevel = t3Diagnosis?.diagnosedLevel || t2Diagnosis?.diagnosedLevel || t1Diagnosis?.diagnosedLevel || "B1";
    const res = await fetch(T4_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-stimuli", prevLevel }),
    });
    const data = await res.json();
    if (data.stimuli) {
      setT4Stimuli(data.stimuli);
      setT4CurrentIdx(0);
      setT4Responses({});
      setPhase("t4-challenges");
    }
  };

  const t4CurrentStimulus = t4Stimuli[t4CurrentIdx] || null;
  const t4CurrentResponse = t4CurrentStimulus ? (t4Responses[t4CurrentStimulus.id] || "") : "";
  const t4AllDone = t4Stimuli.length > 0 && t4Stimuli.every(s => (t4Responses[s.id] || "").trim().length > 5);

  const submitT4 = async () => {
    if (!t4AllDone) return;
    setPhase("t4-diagnosing");
    const responses = t4Stimuli.map(s => ({
      stimulusId: s.id,
      instruction: s.instruction,
      stimulus: s.stimulus,
      response: t4Responses[s.id] || "",
    }));
    try {
      const res = await fetch(T4_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "diagnose", responses }),
      });
      const data = await res.json();
      if (data.diagnosis) { setT4Diagnosis(data.diagnosis); if (data.formAnalysis) setT4Form(data.formAnalysis); setTaskScores(prev => ({ ...prev, task4: getTaskScore("task4", data.diagnosis.diagnosedLevel) })); }
      setPhase("t4-results");
    } catch { setPhase("t4-results"); }
  };

  /* ── Task 5 helpers ────────────────────────────────────────────────── */

  const startT5 = async () => {
    t5DoneRef.current = false;
    setPhase("t5-loading");
    const prevLevel = t4Diagnosis?.diagnosedLevel || t3Diagnosis?.diagnosedLevel || t2Diagnosis?.diagnosedLevel || t1Diagnosis?.diagnosedLevel || "B1";
    const stimRes = await fetch(T5_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get-stimulus", prevLevel }),
    });
    const stimData = await stimRes.json();
    if (stimData.stimulusSet) setT5StimulusSet(stimData.stimulusSet);

    const chatRes = await fetch(T5_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", messages: [], exchangeCount: 0, stimulusSetId: stimData.stimulusSet?.id }),
    });
    const chatData = await chatRes.json();
    setT5Messages([{ role: "assistant", content: chatData.message }]);
    setT5ExchangeCount(0);
    setPhase("t5-conversation");
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const sendT5 = async () => {
    const text = t5Input.trim();
    if (!text || t5Processing || t5DoneRef.current) return;
    if (text.toLowerCase() === "exit please") { setT5Input(""); await finishT5([...t5Messages], t5ExchangeCount); return; }
    setT5Input(""); setT5Processing(true);
    const userMsg: Message = { role: "user", content: text };
    const newMsgs = [...t5Messages, userMsg];
    setT5Messages(newMsgs);
    const nextCount = t5ExchangeCount + 1;
    setT5ExchangeCount(nextCount);

    const maxEx = t5Config?.meta?.maxExchanges || 12;
    if (nextCount >= maxEx) { await finishT5(newMsgs, nextCount); return; }

    const res = await fetch(T5_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", messages: newMsgs, exchangeCount: nextCount, stimulusSetId: t5StimulusSet?.id }),
    });
    const data = await res.json();
    const updated = [...newMsgs, { role: "assistant" as const, content: data.message }];
    setT5Messages(updated);
    if (data.ceilingReached && nextCount >= MIN_EXCHANGES) {
      t5DoneRef.current = true; setT5Processing(false);
      await runT5Diagnosis(updated); return;
    }
    setT5Processing(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const finishT5 = async (msgs: Message[], count: number) => {
    t5DoneRef.current = true;
    const res = await fetch(T5_API, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "chat", messages: msgs, exchangeCount: count, wrapUp: true, stimulusSetId: t5StimulusSet?.id }),
    });
    const data = await res.json();
    const all = [...msgs, { role: "assistant" as const, content: data.message }];
    setT5Messages(all); setT5Processing(false);
    await runT5Diagnosis(all);
  };

  const runT5Diagnosis = async (finalMsgs: Message[]) => {
    setPhase("t5-diagnosing");
    try {
      const res = await fetch(T5_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: finalMsgs, action: "diagnose" }),
      });
      const data = await res.json();
      if (data.diagnosis) { setT5Diagnosis(data.diagnosis); if (data.formAnalysis) setT5Form(data.formAnalysis); setTaskScores(prev => ({ ...prev, task5: getTaskScore("task5", data.diagnosis.diagnosedLevel) })); }
      setPhase("t5-results");
    } catch { setPhase("t5-results"); }
  };

  // Card renderer for T5
  const renderT5Card = (card: StimulusCardType) => (
    <div className="t5-card" key={card.id}>
      <div className="t5-card-header">
        <span className="t5-card-name">{card.name}</span>
        <span className="t5-card-stars">{"★".repeat(card.rating)}{"☆".repeat(5 - card.rating)}</span>
      </div>
      <div className="t5-card-tagline">{card.tagline}</div>
      <div className="t5-card-price">{card.price}</div>
      {card.priceNote && <div className="t5-card-price-note">{card.priceNote}</div>}
      <div className="t5-card-features">
        {card.features.map((f, i) => (
          <div className="t5-card-feature" key={i}>
            <span className="t5-card-feature-icon">{f.icon}</span>
            <span className="t5-card-feature-label">{f.label}</span>
            <span>{f.value}</span>
          </div>
        ))}
      </div>
      {card.highlight && <div className="t5-card-highlight">{card.highlight}</div>}
    </div>
  );

  /* ── Word count ────────────────────────────────────────────────────── */
  const wordCount = t2WrittenText.trim().split(/\s+/).filter(w => w.length > 0).length;

  /* ── Shared rendering helpers ──────────────────────────────────────── */

  const renderResultsDashboard = (
    taskLabel: string, taskNum: number, taskKey: TaskKey, config: TaskConfig, diagnosis: Diagnosis | null, form: FormAnalysis | null,
    expanded: Set<string>, setExpanded: React.Dispatch<React.SetStateAction<Set<string>>>,
    showTranscript: boolean, setShowTranscript: React.Dispatch<React.SetStateAction<boolean>>,
    messages: Message[], nextAction?: () => void, nextLabel?: string,
    writtenText?: string, showWriting?: boolean, setShowWriting?: React.Dispatch<React.SetStateAction<boolean>>
  ) => {
    const taskScore = taskScores[taskKey] ?? null;
    const scoreLabel = taskScore !== null ? getScoreLabel(taskScore) : null;
    const ceiling = TASK_CEILINGS[taskKey];
    const toggleLevel = (level: string) => {
      setExpanded(prev => { const next = new Set(prev); if (next.has(level)) next.delete(level); else next.add(level); return next; });
    };
    const canCount = diagnosis?.results?.filter(r => r.result === "CAN").length ?? 0;
    const totalMacros = diagnosis?.results?.length ?? 0;
    const confirmedLevels = diagnosis?.levelResults?.filter(r => r.confirmed).length ?? 0;
    const totalLevels = diagnosis?.levelResults?.length ?? 0;

    return (
      <>
        <nav className="results-nav">
          <div className="results-nav-logo">AZE <em>Writing Test</em></div>
          <div className="results-nav-tag">{taskLabel}</div>
        </nav>
        <header className="results-hero animate-fade-up">
          <div className="hero-left">
            <div className="hero-eyebrow">Task {taskNum} Complete — {config.meta.title}</div>
            <h1 className="hero-title">Assessment <em>Report</em></h1>
            <p className="hero-subtitle">Function (what the candidate did), decision logic (evidence), and language quality (form).</p>
          </div>
          <div className="hero-levels">
            {taskScore !== null && (<><div className="hero-level-block"><div className="hero-level-label">Performance</div><div className="hero-level-value function-level" style={{ fontSize: "2.6rem" }}>{taskScore}<span style={{ fontSize: "1.2rem", color: "var(--muted)", fontFamily: "var(--font-sans)" }}> / 10</span></div><div style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: "4px", textAlign: "center" }}>{scoreLabel}</div></div><div className="hero-level-divider" /></>)}
            <div className="hero-level-block"><div className="hero-level-label">Function Level</div><div className="hero-level-value function-level">{diagnosis?.diagnosedLevel ?? "—"}</div><div style={{ fontSize: ".65rem", color: "var(--muted)", marginTop: "4px", textAlign: "center" }}>ceiling: {ceiling}</div></div>
            <div className="hero-level-divider" />
            <div className="hero-level-block"><div className="hero-level-label">Form</div><div className="hero-level-value form-level">{form?.overallFormLevel ?? "—"}</div></div>
          </div>
        </header>
        <div className="results-grid">
          {/* Col 1 */}
          <div className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="col-header"><div className="col-number">Column 1</div><div className="col-title">What the Learner Did</div><div className="col-subtitle">Summary, meaning, next steps</div></div>
            <div className="glass-card">
              <div className="glass-card-label">Diagnostic Summary</div>
              <div className="summary-stat"><span className="summary-stat-value">{diagnosis?.diagnosedLevel ?? "—"}</span><span className="summary-stat-label">Function level</span></div>
              <div className="summary-stat"><span className="summary-stat-value" style={{ fontSize: "1.4rem", color: "var(--blue)" }}>{canCount}/{totalMacros}</span><span className="summary-stat-label">descriptors CAN</span></div>
              <p className="summary-text">The system confirmed {confirmedLevels} of {totalLevels} level bands. The diagnosed level ({diagnosis?.diagnosedLevel}) is the highest band where the candidate met the threshold.</p>
            </div>
            <div className="glass-card">
              <div className="glass-card-label">Function vs Form</div>
              <p className="summary-text"><strong>Function</strong> ({diagnosis?.diagnosedLevel}) = what they can do. <strong>Form</strong> ({form?.overallFormLevel ?? "—"}) = how well they write. {diagnosis?.diagnosedLevel !== form?.overallFormLevel ? "These differ — normal. Both matter for placement." : "These align — consistent performance."}</p>
            </div>
          </div>
          {/* Col 2 */}
          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="col-header"><div className="col-number">Column 2</div><div className="col-title">Decision Logic</div><div className="col-subtitle">Function verdicts and evidence</div></div>
            <div className="glass-card">
              <div className="glass-card-label">Level Confirmation Chain</div>
              {config.levelClusters.map(cluster => {
                const lr = diagnosis?.levelResults?.find(r => r.level === cluster.level);
                const confirmed = lr?.confirmed ?? false;
                const isExp = expanded.has(cluster.level);
                const macros = cluster.macroIds.map(id => ({ macro: config.azeMacro.find(m => m.azeId === id), result: diagnosis?.results?.find(r => r.azeId === id) }));
                return (
                  <div key={cluster.level}>
                    <div className="cluster-row" onClick={() => toggleLevel(cluster.level)}>
                      <span className={`cluster-pill ${confirmed ? "confirmed" : "unconfirmed"}`}>{levelLabel(cluster.level)}</span>
                      <div className="cluster-info"><div className="cluster-info-status">{confirmed ? "Confirmed ✓" : "Not confirmed"}</div><div className="cluster-info-threshold">{lr?.canCount ?? 0} CAN / {cluster.confirmThreshold} needed</div></div>
                      <span className={`cluster-chevron ${isExp ? "open" : ""}`}>▼</span>
                    </div>
                    {isExp && <div className="macro-list">{macros.map(({ macro, result }) => {
                      if (!macro) return null;
                      const v = result?.result ?? "NOT_TESTED";
                      const tc = v === "CAN" ? "can" : v === "NOT_YET" ? "not-yet" : "not-tested";
                      return (<div key={macro.azeId} className="macro-item"><div className="macro-top-row"><span className={`verdict-tag ${tc}`}>{v === "CAN" ? "CAN" : v === "NOT_YET" ? "Not Demonstrated" : "—"}</span><div style={{ flex: 1 }}><div className="macro-claim-text">{macro.claim}</div><div className="macro-meta"><span className="macro-fn-tag">{macro.fn}</span><span className="macro-id-tag">{macro.azeId}</span></div></div></div>{result?.rationale && <p className="macro-rationale">{result.rationale}</p>}{result?.evidence && <p className="macro-evidence">&ldquo;{result.evidence}&rdquo;</p>}</div>);
                    })}</div>}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Col 3 */}
          <div className="animate-fade-up" style={{ animationDelay: "300ms" }}>
            <div className="col-header"><div className="col-number">Column 3</div><div className="col-title">Language Report</div><div className="col-subtitle">How the candidate wrote</div></div>
            <div className="glass-card">
              <div className="glass-card-label">Overall Language Quality</div>
              <div className="form-overall"><div className="form-overall-level">{form?.overallFormLevel ?? "—"}</div><p className="form-overall-summary">{form?.overallFormSummary ?? "Not available."}</p></div>
              {form?.dimensions?.map((dim, i) => (
                <div key={dim.dimension} className="form-dimension">
                  <div className="form-dim-header"><span className="form-dim-name">{dim.dimension}</span><span className="form-dim-level">{dim.level}</span></div>
                  <div className="form-dim-bar-track"><div className="form-dim-bar-fill" style={{ width: `${levelToPercent(dim.level)}%`, background: barColor(dim.level), animationDelay: `${i * .15}s` }} /></div>
                  <p className="form-dim-descriptor">{dim.descriptor}</p>
                  {dim.examples?.map((ex, j) => <p key={j} className="form-dim-example">&ldquo;{ex}&rdquo;</p>)}
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Written text toggle (Task 2) */}
        {writtenText && setShowWriting && (
          <div className="transcript-section">
            <div className="transcript-card animate-fade-up" style={{ animationDelay: "450ms" }}>
              <button onClick={() => setShowWriting(!showWriting)} className="transcript-toggle"><h3>Candidate&apos;s Writing</h3><span className={`cluster-chevron ${showWriting ? "open" : ""}`}>▼</span></button>
              {showWriting && <div className="transcript-body" style={{ display: "block" }}><p style={{ fontSize: ".85rem", lineHeight: 1.75, color: "#374151", whiteSpace: "pre-wrap" }}>{writtenText}</p></div>}
            </div>
          </div>
        )}
        {/* Transcript */}
        <div className="transcript-section">
          <div className="transcript-card animate-fade-up" style={{ animationDelay: "500ms" }}>
            <button onClick={() => setShowTranscript(!showTranscript)} className="transcript-toggle"><h3>Chat Transcript</h3><span className={`cluster-chevron ${showTranscript ? "open" : ""}`}>▼</span></button>
            {showTranscript && <div className="transcript-body">{messages.map((m, i) => <div key={i} className="transcript-msg"><span className={`transcript-role ${m.role === "assistant" ? "ai" : "you"}`}>{m.role === "assistant" ? "AI" : "You"}</span><span className="transcript-text">{m.content}</span></div>)}</div>}
          </div>
        </div>
        {/* Continue button */}
        {nextAction && (
          <div className="results-continue"><button onClick={nextAction} className="btn-continue">{nextLabel ?? "Continue"}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button></div>
        )}
      </>
    );
  };

  const renderPhoneChat = (
    label: string, subtitle: string, messages: Message[], input: string, setInput: (v: string) => void,
    processing: boolean, doneRef: React.RefObject<boolean>, sendFn: () => void,
    exchangeCount: number, maxExchanges: number, notice?: string
  ) => {
    const progressPct = Math.min((exchangeCount / maxExchanges) * 100, 100);
    return (
      <main className="chat-page">
        <div className="phone-frame">
          <div className="phone-status-bar"><div className="phone-notch" /></div>
          <div className="chat-top-bar">
            <div className="chat-avatar">AZE</div>
            <div className="chat-top-info"><h2>{label}</h2><span>{subtitle}</span></div>
            <div className="chat-progress-wrap"><span className="chat-progress-label">Progress</span><div className="chat-progress-bar"><div className="chat-progress-fill" style={{ width: `${progressPct}%` }} /></div></div>
          </div>
          {notice && <div className="scaffolding-notice">{notice}</div>}
          <div className="chat-body">
            {messages.map((m, i) => (<div key={i}><div className={`msg-row ${m.role}`}>{m.role === "assistant" && <div className="msg-avatar-sm">AZE</div>}<div className={`msg-bubble ${m.role}`}>{m.content}</div></div><div className="msg-time">{getTime(i)}</div></div>))}
            {processing && <div className="typing-row"><div className="msg-avatar-sm">AZE</div><div className="typing-bubble"><span className="dot"/><span className="dot"/><span className="dot"/></div></div>}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-input-area">
            <textarea ref={inputRef as React.RefObject<HTMLTextAreaElement>} value={input} onChange={e => { setInput(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`; }} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendFn(); } }} placeholder={doneRef.current ? "Chat complete" : processing ? "Waiting…" : "Type a message…"} disabled={processing || doneRef.current} className="chat-text-input" rows={1} />
            <button onClick={sendFn} disabled={!input.trim() || processing || doneRef.current} className="chat-send-btn" style={{ background: input.trim() ? "var(--accent)" : "#d1d5db" }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
            </button>
          </div>
          <div className="phone-home-bar"><div className="home-indicator" /></div>
        </div>
      </main>
    );
  };

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  const S = <style dangerouslySetInnerHTML={{ __html: styles }} />;
  const stakeholder = isStakeholderPhase(phase);
  const candidate = isCandidatePhase(phase);
  const badge = (stakeholder || candidate) ? (
    <div className={`view-badge ${stakeholder ? "stakeholder" : "candidate"}`}>
      {stakeholder ? "Stakeholder View" : "Candidate View"}
    </div>
  ) : null;
  const wrap = (children: React.ReactNode) => (
    <div className={stakeholder ? "stakeholder-theme" : ""}>{S}{badge}{children}</div>
  );

  // Loading
  if (phase === "loading" || !t1Config) return wrap(<main className="diagnosing-container"><div className="spinner" style={{ margin: "0 auto" }} /></main>);

  // ── LANDING PAGE (Stakeholder) ────────────────────────────────────
  if (phase === "landing") return wrap(
    <main className="landing-container">
      <header className="landing-header animate-fade-up">
        <div className="landing-logo">AZE <em>Writing Test</em><div className="landing-logo-sub">ES World · Assessment Development · Feb 2026</div></div>
        <h1 className="landing-title">Testing Communicative <em>Function</em>,<br/>Not Genre</h1>
        <p className="landing-subtitle">A new approach to writing assessment that measures what candidates can do with language — not whether they know the conventions of a particular text type.</p>
      </header>

      <div className="landing-grid animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="landing-card">
          <div className="landing-card-icon">🚫</div>
          <h3>The Problem with Genre-Based Testing</h3>
          <p>Traditional writing tests ask candidates to produce specific text types — essays, emails, reports, letters. This tests whether they know the format conventions, not whether they can actually communicate. A candidate who memorises &ldquo;Dear Sir/Madam, I am writing to...&rdquo; can pass without demonstrating real communicative ability.</p>
        </div>
        <div className="landing-card">
          <div className="landing-card-icon">✅</div>
          <h3>The Function-Based Alternative</h3>
          <p>AZE tests communicative functions directly — can you inform, narrate, argue, explain? These functions exist in every genre. A candidate who can inform clearly does so whether they&apos;re writing an email, a chat message, or a report. We test the function, not the wrapper.</p>
        </div>
        <div className="landing-card">
          <div className="landing-card-icon">🎯</div>
          <h3>What We Assess</h3>
          <p>Each writing task targets specific CEFR-aligned communicative functions. Scoring is binary — CAN or Not Demonstrated — based on observable evidence. Did the candidate achieve the communicative goal? Not &ldquo;did they follow the genre template.&rdquo;</p>
        </div>
        <div className="landing-card">
          <div className="landing-card-icon">📊</div>
          <h3>Two Reports, Complete Picture</h3>
          <p><strong>Report 1: Function</strong> — what the candidate can do (CAN/Not Demonstrated per function). <strong>Report 2: Form</strong> — how well they use language (grammar, vocabulary, coherence). Function tells you what. Form tells you how.</p>
        </div>
      </div>

      <div className="landing-highlight animate-fade-up" style={{ animationDelay: "200ms" }}>
        <h3>Design Principle</h3>
        <p>For this test, our aim is to assess <strong>what the candidate can produce outside the constraints of genre</strong> and <strong>how they produce it</strong>.</p>
        <p style={{ marginTop: "12px" }}>This platform could be adapted for genre-focused writing — for example, an academic test might require essays or reports. But a <strong>general English test does not require specific genres to diagnose CEFR level</strong>. Communicative functions are genre-independent.</p>
      </div>

      <div className="landing-structure animate-fade-up" style={{ animationDelay: "300ms" }}>
        <h3>Test Structure</h3>
        <div className="landing-task-row">
          <div className="landing-task-num t1">T1</div>
          <div className="landing-task-info"><h4>Diagnostic Chat — Interact &amp; Inform</h4><p>Text chat with AI examiner. Probes up/down to find level. Tests interactional and informing functions in real-time written exchange.</p></div>
        </div>
        <div className="landing-task-row">
          <div className="landing-task-num t2">T2</div>
          <div className="landing-task-info"><h4>Inform &amp; Narrate — Extended Writing</h4><p>Short scaffolding chat (not assessed), then extended writing with adaptive prompt. Tests informing and narrating functions across all levels.</p></div>
        </div>
        <div className="landing-task-row">
          <div className="landing-task-num" style={{ background: "rgba(196,69,54,.12)", color: "#c44536" }}>T3</div>
          <div className="landing-task-info"><h4>Express &amp; Argue — Opinion Chat</h4><p>Pick a topic, then debate with the AI. The AI challenges, disagrees, and pushes back. Tests expressing opinions and arguing/justifying.</p></div>
        </div>
        <div className="landing-task-row">
          <div className="landing-task-num" style={{ background: "rgba(147,51,234,.12)", color: "#7c3aed" }}>T4</div>
          <div className="landing-task-info"><h4>Rephrase &amp; Adjust — Pragmatic Competence</h4><p>Read a text and rewrite it: simpler, more formal, for a different audience. Tests paraphrasing, register control, and pragmatic transformation.</p></div>
        </div>
        <div className="landing-task-row">
          <div className="landing-task-num" style={{ background: "rgba(8,145,178,.12)", color: "#0891b2" }}>T5</div>
          <div className="landing-task-info"><h4>Compare &amp; Advise — Mediation</h4><p>See two options side by side, then chat about them. The AI asks who each is best for and keeps changing the situation. Tests relaying, recommending, and adapting advice.</p></div>
        </div>
      </div>

      <div className="landing-cta animate-fade-up" style={{ animationDelay: "400ms" }}>
        <button onClick={() => setPhase("t1-briefing")} className="btn-start">Begin Test Demo<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
      </div>
    </main>
  );

  // ── TASK 1: Briefing ──────────────────────────────────────────────
  if (phase === "t1-briefing") return wrap(
    <main className="briefing-container"><div className="briefing-card animate-slide-up">
      <div className="briefing-badge">✍️ Writing Test · Task 1</div>
      <h1 className="briefing-title">Diagnostic <em>Chat</em></h1>
      <p className="briefing-sub">Text chat · Interactional &amp; Informing · 3–4 minutes</p>
      <div className="briefing-section"><h3>What you&apos;ll do</h3><p>Have a text conversation with the AI examiner — like WhatsApp or iMessage. It starts simple (name, where you&apos;re from) and gets harder based on how you write.</p></div>
      <div className="briefing-section"><h3>How the AI will act</h3><p>The AI probes upward when you write comfortably, stays or goes easier when you struggle, and creates conditions to test your written interaction.</p></div>
      <div className="briefing-section"><h3>How it&apos;s assessed</h3><p>Each CEFR level has descriptors scored as <strong>CAN</strong> or <strong>Not Demonstrated</strong> with evidence from your messages.</p></div>
      <button onClick={startT1} className="btn-start">Start Chat <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div></main>
  );

  // ── TASK 1: Conversation ──────────────────────────────────────────
  if (phase === "t1-conversation") return wrap(renderPhoneChat("Writing Examiner", "Task 1 · Diagnostic Chat", t1Messages, t1Input, setT1Input, t1Processing, t1DoneRef, sendT1, t1ExchangeCount, t1Config.meta.maxExchanges || 12));

  // ── TASK 1: Diagnosing ────────────────────────────────────────────
  if (phase === "t1-diagnosing") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Analysing function and language…</p></div></main>);

  // ── TASK 1: Results ───────────────────────────────────────────────
  if (phase === "t1-results") return wrap(
    <main className="results-page">
      {renderResultsDashboard(
        "Task 1 · Diagnostic Results", 1, "task1", t1Config, t1Diagnosis, t1Form,
        t1Expanded, setT1Expanded, t1ShowTranscript, setT1ShowTranscript, t1Messages,
        () => setPhase("t2-briefing"), "Continue to Task 2 →"
      )}
    </main>
  );

  // ── TASK 2: Briefing ──────────────────────────────────────────────
  if (phase === "t2-briefing") return wrap(
    <main className="briefing-container"><div className="briefing-card animate-slide-up">
      <div className="briefing-badge">✍️ Writing Test · Task 2</div>
      <h1 className="briefing-title">Inform &amp; <em>Narrate</em></h1>
      <p className="briefing-sub">Two phases · Informing &amp; Narrating · ~5 minutes</p>
      <div className="briefing-section"><h3>Phase 1: Think</h3><p>The examiner will ask you a few quick questions to help you think about what to write. This part is not assessed — it&apos;s just to get your ideas flowing.</p></div>
      <div className="briefing-section"><h3>Phase 2: Write</h3><p>Based on what you discussed, you&apos;ll write a longer response. Take your time — write naturally and include as much detail as you can.</p></div>
      <div className="briefing-section"><h3>How it&apos;s assessed</h3><p>Your written response is assessed for communicative functions — can you <strong>inform</strong> (describe, explain) and <strong>narrate</strong> (tell what happened, sequence events).</p></div>
      <button onClick={startT2Scaffolding} className="btn-start">Start Task 2 <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div></main>
  );

  // ── TASK 2: Scaffolding chat ──────────────────────────────────────
  if (phase === "t2-scaffolding") return wrap(renderPhoneChat("Writing Examiner", "Task 2 · Phase 1: Think", t2ScaffoldMsgs, t2ScaffoldInput, setT2ScaffoldInput, t2ScaffoldProcessing, t2ScaffoldDoneRef, sendT2Scaffold, t2ScaffoldCount, 4, "⚡ Scaffolding — not assessed"));

  // ── TASK 2: Generating prompt ─────────────────────────────────────
  if (phase === "t2-generating-prompt") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Creating your writing prompt…</p></div></main>);

  // ── TASK 2: Writing ───────────────────────────────────────────────
  if (phase === "t2-writing") return wrap(
    <main className="writing-page"><div className="writing-frame animate-slide-up">
      <div className="writing-prompt-card">
        <div className="writing-prompt-tag">Task 2 — Writing Prompt</div>
        <h2 className="writing-prompt-title">{t2Prompt?.promptTitle ?? "Write about your experience"}</h2>
        <p className="writing-prompt-text" style={{ whiteSpace: "pre-line" }}>{t2Prompt?.promptText ?? "Write about what you discussed with the examiner.\n\n• Describe it — what is it like?\n• What happened?\n• How did it make you feel?\n• What would you change?"}</p>
        <div className="writing-word-guide">💡 Suggested: around {t2Prompt?.suggestedWords?.[0] ?? 80}–{t2Prompt?.suggestedWords?.[1] ?? 200} words</div>
      </div>
      <div className="writing-textarea-wrap">
        <textarea ref={textareaRef} className="writing-textarea" placeholder="Start writing here…" value={t2WrittenText} onChange={e => setT2WrittenText(e.target.value)} />
        <div className="writing-footer">
          <span className="writing-word-count">{wordCount} word{wordCount !== 1 ? "s" : ""}</span>
          <button onClick={submitT2Writing} disabled={wordCount < 10} className="writing-submit-btn">Submit Writing →</button>
        </div>
      </div>
    </div></main>
  );

  // ── TASK 2: Diagnosing ────────────────────────────────────────────
  if (phase === "t2-diagnosing") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Analysing your writing…</p></div></main>);

  // ── TASK 2: Results ───────────────────────────────────────────────
  if (phase === "t2-results" && t2Config) return wrap(
    <main className="results-page">
      {renderResultsDashboard(
        "Task 2 · Inform & Narrate Results", 2, "task2", t2Config, t2Diagnosis, t2Form,
        t2Expanded, setT2Expanded, t2ShowTranscript, setT2ShowTranscript, t2ScaffoldMsgs,
        () => setPhase("t3-briefing"), "Continue to Task 3 →",
        t2WrittenText, t2ShowWriting, setT2ShowWriting
      )}
    </main>
  );

  // ── TASK 3: Briefing ──────────────────────────────────────────────
  if (phase === "t3-briefing") return wrap(
    <main className="briefing-container"><div className="briefing-card animate-slide-up">
      <div className="briefing-badge" style={{ background: "var(--coral-light)", color: "var(--coral)" }}>💬 Writing Test · Task 3</div>
      <h1 className="briefing-title">Express &amp; <em style={{ color: "var(--coral)" }}>Argue</em></h1>
      <p className="briefing-sub">Opinion chat · Expressing &amp; Arguing · 4–5 minutes</p>
      <div className="briefing-section"><h3>What you&apos;ll do</h3><p>Pick a topic, then have a written debate with the AI. The AI will challenge your opinions, disagree with you, and ask you to explain why you think what you think.</p></div>
      <div className="briefing-section"><h3>How the AI will act</h3><p>The AI is a debate partner, not a friend. It will push back on your views, ask for reasons, and play devil&apos;s advocate. Your job is to defend your position.</p></div>
      <div className="briefing-section"><h3>How it&apos;s assessed</h3><p>Can you <strong>express</strong> opinions clearly? Can you <strong>argue</strong> — give reasons, respond to challenges, see both sides?</p></div>
      <button onClick={() => setPhase("t3-topic-select")} className="btn-start" style={{ background: "var(--coral)", boxShadow: "0 4px 14px rgba(196,69,54,.3)" }}>Choose a Topic <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div></main>
  );

  // ── TASK 3: Topic selector ────────────────────────────────────────
  if (phase === "t3-topic-select") {
    const familiarTopics = [
      { id: "social-media", label: "Social Media" },
      { id: "remote-work", label: "Working from Home" },
      { id: "city-country", label: "City vs Countryside" },
      { id: "travel", label: "Travel & Holidays" },
    ];
    return wrap(
      <main className="topic-page"><div className="topic-frame animate-slide-up">
        <h2>Pick a Topic</h2>
        <p>Choose the topic you&apos;d like to discuss. The AI will challenge your opinions!</p>
        <div className="topic-grid">
          {familiarTopics.map((t) => (
            <button key={t.id} className="topic-btn" onClick={() => startT3(t.id)}>{t.label}</button>
          ))}
        </div>
      </div></main>
    );
  }

  // ── TASK 3: Conversation ──────────────────────────────────────────
  if (phase === "t3-conversation") return wrap(
    <div className="debate-accent">{renderPhoneChat("Debate Partner", "Task 3 · Express & Argue", t3Messages, t3Input, setT3Input, t3Processing, t3DoneRef, sendT3, t3ExchangeCount, t3Config?.meta?.maxExchanges || 14)}</div>
  );

  // ── TASK 3: Diagnosing ────────────────────────────────────────────
  if (phase === "t3-diagnosing") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Analysing your arguments…</p></div></main>);

  // ── TASK 3: Results ───────────────────────────────────────────────
  if (phase === "t3-results" && t3Config) return wrap(
    <main className="results-page">
      {renderResultsDashboard(
        "Task 3 · Express & Argue Results", 3, "task3", t3Config, t3Diagnosis, t3Form,
        t3Expanded, setT3Expanded, t3ShowTranscript, setT3ShowTranscript, t3Messages,
        () => setPhase("t4-briefing"), "Continue to Task 4 →"
      )}
    </main>
  );

  // ── TASK 4: Briefing ──────────────────────────────────────────────
  if (phase === "t4-briefing") return wrap(
    <main className="briefing-container"><div className="briefing-card animate-slide-up">
      <div className="briefing-badge" style={{ background: "rgba(147,51,234,.1)", color: "#7c3aed" }}>🔄 Writing Test · Task 4</div>
      <h1 className="briefing-title">Rephrase &amp; <em style={{ color: "#7c3aed" }}>Adjust</em></h1>
      <p className="briefing-sub">Stimulus-response · Mediating · 4–5 minutes</p>
      <div className="briefing-section"><h3>What you&apos;ll do</h3><p>You&apos;ll read short texts and rewrite them — making them simpler, more formal, more casual, or for a different audience. This tests your ability to control language for a purpose.</p></div>
      <div className="briefing-section"><h3>What we&apos;re looking for</h3><p>Can you paraphrase? Can you shift register? Can you simplify complex ideas? This is about <strong>pragmatic competence</strong> — transforming language, not just producing it.</p></div>
      <div className="briefing-section"><h3>How it works</h3><p>You&apos;ll get 3–4 short challenges. Read the original text, read the instruction, then write your version. Take your time on each one.</p></div>
      <button onClick={startT4} className="btn-start" style={{ background: "#7c3aed", boxShadow: "0 4px 14px rgba(124,58,234,.3)" }}>Start Challenges <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div></main>
  );

  // ── TASK 4: Loading stimuli ───────────────────────────────────────
  if (phase === "t4-loading-stimuli") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Preparing your challenges…</p></div></main>);

  // ── TASK 4: Challenges ────────────────────────────────────────────
  if (phase === "t4-challenges" && t4CurrentStimulus) return wrap(
    <main className="challenge-page">
      <div className="challenge-header animate-fade-up">
        <h2>Challenge {t4CurrentIdx + 1} of {t4Stimuli.length}</h2>
        <p>Read the original text, then rewrite it as instructed.</p>
        <div className="challenge-progress">
          {t4Stimuli.map((_, i) => (
            <div key={i} className={`challenge-dot ${i === t4CurrentIdx ? "active" : (t4Responses[t4Stimuli[i].id] || "").trim() ? "done" : ""}`} />
          ))}
        </div>
      </div>
      <div className="challenge-card">
        <div className="challenge-stimulus-area">
          <span className={`challenge-type-tag ${t4CurrentStimulus.type}`}>
            {t4CurrentStimulus.type === "simplify" ? "✨ Simplify" : t4CurrentStimulus.type === "formalise" ? "👔 Formalise" : t4CurrentStimulus.type === "audience" ? "👥 Audience" : "🎭 Tone"}
          </span>
          <div className="challenge-instruction">{t4CurrentStimulus.instruction}</div>
          <div className="challenge-stimulus-box">
            <div className="challenge-stimulus-label">Original text</div>
            <div className="challenge-stimulus-text">{t4CurrentStimulus.stimulus}</div>
          </div>
        </div>
        <div className="challenge-response-area">
          <div className="challenge-response-label">Your version</div>
          <textarea
            className="challenge-textarea"
            placeholder="Write your rewritten version here…"
            value={t4CurrentResponse}
            onChange={e => setT4Responses(prev => ({ ...prev, [t4CurrentStimulus.id]: e.target.value }))}
          />
        </div>
        <div className="challenge-nav">
          <button
            className="challenge-nav-btn secondary"
            disabled={t4CurrentIdx === 0}
            onClick={() => setT4CurrentIdx(i => i - 1)}
          >← Previous</button>
          {t4CurrentIdx < t4Stimuli.length - 1 ? (
            <button
              className="challenge-nav-btn primary"
              disabled={!t4CurrentResponse.trim()}
              onClick={() => setT4CurrentIdx(i => i + 1)}
            >Next →</button>
          ) : (
            <button
              className="challenge-nav-btn primary"
              disabled={!t4AllDone}
              onClick={submitT4}
            >Submit All →</button>
          )}
        </div>
      </div>
    </main>
  );

  // ── TASK 4: Diagnosing ────────────────────────────────────────────
  if (phase === "t4-diagnosing") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Analysing your transformations…</p></div></main>);

  // ── TASK 4: Results ───────────────────────────────────────────────
  if (phase === "t4-results" && t4Config) {
    const t4TranscriptMsgs: Message[] = t4Stimuli.flatMap(s => [
      { role: "assistant" as const, content: `[${s.label}] ${s.instruction}\n\nOriginal: "${s.stimulus}"` },
      { role: "user" as const, content: t4Responses[s.id] || "(no response)" },
    ]);
    return wrap(
      <main className="results-page">
        {renderResultsDashboard(
          "Task 4 · Rephrase & Adjust Results", 4, "task4", t4Config, t4Diagnosis, t4Form,
          t4Expanded, setT4Expanded, t4ShowTranscript, setT4ShowTranscript, t4TranscriptMsgs,
          () => setPhase("t5-briefing"), "Continue to Task 5 →"
        )}
      </main>
    );
  }

  // ── TASK 5: Briefing ──────────────────────────────────────────────
  if (phase === "t5-briefing") return wrap(
    <main className="briefing-container"><div className="briefing-card animate-slide-up">
      <div className="briefing-badge" style={{ background: "rgba(8,145,178,.1)", color: "#0891b2" }}>🔀 Writing Test · Task 5</div>
      <h1 className="briefing-title">Compare &amp; <em style={{ color: "#0891b2" }}>Advise</em></h1>
      <p className="briefing-sub">Visual cards + chat · Mediating · 4–5 minutes</p>
      <div className="briefing-section"><h3>What you&apos;ll do</h3><p>You&apos;ll see two options side by side — like two hotel adverts or two job listings. Then you&apos;ll chat about them. The AI will ask you to compare them and recommend one for different people and situations.</p></div>
      <div className="briefing-section"><h3>How the AI will act</h3><p>The AI will describe different people with different needs and ask which option is better for them — and why. It will change the situation to see if you can adapt your advice.</p></div>
      <div className="briefing-section"><h3>What we&apos;re looking for</h3><p>Can you <strong>mediate</strong> — take information from a source and relay it to someone with specific needs? Can you compare, recommend, and explain trade-offs?</p></div>
      <button onClick={startT5} className="btn-start" style={{ background: "#0891b2", boxShadow: "0 4px 14px rgba(8,145,178,.3)" }}>See the Options <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></button>
    </div></main>
  );

  // ── TASK 5: Loading ───────────────────────────────────────────────
  if (phase === "t5-loading") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Preparing your options…</p></div></main>);

  // ── TASK 5: Split-screen conversation ─────────────────────────────
  if (phase === "t5-conversation" && t5StimulusSet) return wrap(
    <div className="t5-split">
      <div className="t5-cards-bar">
        {renderT5Card(t5StimulusSet.cardA)}
        {renderT5Card(t5StimulusSet.cardB)}
      </div>
      <div className="t5-chat-area t5-accent">
        {renderPhoneChat("Adviser", "Task 5 · Compare & Advise", t5Messages, t5Input, setT5Input, t5Processing, t5DoneRef, sendT5, t5ExchangeCount, t5Config?.meta?.maxExchanges || 12)}
      </div>
    </div>
  );

  // ── TASK 5: Diagnosing ────────────────────────────────────────────
  if (phase === "t5-diagnosing") return wrap(<main className="diagnosing-container"><div className="diagnosing-inner animate-fade-up"><div className="spinner" style={{ margin: "0 auto" }} /><p>Analysing your advice…</p></div></main>);

  // ── TASK 5: Results ───────────────────────────────────────────────
  if (phase === "t5-results" && t5Config) return wrap(
    <main className="results-page">
      {renderResultsDashboard(
        "Task 5 · Compare & Advise Results", 5, "task5", t5Config, t5Diagnosis, t5Form,
        t5Expanded, setT5Expanded, t5ShowTranscript, setT5ShowTranscript, t5Messages,
        () => setPhase("final-report"), "View Full Report →"
      )}
    </main>
  );

  // ── FINAL REPORT ──────────────────────────────────────────────────
  if (phase === "final-report") {
    // Aggregate function levels across tasks
    type FnEntry = { fn: string; task: string; level: string; taskNum: number };
    const fnEntries: FnEntry[] = [];

    const addFn = (diag: Diagnosis | null, taskLabel: string, taskNum: number, fns: string[]) => {
      if (!diag?.results) return;
      const levelOrder = ["Below A1", "A1", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"];
      for (const fn of fns) {
        const macros = diag.results.filter(r => r.fn === fn && r.result === "CAN");
        if (macros.length === 0) { fnEntries.push({ fn, task: taskLabel, level: "—", taskNum }); continue; }
        const highest = macros.reduce((best, m) => {
          const bi = levelOrder.indexOf(best.level);
          const mi = levelOrder.indexOf(m.level);
          return mi > bi ? m : best;
        }, macros[0]);
        fnEntries.push({ fn, task: taskLabel, level: highest.level, taskNum });
      }
    };

    addFn(t1Diagnosis, "Task 1", 1, ["Interactional", "Informing"]);
    addFn(t2Diagnosis, "Task 2", 2, ["Informing", "Narrating"]);
    addFn(t3Diagnosis, "Task 3", 3, ["Expressing", "Arguing"]);
    addFn(t4Diagnosis, "Task 4", 4, ["Mediating"]);
    addFn(t5Diagnosis, "Task 5", 5, ["Mediating", "Informing", "Directing"]);

    // Deduplicate — take highest level per function
    const levelOrder = ["—", "Below A1", "A1", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"];
    const fnMap = new Map<string, FnEntry>();
    for (const e of fnEntries) {
      const existing = fnMap.get(e.fn);
      if (!existing || levelOrder.indexOf(e.level) > levelOrder.indexOf(existing.level)) {
        fnMap.set(e.fn, e);
      }
    }
    const fnSummary = Array.from(fnMap.values());

    // Overall function level — most common confirmed level
    const confirmedLevels = fnSummary.map(f => f.level).filter(l => l !== "—");
    const overallFn = confirmedLevels.length > 0
      ? confirmedLevels.sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b))[Math.floor(confirmedLevels.length / 2)]
      : "—";

    // Aggregate form dimensions across tasks
    type FormEntry = { dimension: string; level: string; descriptor: string; source: string };
    const formEntries: FormEntry[] = [];
    const addForm = (form: FormAnalysis | null, src: string) => {
      if (!form?.dimensions) return;
      for (const d of form.dimensions) {
        formEntries.push({ dimension: d.dimension, level: d.level, descriptor: d.descriptor, source: src });
      }
    };
    addForm(t1Form, "T1");
    addForm(t2Form, "T2");
    addForm(t3Form, "T3");
    addForm(t4Form, "T4");
    addForm(t5Form, "T5");

    // Deduplicate — take highest level per dimension
    const dimMap = new Map<string, FormEntry>();
    for (const e of formEntries) {
      const existing = dimMap.get(e.dimension);
      if (!existing || levelOrder.indexOf(e.level) > levelOrder.indexOf(existing.level)) {
        dimMap.set(e.dimension, e);
      }
    }
    const formSummary = Array.from(dimMap.values());

    const overallFormLevels = formSummary.map(f => f.level).filter(l => levelOrder.indexOf(l) > 0);
    const overallForm = overallFormLevels.length > 0
      ? overallFormLevels.sort((a, b) => levelOrder.indexOf(a) - levelOrder.indexOf(b))[Math.floor(overallFormLevels.length / 2)]
      : "—";

    const fnLevelClass = (lvl: string) => {
      const i = levelOrder.indexOf(lvl);
      if (i <= 0) return "na";
      if (i >= 7) return "high";
      if (i >= 4) return "mid";
      return "low";
    };

    const formBarWidth = (lvl: string) => {
      const i = levelOrder.indexOf(lvl);
      if (i <= 0) return 0;
      return Math.round((i / 10) * 100);
    };

    // Task scores summary
    const taskScoreSummary: { key: TaskKey; name: string; score: number | null; fnLevel: string }[] = [
      { key: "task1", name: "Diagnostic Chat",    score: taskScores.task1 ?? null, fnLevel: t1Diagnosis?.diagnosedLevel ?? "—" },
      { key: "task2", name: "Narrative Writing",  score: taskScores.task2 ?? null, fnLevel: t2Diagnosis?.diagnosedLevel ?? "—" },
      { key: "task3", name: "Debate",             score: taskScores.task3 ?? null, fnLevel: t3Diagnosis?.diagnosedLevel ?? "—" },
      { key: "task4", name: "Mediation",          score: taskScores.task4 ?? null, fnLevel: t4Diagnosis?.diagnosedLevel ?? "—" },
      { key: "task5", name: "Advice Task",        score: taskScores.task5 ?? null, fnLevel: t5Diagnosis?.diagnosedLevel ?? "—" },
    ].filter(t => t.score !== null);

    const allTaskLevels: Partial<Record<TaskKey, string>> = {
      task1: t1Diagnosis?.diagnosedLevel,
      task2: t2Diagnosis?.diagnosedLevel,
      task3: t3Diagnosis?.diagnosedLevel,
      task4: t4Diagnosis?.diagnosedLevel,
      task5: t5Diagnosis?.diagnosedLevel,
    };
    const highestConfirmed = getHighestConfirmedLevel(allTaskLevels);
    const { total: scoreTotal, maxPossible: scoreMax } = getTotalScore(taskScores);

    return wrap(
      <main className="report-page">
        <nav className="report-nav">
          <div className="report-nav-logo">AZE <em>Writing Test</em></div>
          <div className="report-nav-tag">Final Report</div>
        </nav>

        <div className="report-hero animate-fade-up">
          <div className="report-hero-eyebrow">Assessment Complete</div>
          <h1 className="report-hero-title">Your <em>Writing Profile</em></h1>
          <p className="report-hero-sub">{taskScoreSummary.length} tasks · {fnSummary.length} functions tested · {formSummary.length} language dimensions</p>
          <div className="report-overall">
            <div className="report-overall-item">
              <div className="report-overall-label">Highest Confirmed Level</div>
              <div className="report-overall-value fn">{highestConfirmed}</div>
              <div style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: "4px" }}>across all tasks</div>
            </div>
            <div className="report-divider" />
            <div className="report-overall-item">
              <div className="report-overall-label">Total Score</div>
              <div className="report-overall-value fn" style={{ color: "var(--accent)" }}>{scoreTotal}<span style={{ fontSize: "1.2rem", color: "var(--muted)", fontFamily: "var(--font-sans)" }}> / {scoreMax}</span></div>
              <div style={{ fontSize: ".7rem", color: "var(--muted)", marginTop: "4px" }}>performance</div>
            </div>
            <div className="report-divider" />
            <div className="report-overall-item">
              <div className="report-overall-label">Language Level</div>
              <div className="report-overall-value form">{overallForm}</div>
            </div>
          </div>

          {/* Task scores table */}
          <div style={{ marginTop: "32px", width: "100%", maxWidth: "560px" }}>
            <div style={{ fontSize: ".65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".12em", color: "var(--muted)", marginBottom: "12px" }}>Task Scores</div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {taskScoreSummary.map(t => (
                <div key={t.key} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div style={{ flex: 1, fontSize: ".82rem", color: "var(--ink)" }}>{t.name}</div>
                  <div style={{ fontSize: ".75rem", color: "var(--muted)", width: "40px", textAlign: "right" }}>{t.fnLevel}</div>
                  <div style={{ width: "120px", height: "6px", background: "var(--separator)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${((t.score ?? 0) / 10) * 100}%`, background: "var(--accent)", borderRadius: "3px", transition: "width .8s ease" }} />
                  </div>
                  <div style={{ fontSize: ".9rem", fontWeight: 700, color: "var(--accent)", width: "42px", textAlign: "right" }}>{t.score} <span style={{ fontSize: ".65rem", fontWeight: 400, color: "var(--muted)" }}>/ 10</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="report-split">
          {/* LEFT — Functions */}
          <div className="report-panel animate-fade-up" style={{ animationDelay: "100ms" }}>
            <div className="report-panel-header">
              <div className="report-panel-icon fn">📋</div>
              <div>
                <div className="report-panel-title">What You Can Do</div>
                <div className="report-panel-sub">Communicative functions · CAN / Not Demonstrated</div>
              </div>
            </div>
            {fnSummary.map((f, i) => (
              <div className="report-fn-row" key={i}>
                <div className="report-fn-info">
                  <div className="report-fn-name">{f.fn}</div>
                  <div className="report-fn-task">{f.task}</div>
                </div>
                <div className={`report-fn-level ${fnLevelClass(f.level)}`}>
                  {f.level === "—" ? "Not tested" : f.level}
                </div>
              </div>
            ))}
          </div>

          {/* RIGHT — Language */}
          <div className="report-panel animate-fade-up" style={{ animationDelay: "200ms" }}>
            <div className="report-panel-header">
              <div className="report-panel-icon form">🔤</div>
              <div>
                <div className="report-panel-title">How You Use Language</div>
                <div className="report-panel-sub">Language quality · Analytic assessment</div>
              </div>
            </div>
            {formSummary.map((f, i) => (
              <div className="report-form-row" key={i}>
                <div className="report-form-dim">
                  <div className="report-form-dim-name">{f.dimension}</div>
                  <div className="report-form-dim-desc">{f.descriptor}</div>
                </div>
                <div className="report-form-bar">
                  <div className="report-form-bar-fill" style={{ width: `${formBarWidth(f.level)}%` }} />
                </div>
                <div className="report-form-level-tag">{f.level}</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  // Fallback
  return wrap(<main className="diagnosing-container"><p>Something went wrong.</p></main>);
}