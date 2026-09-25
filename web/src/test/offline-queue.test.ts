import { describe, it, expect, beforeEach } from "vitest";
import {
  getQueue,
  addToQueue,
  removeFromQueue,
  incrementRetry,
  clearQueue,
  generateMutationId,
} from "@/lib/offline-queue";

describe("Offline Queue", () => {
  beforeEach(() => {
    clearQueue();
    localStorage.clear();
  });

  it("starts with empty queue", () => {
    expect(getQueue()).toEqual([]);
  });

  it("adds mutation to queue", () => {
    const id = generateMutationId();
    addToQueue({
      id,
      table: "tickets",
      operation: "CREATE",
      payload: { test: "data" },
      baseVersion: 0,
    });

    const queue = getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].id).toBe(id);
    expect(queue[0].retryCount).toBe(0);
  });

  it("removes mutation from queue", () => {
    const id = generateMutationId();
    addToQueue({
      id,
      table: "tickets",
      operation: "CREATE",
      payload: {},
      baseVersion: 0,
    });

    removeFromQueue(id);
    expect(getQueue()).toEqual([]);
  });

  it("increments retry count", () => {
    const id = generateMutationId();
    addToQueue({
      id,
      table: "tickets",
      operation: "CREATE",
      payload: {},
      baseVersion: 0,
    });

    const retries = incrementRetry(id, "Network error");
    expect(retries).toBe(1);

    const queue = getQueue();
    expect(queue[0].retryCount).toBe(1);
    expect(queue[0].lastError).toBe("Network error");
  });

  it("generates unique mutation IDs", () => {
    const id1 = generateMutationId();
    const id2 = generateMutationId();
    expect(id1).not.toBe(id2);
  });
});
