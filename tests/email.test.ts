import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const isEmailPayload = (
  value: unknown
): value is { from?: string; html?: string; subject?: string; to?: string[] } =>
  typeof value === "object" && value !== null;

vi.mock("resend", () => ({
  Resend: function Resend() {
    return { emails: { send } };
  },
}));

describe("email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.unstubAllEnvs();
    process.env.RESEND_API_KEY = "test-key";
    process.env.RESEND_FROM_ADDRESS = "from@example.com";
    process.env.RESEND_FROM_NAME = "Formbot";
    process.env.FORWARD_EMAIL = "forward@example.com";
  });

  it("validates email addresses", async () => {
    const { validateEmailAddress } = await import("../src/lib/email.js");

    expect(() => {
      validateEmailAddress("user@example.com");
    }).not.toThrow();
    expect(() => {
      validateEmailAddress("  user@example.com  ");
    }).toThrow(
      'Invalid email address: "  user@example.com  ". Expected format: user@example.com'
    );
    expect(() => {
      validateEmailAddress("bad-address");
    }).toThrow(
      'Invalid email address: "bad-address". Expected format: user@example.com'
    );
    expect(() => {
      validateEmailAddress("");
    }).toThrow('Invalid email address: "". Expected format: user@example.com');
  });

  it("forwards a submission email", async () => {
    const { forwardToEmail } = await import("../src/lib/email.js");

    await forwardToEmail({ count: 2, name: "Ada" });

    const payload: unknown = send.mock.calls[0]?.[0];
    if (!isEmailPayload(payload)) {
      throw new Error("Expected email payload");
    }

    expect(payload.from).toBe("Formbot <from@example.com>");
    expect(payload.subject).toBe("New Form Submission");
    expect(payload.to).toEqual(["forward@example.com"]);
    expect(payload.html).toContain("New Form Submission");
  });

  it("uses the default sender name when none is configured", async () => {
    delete process.env.RESEND_FROM_NAME;

    const { forwardToEmail } = await import("../src/lib/email.js");

    await forwardToEmail({ name: "Ada" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Formbot <from@example.com>",
      })
    );
  });

  it("throws when the sender address is missing", async () => {
    delete process.env.RESEND_FROM_ADDRESS;

    const { forwardToEmail } = await import("../src/lib/email.js");

    expect(() => forwardToEmail({ name: "Ada" })).toThrow(
      'Invalid email address: "". Expected format: user@example.com'
    );
  });

  it("falls back to an empty recipient when none is configured", async () => {
    delete process.env.FORWARD_EMAIL;

    const { forwardToEmail } = await import("../src/lib/email.js");

    await forwardToEmail({ name: "Ada" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: [""],
      })
    );
  });

  it("uses the configured sender name when present", async () => {
    process.env.RESEND_FROM_NAME = "Team Inbox";

    const { forwardToEmail } = await import("../src/lib/email.js");

    await forwardToEmail({ name: "Ada" });

    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Team Inbox <from@example.com>",
      })
    );
  });

  it("formats forwarded HTML rows for multiple fields", async () => {
    const { forwardToEmail } = await import("../src/lib/email.js");

    await forwardToEmail({ active: false, name: "Ada", role: "Engineer" });

    const payload: unknown = send.mock.calls[0]?.[0];
    if (!isEmailPayload(payload)) {
      throw new Error("Expected email payload");
    }

    expect(payload.html).toContain('<td style="padding:12px 24px 12px 0');
    expect(payload.html).toContain('<td style="padding:12px 0 12px 0');
    expect(payload.html).toContain("Engineer");
    expect(payload.html).toContain("false");
    expect(payload.html).toContain("padding:40px 16px");
  });

  it("keeps special characters in the email body as text", async () => {
    const { forwardToEmail } = await import("../src/lib/email.js");

    await forwardToEmail({ note: "<script>alert(1)</script>" });

    const payload: unknown = send.mock.calls[0]?.[0];
    if (!isEmailPayload(payload)) {
      throw new Error("Expected email payload");
    }

    expect(payload.html).toContain("<script>alert(1)</script>");
  });

  it("accepts plus-addressed sender emails", async () => {
    process.env.RESEND_FROM_ADDRESS = "alerts+forms@example.com";

    const { forwardToEmail } = await import("../src/lib/email.js");

    await forwardToEmail({ name: "Ada" });

    const payload: unknown = send.mock.calls[0]?.[0];
    expect(payload).toEqual(
      expect.objectContaining({
        from: "Formbot <alerts+forms@example.com>",
      })
    );
  });
});
