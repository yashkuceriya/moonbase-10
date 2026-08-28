export type SkillKey = "arrays" | "placeValue" | "fractions" | "subtraction";

export type Mastery = Record<SkillKey, number>;

export const STARTING_MASTERY: Mastery = {
  arrays: 68,
  placeValue: 81,
  fractions: 62,
  subtraction: 54,
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
  missions: ReadonlyArray<{ skill: SkillKey }>,
  currentIndex: number,
  mastery: Mastery,
) {
  if (missions.length < 2) return 0;

  return missions.reduce((bestIndex, candidate, candidateIndex) => {
    if (candidateIndex === currentIndex) return bestIndex;
    if (bestIndex === currentIndex) return candidateIndex;

    return mastery[candidate.skill] < mastery[missions[bestIndex].skill]
      ? candidateIndex
      : bestIndex;
  }, currentIndex);
}

export function getMissionProgress(completed: number) {
  const systemsRestored = Math.min(8, 3 + Math.max(0, completed));
  return {
    systemsRestored,
    basePower: Math.round((systemsRestored / 8) * 100),
  };
}
