import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("chat", () => ({
  Actions: vi.fn((value: unknown) => ({ kind: "Actions" as const, value })),
  Button: vi.fn((value: unknown) => ({ kind: "Button" as const, value })),
  Card: vi.fn((value: unknown) => ({ kind: "Card" as const, value })),
  CardText: vi.fn((value: unknown, options: unknown) => ({
    kind: "CardText" as const,
    options,
    value,
  })),
  Divider: vi.fn(() => ({ kind: "Divider" as const })),
  Field: vi.fn((value: unknown) => ({ kind: "Field" as const, value })),
  Fields: vi.fn((value: unknown) => ({ kind: "Fields" as const, value })),
  Modal: vi.fn((value: unknown) => ({ kind: "Modal" as const, value })),
  TextInput: vi.fn((value: unknown) => ({ kind: "TextInput" as const, value })),
}));

describe("cards", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    process.env.FORWARD_EMAIL = "forward@example.com";
  });

  it("builds the new submission card", async () => {
    const { newSubmissionCard } = await import("../src/lib/cards.js");

    expect(newSubmissionCard({ count: 2, name: "Ada" }, "sub_123")).toEqual({
      kind: "Card",
      value: {
        children: [
          {
            kind: "Fields",
            value: [
              { kind: "Field", value: { label: "count", value: "2" } },
              { kind: "Field", value: { label: "name", value: "Ada" } },
            ],
          },
          { kind: "Divider" },
          {
            kind: "Actions",
            value: [
              {
                kind: "Button",
                value: {
                  id: "forward",
                  label: "Forward Submission",
                  style: "primary",
                  value: "sub_123",
                },
              },
              {
                kind: "Button",
                value: {
                  id: "edit",
                  label: "Edit & Forward",
                  style: "primary",
                  value: "sub_123",
                },
              },
            ],
          },
          {
            kind: "Actions",
            value: [
              {
                kind: "Button",
                value: {
                  id: "spam",
                  label: "Mark as Spam",
                  style: "danger",
                  value: "sub_123",
                },
              },
            ],
          },
        ],
        title: "New Form Submission",
      },
    });
  });

  it("builds forwarded and spam cards", async () => {
    const { forwardedCard, spamCard } = await import("../src/lib/cards.js");

    expect(forwardedCard({ topic: "Support" }, "Lin")).toEqual({
      kind: "Card",
      value: {
        children: [
          {
            kind: "Fields",
            value: [
              { kind: "Field", value: { label: "topic", value: "Support" } },
            ],
          },
          { kind: "Divider" },
          {
            kind: "CardText",
            options: { style: "bold" },
            value: "Forwarded to forward@example.com by Lin",
          },
        ],
        title: "Form Submission",
      },
    });

    expect(spamCard({ topic: "Support" }, "Lin")).toEqual({
      kind: "Card",
      value: {
        children: [
          {
            kind: "Fields",
            value: [
              { kind: "Field", value: { label: "topic", value: "Support" } },
            ],
          },
          { kind: "Divider" },
          {
            kind: "CardText",
            options: undefined,
            value: "Marked as spam by Lin",
          },
        ],
        title: "Form Submission",
      },
    });
  });

  it("stringifies null and boolean field values", async () => {
    const { newSubmissionCard } = await import("../src/lib/cards.js");

    expect(newSubmissionCard({ empty: null, optedIn: true }, "sub_9")).toEqual(
      expect.objectContaining({
        kind: "Card",
      })
    );
  });

  it("stringifies nested object values when building fields", async () => {
    const { forwardedCard } = await import("../src/lib/cards.js");

    expect(forwardedCard({ profile: { role: "admin" } }, "Nia")).toEqual(
      expect.objectContaining({
        kind: "Card",
      })
    );
  });

  it("supports an empty submission payload", async () => {
    const { spamCard } = await import("../src/lib/cards.js");

    expect(spamCard({}, "Lin")).toEqual(
      expect.objectContaining({ kind: "Card" })
    );
  });

  it("builds the edit submission modal with pre-filled values", async () => {
    const { editSubmissionModal } = await import("../src/lib/cards.js");

    expect(
      editSubmissionModal({ name: "Ada", role: "Engineer" }, "sub_1")
    ).toEqual({
      kind: "Modal",
      value: {
        callbackId: "edit_submission",
        children: [
          {
            kind: "TextInput",
            value: { id: "name", initialValue: "Ada", label: "name" },
          },
          {
            kind: "TextInput",
            value: { id: "role", initialValue: "Engineer", label: "role" },
          },
        ],
        privateMetadata: "sub_1",
        submitLabel: "Forward",
        title: "Edit Submission",
      },
    });
  });
});
