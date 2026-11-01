import { Hono } from "hono";
import { cors } from "hono/cors";

import { bot, postFormCard } from "./bot.js";

const app = new Hono();

app.use("/api/form", cors());

app.post("/api/form", (c) =>
  c.req.json().then(async (formData: Record<string, unknown>) => {
    const submissionId = crypto.randomUUID();

    await Promise.resolve(postFormCard(formData, submissionId));
    return c.json({ status: "received", submissionId });
  })
);

app.post("/api/webhooks/:platform", (c) => {
  const platform = c.req.param("platform");

  if (platform !== "slack") {
    return c.json({ error: `Unknown platform: ${platform}` }, 404);
  }

  return bot.webhooks.slack(c.req.raw);
});

export default app;
