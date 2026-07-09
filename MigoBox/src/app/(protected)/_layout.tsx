import { Redirect, Stack } from 'expo-router';

import { useUserContext } from '@/context/user-context';

export default function ProtectedLayout() {
  const { user } = useUserContext();

  if (!user) {
    return <Redirect href="/" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="add-friend" />
      <Stack.Screen name="chat-builder" />
      <Stack.Screen name="friend-profile" />
    </Stack>
  );
}
