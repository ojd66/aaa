import {
  Actions,
  Button,
  Card,
  CardText,
  Divider,
  Field,
  Fields,
  Modal,
  TextInput,
} from "chat";

const buildFields = (formData: Record<string, unknown>) =>
  Object.entries(formData).map(([key, value]) =>
    Field({ label: key, value: String(value) })
  );

export const newSubmissionCard = (
  formData: Record<string, unknown>,
  submissionId: string
) =>
  Card({
    children: [
      Fields(buildFields(formData)),
      Divider(),
      Actions([
        Button({
          id: "forward",
          label: "Forward Submission",
          style: "primary",
          value: submissionId,
        }),
        Button({
          id: "edit",
          label: "Edit & Forward",
          style: "primary",
          value: submissionId,
        }),
      ]),
      Actions([
        Button({
          id: "spam",
          label: "Mark as Spam",
          style: "danger",
          value: submissionId,
        }),
      ]),
    ],
    title: "New Form Submission",
  });

export const forwardedCard = (
  formData: Record<string, unknown>,
  forwardedBy: string
) =>
  Card({
    children: [
      Fields(buildFields(formData)),
      Divider(),
      CardText(`Forwarded to ${process.env.FORWARD_EMAIL} by ${forwardedBy}`, {
        style: "bold",
      }),
    ],
    title: "Form Submission",
  });

export const spamCard = (formData: Record<string, unknown>, markedBy: string) =>
  Card({
    children: [
      Fields(buildFields(formData)),
      Divider(),
      CardText(`Marked as spam by ${markedBy}`),
    ],
    title: "Form Submission",
  });

export const editSubmissionModal = (
  formData: Record<string, unknown>,
  submissionId: string
) =>
  Modal({
    callbackId: "edit_submission",
    children: Object.entries(formData).map(([key, value]) =>
      TextInput({ id: key, initialValue: String(value), label: key })
    ),
    privateMetadata: submissionId,
    submitLabel: "Forward",
    title: "Edit Submission",
  });
