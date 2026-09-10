export type SkillKey = "arrays" | "placeValue" | "fractions" | "subtraction";
export type SkillLevel = 1 | 2 | 3;

export type Mastery = Record<SkillKey, number>;
export type SkillLevels = Record<SkillKey, SkillLevel>;
export type SkillEvidence = Record<
  SkillKey,
  { independentWins: number; scaffoldedWins: number; nearMisses: number; transferWins: number; transferNeedsSupport: number }
>;

export const STARTING_MASTERY: Mastery = {
  arrays: 68,
  placeValue: 81,
  fractions: 62,
  subtraction: 54,
};

export const STARTING_LEVELS: SkillLevels = {
  arrays: 2,
  placeValue: 2,
  fractions: 1,
  subtraction: 1,
};

export const EMPTY_EVIDENCE: SkillEvidence = {
  arrays: { independentWins: 0, scaffoldedWins: 0, nearMisses: 0, transferWins: 0, transferNeedsSupport: 0 },
  placeValue: { independentWins: 0, scaffoldedWins: 0, nearMisses: 0, transferWins: 0, transferNeedsSupport: 0 },
  fractions: { independentWins: 0, scaffoldedWins: 0, nearMisses: 0, transferWins: 0, transferNeedsSupport: 0 },
  subtraction: { independentWins: 0, scaffoldedWins: 0, nearMisses: 0, transferWins: 0, transferNeedsSupport: 0 },
};

/**
 * A compact, BKT-inspired evidence update for the deterministic prototype.
 *
 * The parameters are deliberately explicit and hand-set; they have not been
 * calibrated on learner data. The extra stabilization step prevents a single
 * demo response from producing an implausibly large swing.
 */
export function traceMastery(priorPercent: number, correct: boolean, scaffolded = false) {
  const prior = priorPercent / 100;
  const slip = 0.1;
  const guess = 0.2;
  const learn = scaffolded ? 0.08 : 0.13;
  const observed = correct
    ? (prior * (1 - slip)) / (prior * (1 - slip) + (1 - prior) * guess)
    : (prior * slip) / (prior * slip + (1 - prior) * (1 - guess));
  const stabilized = (observed + prior * 2) / 3;
  const learned = stabilized + (1 - stabilized) * learn;

  return Math.max(12, Math.min(98, Math.round(learned * 100)));
}

export function chooseNextMissionIndex(
  missions: ReadonlyArray<{ skill: SkillKey; level: SkillLevel }>,
  currentIndex: number,
  mastery: Mastery,
  levels: SkillLevels,
) {
  if (missions.length < 2) return 0;

  const currentSkill = missions[currentIndex]?.skill;
  const availableSkills = Array.from(new Set(missions.map((mission) => mission.skill)));
  const otherSkills = availableSkills.filter((skill) => skill !== currentSkill);
  const skillPool = otherSkills.length > 0 ? otherSkills : availableSkills;
  const nextSkill = skillPool.reduce((best, skill) =>
    mastery[skill] < mastery[best] ? skill : best,
  );
  const targetLevel = levels[nextSkill];
  const candidates = missions
    .map((mission, index) => ({ mission, index }))
    .filter(({ mission, index }) => mission.skill === nextSkill && index !== currentIndex)
    .sort((a, b) => {
      const distance = Math.abs(a.mission.level - targetLevel) - Math.abs(b.mission.level - targetLevel);
      return distance || a.mission.level - b.mission.level || a.index - b.index;
    });

  return candidates[0]?.index ?? currentIndex;
}

export function updateSkillLevel(
  currentLevel: SkillLevel,
  correct: boolean,
  scaffolded = false,
  observedLevel = currentLevel,
): SkillLevel {
  if (!correct || scaffolded) return currentLevel;
  return Math.max(currentLevel, Math.min(3, observedLevel + 1)) as SkillLevel;
}

const SKILL_NAMES: Record<SkillKey, string> = {
  arrays: "Equal groups & arrays",
  placeValue: "Place value & regrouping",
  fractions: "Fractions of sets",
  subtraction: "Subtracting across ten",
};

const LEVEL_NAMES: Record<SkillLevel, string> = {
  1: "Build",
  2: "Connect",
  3: "Transfer",
};

export function buildTutorBrief({
  mastery,
  levels,
  evidence,
  attempts,
  completed,
  detours,
  latestSignal,
  nextMove,
}: {
  mastery: Mastery;
  levels: SkillLevels;
  evidence: SkillEvidence;
  attempts: number;
  completed: number;
  detours: number;
  latestSignal: string;
  nextMove: string;
}) {
  const skillRows = (Object.keys(mastery) as SkillKey[]).map((skill) => {
    const observations = evidence[skill];
    return `- ${SKILL_NAMES[skill]}: ${mastery[skill]}% prototype estimate; ${LEVEL_NAMES[levels[skill]]} level; ${observations.independentWins} independent, ${observations.scaffoldedWins} scaffolded, ${observations.nearMisses} near-miss; new-number checks: ${observations.transferWins} passed, ${observations.transferNeedsSupport} need support`;
  });

  return [
    "MOONBASE 10 · TUTOR BRIEF",
    `Session: ${attempts} attempts · ${completed} missions completed · ${detours} targeted detours`,
    "",
    `Latest learning signal: ${latestSignal}`,
    `Recommended next move: ${nextMove}`,
    "",
    "Skill evidence:",
    ...skillRows,
    "",
    "Note: Estimates are BKT-inspired with hand-set, uncalibrated prototype parameters. Use this brief as a conversation starter, not a grade or diagnosis.",
  ].join("\n");
}

export function getMissionProgress(completed: number) {
  const systemsRestored = Math.min(8, 3 + Math.max(0, completed));
  return {
    systemsRestored,
    basePower: Math.round((systemsRestored / 8) * 100),
  };
}
