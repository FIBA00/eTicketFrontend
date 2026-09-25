import { useEffect, useState } from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import { getUser } from "@/auth/tokens";
import { registerBackgroundSync } from "@/sync/background";
import type { User } from "@/types";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    async function init() {
      // Check for existing session
      const savedUser = await getUser<User>();
      setUser(savedUser);

      // Register background sync
      await registerBackgroundSync();

      setIsReady(true);
    }
    init();
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // Redirect to login
      router.replace("/(auth)/login");
    } else if (user && inAuthGroup) {
      // Redirect to home
      router.replace("/(app)");
    }
  }, [isReady, user, segments]);

  if (!isReady) {
    return null; // Or splash screen
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <StatusBar style="auto" />
    </QueryClientProvider>
  );
}
