
import { requireNativeModule } from 'expo-modules-core';

export type SecureCredentials = {
  accessToken: string;
  secretKey: string;
};

type MyModuleType = {
  getCredentials(): Promise<SecureCredentials | null>;
  saveCredentials(
    accessToken: string,
    secretKey: string
  ): Promise<boolean>;
  clearCredentials(): Promise<boolean>;
};

export default requireNativeModule<MyModuleType>('MyModule');
