import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchSpy = vi.fn();
vi.stubGlobal("fetch", fetchSpy);

describe("endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("posts form data to the configured endpoint", async () => {
    process.env.FORWARD_ENDPOINT = "https://example.com/hook";

    const { forwardToEndpoint } = await import("../src/lib/endpoint.js");

    await forwardToEndpoint({ name: "Ada" });

    expect(fetchSpy).toHaveBeenCalledWith("https://example.com/hook", {
      body: JSON.stringify({ name: "Ada" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });
  });

  it("does nothing when FORWARD_ENDPOINT is not set", async () => {
    delete process.env.FORWARD_ENDPOINT;

    const { forwardToEndpoint } = await import("../src/lib/endpoint.js");

    await forwardToEndpoint({ name: "Ada" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
