import assert from "node:assert/strict";
import test from "node:test";
import { recordEvidence, createRequestGate, type ExposureLedger } from "../app/evidence-policy.ts";
import { MISSIONS } from "../app/missions.ts";
import { TRANSFER_CHECKS, checkAnswer } from "../app/transfer-checks.ts";
import { bridgeIsReady, selectLearningBridge, toggleBridgeRow } from "../app/array-bridges.ts";

test("recovery, repeated clicks, and replay cannot create independent evidence or repeat rewards", () => {
  let ledger: ExposureLedger = {};
  const submit = (correct: boolean, assisted = false) => {
    const result = recordEvidence(ledger, "solar-array-connect", correct, assisted);
    ledger = result.ledger;
    return result;
  };
  assert.equal(submit(false).observation, "miss");
  assert.equal(submit(false).observation, "practice");
  const recovery = submit(true, true);
  assert.equal(recovery.observation, "recovery");
  assert.equal(recovery.firstCompletion, true);
  for (const correct of [true, false, true]) {
    const replay = submit(correct);
    assert.equal(replay.observation, "practice");
    assert.equal(replay.firstCompletion, false);
  }
});

test("returning to an unsolved question after a tutor switch does not erase earlier exposure", () => {
  const missed = recordEvidence({}, "mission", false);
  assert.equal(recordEvidence(missed.ledger, "mission", true, false).observation, "recovery");
  assert.equal(recordEvidence(missed.ledger, "different-question", true).observation, "independent");
  assert.equal(recordEvidence({}, "mission", true).observation, "independent");
});

test("changing level, evidence, or resetting rejects a late plan even if fetch ignores abort", async () => {
  const gate = createRequestGate();
  const older = gate.begin();
  const newer = gate.begin();
  assert.equal(older.signal.aborted, true);
  assert.equal(older.isCurrent(), false);
  assert.equal(newer.isCurrent(), true);
  const delayed = Promise.resolve().then(() => newer.isCurrent());
  gate.cancel();
  assert.equal(await delayed, false);
  assert.equal(newer.signal.aborted, true);
  assert.equal(gate.begin().isCurrent(), true);
});

test("every mission has an arithmetically valid separate new-number check", () => {
  assert.deepEqual(Object.keys(TRANSFER_CHECKS).sort(), MISSIONS.map((mission) => mission.id).sort());
  const expectedAnswers = [35, 65, 12, 36, 15, 48, 5, 26, 32, 134, 16, 35];
  for (const [index, mission] of MISSIONS.entries()) {
    const check = TRANSFER_CHECKS[mission.id];
    const answer = checkAnswer(check);
    assert.equal(answer, expectedAnswers[index], mission.id);
    assert.notEqual(answer, mission.answer, `${mission.id} must not reuse the practiced answer`);
    assert.equal(check.options.filter((value) => value === answer).length, 1);
    assert.equal(new Set(check.options).size, check.options.length);
    assert.equal(check.options.length, 3);
    assert.ok(check.options.every((value) => Number.isInteger(value) && value > 0));
    assert.notEqual(check.prompt, mission.prompt);
  }
});

test("three initial mistakes create different, arithmetically valid bridge tasks", () => {
  const mission = MISSIONS[0];
  const cases = [
    { value: 10, mode: "count", answer: 8, initial: [], target: [0, 1] },
    { value: 20, mode: "restore", answer: 4, initial: [0, 1, 2, 3, 4], target: [0, 1, 2, 3, 4, 5] },
    { value: 28, mode: "remove", answer: 4, initial: [0, 1, 2, 3, 4, 5, 6], target: [0, 1, 2, 3, 4, 5] },
  ];
  const titles = new Set<string>();
  for (const item of cases) {
    const bridge = selectLearningBridge(mission, item.value);
    assert.ok(bridge.activity);
    titles.add(bridge.title);
    assert.equal(bridge.activity.mode, item.mode);
    assert.equal(bridge.answer, item.answer);
    assert.deepEqual(bridge.activity.initialRows, item.initial);
    assert.deepEqual(bridge.activity.targetRows, item.target);
    assert.equal(bridgeIsReady(bridge.activity, item.initial), false);
    assert.equal(bridgeIsReady(bridge.activity, item.target), true);
    assert.equal(bridge.options.filter((option) => option === bridge.answer).length, 1);
  }
  assert.equal(titles.size, 3);
});

test("all nine array distractors require a valid reversible representation action", () => {
  let count = 0;
  for (const mission of MISSIONS.filter((item) => item.skill === "arrays")) {
    for (const wrong of mission.options.filter((option) => option !== mission.answer)) {
      count++;
      const bridge = selectLearningBridge(mission, wrong);
      const activity = bridge.activity;
      assert.ok(activity, `${mission.id}: ${wrong}`);
      assert.equal(bridge.options.length, 3);
      assert.equal(bridgeIsReady(activity, activity.initialRows), false);
      let rows = [...activity.initialRows];
      for (let row = 0; row < activity.rows; row++) {
        if (rows.includes(row) !== activity.targetRows.includes(row)) rows = toggleBridgeRow(activity, rows, row);
      }
      assert.equal(bridgeIsReady(activity, rows), true);
      const expected = activity.mode === "count" ? activity.rows * activity.columns
        : Math.abs(activity.initialRows.length - activity.targetRows.length) * activity.columns;
      assert.equal(bridge.answer, expected);
      const undone = toggleBridgeRow(activity, rows, 0);
      assert.equal(bridgeIsReady(activity, undone), false);
      assert.equal(bridgeIsReady(activity, toggleBridgeRow(activity, undone, 0)), true);
      assert.deepEqual(toggleBridgeRow(activity, rows, -1), rows);
      assert.deepEqual(toggleBridgeRow(activity, rows, activity.rows), rows);
      assert.equal(bridgeIsReady(activity, [...rows, rows[0]]), false);
    }
  }
  assert.equal(count, 9);
});

test("bridge selection cannot use an invalid or correct answer as a mistake", () => {
  for (const mission of MISSIONS) {
    for (const value of [null, mission.answer, -99]) {
      assert.equal(selectLearningBridge(mission, value).activity, undefined);
      assert.equal(selectLearningBridge(mission, value).prompt, mission.scaffold.prompt);
    }
  }
});

test("non-array distractors retain distinct provisional interpretations, not solution nudges", () => {
  for (const mission of MISSIONS.filter((item) => item.skill !== "arrays")) {
    const reasons = mission.options.filter((value) => value !== mission.answer).map((value) => selectLearningBridge(mission, value).reason);
    assert.equal(new Set(reasons).size, reasons.length, mission.id);
    assert.ok(reasons.every((reason) => reason !== mission.nudge));
  }
});

test("unit-fraction errors require composing any valid subset of requested shares", () => {
  for (const id of ["water-vault-connect", "habitat-transfer"]) {
    const mission = MISSIONS.find((item) => item.id === id)!;
    assert.equal(mission.visual.kind, "fraction");
    if (mission.visual.kind !== "fraction") continue;
    const { total, denominator, numerator } = mission.visual;
    const bridge = selectLearningBridge(mission, total / denominator);
    const activity = bridge.activity!;
    assert.equal(activity.mode, "compose");
    assert.equal(activity.rows * activity.columns, total);
    assert.equal(bridge.answer, total / denominator * numerator);
    assert.equal(new Set(bridge.options).size, 3);
    for (let mask = 0; mask < 2 ** denominator; mask++) {
      const selected = Array.from({ length: denominator }, (_, i) => i).filter((i) => mask & 2 ** i);
      assert.equal(bridgeIsReady(activity, selected), selected.length === numerator);
    }
    const valid = Array.from({ length: numerator }, (_, i) => i);
    assert.equal(bridgeIsReady(activity, valid), true);
    assert.equal(bridgeIsReady(activity, toggleBridgeRow(activity, valid, 0)), false);
    assert.equal(bridgeIsReady(activity, [...valid.slice(1), denominator]), false);
    assert.equal(bridgeIsReady(activity, [...valid.slice(1), valid[1]]), false);
    const ledger = recordEvidence({}, id, false).ledger;
    assert.equal(recordEvidence(ledger, id, true, true).observation, "recovery");
    assert.equal(selectLearningBridge(mission, mission.options.find((value) => value !== mission.answer && value !== total / denominator)!).activity, undefined);
  }
});
