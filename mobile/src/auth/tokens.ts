import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// Use SecureStore on native, localStorage fallback on web
const isWeb = Platform.OS === "web";

const KEYS = {
  ACCESS_TOKEN: "eticket_access_token",
  REFRESH_TOKEN: "eticket_refresh_token",
  USER: "eticket_user",
} as const;

export async function getAccessToken(): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(KEYS.ACCESS_TOKEN);
  }
  return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  if (isWeb) {
    return localStorage.getItem(KEYS.REFRESH_TOKEN);
  }
  return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
}

export async function setTokens(access: string, refresh: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(KEYS.ACCESS_TOKEN, access);
    localStorage.setItem(KEYS.REFRESH_TOKEN, refresh);
    return;
  }
  await SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, access);
  await SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refresh);
}

export async function setUser(user: unknown): Promise<void> {
  const json = JSON.stringify(user);
  if (isWeb) {
    localStorage.setItem(KEYS.USER, json);
    return;
  }
  await SecureStore.setItemAsync(KEYS.USER, json);
}

export async function getUser<T>(): Promise<T | null> {
  let json: string | null;
  if (isWeb) {
    json = localStorage.getItem(KEYS.USER);
  } else {
    json = await SecureStore.getItemAsync(KEYS.USER);
  }
  return json ? JSON.parse(json) : null;
}

export async function clearTokens(): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(KEYS.ACCESS_TOKEN);
    localStorage.removeItem(KEYS.REFRESH_TOKEN);
    localStorage.removeItem(KEYS.USER);
    return;
  }
  await SecureStore.deleteItemAsync(KEYS.ACCESS_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.REFRESH_TOKEN);
  await SecureStore.deleteItemAsync(KEYS.USER);
}
