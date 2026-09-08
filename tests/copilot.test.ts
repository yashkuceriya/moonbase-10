import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVerifiedTutorPlan,
  chooseCopilotMission,
  parseCopilotInput,
  validateModelPlan,
  type CopilotInput,
} from "../app/copilot.ts";
import { MISSIONS } from "../app/missions.ts";
import { handleCopilotRequest } from "../server/orbit-copilot.ts";

const INPUT: CopilotInput = {
  missionId: "solar-array-connect",
  targetLevel: 3,
  mastery: 71,
  latestSignal: "The final equal group was dropped.",
  independentWins: 0,
  scaffoldedWins: 1,
  nearMisses: 1,
};

function request(body: unknown, ip: string, origin = "https://moonbase.test") {
  return new Request("https://moonbase.test/api/orbit-plan", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "cf-connecting-ip": ip,
      origin,
    },
    body: JSON.stringify(body),
  });
}

test("copilot input accepts bounded evidence and rejects invented mission identifiers", () => {
  assert.deepEqual(parseCopilotInput(INPUT), INPUT);
  assert.equal(parseCopilotInput({ ...INPUT, missionId: "invented" }), null);
  assert.equal(parseCopilotInput({ ...INPUT, mastery: 101 }), null);
  assert.equal(parseCopilotInput({ ...INPUT, targetLevel: 4 }), null);
});

test("copilot selects a different authored mission at the tutor-requested level", () => {
  const current = MISSIONS.find((mission) => mission.id === INPUT.missionId)!;
  const selected = chooseCopilotMission(current, 3);

  assert.equal(selected.id, "comms-transfer");
  assert.equal(selected.level, 3);
  assert.notEqual(selected.id, current.id);
  assert.equal(chooseCopilotMission(current, 2).id, current.id);
});

test("verified plan is actionable and keeps the learner-facing answer out of the coaching copy", () => {
  const plan = buildVerifiedTutorPlan(INPUT);
  const coachingCopy = [plan.headline, plan.noticePrompt, plan.representPrompt, plan.fadePrompt, plan.tutorLookFor].join(" ");

  assert.equal(plan.source, "verified-engine");
  assert.equal(plan.recommendedMissionId, "comms-transfer");
  assert.doesNotMatch(coachingCopy, /\b24\b/);
  assert.deepEqual(plan.safety, {
    mathSource: "authored-and-tested",
    answerWithheld: true,
    storedByMoonbase: false,
  });
});

test("verified prompts stay answer-independent for every authored mission", () => {
  for (const mission of MISSIONS) {
    const plan = buildVerifiedTutorPlan({ ...INPUT, missionId: mission.id });
    const reusablePrompts = [plan.noticePrompt, plan.representPrompt, plan.tutorLookFor].join(" ");
    assert.doesNotMatch(reusablePrompts, new RegExp(`\\b${mission.answer}\\b`), mission.id);
  }
});

test("model-plan validator rejects answer leakage and diagnostic language", () => {
  const valid = {
    headline: "Test the idea through a learner explanation",
    rationale: "The signal is provisional and needs conversational evidence.",
    noticePrompt: "Ask what each equal group represents.",
    representPrompt: "Invite the learner to point to every group.",
    fadePrompt: "Remove part of the picture after the strategy is explained.",
    tutorLookFor: "Listen for both the group size and number of groups.",
  };

  assert.deepEqual(validateModelPlan(valid), valid);
  assert.equal(validateModelPlan({ ...valid, fadePrompt: "The answer is 24." }), null);
  assert.equal(validateModelPlan({ ...valid, fadePrompt: "The answer is forty two." }), null);
  assert.equal(validateModelPlan({ ...valid, rationale: "This diagnoses a learner deficit." }), null);
});

test("API uses the verified engine when no OpenAI key is configured", async () => {
  const response = await handleCopilotRequest(request(INPUT, "198.51.100.1"), {});
  const plan = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(plan.source, "verified-engine");
  assert.equal(plan.recommendedMissionId, "comms-transfer");
});

test("API accepts a schema-shaped OpenAI plan while retaining verified math and mission selection", async () => {
  const modelPlan = {
    headline: "Help Nova explain the equal-group structure",
    rationale: "A verbal explanation can test the current learning hypothesis.",
    noticePrompt: "Ask what each row represents in the whole structure.",
    representPrompt: "Invite Nova to track each row with a gesture.",
    fadePrompt: "Hide part of the representation after Nova explains the strategy.",
    tutorLookFor: "Listen for coordination of group size and group count.",
  };
  const fakeFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    assert.equal(String(input), "https://api.openai.com/v1/responses");
    const body = JSON.parse(String(init?.body));
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.equal(body.text.format.name, "orbit_tutor_plan");
    assert.equal(body.input.includes("learnerFacingPrompt"), false);
    assert.doesNotMatch(String(init?.body), /OPENAI_API_KEY/);

    return Response.json({
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(modelPlan) }] }],
    });
  };

  const response = await handleCopilotRequest(
    request(INPUT, "198.51.100.2"),
    { OPENAI_API_KEY: "test-secret", OPENAI_MODEL: "test-model" },
    fakeFetch,
  );
  const plan = await response.json();

  assert.equal(plan.source, "openai");
  assert.equal(plan.model, "test-model");
  assert.equal(plan.noticePrompt, modelPlan.noticePrompt);
  assert.equal(plan.recommendedMissionId, "comms-transfer");
  assert.equal(plan.safety.mathSource, "authored-and-tested");
});

test("API falls back when model output introduces unverified arithmetic", async () => {
  const unsafeFetch = async () => Response.json({
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({
      headline: "Use 24 as the answer",
      rationale: "A conversational check is appropriate here.",
      noticePrompt: "Ask what each group represents.",
      representPrompt: "Point to every visible group.",
      fadePrompt: "Hide part of the representation.",
      tutorLookFor: "Listen for a complete strategy explanation.",
    }) }] }],
  });

  const response = await handleCopilotRequest(
    request(INPUT, "198.51.100.3"),
    { OPENAI_API_KEY: "test-secret" },
    unsafeFetch,
  );
  const plan = await response.json();

  assert.equal(plan.source, "verified-engine");
  assert.equal(plan.recommendedMissionId, "comms-transfer");
});

test("API blocks cross-origin requests before any model call", async () => {
  const response = await handleCopilotRequest(request(INPUT, "198.51.100.4", "https://attacker.test"), {});
  assert.equal(response.status, 403);
});

test("API requires a browser origin outside local development", async () => {
  const response = await handleCopilotRequest(new Request("https://moonbase.test/api/orbit-plan", {
    method: "POST",
    headers: { "content-type": "application/json", "cf-connecting-ip": "198.51.100.5" },
    body: JSON.stringify(INPUT),
  }), {});

  assert.equal(response.status, 403);
});
