import {
  buildVerifiedTutorPlan,
  mergeModelPlan,
  parseCopilotInput,
  validateModelPlan,
  type TutorPlan,
} from "../app/copilot.ts";
import { MISSIONS } from "../app/missions.ts";

export interface CopilotEnv {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const MAX_BODY_BYTES = 4096;
const REQUESTS_PER_MINUTE = 6;
const requestBuckets = new Map<string, { startedAt: number; count: number }>();

const MODEL_PLAN_SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string" },
    rationale: { type: "string" },
    noticePrompt: { type: "string" },
    representPrompt: { type: "string" },
    fadePrompt: { type: "string" },
    tutorLookFor: { type: "string" },
  },
  required: ["headline", "rationale", "noticePrompt", "representPrompt", "fadePrompt", "tutorLookFor"],
  additionalProperties: false,
} as const;

function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) {
    const hostname = new URL(request.url).hostname;
    return hostname === "localhost" || hostname === "127.0.0.1";
  }

  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

function hasRateCapacity(request: Request) {
  const key = request.headers.get("cf-connecting-ip") ?? "local-preview";
  const now = Date.now();
  if (requestBuckets.size > 1_000) {
    for (const [bucketKey, bucket] of requestBuckets) {
      if (now - bucket.startedAt >= 60_000) requestBuckets.delete(bucketKey);
    }
    if (requestBuckets.size > 1_000) requestBuckets.clear();
  }
  const current = requestBuckets.get(key);
  if (!current || now - current.startedAt >= 60_000) {
    requestBuckets.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= REQUESTS_PER_MINUTE) return false;
  current.count += 1;
  return true;
}

function extractOutputText(value: unknown) {
  if (typeof value !== "object" || value === null || !("output" in value) || !Array.isArray(value.output)) return null;

  for (const item of value.output) {
    if (typeof item !== "object" || item === null || !("content" in item) || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (typeof content === "object" && content !== null && content.type === "output_text" && typeof content.text === "string") {
        return content.text;
      }
    }
  }

  return null;
}

async function requestModelPlan(
  fallback: TutorPlan,
  apiKey: string,
  model: string,
  fetcher: Fetcher,
) {
  const current = MISSIONS.find((mission) => mission.id === fallback.recommendedMissionId);
  if (!current) return null;

  const response = await fetcher("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 420,
      instructions: [
        "You are ORBIT Tutor Copilot, an elementary-math instructional planning assistant.",
        "Write a concise, warm three-move Socratic plan for a human tutor.",
        "Treat the learning signal as a hypothesis, never a diagnosis.",
        "Do not state, spell, imply, or calculate an answer. Do not introduce any new numbers.",
        "The application supplies the only learner-facing math, which is authored and automatically tested.",
        "Return plain text fields without markdown.",
      ].join(" "),
      input: JSON.stringify({
        skill: current.skillLabel,
        representationLevel: current.levelLabel,
        rationaleFromVerifiedEngine: fallback.rationale,
        noticeDraft: fallback.noticePrompt,
        representationDraft: fallback.representPrompt,
        fadeDraft: fallback.fadePrompt,
        tutorLookForDraft: fallback.tutorLookFor,
      }),
      text: {
        format: {
          type: "json_schema",
          name: "orbit_tutor_plan",
          strict: true,
          schema: MODEL_PLAN_SCHEMA,
        },
      },
    }),
    signal: AbortSignal.timeout(9_000),
  });

  if (!response.ok) return null;
  const outputText = extractOutputText(await response.json());
  if (!outputText) return null;

  try {
    return validateModelPlan(JSON.parse(outputText));
  } catch {
    return null;
  }
}

export async function handleCopilotRequest(
  request: Request,
  env: CopilotEnv,
  fetcher: Fetcher = fetch,
): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }
  if (!isSameOrigin(request)) {
    return jsonResponse({ error: "Cross-origin request blocked" }, 403);
  }
  if (!hasRateCapacity(request)) {
    return jsonResponse({ error: "Please wait before creating another plan" }, 429);
  }
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return jsonResponse({ error: "Content type must be application/json" }, 415);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Request is too large" }, 413);
  }

  // Enforce the cap while streaming, including requests without Content-Length.
  const reader = request.body?.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    if (reader) {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BODY_BYTES) {
          await reader.cancel();
          return jsonResponse({ error: "Request is too large" }, 413);
        }
        chunks.push(value);
      }
    }
  } catch {
    return jsonResponse({ error: "Could not read request" }, 400);
  } finally {
    reader?.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  const body = new TextDecoder().decode(bytes);

  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return jsonResponse({ error: "Invalid JSON" }, 400);
  }

  const input = parseCopilotInput(parsed);
  if (!input) return jsonResponse({ error: "Invalid learning evidence" }, 400);

  const fallback = buildVerifiedTutorPlan(input);
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return jsonResponse(fallback);

  const model = env.OPENAI_MODEL?.trim() || "gpt-6-astra";
  try {
    const modelPlan = await requestModelPlan(fallback, apiKey, model, fetcher);
    return jsonResponse(modelPlan ? mergeModelPlan(fallback, modelPlan, model) : fallback);
  } catch {
    return jsonResponse(fallback);
  }
}
