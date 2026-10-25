import { appStorage } from './app-storage';

export const storage = {
  async setItem(key: string, value: string) {
    await appStorage.setItem(String(key), String(value));
  },

  async getItem(key: string) {
    return appStorage.getItem(String(key));
  },

  async removeItem(key: string) {
    await appStorage.removeItem(String(key));
  },
};
