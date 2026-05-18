import { Stack } from 'expo-router';
import MessageScreen from '@screens/chat/MessageScreen';

export default function ChatRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MessageScreen />
    </>
  );
}
