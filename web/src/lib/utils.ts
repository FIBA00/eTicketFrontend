import { useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getQueue } from "./offline-queue";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const AUTO_SYNC_KEY = "transit-eticket-auto-sync";
export const STATION_NAME = "Addis Ababa Central";
export const STATION_CODE = "ST-AA";

export function isAutoSyncEnabled() {
  return (
    typeof window === "undefined" ||
    window.localStorage.getItem(AUTO_SYNC_KEY) !== "false"
  );
}

export function currency(value: number | undefined | null) {
  return `ETB ${(value ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function shortDate(date: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "The station service could not be reached.";
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

export function useQueueCount() {
  const [count, setCount] = useState(() =>
    typeof window === "undefined" ? 0 : getQueue().length,
  );
  useEffect(() => {
    const update = () => setCount(getQueue().length);
    window.addEventListener("storage", update);
    window.addEventListener("online", update);
    const interval = setInterval(update, 2000);
    return () => {
      window.removeEventListener("storage", update);
      window.removeEventListener("online", update);
      clearInterval(interval);
    };
  }, []);
  return count;
}
