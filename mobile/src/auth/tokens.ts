import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Use SecureStore on native, localStorage fallback on web
const isWeb = Platform.OS === "web";

const KEYS = {
  ACCESS_TOKEN: "eticket_access_token",
  REFRESH_TOKEN: "eticket_refresh_token",
  USER: "eticket_user",
} as const;

const webStorage = {
  getItem: (key: string) => {
    try {
      return typeof globalThis !== "undefined" && (globalThis as any).localStorage
        ? (globalThis as any).localStorage.getItem(key)
        : null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, val: string) => {
    try {
      if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.setItem(key, val);
      }
    } catch {}
  },
  removeItem: (key: string) => {
    try {
      if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
        (globalThis as any).localStorage.removeItem(key);
      }
    } catch {}
  },
};

export async function getAccessToken(): Promise<string | null> {
  if (isWeb) {
    return webStorage.getItem(KEYS.ACCESS_TOKEN);
  }
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  if (isWeb) {
    return webStorage.getItem(KEYS.REFRESH_TOKEN);
  }
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  if (isWeb) {
    webStorage.setItem(KEYS.ACCESS_TOKEN, access);
    webStorage.setItem(KEYS.REFRESH_TOKEN, refresh);
    return;
  }
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh);
}

export async function setUser(user: unknown): Promise<void> {
  const json = JSON.stringify(user);
  if (isWeb) {
    webStorage.setItem(KEYS.USER, json);
    return;
  }
  await SecureStore.setItemAsync(KEYS.USER, json);
}

export async function getUser<T>(): Promise<T | null> {
  let json: string | null;
  if (isWeb) {
    json = webStorage.getItem(KEYS.USER);
  } else {
    json = await SecureStore.getItemAsync(KEYS.USER);
  }
  return json ? JSON.parse(json) : null;
}

export async function clearTokens(): Promise<void> {
  if (isWeb) {
    webStorage.removeItem(KEYS.ACCESS_TOKEN);
    webStorage.removeItem(KEYS.REFRESH_TOKEN);
    webStorage.removeItem(KEYS.USER);
    return;
  }
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.USER);
}
