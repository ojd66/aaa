import { beforeEach, describe, expect, it, vi } from "vitest";

const postFormCard = vi.fn();
const webhookHandler = vi.fn(() => new Response("ok", { status: 200 }));

const isSubmissionResponse = (
  value: unknown
): value is { submissionId: string } =>
  typeof value === "object" &&
  value !== null &&
  "submissionId" in value &&
  typeof (value as { submissionId: unknown }).submissionId === "string";

vi.mock("../src/bot.js", () => ({
  bot: {
    webhooks: {
      slack: webhookHandler,
    },
  },
  postFormCard,
}));

describe("app routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("crypto", { randomUUID: vi.fn(() => "uuid-123") });
  });

  it("accepts a form submission", async () => {
    const mod = await import("../src/index.js");
    const app = mod.default;

    const response = await app.fetch(
      new Request("http://localhost/api/form", {
        body: JSON.stringify({ name: "Ada" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );

    expect(postFormCard).toHaveBeenCalledWith({ name: "Ada" }, "uuid-123");
    expect(await response.json()).toEqual({
      status: "received",
      submissionId: "uuid-123",
    });
  });

  it("routes webhooks and reports unknown platforms", async () => {
    const mod = await import("../src/index.js");
    const app = mod.default;

    const known = await app.fetch(
      new Request("http://localhost/api/webhooks/slack", { method: "POST" })
    );
    const unknown = await app.fetch(
      new Request("http://localhost/api/webhooks/unknown", { method: "POST" })
    );

    expect(webhookHandler).toHaveBeenCalledWith(expect.any(Request));
    expect(known.status).toBe(200);
    expect(await unknown.json()).toEqual({
      error: "Unknown platform: unknown",
    });
    expect(unknown.status).toBe(404);
  });

  it("rejects unsupported methods on the form endpoint", async () => {
    const mod = await import("../src/index.js");
    const app = mod.default;

    const response = await app.fetch(
      new Request("http://localhost/api/form", { method: "GET" })
    );

    expect(response.status).toBe(404);
  });

  it("returns a submission id that looks like a uuid", async () => {
    const mod = await import("../src/index.js");
    const app = mod.default;

    const response = await app.fetch(
      new Request("http://localhost/api/form", {
        body: JSON.stringify({ company: "Acme" }),
        headers: { "content-type": "application/json" },
        method: "POST",
      })
    );

    const body: unknown = await response.json();
    if (!isSubmissionResponse(body)) {
      throw new Error("Expected submission response");
    }
    expect(body.submissionId).toBe("uuid-123");
    expect(typeof body.submissionId).toBe("string");
  });

  it("forwards the raw request object to the webhook handler", async () => {
    const mod = await import("../src/index.js");
    const app = mod.default;
    const request = new Request("http://localhost/api/webhooks/slack", {
      headers: { "x-test": "1" },
      method: "POST",
    });

    await app.fetch(request);

    expect(webhookHandler).toHaveBeenCalledWith(request);
  });
});
