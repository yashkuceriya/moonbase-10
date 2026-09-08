import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_EVIDENCE,
  STARTING_LEVELS,
  STARTING_MASTERY,
  buildTutorBrief,
  chooseNextMissionIndex,
  getMissionProgress,
  traceMastery,
  updateSkillLevel,
  type SkillKey,
  type SkillLevel,
} from "../app/learning-model.ts";
import { MISSIONS } from "../app/missions.ts";

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
  const missions: Array<{ skill: SkillKey; level: SkillLevel }> = [
    { skill: "arrays", level: 2 },
    { skill: "placeValue", level: 2 },
    { skill: "fractions", level: 1 },
    { skill: "subtraction", level: 1 },
    { skill: "subtraction", level: 2 },
  ];

  assert.equal(chooseNextMissionIndex(missions, 0, { ...STARTING_MASTERY, arrays: 79 }, STARTING_LEVELS), 3);
  assert.equal(chooseNextMissionIndex(missions, 3, STARTING_MASTERY, STARTING_LEVELS), 2);
  assert.equal(
    chooseNextMissionIndex(missions, 0, { ...STARTING_MASTERY, subtraction: 40 }, { ...STARTING_LEVELS, subtraction: 2 }),
    4,
  );
});

test("only independent evidence advances representation level", () => {
  assert.equal(updateSkillLevel(1, true), 2);
  assert.equal(updateSkillLevel(2, true), 3);
  assert.equal(updateSkillLevel(3, true), 3);
  assert.equal(updateSkillLevel(2, true, true), 2);
  assert.equal(updateSkillLevel(2, false), 2);
  assert.equal(updateSkillLevel(2, true, false, 1), 2);
  assert.equal(updateSkillLevel(1, true, false, 3), 3);
});

test("real mission routing selects the needed skill at its current representation level", () => {
  const next = chooseNextMissionIndex(
    MISSIONS,
    0,
    { ...STARTING_MASTERY, arrays: 79 },
    { ...STARTING_LEVELS, arrays: 3 },
  );

  assert.equal(MISSIONS[next].id, "crater-build");
});

test("mission bank has a valid authored Build, Connect, and Transfer item for every skill", () => {
  const skills: SkillKey[] = ["arrays", "placeValue", "fractions", "subtraction"];

  assert.equal(MISSIONS.length, 12);
  assert.equal(new Set(MISSIONS.map((mission) => mission.id)).size, MISSIONS.length);

  for (const skill of skills) {
    assert.deepEqual(
      MISSIONS.filter((mission) => mission.skill === skill).map((mission) => mission.level).sort(),
      [1, 2, 3],
    );
  }

  for (const mission of MISSIONS) {
    assert.equal(mission.levelLabel, (["", "Build", "Connect", "Transfer"] as const)[mission.level]);
    assert.ok(mission.options.includes(mission.answer), `${mission.id} omits its answer`);
    assert.equal(new Set(mission.options).size, mission.options.length, `${mission.id} repeats an option`);
    assert.ok(mission.scaffold.options.includes(mission.scaffold.answer), `${mission.id} scaffold omits its answer`);
    assert.equal(new Set(mission.scaffold.options).size, mission.scaffold.options.length, `${mission.id} scaffold repeats an option`);
    assert.ok(
      mission.options.filter((option) => option !== mission.answer).every((option) => mission.insightByAnswer[option]),
      `${mission.id} has a distractor without a misconception hypothesis`,
    );
    if (mission.visual.kind === "array") {
      assert.equal(mission.visual.rows * mission.visual.columns, mission.answer);
    }
    if (mission.visual.kind === "fraction") {
      assert.ok(Number.isInteger(mission.visual.total / mission.visual.denominator));
      assert.equal((mission.visual.total / mission.visual.denominator) * mission.visual.numerator, mission.answer);
    }
    if (mission.visual.kind === "number-line") {
      assert.equal(mission.visual.start - mission.visual.subtract, mission.answer);
    }
    if (mission.visual.kind === "base-ten") {
      assert.equal(mission.visual.left + mission.visual.right, mission.answer);
    }
  }
});

test("tutor brief is transparent, actionable, and contains no diagnosis claim", () => {
  const brief = buildTutorBrief({
    mastery: STARTING_MASTERY,
    levels: STARTING_LEVELS,
    evidence: EMPTY_EVIDENCE,
    attempts: 3,
    completed: 1,
    detours: 1,
    latestSignal: "The final equal group was dropped.",
    nextMove: "Fade two rows and reconstruct them.",
  });

  assert.match(brief, /TUTOR BRIEF/);
  assert.match(brief, /Latest learning signal: The final equal group was dropped/);
  assert.match(brief, /Recommended next move: Fade two rows/);
  assert.match(brief, /hand-set, uncalibrated prototype parameters/);
  assert.doesNotMatch(brief, /diagnosed|deficit|disorder/i);
});

test("mission progress reaches eight systems without exceeding 100 percent", () => {
  assert.deepEqual(getMissionProgress(0), { systemsRestored: 3, basePower: 38 });
  assert.deepEqual(getMissionProgress(5), { systemsRestored: 8, basePower: 100 });
  assert.deepEqual(getMissionProgress(50), { systemsRestored: 8, basePower: 100 });
});
