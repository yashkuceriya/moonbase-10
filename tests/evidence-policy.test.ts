import assert from "node:assert/strict";
import test from "node:test";
import { recordEvidence, createRequestGate, type ExposureLedger } from "../app/evidence-policy.ts";
import { MISSIONS } from "../app/missions.ts";
import { TRANSFER_CHECKS, checkAnswer } from "../app/transfer-checks.ts";

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
