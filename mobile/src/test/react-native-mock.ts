export const Platform = {
  OS: "android",
  select: (obj: Record<string, unknown>) => obj.android ?? obj.default,
};

export const PermissionsAndroid = {
  PERMISSIONS: {
    BLUETOOTH_CONNECT: "android.permission.BLUETOOTH_CONNECT",
    BLUETOOTH_SCAN: "android.permission.BLUETOOTH_SCAN",
  },
  RESULTS: {
    GRANTED: "granted",
    DENIED: "denied",
  },
  requestMultiple: async () => ({
    "android.permission.BLUETOOTH_CONNECT": "granted",
    "android.permission.BLUETOOTH_SCAN": "granted",
  }),
};

export const NativeModules: Record<string, unknown> = {};

export default {
  Platform,
  PermissionsAndroid,
  NativeModules,
};
