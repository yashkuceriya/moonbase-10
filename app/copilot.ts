import { MISSIONS, type Mission } from "./missions.ts";
import type { SkillKey, SkillLevel } from "./learning-model.ts";

export type CopilotInput = {
  missionId: string;
  targetLevel: SkillLevel;
  mastery: number;
  latestSignal: string;
  independentWins: number;
  scaffoldedWins: number;
  nearMisses: number;
};

export type TutorPlan = {
  source: "openai" | "verified-engine";
  model: string | null;
  headline: string;
  rationale: string;
  noticePrompt: string;
  representPrompt: string;
  fadePrompt: string;
  tutorLookFor: string;
  recommendedMissionId: string;
  recommendedLevel: SkillLevel;
  safety: {
    mathSource: "authored-and-tested";
    answerWithheld: true;
    storedByMoonbase: false;
  };
};

export type ModelPlan = Pick<
  TutorPlan,
  "headline" | "rationale" | "noticePrompt" | "representPrompt" | "fadePrompt" | "tutorLookFor"
>;

const SKILL_PROMPTS: Record<SkillKey, { notice: string; represent: string; lookFor: string }> = {
  arrays: {
    notice: "Ask: “What does each equal row represent, and how will you keep track of every row?”",
    represent: "Invite Nova to point to each equal group, then describe how the groups form one complete structure.",
    lookFor: "Listen for Nova naming both the number of groups and the size of each group.",
  },
  placeValue: {
    notice: "Ask: “Which pieces belong in the tens place, and which belong in the ones place?”",
    represent: "Invite Nova to describe any exchange with place-value language before recording the written strategy.",
    lookFor: "Listen for Nova describing the exchange rather than reciting a carrying rule.",
  },
  fractions: {
    notice: "Ask: “What does the denominator tell us to build before we choose any shares?”",
    represent: "Invite Nova to make equal groups, identify one share, and explain how the requested shares are composed.",
    lookFor: "Listen for Nova identifying equal groups before using the numerator.",
  },
  subtraction: {
    notice: "Ask: “Which friendly jump would make this distance easier to track?”",
    represent: "Invite Nova to mark an intermediate landing point and explain how the smaller jumps preserve the full distance.",
    lookFor: "Listen for Nova decomposing the distance and checking the direction of each jump.",
  },
};

const MAX_SIGNAL_LENGTH = 280;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isBoundedInteger(value: unknown, min: number, max: number): value is number {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

export function parseCopilotInput(value: unknown): CopilotInput | null {
  if (!isRecord(value)) return null;
  const mission = MISSIONS.find((candidate) => candidate.id === value.missionId);
  if (!mission) return null;
  if (!isBoundedInteger(value.targetLevel, 1, 3)) return null;
  if (!isBoundedInteger(value.mastery, 0, 100)) return null;
  if (typeof value.latestSignal !== "string" || value.latestSignal.length < 4 || value.latestSignal.length > MAX_SIGNAL_LENGTH) return null;
  if (!isBoundedInteger(value.independentWins, 0, 999)) return null;
  if (!isBoundedInteger(value.scaffoldedWins, 0, 999)) return null;
  if (!isBoundedInteger(value.nearMisses, 0, 999)) return null;

  return {
    missionId: mission.id,
    targetLevel: value.targetLevel as SkillLevel,
    mastery: value.mastery,
    latestSignal: value.latestSignal.trim(),
    independentWins: value.independentWins,
    scaffoldedWins: value.scaffoldedWins,
    nearMisses: value.nearMisses,
  };
}

export function chooseCopilotMission(current: Mission, targetLevel: SkillLevel) {
  const candidates = MISSIONS
    .filter((mission) => mission.skill === current.skill)
    .sort((a, b) => {
      const distance = Math.abs(a.level - targetLevel) - Math.abs(b.level - targetLevel);
      if (distance) return distance;
      if (a.id === current.id) return 1;
      if (b.id === current.id) return -1;
      return b.level - a.level;
    });

  return candidates[0] ?? current;
}

export function buildVerifiedTutorPlan(input: CopilotInput): TutorPlan {
  const current = MISSIONS.find((mission) => mission.id === input.missionId) ?? MISSIONS[0];
  const next = chooseCopilotMission(current, input.targetLevel);
  const prompts = SKILL_PROMPTS[current.skill];
  const evidenceSummary = `${input.independentWins} independent, ${input.scaffoldedWins} scaffolded, and ${input.nearMisses} near-miss observations`;

  return {
    source: "verified-engine",
    model: null,
    headline: `Turn the signal into a ${next.levelLabel.toLowerCase()}-level conversation`,
    rationale: `Signal: ${input.latestSignal} The current estimate is ${input.mastery}% with ${evidenceSummary}. Keep the hypothesis provisional and test it through explanation, not another score alone.`,
    noticePrompt: prompts.notice,
    representPrompt: prompts.represent,
    fadePrompt: `When Nova can explain the strategy, launch “${next.title}” and let the ${next.levelLabel.toLowerCase()} representation carry less of the thinking.`,
    tutorLookFor: prompts.lookFor,
    recommendedMissionId: next.id,
    recommendedLevel: next.level,
    safety: {
      mathSource: "authored-and-tested",
      answerWithheld: true,
      storedByMoonbase: false,
    },
  };
}

const PLAN_KEYS: Array<keyof ModelPlan> = [
  "headline",
  "rationale",
  "noticePrompt",
  "representPrompt",
  "fadePrompt",
  "tutorLookFor",
];

export function validateModelPlan(value: unknown): ModelPlan | null {
  if (!isRecord(value)) return null;
  const plan = {} as ModelPlan;

  for (const key of PLAN_KEYS) {
    const field = value[key];
    if (typeof field !== "string") return null;
    const normalized = field.trim().replace(/\s+/g, " ");
    if (normalized.length < 8 || normalized.length > 280) return null;
    if (/\p{N}/u.test(normalized)) return null;
    if (/\b(?:zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand)\b/i.test(normalized)) return null;
    if (/\b(answer is|equals|diagnos(?:e|ed|is)|disorder|deficit)\b/i.test(normalized)) return null;
    plan[key] = normalized;
  }

  return plan;
}

export function mergeModelPlan(
  fallback: TutorPlan,
  modelPlan: ModelPlan,
  model: string,
): TutorPlan {
  return {
    ...fallback,
    ...modelPlan,
    source: "openai",
    model,
  };
}
