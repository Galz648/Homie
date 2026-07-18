/**
 * Create or update Temporal Schedules for each enabled Facebook group.
 */
import {
  Client,
  Connection,
  ScheduleAlreadyRunning,
  ScheduleOverlapPolicy,
} from "@temporalio/client";
import { enabledGroups, loadSettings, type Settings } from "./config.js";
import {
  scrapeScheduleId,
  scrapeScheduleSpec,
  SCRAPE_SCHEDULE_TIMEZONE,
} from "./scrapeSchedule.js";

export async function ensureScrapeSchedules(
  settings: Settings = loadSettings(),
): Promise<void> {
  const connection = await Connection.connect({
    address: settings.temporalAddress,
  });
  const client = new Client({
    connection,
    namespace: settings.temporalNamespace,
  });

  const spec = scrapeScheduleSpec(SCRAPE_SCHEDULE_TIMEZONE);
  const groups = enabledGroups();

  for (const group of groups) {
    const scheduleId = scrapeScheduleId(group.id);
    const action = {
      type: "startWorkflow" as const,
      workflowType: "scrapeFacebookGroup",
      taskQueue: settings.taskQueue,
      workflowId: `fb-scrape-${group.id}`,
      args: [{ groupId: group.id, groupUrl: group.url }],
    };
    const policies = {
      overlap: ScheduleOverlapPolicy.SKIP,
      catchupWindow: "1 hour" as const,
    };

    try {
      await client.schedule.create({
        scheduleId,
        spec,
        action,
        policies,
      });
      console.log(
        `schedule created ${scheduleId} tz=${SCRAPE_SCHEDULE_TIMEZONE} group=${group.id}`,
      );
    } catch (err) {
      if (!(err instanceof ScheduleAlreadyRunning)) {
        throw err;
      }
      const handle = client.schedule.getHandle(scheduleId);
      await handle.update((prev) => ({
        ...prev,
        spec,
        action,
        policies,
      }));
      console.log(
        `schedule updated ${scheduleId} tz=${SCRAPE_SCHEDULE_TIMEZONE} group=${group.id}`,
      );
    }
  }

  await connection.close();
}
