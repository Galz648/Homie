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

  return {
    groupId: input.groupId,
    status: report.status,
    probe,
    report,
  };
}
