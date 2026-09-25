import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { syncNow, pullReferenceData } from "./engine";

const SYNC_TASK = "eticket-background-sync";

TaskManager.defineTask(SYNC_TASK, async () => {
  try {
    const result = await syncNow();
    await pullReferenceData();

    // Show notification if there are failures?
    // Would need expo-notifications

    return result.synced > 0
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData;
  } catch (err) {
    console.error("Background sync failed:", err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundSync(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (status !== BackgroundFetch.BackgroundFetchStatus.Available) {
    console.warn("Background fetch not available");
    return;
  }

  await BackgroundFetch.registerTaskAsync(SYNC_TASK, {
    minimumInterval: 15 * 60, // 15 minutes
    stopOnTerminate: false,
    startOnBoot: true,
  });
}

export async function unregisterBackgroundSync(): Promise<void> {
  await BackgroundFetch.unregisterTaskAsync(SYNC_TASK);
}
