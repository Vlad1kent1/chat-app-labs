import { useEffect, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, ListRenderItem, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';

import { getMessages, sendMessage, updateMessage, deleteMessage } from '@services/modules/message.service';
import { getChat, checkDirectChat } from '@services/modules/chat.service';
import { connectSocket, subscribeMessageCreated } from '@services/modules/socket.service';
import type { Chat, Message } from '@types';
import { useAppSelector } from '@store/hooks';

// TextInput (mapped to Input)
import { Input, InputField } from '@/components/ui/input';

// ─── Налаштування обробника сповіщень ───────────────────────────────────────
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});

// ─── Запит дозволу + відправка локального push ───────────────────────────────
async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function sendLocalPushNotification(senderName: string, messageContent: string): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `📨 ${senderName}`,
      body: messageContent,
      sound: true,
    },
    trigger: null, // показати одразу
  });
}

// ─── Утиліта форматування часу ───────────────────────────────────────────────
const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

// ─── Компонент ───────────────────────────────────────────────────────────────
export default function MessageScreen() {
  const router = useRouter();
  const authUser = useAppSelector((state) => state.auth.user);
  const { chatId } = useLocalSearchParams<{ chatId?: string }>();

  const resolvedChatId = Array.isArray(chatId) ? chatId[0] : chatId;
  const isDirectRoute = resolvedChatId?.startsWith('direct-');
  const directRecipientId = isDirectRoute
    ? Number(resolvedChatId?.replace('direct-', ''))
    : undefined;
  const numericChatId = isDirectRoute ? undefined : resolvedChatId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [actionMessageId, setActionMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // ── Завантаження повідомлень ────────────────────────────────────────────────
  const fetchMessages = async () => {
    if (!numericChatId) {
      setMessages([]);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getMessages(numericChatId);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load messages');
    } finally {
      setLoading(false);
    }
  };

  // ── Завантаження чату ───────────────────────────────────────────────────────
  const fetchChat = async () => {
    if (!numericChatId) {
      setChat(null);
      setChatLoading(false);
      return;
    }
    setChatLoading(true);
    try {
      const loaded = await getChat(numericChatId);
      setChat(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load chat');
    } finally {
      setChatLoading(false);
    }
  };

  // ── Resolve direct chat ─────────────────────────────────────────────────────
  const resolvePendingDirectChat = async () => {
    if (numericChatId || !directRecipientId || !authUser) return;
    try {
      const directChat = await checkDirectChat(directRecipientId);
      if (directChat) router.replace(`/chat/${directChat.id}`);
    } catch {
      // no direct chat yet
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchChat();
    resolvePendingDirectChat();
  }, [numericChatId, directRecipientId]);

  // ── Socket ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    connectSocket().then((socket) => {
      if (!socket) return;
      unsubscribe = subscribeMessageCreated(({ message }) => {
        if (!message || !message.chatId) return;
        if (numericChatId && String(message.chatId) === String(numericChatId)) {
          setMessages((prev) => [
            ...prev,
            {
              id: String(message.id),
              content: String(message.content),
              chatId: String(message.chatId),
              createdAt: String(message.createdAt),
              author: {
                id: Number(message.author.id),
                email: String(message.author.email),
                phone: message.author.phone ?? null,
                firstName: String(message.author.firstName),
                lastName: message.author.lastName ?? null,
                username: String(message.author.username),
                avatarUrl: message.author.avatarUrl ?? null,
                fcmToken: message.author.fcmToken ?? null,
                isOnline: Boolean(message.author.isOnline),
                lastSeen: String(message.author.lastSeen),
                createdAt: String(message.author.createdAt),
                updatedAt: String(message.author.updatedAt),
              },
            },
          ]);
        }
      });
    });
    return () => { if (unsubscribe) unsubscribe(); };
  }, [numericChatId]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const isCurrentUser = (authorId: number) => authUser?.id === authorId;

  const getConversationTitle = (): string => {
    if (chat) {
      if (chat.isGroup) return chat.title?.trim() || `Group ${chat.id}`;
      const other = chat.members?.find((m) => m.id !== authUser?.id);
      if (other) return `${other.firstName ?? ''} ${other.lastName ?? other.username ?? ''}`.trim();
      return `Chat ${chat.id}`;
    }
    if (isDirectRoute && directRecipientId) return 'New Conversation';
    return 'Chat';
  };

  // ── Відправка / редагування ─────────────────────────────────────────────────
  const handleSend = async () => {
    if (!draft.trim() || sending || !authUser) return;
    setSending(true);
    setError(null);
    try {
      if (editingMessageId) {
        const updated = await updateMessage(editingMessageId, draft.trim());
        setMessages((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
        setEditingMessageId(null);
        setDraft('');
      } else {
        const message = await sendMessage(draft.trim(), numericChatId, directRecipientId);

        // 🔔 Локальне push-сповіщення відправнику
        const senderName = authUser.firstName
          ? `${authUser.firstName} ${authUser.lastName ?? ''}`.trim()
          : authUser.username ?? 'You';
        await sendLocalPushNotification(senderName, draft.trim());

        setDraft('');
        if (message.chatId && isDirectRoute) router.replace(`/chat/${message.chatId}`);
        setMessages((prev) => [...prev, message]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send message');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to delete message');
    } finally {
      setActionMessageId(null);
    }
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;
    setEditingMessageId(messageId);
    setDraft(message.content);
    setActionMessageId(null);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setDraft('');
  };

  // ── Рендер повідомлення ─────────────────────────────────────────────────────
  const renderMessage: ListRenderItem<Message> = ({ item }) => {
    const mine = isCurrentUser(item.author.id);
    return (
      <Pressable
        onLongPress={() => setActionMessageId(item.id)}
        className={`mb-3.5 flex-row ${mine ? 'justify-end' : 'justify-start'}`}
      >
        <Box
          className={`max-w-[85%] p-3 border-2 border-black rounded-none ${
            mine ? 'bg-black' : 'bg-white'
          }`}
        >
          <Text
            className={`text-[11px] font-bold mb-1 uppercase tracking-wide ${
              mine ? 'text-white' : 'text-black'
            }`}
          >
            {mine
              ? 'You'
              : `${item.author.firstName} ${item.author.lastName ?? item.author.username}`}
          </Text>
          <Text className={`text-[15px] leading-5 ${mine ? 'text-white' : 'text-black'}`}>
            {item.content}
          </Text>
          <Text
            className={`mt-1.5 text-[10px] text-right ${mine ? 'text-[#A3A3A3]' : 'text-[#666]'}`}
          >
            {formatTimestamp(item.createdAt)}
          </Text>
        </Box>
      </Pressable>
    );
  };

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading || chatLoading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <Box className="flex-1 items-center justify-center gap-3">
          <ActivityIndicator size="large" className="color-black" />
          <Text className="text-sm font-bold uppercase text-black">Loading messages...</Text>
        </Box>
      </SafeAreaView>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        {/* ── Хедер ── */}
        <Box className="w-full flex-row items-center px-4 py-3.5 border-b-2 border-black bg-white">
          <Pressable
            className="w-10 h-10 border-2 border-black items-center justify-center"
            onPress={() => router.back()}
          >
            <Text className="text-black text-lg font-bold">{'<'}</Text>
          </Pressable>
          <Pressable
            className="flex-1 ml-3"
            onPress={() => router.push(`/chat/${resolvedChatId}/info`)}
          >
            <Text className="text-black text-[17px] font-bold">{getConversationTitle()}</Text>
          </Pressable>
        </Box>

        {/* ── Список повідомлень ── */}
        <FlatList
          data={messages}
          keyExtractor={(item) => `message-${item.id}`}
          renderItem={renderMessage}
          contentContainerClassName="p-4 pb-6"
          ListEmptyComponent={
            <Box className="flex-1 items-center justify-center py-10">
              <Text className="text-sm font-medium uppercase text-[#666]">
                {directRecipientId ? 'Start a new conversation' : 'No messages yet'}
              </Text>
            </Box>
          }
        />

        {/* ── Плашка редагування ── */}
        {editingMessageId && (
          <Box className="flex-row items-center justify-between bg-[#E5E7EB] px-4 py-2.5 border-t-2 border-black">
            <Text className="flex-1 text-[12px] font-bold uppercase tracking-wide text-black">
              Editing message...
            </Text>
            <Pressable
              className="w-6 h-6 border-2 border-black bg-white items-center justify-center"
              onPress={handleCancelEdit}
            >
              <Text className="text-[10px] font-black text-black">✕</Text>
            </Pressable>
          </Box>
        )}

        {/* ── Поле введення ── */}
        <Box className="border-t-2 border-black bg-white pb-safe-or-3">
          <Box className="flex-row items-end px-4 py-3 gap-3">
            <Input
              className="flex-1 min-h-[44px] max-h-[120px] border-2 border-black rounded-none"
              size="md"
            >
              <InputField
                value={draft}
                onChangeText={setDraft}
                placeholder="Type a message…"
                placeholderTextColor="#666666"
                multiline
                className="text-black text-[15px] px-3 py-2.5"
              />
            </Input>
            <Pressable
              className={`h-11 px-5 items-center justify-center border-2 rounded-none ${
                !draft.trim() || sending
                  ? 'bg-white border-[#E5E7EB]'
                  : 'bg-black border-black'
              }`}
              onPress={handleSend}
              disabled={sending || !draft.trim()}
            >
              <Text
                className={`font-bold text-sm tracking-widest ${
                  !draft.trim() || sending ? 'text-[#9CA3AF]' : 'text-white'
                }`}
              >
                {sending ? '...' : 'SEND'}
              </Text>
            </Pressable>
          </Box>
          {error ? (
            <Text className="mx-4 mb-2 text-[12px] font-semibold text-black">{error}</Text>
          ) : null}
        </Box>

        {/* ── Action overlay (long press) ── */}
        {actionMessageId ? (
          <Box className="absolute inset-0 bg-black/50 items-center justify-center">
            <Box className="bg-white border-[3px] border-black w-[280px]">
              <Pressable
                className="py-4 items-center bg-white"
                onPress={() => handleEditMessage(actionMessageId)}
              >
                <Text className="text-black font-bold text-[15px] uppercase tracking-wide">
                  Edit Message
                </Text>
              </Pressable>
              <Box className="h-0.5 bg-black" />
              <Pressable
                className="py-4 items-center bg-white"
                onPress={() => handleDeleteMessage(actionMessageId)}
              >
                <Text className="text-black font-bold text-[15px] uppercase tracking-wide">
                  Delete Message
                </Text>
              </Pressable>
              <Box className="h-0.5 bg-black" />
              <Pressable
                className="py-4 items-center bg-white"
                onPress={() => setActionMessageId(null)}
              >
                <Text className="text-[#666] font-bold text-[15px] uppercase tracking-wide">
                  Cancel
                </Text>
              </Pressable>
            </Box>
          </Box>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
