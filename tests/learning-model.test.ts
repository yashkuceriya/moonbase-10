import assert from "node:assert/strict";
import test from "node:test";
import {
  STARTING_MASTERY,
  chooseNextMissionIndex,
  getMissionProgress,
  traceMastery,
  type SkillKey,
} from "../app/learning-model.ts";

test("BKT-inspired update distinguishes wrong, independent, and scaffolded evidence", () => {
  assert.equal(traceMastery(68, true), 79);
  assert.equal(traceMastery(68, false), 59);
  assert.equal(traceMastery(59, true, true), 71);
});

test("mastery estimates remain inside the declared display range", () => {
  for (const prior of [0, 12, 50, 98, 100]) {
    for (const correct of [false, true]) {
      for (const scaffolded of [false, true]) {
        const estimate = traceMastery(prior, correct, scaffolded);
        assert.ok(estimate >= 12 && estimate <= 98, `${estimate} is outside the display range`);
      }
    }
  }
});

test("next-mission policy targets the lowest other skill estimate", () => {
  const missions: Array<{ skill: SkillKey }> = [
    { skill: "arrays" },
    { skill: "placeValue" },
    { skill: "fractions" },
    { skill: "subtraction" },
  ];

  assert.equal(chooseNextMissionIndex(missions, 0, { ...STARTING_MASTERY, arrays: 79 }), 3);
  assert.equal(chooseNextMissionIndex(missions, 3, STARTING_MASTERY), 2);
});

test("mission progress reaches eight systems without exceeding 100 percent", () => {
  assert.deepEqual(getMissionProgress(0), { systemsRestored: 3, basePower: 38 });
  assert.deepEqual(getMissionProgress(5), { systemsRestored: 8, basePower: 100 });
  assert.deepEqual(getMissionProgress(50), { systemsRestored: 8, basePower: 100 });
});
