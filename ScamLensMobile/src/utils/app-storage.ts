import { Platform } from "react-native";
import SQLiteStorage from "expo-sqlite/kv-store";

const isBrowser = typeof window !== "undefined";

export const appStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return isBrowser ? window.localStorage.getItem(key) : null;
    }
    return SQLiteStorage.getItem(key);
  },

  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (isBrowser) window.localStorage.setItem(key, value);
      return;
    }
    await SQLiteStorage.setItem(key, value);
  },

  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (isBrowser) window.localStorage.removeItem(key);
      return;
    }
    await SQLiteStorage.removeItem(key);
  },
};
