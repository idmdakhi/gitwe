import type { Plugin } from "#gitwe/domain/ports/Plugin";
import type { PluginContext } from "#gitwe/domain/plugins/PluginContext";

export const slackNotifier: Plugin = {
  name: "slack-notifier",

  async onPostFinish(_ctx: PluginContext, branchName: string) {
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
