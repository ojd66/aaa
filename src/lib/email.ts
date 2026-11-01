import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const validateEmailAddress = (email: string) => {
  if (!email || !EMAIL_REGEX.test(email)) {
    throw new Error(
      `Invalid email address: "${email}". Expected format: user@example.com`
    );
  }
};

const buildFrom = () => {
  const address = process.env.RESEND_FROM_ADDRESS ?? "";
  validateEmailAddress(address);
  const name = process.env.RESEND_FROM_NAME ?? "Formbot";
  return `${name} <${address}>`;
};

const buildHtml = (formData: Record<string, unknown>) => {
  const rows = Object.entries(formData)
    .map(
      ([key, value]) => `
      <tr>
        <td style="padding:12px 24px 12px 0;color:#6b7280;font-size:13px;white-space:nowrap;vertical-align:top;width:1px">${key}</td>
        <td style="padding:12px 0 12px 0;color:#111827;font-size:14px">${String(value)}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;padding:40px 16px">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden">
      <div style="padding:24px 24px 0">
        <h2 style="margin:0;font-size:16px;font-weight:600;color:#111827">New Form Submission</h2>
        <p style="margin:4px 0 0;font-size:13px;color:#9ca3af">A new submission was forwarded to you.</p>
      </div>
      <div style="padding:16px 0;margin:20px 24px 0;border-top:1px solid #f3f4f6">
        <table style="width:100%;border-collapse:collapse">${rows}</table>
      </div>
      <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #f3f4f6">
        <p style="margin:0;font-size:12px;color:#9ca3af">This email was sent automatically by Formbot.</p>
      </div>
    </div>
  </div>`;
};

export const forwardToEmail = (formData: Record<string, unknown>) =>
  resend.emails.send({
    from: buildFrom(),
    html: buildHtml(formData),
    subject: "New Form Submission",
    to: [process.env.FORWARD_EMAIL ?? ""],
  });
