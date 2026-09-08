/** Cloudflare Worker entry point for Moonbase 10. */
import handler from "vinext/server/app-router-entry";
import { handleCopilotRequest, type CopilotEnv } from "../server/orbit-copilot";

interface Env extends CopilotEnv {
  ASSETS: {
    fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (new URL(request.url).pathname === "/api/orbit-plan") {
      return handleCopilotRequest(request, env);
    }
    return handler.fetch(request, env, ctx);
  },
};

export default worker;
