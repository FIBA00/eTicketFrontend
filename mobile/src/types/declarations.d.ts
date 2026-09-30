declare module "@expo/vector-icons" {
  import React from "react";
  export const Ionicons: React.ComponentType<{
    name: string;
    size?: number;
    color?: string;
    style?: any;
  }>;
}

declare module "expo-constants" {
  const Constants: {
    expoConfig?: {
      extra?: {
        apiUrl?: string;
        [key: string]: any;
      };
      [key: string]: any;
    };
    [key: string]: any;
  };
  export default Constants;
}
