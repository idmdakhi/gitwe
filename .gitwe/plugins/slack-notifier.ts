import type { Plugin, PluginContext } from "gitwe";

export const slackNotifier: Plugin = {
  name: "slack-notifier",

  async onPostFinish(ctx: PluginContext, branchName: string) {
    const webhook = process.env.SLACK_WEBHOOK_URL;
    if (!webhook) return;

    await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `✅ Branch ${branchName} finished successfully!`,
      }),
    });
  },
};
