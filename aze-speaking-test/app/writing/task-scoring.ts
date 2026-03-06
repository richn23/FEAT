// ─────────────────────────────────────────────────────────────────────────────
// AZE Writing Test — Task Performance Scoring
//
// Converts a diagnosed CEFR level into a 0-10 performance score
// relative to each task's ceiling. This is a PERFORMANCE indicator,
// not an absolute proficiency level.
//
// Ceilings:
//   Task 1 — B1+  (interaction / inform)
//   Task 2 — B2   (inform / narrate)
//   Task 3 — C1   (express / argue)
//   Task 4 — C1   (mediation)
//   Task 5 — C1   (compare / advise)
//
// Final CEFR level = highest confirmed level across all tasks.
// Score = performance relative to task difficulty.
// These are separate concepts and must not be conflated.
// ─────────────────────────────────────────────────────────────────────────────

export type TaskKey = "task1" | "task2" | "task3" | "task4" | "task5";

// CEFR level ordering for "highest confirmed" calculation
export const CEFR_ORDER = [
  "Pre-A1", "A1", "A2", "A2+", "B1", "B1+", "B2", "B2+", "C1", "C2"
] as const;

export type CefrLevel = typeof CEFR_ORDER[number];

// ─────────────────────────────────────────────────────────────────────────────
// Score maps — relative to task ceiling
// ─────────────────────────────────────────────────────────────────────────────

const SCORE_MAP: Record<TaskKey, Partial<Record<CefrLevel, number>>> = {
  // Ceiling: B1+
  task1: {
    "Pre-A1": 1,
    "A1":     2,
    "A2":     4,
    "A2+":    6,
    "B1":     8,
    "B1+":    10,
  },
  // Ceiling: B2
  task2: {
    "Pre-A1": 1,
    "A1":     2,
    "A2":     3,
    "A2+":    5,
    "B1":     6,
    "B1+":    8,
    "B2":     10,
  },
  // Ceiling: C1
  task3: {
    "Pre-A1": 1,
    "A1":     2,
    "A2":     3,
    "A2+":    4,
    "B1":     5,
    "B1+":    6,
    "B2":     8,
    "B2+":    9,
    "C1":     10,
  },
  // Ceiling: C1
  task4: {
    "Pre-A1": 1,
    "A1":     2,
    "A2":     3,
    "A2+":    4,
    "B1":     5,
    "B1+":    6,
    "B2":     8,
    "B2+":    9,
    "C1":     10,
  },
  // Ceiling: C1
  task5: {
    "Pre-A1": 1,
    "A1":     2,
    "A2":     3,
    "A2+":    4,
    "B1":     5,
    "B1+":    6,
    "B2":     8,
    "B2+":    9,
    "C1":     10,
  },
};

// Task ceiling labels for display
export const TASK_CEILINGS: Record<TaskKey, string> = {
  task1: "B1+",
  task2: "B2",
  task3: "C1",
  task4: "C1",
  task5: "C1",
};

// Task display names
export const TASK_NAMES: Record<TaskKey, string> = {
  task1: "Diagnostic Chat",
  task2: "Narrative Writing",
  task3: "Debate",
  task4: "Mediation",
  task5: "Advice Task",
};

// ─────────────────────────────────────────────────────────────────────────────
// getTaskScore
//
// Returns the 0-10 performance score for a given task and diagnosed level.
// Falls back to 1 if level is unrecognised or not in this task's map
// (e.g. C1 evidence from Task 1 — score at ceiling instead).
// ─────────────────────────────────────────────────────────────────────────────

export function getTaskScore(task: TaskKey, diagnosedLevel: string): number {
  const map = SCORE_MAP[task];
  const level = diagnosedLevel as CefrLevel;

  // Direct match
  if (map[level] !== undefined) return map[level]!;

  // Level is above this task's ceiling — candidate hit the ceiling
  const levelIdx = CEFR_ORDER.indexOf(level);
  const ceilingLevel = TASK_CEILINGS[task] as CefrLevel;
  const ceilingIdx = CEFR_ORDER.indexOf(ceilingLevel);

  if (levelIdx > ceilingIdx) return 10;

  // Unrecognised or below floor — return 1
  return 1;
}

// ─────────────────────────────────────────────────────────────────────────────
// getHighestConfirmedLevel
//
// Returns the highest CEFR level confirmed across all completed tasks.
// Used for the final report headline level.
// ─────────────────────────────────────────────────────────────────────────────

export function getHighestConfirmedLevel(
  taskLevels: Partial<Record<TaskKey, string>>
): string {
  let highestIdx = -1;
  let highestLevel = "Pre-A1";

  for (const level of Object.values(taskLevels)) {
    if (!level) continue;
    const idx = CEFR_ORDER.indexOf(level as CefrLevel);
    if (idx > highestIdx) {
      highestIdx = idx;
      highestLevel = level;
    }
  }

  return highestLevel;
}

// ─────────────────────────────────────────────────────────────────────────────
// getTotalScore
//
// Returns { total, maxPossible, percentage } across completed tasks only.
// ─────────────────────────────────────────────────────────────────────────────

export function getTotalScore(scores: Partial<Record<TaskKey, number>>): {
  total: number;
  maxPossible: number;
  percentage: number;
} {
  const entries = Object.entries(scores) as [TaskKey, number][];
  const total = entries.reduce((sum, [, score]) => sum + score, 0);
  const maxPossible = entries.length * 10;
  const percentage = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;
  return { total, maxPossible, percentage };
}

// ─────────────────────────────────────────────────────────────────────────────
// getScoreLabel
//
// Returns a short motivating label for a given score.
// ─────────────────────────────────────────────────────────────────────────────

export function getScoreLabel(score: number): string {
  if (score >= 10) return "Ceiling reached";
  if (score >= 8)  return "Strong performance";
  if (score >= 6)  return "Solid performance";
  if (score >= 4)  return "Developing";
  if (score >= 2)  return "Emerging";
  return "Foundation level";
}