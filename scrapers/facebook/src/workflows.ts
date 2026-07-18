/**
 * Workflow bundle — keep side-effect imports out of this file.
 * Activities are invoked by name string from the worker registration.
 */
import {
  condition,
  defineSignal,
  proxyActivities,
  setHandler,
  workflowInfo,
} from "@temporalio/workflow";
import type * as activities from "./activities.js";

const { probeFacebookAuth, scrapeFacebookGroupFeed } = proxyActivities<
  typeof activities
>({
  startToCloseTimeout: "5 minutes",
  retry: { maximumAttempts: 2 },
});

/**
 * Fire-and-forget Agent notify: await only HTTP accept (short timeout).
 * Agent extraction + Homie callback continue asynchronously outside Temporal.
 */
const { notifyListingAgentFireAndForget } = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  retry: { maximumAttempts: 2 },
});

export const cookiesRenewedSignal = defineSignal("cookies_renewed");

export type ScrapeGroupInput = {
  groupId: string;
  groupUrl: string;
};

/** One workflow run = one Facebook group (failure isolation). */
export async function scrapeFacebookGroup(
  input: ScrapeGroupInput,
): Promise<Record<string, unknown>> {
  let cookiesRenewed = false;
  setHandler(cookiesRenewedSignal, () => {
    cookiesRenewed = true;
  });

  const info = workflowInfo();
  let probe = await probeFacebookAuth({
    groupId: input.groupId,
    groupUrl: input.groupUrl,
    workflowId: info.workflowId,
  });

  if (probe.status !== "ok") {
    await condition(() => cookiesRenewed);
    cookiesRenewed = false;
    probe = await probeFacebookAuth({
      groupId: input.groupId,
      groupUrl: input.groupUrl,
      workflowId: info.workflowId,
    });
    if (probe.status !== "ok") {
      return {
        groupId: input.groupId,
        status: "auth",
        probe,
        note: "Still unauthorized after cookies_renewed",
      };
    }
  }

  const report = await scrapeFacebookGroupFeed({
    groupId: input.groupId,
    groupUrl: input.groupUrl,
    workflowId: info.workflowId,
  });

  // After successful scrape/upsert: FF notify CF Agent per new listing.
  // Temporal waits only for webhook HTTP accept (30s), not Agent work.
  let agentNotify: unknown[] = [];
  if (report.status === "ok" && report.postsNew > 0) {
    const listings = report.newListings ?? [];
    if (listings.length > 0) {
      agentNotify = await Promise.all(
        listings.map((listing) =>
          notifyListingAgentFireAndForget({
            text: listing.text,
            postId: listing.postId,
            url: listing.url,
            groupId: input.groupId,
          }),
        ),
      );
    } else {
      // Fallback when DB load of new rows failed: one batch envelope.
      agentNotify = [
        await notifyListingAgentFireAndForget({
          groupId: input.groupId,
          text: [
            `Facebook group scrape batch`,
            `groupId=${input.groupId}`,
            `groupUrl=${input.groupUrl}`,
            `postsNew=${report.postsNew}`,
            `postsSeen=${report.postsSeen}`,
            `stopReason=${report.stopReason}`,
          ].join("\n"),
        }),
      ];
    }
  }

  return {
    groupId: input.groupId,
    status: report.status,
    probe,
    report,
    agentNotify,
  };
}
