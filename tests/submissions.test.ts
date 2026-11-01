import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {
  connect: vi.fn(() => Promise.resolve()),
  delete: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
};

vi.mock("@chat-adapter/state-redis", () => ({
  createRedisState: vi.fn(() => state),
}));

describe("submissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads, writes, and deletes submissions with the expected ttl key", async () => {
    const {
      deleteSubmission,
      getSubmission,
      setSubmission,
      state: exportedState,
    } = await import("../src/lib/submissions.js");

    expect(exportedState).toBe(state);

    state.get.mockResolvedValueOnce({ name: "Ada" });

    await expect(getSubmission("sub_1")).resolves.toEqual({ name: "Ada" });
    await expect(
      setSubmission("sub_1", { name: "Ada" })
    ).resolves.toBeUndefined();
    await expect(deleteSubmission("sub_1")).resolves.toBeUndefined();

    expect(state.connect).toHaveBeenCalledTimes(1);
    expect(state.get).toHaveBeenCalledWith("submission:sub_1");
    expect(state.set).toHaveBeenCalledWith(
      "submission:sub_1",
      { name: "Ada" },
      7 * 24 * 60 * 60 * 1000
    );
    expect(state.delete).toHaveBeenCalledWith("submission:sub_1");
  });

  it("uses distinct keys for different submission ids", async () => {
    const { setSubmission } = await import("../src/lib/submissions.js");

    await setSubmission("sub_a", { name: "Ada" });
    await setSubmission("sub_b", { name: "Bea" });

    expect(state.set).toHaveBeenCalledWith(
      "submission:sub_a",
      { name: "Ada" },
      expect.any(Number)
    );
    expect(state.set).toHaveBeenCalledWith(
      "submission:sub_b",
      { name: "Bea" },
      expect.any(Number)
    );
  });
});
