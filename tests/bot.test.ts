import { beforeEach, describe, expect, it, vi } from "vitest";

const forwardToEmail = vi.fn();
const forwardToEndpoint = vi.fn();
const deleteSubmission = vi.fn();
const getSubmission = vi.fn();
const setSubmission = vi.fn();
const editSubmissionModal = vi.fn(() => "edit-modal");
const forwardedCard = vi.fn(() => "forwarded-card");
const newSubmissionCard = vi.fn(() => "new-card");
const spamCard = vi.fn(() => "spam-card");
const editMessage = vi.fn();
const post = vi.fn();
const channel = vi.fn(() => ({ post }));
const getAdapter = vi.fn(() => ({ editMessage }));
const onAction = vi.fn();
const onModalSubmit = vi.fn();
const slackAdapter = { name: "slack-adapter" };

interface BotActionEvent {
  actionId?: string;
  messageId?: string;
  openModal?: (modal: unknown) => Promise<void>;
  thread?: { id?: string };
  user?: { fullName: string };
  value?: string;
}

interface BotModalSubmitEvent {
  privateMetadata?: string;
  relatedMessage?: { edit: ReturnType<typeof vi.fn> };
  user: { fullName: string };
  values: Record<string, string>;
}

let actionHandler: (event: BotActionEvent) => Promise<void>;
let modalSubmitHandler: (event: BotModalSubmitEvent) => Promise<unknown>;

vi.mock("@chat-adapter/slack", () => ({
  createSlackAdapter: vi.fn(() => slackAdapter),
}));

vi.mock("../src/lib/cards.js", () => ({
  editSubmissionModal,
  forwardedCard,
  newSubmissionCard,
  spamCard,
}));

vi.mock("../src/lib/email.js", () => ({
  forwardToEmail,
}));

vi.mock("../src/lib/endpoint.js", () => ({
  forwardToEndpoint,
}));

vi.mock("../src/lib/submissions.js", () => ({
  deleteSubmission,
  getSubmission,
  setSubmission,
  state: { mocked: true },
}));

vi.mock("chat", () => ({
  Chat: function MockChat(this: {
    channel: typeof channel;
    getAdapter: typeof getAdapter;
    onAction: (
      ids: string[],
      handler: (event: BotActionEvent) => Promise<void>
    ) => void;
    onModalSubmit: (
      callbackId: string,
      handler: (event: BotModalSubmitEvent) => Promise<unknown>
    ) => void;
    webhooks: Record<string, unknown>;
  }) {
    this.channel = channel;
    this.getAdapter = getAdapter;
    this.webhooks = {};
    this.onAction = (ids, handler) => {
      actionHandler = handler;
      onAction(ids, handler);
    };
    this.onModalSubmit = (callbackId, handler) => {
      modalSubmitHandler = handler;
      onModalSubmit(callbackId, handler);
    };
  },
}));

describe("bot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.SLACK_CHANNEL_ID = "C123";
  });

  it("posts a submission card after saving state", async () => {
    const { bot, postFormCard } = await import("../src/bot.js");

    expect(bot).toBeDefined();

    await postFormCard({ name: "Ada" }, "sub_1");

    expect(setSubmission).toHaveBeenCalledWith("sub_1", { name: "Ada" });
    expect(channel).toHaveBeenCalledWith("slack:C123");
    expect(newSubmissionCard).toHaveBeenCalledWith({ name: "Ada" }, "sub_1");
    expect(post).toHaveBeenCalledWith("new-card");
  });

  it("forwards and marks spam through the registered action handler", async () => {
    await import("../src/bot.js");

    getSubmission.mockResolvedValueOnce({ name: "Ada" }).mockResolvedValueOnce({
      name: "Ada",
    });

    await actionHandler({
      actionId: "forward",
      messageId: "m1",
      thread: { id: "t1" },
      user: { fullName: "Pat" },
      value: "sub_1",
    });

    await actionHandler({
      actionId: "spam",
      messageId: "m2",
      thread: { id: "t2" },
      user: { fullName: "Pat" },
      value: "sub_2",
    });

    expect(forwardToEmail).toHaveBeenCalledWith({ name: "Ada" });
    expect(forwardToEndpoint).toHaveBeenCalledWith({ name: "Ada" });
    expect(forwardedCard).toHaveBeenCalledWith({ name: "Ada" }, "Pat");
    expect(spamCard).toHaveBeenCalledWith({ name: "Ada" }, "Pat");
    expect(editMessage).toHaveBeenCalledWith("t1", "m1", "forwarded-card");
    expect(editMessage).toHaveBeenCalledWith("t2", "m2", "spam-card");
    expect(deleteSubmission).toHaveBeenCalledWith("sub_1");
    expect(deleteSubmission).toHaveBeenCalledWith("sub_2");
  });

  it("ignores invalid action events and missing submissions", async () => {
    await import("../src/bot.js");

    await actionHandler({
      actionId: "forward",
      thread: { id: "t1" },
      value: "",
    });
    await actionHandler({
      actionId: "forward",
      thread: { id: "t1" },
      value: "sub_missing",
    });
    await actionHandler({ actionId: "spam", thread: { id: "t2" }, value: "" });
    await actionHandler({
      actionId: "spam",
      thread: { id: "t2" },
      value: "sub_missing",
    });

    expect(forwardToEmail).not.toHaveBeenCalled();
    expect(editMessage).not.toHaveBeenCalled();
    expect(deleteSubmission).not.toHaveBeenCalled();
    expect(getSubmission).toHaveBeenCalledTimes(2);
  });

  it("ignores events that are missing the thread object", async () => {
    await import("../src/bot.js");

    await actionHandler({ actionId: "forward", value: "sub_1" });
    await actionHandler({ actionId: "spam", value: "sub_2" });

    expect(getSubmission).not.toHaveBeenCalled();
    expect(getAdapter).not.toHaveBeenCalled();
    expect(forwardToEmail).not.toHaveBeenCalled();
  });

  it("does not attempt to edit when the thread id is missing", async () => {
    await import("../src/bot.js");

    getSubmission.mockResolvedValueOnce({ name: "Ada" });

    await actionHandler({
      actionId: "forward",
      messageId: "m1",
      thread: {},
      user: { fullName: "Pat" },
      value: "sub_1",
    });

    expect(getSubmission).toHaveBeenCalledWith("sub_1");
    expect(getAdapter).toHaveBeenCalledWith("slack");
    expect(editMessage).toHaveBeenCalledWith(undefined, "m1", "forwarded-card");
  });

  it("does not attempt to edit when the message id is missing", async () => {
    await import("../src/bot.js");

    getSubmission.mockResolvedValueOnce({ name: "Ada" });

    await actionHandler({
      actionId: "spam",
      thread: { id: "t2" },
      user: { fullName: "Pat" },
      value: "sub_2",
    });

    expect(getSubmission).toHaveBeenCalledWith("sub_2");
    expect(getAdapter).toHaveBeenCalledWith("slack");
    expect(editMessage).toHaveBeenCalledWith("t2", undefined, "spam-card");
  });

  it("opens the edit modal when the edit action is triggered", async () => {
    await import("../src/bot.js");

    getSubmission.mockResolvedValueOnce({ name: "Ada" });
    const openModal = vi.fn();

    await actionHandler({
      actionId: "edit",
      openModal,
      thread: { id: "t1" },
      user: { fullName: "Pat" },
      value: "sub_1",
    });

    expect(editSubmissionModal).toHaveBeenCalledWith({ name: "Ada" }, "sub_1");
    expect(openModal).toHaveBeenCalledWith("edit-modal");
    expect(forwardToEmail).not.toHaveBeenCalled();
  });

  it("forwards the edited submission on modal submit", async () => {
    await import("../src/bot.js");

    const edit = vi.fn();
    const result = await modalSubmitHandler({
      privateMetadata: "sub_1",
      relatedMessage: { edit },
      user: { fullName: "Pat" },
      values: { name: "Ada (edited)" },
    });

    expect(forwardToEmail).toHaveBeenCalledWith({ name: "Ada (edited)" });
    expect(forwardToEndpoint).toHaveBeenCalledWith({ name: "Ada (edited)" });
    expect(edit).toHaveBeenCalledWith("forwarded-card");
    expect(forwardedCard).toHaveBeenCalledWith({ name: "Ada (edited)" }, "Pat");
    expect(deleteSubmission).toHaveBeenCalledWith("sub_1");
    expect(result).toBeUndefined();
  });

  it("falls back to empty submissionId when privateMetadata is undefined", async () => {
    await import("../src/bot.js");

    const edit = vi.fn();
    await modalSubmitHandler({
      privateMetadata: undefined,
      relatedMessage: { edit },
      user: { fullName: "Pat" },
      values: { name: "Ada" },
    });

    expect(deleteSubmission).toHaveBeenCalledWith("");
  });
});
