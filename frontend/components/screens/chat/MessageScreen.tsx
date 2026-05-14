import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ListRenderItem,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import { getMessages } from '@services/modules/message.service';
import type { Message } from '@types';
import { ErrorMessage } from '@common/ErrorMessage';

const CURRENT_USER_ID = '1';

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

export default function MessageScreen() {
  const { chatId } = useLocalSearchParams<{ chatId?: string }>();
  const resolvedChatId = Array.isArray(chatId) ? chatId[0] : chatId;

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = async () => {
    if (!resolvedChatId) {
      setError('Missing chat identifier');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getMessages(resolvedChatId);
      setMessages(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [resolvedChatId]);

  const renderMessage: ListRenderItem<Message> = ({ item }) => {
    const isCurrentUser = item.author.id === CURRENT_USER_ID;
    return (
      <View
        style={[
          styles.messageRow,
          isCurrentUser ? styles.messageRight : styles.messageLeft,
        ]}>
        <View style={[styles.messageBubble, isCurrentUser ? styles.bubbleSender : styles.bubbleReceiver]}>
          <Text style={styles.authorText}>{isCurrentUser ? 'You' : item.author.name}</Text>
          <Text style={styles.messageText}>{item.content}</Text>
          <Text style={styles.timestampText}>{formatTimestamp(item.createdAt)}</Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorMessage message={error} onRetry={fetchMessages} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        inverted={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
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
    borderRadius: 16,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 1,
  },
  bubbleReceiver: {
    backgroundColor: '#F3F4F6',
  },
  bubbleSender: {
    backgroundColor: '#2563EB',
  },
  authorText: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 4,
    color: '#0F172A',
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#111827',
  },
  timestampText: {
    marginTop: 6,
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'right',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#374151',
  },
});
