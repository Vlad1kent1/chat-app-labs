import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { getMessages, sendMessage, updateMessage, deleteMessage } from '@services/modules/message.service';
import { getChat, checkDirectChat } from '@services/modules/chat.service';
import { connectSocket, subscribeMessageCreated } from '@services/modules/socket.service';
import type { Chat, Message } from '@types';
import { ErrorMessage } from '@common/ErrorMessage';
import { useAppSelector } from '@store/hooks';

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

export default function MessageScreen() {
  const router = useRouter();
  const authUser = useAppSelector((state) => state.auth.user);
  const { chatId } = useLocalSearchParams<{ chatId?: string }>();
  const resolvedChatId = Array.isArray(chatId) ? chatId[0] : chatId;
  const isDirectRoute = resolvedChatId?.startsWith('direct-');
  const directRecipientId = isDirectRoute ? Number(resolvedChatId?.replace('direct-', '')) : undefined;
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

  const resolvePendingDirectChat = async () => {
    if (numericChatId || !directRecipientId || !authUser) {
      return;
    }

    try {
      const directChat = await checkDirectChat(directRecipientId);
      if (directChat) {
        router.replace(`/chat/${directChat.id}`);
      }
    } catch {
      // no direct chat exists yet
    }
  };

  useEffect(() => {
    fetchMessages();
    fetchChat();
    resolvePendingDirectChat();
  }, [numericChatId, directRecipientId]);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    connectSocket().then((socket) => {
      if (!socket) {
        return;
      }

      unsubscribe = subscribeMessageCreated(({ message }) => {
        if (!message || !message.chatId) {
          return;
        }

        if (numericChatId && String(message.chatId) === String(numericChatId)) {
          setMessages((prev) => [...prev, {
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
          }] );
        }
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [numericChatId]);

  const isCurrentUser = (authorId: number) => authUser?.id === authorId;

  const getConversationTitle = (): string => {
    if (chat) {
      if (chat.isGroup) {
        return chat.title?.trim() || `Group ${chat.id}`;
      }

      const otherMember = chat.members?.find((member) => member.id !== authUser?.id);
      if (otherMember) {
        return `${otherMember.firstName ?? ''} ${otherMember.lastName ?? otherMember.username ?? ''}`.trim();
      }

      return `Chat ${chat.id}`;
    }

    if (isDirectRoute && directRecipientId) {
      return 'New Conversation';
    }

    return 'Chat';
  };

  const handleSend = async () => {
    if (!draft.trim() || sending || !authUser) {
      return;
    }

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
        setDraft('');
        if (message.chatId && isDirectRoute) {
          router.replace(`/chat/${message.chatId}`);
        }
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

  const renderMessage: ListRenderItem<Message> = ({ item }) => {
    const currentUser = isCurrentUser(item.author.id);
    return (
      <Pressable
        onLongPress={() => setActionMessageId(item.id)}
        style={[
          styles.messageRow,
          currentUser ? styles.messageRight : styles.messageLeft,
        ]}
      >
        <View style={[styles.messageBubble, currentUser ? styles.bubbleSender : styles.bubbleReceiver]}>
          <Text style={[styles.authorText, currentUser && styles.authorTextSender]}>
            {currentUser ? 'You' : `${item.author.firstName} ${item.author.lastName ?? item.author.username}`}
          </Text>
          <Text style={[styles.messageText, currentUser && styles.messageTextSender]}>{item.content}</Text>
          <Text style={[styles.timestampText, currentUser && styles.timestampTextSender]}>{formatTimestamp(item.createdAt)}</Text>
        </View>
      </Pressable>
    );
  };

  if (loading || chatLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerBar}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>{'<'}</Text>
        </Pressable>
        <Pressable style={styles.headerTitleContainer} onPress={() => router.push(`/chat/${resolvedChatId}/info`)}>
          <Text style={styles.headerTitle}>{getConversationTitle()}</Text>
        </Pressable>
      </View>
      <FlatList
        data={messages}
        keyExtractor={(item) => `message-${item.id}`}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        inverted={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {directRecipientId ? 'Start a new conversation' : 'No messages yet'}
            </Text>
          </View>
        }
      />

      {actionMessageId ? (
        <View style={styles.actionOverlay}>
          <View style={styles.actionBox}>
            <Pressable style={styles.actionButton} onPress={() => handleEditMessage(actionMessageId)}>
              <Text style={styles.actionText}>Edit Message</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => handleDeleteMessage(actionMessageId)}>
              <Text style={styles.actionText}>Delete Message</Text>
            </Pressable>
            <Pressable style={styles.actionButton} onPress={() => setActionMessageId(null)}>
              <Text style={styles.actionText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 64}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message…"
            placeholderTextColor="#000000"
            multiline
          />
          <Pressable style={styles.sendButton} onPress={handleSend} disabled={sending || !draft.trim()}>
            <Text style={styles.sendButtonText}>{sending ? 'Sending' : 'Send'}</Text>
          </Pressable>
        </View>
        {error ? <Text style={styles.sendError}>{error}</Text> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    width: 40,
    height: 40,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#000000',
    fontSize: 17,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    paddingBottom: 12,
  },
  messageRow: {
    marginBottom: 12,
    flexDirection: 'row',
  },
  messageLeft: {
    justifyContent: 'flex-start',
  },
  messageRight: {
    justifyContent: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 0,
    padding: 12,
  },
  bubbleReceiver: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  bubbleSender: {
    backgroundColor: '#000000',
  },
  authorText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    color: '#000000',
  },
  authorTextSender: {
    color: '#FFFFFF',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#000000',
  },
  messageTextSender: {
    color: '#FFFFFF',
  },
  timestampText: {
    marginTop: 6,
    fontSize: 12,
    color: '#000000',
    textAlign: 'right',
  },
  timestampTextSender: {
    color: '#FFFFFF',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  sendButton: {
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  actionBox: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 8,
    width: 260,
  },
  actionButton: {
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  actionText: {
    color: '#000000',
    fontWeight: '700',
    textAlign: 'center',
  },
  sendButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000000',
  },
  sendError: {
    marginHorizontal: 16,
    marginTop: 8,
    fontSize: 14,
    color: '#000000',
  },
});
