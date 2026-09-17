import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPTY_EVIDENCE,
  STARTING_LEVELS,
  STARTING_MASTERY,
  buildTutorBrief,
  chooseNextMissionIndex,
  getMissionProgress,
  missionRewards,
  SESSION_MISSION_LIMIT,
  traceMastery,
  describeRepresentationEvidence,
  updateSkillLevel,
  type SkillKey,
  type SkillLevel,
} from "../app/learning-model.ts";
import { MISSIONS, type Mission } from "../app/missions.ts";
import { recordEvidence, type ExposureLedger } from "../app/evidence-policy.ts";

test("BKT-inspired update distinguishes wrong, independent, and scaffolded evidence", () => {
  assert.equal(traceMastery(68, true), 79);
  assert.equal(traceMastery(68, false), 59);
  assert.equal(traceMastery(59, true, true), 71);
});

test("evidence copy separates observed difficulty from unlocked representation", () => {
  const repair = describeRepresentationEvidence(1, 3, 3, false);
  assert.match(repair, /Build-level question independently/);
  assert.match(repair, /does not establish Transfer-level proficiency/);
  assert.doesNotMatch(repair, /confirmed/);
  assert.match(describeRepresentationEvidence(2, 2, 3, false), /Unlocked the next representation: Transfer/);
  assert.match(describeRepresentationEvidence(3, 3, 3, false), /does not establish long-term retention/);
  assert.match(describeRepresentationEvidence(1, 3, 3, true), /Supported recovery does not unlock/);
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
  const missions: Array<{ id: string; skill: SkillKey; level: SkillLevel }> = [
    { id: "a", skill: "arrays", level: 2 },
    { id: "p", skill: "placeValue", level: 2 },
    { id: "f", skill: "fractions", level: 1 },
    { id: "s1", skill: "subtraction", level: 1 },
    { id: "s2", skill: "subtraction", level: 2 },
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

  assert.notEqual(next, null);
  assert.equal(MISSIONS[next!].id, "crater-build");
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

test("supported and independent journeys reach five distinct completions without automatic replay", () => {
  for (const supported of [true, false]) {
    let ledger: ExposureLedger = {};
    let index = 0;
    const mastery = { ...STARTING_MASTERY };
    const levels = { ...STARTING_LEVELS };
    const seen = new Set<string>();
    for (let completed = 0; completed < SESSION_MISSION_LIMIT; completed++) {
      const mission = MISSIONS[index];
      assert.equal(seen.has(mission.id), false, `${supported}: repeated ${mission.id}`);
      assert.ok(mission.level <= levels[mission.skill]);
      seen.add(mission.id);
      if (supported) {
        ledger = recordEvidence(ledger, mission.id, false).ledger;
        mastery[mission.skill] = traceMastery(mastery[mission.skill], false);
      }
      const credit = recordEvidence(ledger, mission.id, true, supported);
      ledger = credit.ledger;
      assert.equal(credit.firstCompletion, true);
      mastery[mission.skill] = traceMastery(mastery[mission.skill], true, supported);
      levels[mission.skill] = updateSkillLevel(levels[mission.skill], true, supported, mission.level);
      if (completed + 1 < SESSION_MISSION_LIMIT) {
        const next = chooseNextMissionIndex(MISSIONS, index, mastery, levels, ledger);
        assert.notEqual(next, null);
        index = next!;
      }
    }
    assert.equal(seen.size, 5);
    assert.equal(missionRewards(seen.size), 700);
  }
});

test("failed transfer repairs the observed level, not an already-promoted skill level", () => {
  const ledger = recordEvidence({}, MISSIONS[0].id, true).ledger;
  const next = chooseNextMissionIndex(MISSIONS, 0, STARTING_MASTERY, { ...STARTING_LEVELS, arrays: 3 }, ledger, true);
  assert.equal(MISSIONS[next!].id, "antenna-build");
  const exhausted = recordEvidence(ledger, "antenna-build", true).ledger;
  assert.equal(chooseNextMissionIndex(MISSIONS, 0, STARTING_MASTERY, { ...STARTING_LEVELS, arrays: 3 }, exhausted, true), null);
});

test("eligible-bank exhaustion is explicit and earlier misses remain eligible recovery", () => {
  const ledger: ExposureLedger = Object.fromEntries(MISSIONS.map((mission) => [mission.id, { solved: true, missed: false }]));
  assert.equal(chooseNextMissionIndex(MISSIONS, 0, STARTING_MASTERY, STARTING_LEVELS, ledger), null);
  ledger["crater-build"] = { solved: false, missed: true };
  const next = chooseNextMissionIndex(MISSIONS, 0, STARTING_MASTERY, STARTING_LEVELS, ledger);
  assert.equal(MISSIONS[next!].id, "crater-build");
  assert.equal(recordEvidence(ledger, "crater-build", true).observation, "recovery");
  assert.equal(chooseNextMissionIndex([], 0, STARTING_MASTERY, STARTING_LEVELS), null);
});

test("all-independent exploration exhausts fresh content rather than looping", () => {
  let ledger: ExposureLedger = {};
  const mastery = { ...STARTING_MASTERY };
  const levels = { ...STARTING_LEVELS };
  let index: number | null = 0;
  const seen = new Set<string>();
  while (index !== null) {
    const mission: Mission = MISSIONS[index];
    assert.equal(seen.has(mission.id), false);
    seen.add(mission.id);
    ledger = recordEvidence(ledger, mission.id, true).ledger;
    mastery[mission.skill] = traceMastery(mastery[mission.skill], true);
    levels[mission.skill] = updateSkillLevel(levels[mission.skill], true, false, mission.level);
    index = chooseNextMissionIndex(MISSIONS, index, mastery, levels, ledger);
  }
  assert.equal(seen.size, MISSIONS.length);
});

test("rewards depend only on unique completed missions, not mistakes or assistance", () => {
  for (const supported of [false, true]) {
    let ledger: ExposureLedger = {};
    let completed = 0;
    if (supported) ledger = recordEvidence(ledger, "item", false).ledger;
    assert.equal(missionRewards(completed), 0);
    const credit = recordEvidence(ledger, "item", true, supported);
    completed += Number(credit.firstCompletion);
    ledger = credit.ledger;
    assert.equal(missionRewards(completed), 140);
    completed += Number(recordEvidence(ledger, "item", true).firstCompletion);
    assert.equal(missionRewards(completed), 140);
  }
  assert.equal(missionRewards(99), 700);
});
