import { Stack } from 'expo-router';
import ChatInfoScreen from '@screens/chat/ChatInfoScreen';

export default function ChatInfoRoute() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ChatInfoScreen />
    </>
  );
}
