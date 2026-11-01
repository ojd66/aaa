import { createSlackAdapter } from "@chat-adapter/slack";
import type { ActionEvent } from "chat";
import { Chat } from "chat";

import {
  editSubmissionModal,
  forwardedCard,
  newSubmissionCard,
  spamCard,
} from "./lib/cards.js";
import { forwardToEmail } from "./lib/email.js";
import { forwardToEndpoint } from "./lib/endpoint.js";
import {
  deleteSubmission,
  getSubmission,
  setSubmission,
  state,
} from "./lib/submissions.js";

export const bot = new Chat({
  adapters: {
    slack: createSlackAdapter(),
  },
  state,
  userName: "form-bot",
});

export const postFormCard = async (
  formData: Record<string, unknown>,
  submissionId: string
) => {
  await setSubmission(submissionId, formData);

  const channel = bot.channel(`slack:${process.env.SLACK_CHANNEL_ID}`);
  await channel.post(newSubmissionCard(formData, submissionId));
};

const handleForward = async (
  event: ActionEvent,
  formData: Record<string, unknown>,
  submissionId: string,
  threadId: string
) => {
  const slack = bot.getAdapter("slack");

  await Promise.all([
    forwardToEmail(formData),
    forwardToEndpoint(formData),
    slack.editMessage(
      threadId,
      event.messageId,
      forwardedCard(formData, event.user.fullName)
    ),
    deleteSubmission(submissionId),
  ]);
};

const handleSpam = async (
  event: ActionEvent,
  formData: Record<string, unknown>,
  submissionId: string,
  threadId: string
) => {
  const slack = bot.getAdapter("slack");

  await Promise.all([
    slack.editMessage(
      threadId,
      event.messageId,
      spamCard(formData, event.user.fullName)
    ),
    deleteSubmission(submissionId),
  ]);
};

bot.onAction(["forward", "spam", "edit"], async (event) => {
  const submissionId = event.value;
  if (submissionId === undefined || submissionId === "" || !event.thread) {
    return;
  }

  const formData = await getSubmission(submissionId);
  if (!formData) {
    return;
  }

  if (event.actionId === "edit") {
    await event.openModal(editSubmissionModal(formData, submissionId));
  } else {
    const handler = event.actionId === "forward" ? handleForward : handleSpam;
    await handler(event, formData, submissionId, event.thread.id);
  }
});

bot.onModalSubmit("edit_submission", async (event): Promise<undefined> => {
  const submissionId = event.privateMetadata ?? "";

  await Promise.all([
    forwardToEmail(event.values),
    forwardToEndpoint(event.values),
    event.relatedMessage?.edit(
      forwardedCard(event.values, event.user.fullName)
    ),
    deleteSubmission(submissionId),
  ]);
});
