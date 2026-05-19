import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Pressable,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { checkDirectChat, getChat, searchChatEntities, addParticipants, updateChatTitle } from '@services/modules/chat.service';
import type { Chat, User } from '@types';
import { useAppSelector } from '@store/hooks';

export default function ChatInfoScreen() {
  const router = useRouter();
  const authUser = useAppSelector((state) => state.auth.user);
  const { chatId } = useLocalSearchParams<{ chatId?: string }>();
  const resolvedChatId = Array.isArray(chatId) ? chatId[0] : chatId;
  const isDirectRoute = resolvedChatId?.startsWith('direct-');
  const directRecipientId = isDirectRoute ? Number(resolvedChatId?.replace('direct-', '')) : undefined;

  const [chat, setChat] = useState<Chat | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [adding, setAdding] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showUserPicker, setShowUserPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChat = async () => {
    const numericId = isDirectRoute ? undefined : resolvedChatId;

    setLoading(true);
    setError(null);

    try {
      if (numericId) {
        const loaded = await getChat(numericId);
        setChat(loaded);
      } else if (directRecipientId && authUser) {
        const directChat = await checkDirectChat(directRecipientId);
        setChat(directChat);
      }
    } catch {
      setChat(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChat();
  }, [resolvedChatId]);

  const getHeaderTitle = () => {
    if (chat) {
      if (chat.isGroup) {
        return chat.title?.trim() || `Group ${chat.id}`;
      }
      const other = chat.members?.find((member) => member.id !== authUser?.id);
      return other
        ? `${other.firstName ?? ''} ${other.lastName ?? other.username ?? ''}`.trim()
        : `Chat ${chat.id}`;
    }

    if (isDirectRoute && directRecipientId) {
      return 'New Conversation';
    }

    return 'Chat Info';
  };

  const getRecipient = () => {
    if (!chat || chat.isGroup) return null;
    return chat.members?.find((member) => member.id !== authUser?.id) ?? null;
  };

  const handleSearch = async (value: string) => {
    setSearchTerm(value);
    const trimmed = value.trim();

    if (!trimmed) {
      setSearchResults([]);
      return;
    }

    try {
      const result = await searchChatEntities(trimmed);
      const existingIds = new Set(chat?.members?.map((member) => member.id));
      setSearchResults(result.users.filter((user) => !existingIds.has(user.id)));
    } catch {
      setSearchResults([]);
    }
  };

  const toggleSelectedUser = (user: User) => {
    setSelectedUsers((prev) => {
      if (prev.some((item) => item.id === user.id)) {
        return prev.filter((item) => item.id !== user.id);
      }
      return [...prev, user];
    });
  };

  const handleAddParticipants = async () => {
    if (!chat || !chat.isGroup || selectedUsers.length === 0) {
      return;
    }

    setAdding(true);
    setError(null);

    try {
      const updated = await addParticipants(Number(chat.id), selectedUsers.map((user) => user.id));
      setChat(updated);
      setSelectedUsers([]);
      setSearchResults([]);
      setSearchTerm('');
      setShowUserPicker(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to add participants');
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async () => {
    if (!chat || !chat.isGroup || !newTitle.trim()) {
      return;
    }

    setRenaming(true);
    setError(null);

    try {
      const updated = await updateChatTitle(Number(chat.id), newTitle.trim());
      setChat(updated);
      setNewTitle('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to rename group');
    } finally {
      setRenaming(false);
    }
  };

  const recipient = getRecipient();

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.headerBar}>
            <Pressable style={styles.backButton} onPress={() => router.back()}>
              <Text style={styles.backButtonText}>{'<'}</Text>
            </Pressable>
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
            </View>
          </View>

          {loading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#000000" />
              <Text style={styles.loadingText}>Loading chat info...</Text>
            </View>
          ) : (
            <View style={styles.bodyContainer}>
              {recipient ? (
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Recipient</Text>
                  <View style={styles.profileRow}>
                    <View style={styles.avatarBox}>
                      <Text style={styles.avatarText}>{`${recipient.firstName?.charAt(0) ?? ''}${recipient.lastName?.charAt(0) ?? ''}`.toUpperCase()}</Text>
                    </View>
                    <View style={styles.profileMeta}>
                      <Text style={styles.profileName}>{`${recipient.firstName ?? ''} ${recipient.lastName ?? recipient.username ?? ''}`.trim()}</Text>
                      <Text style={styles.profileDetail}>{recipient.username}</Text>
                    </View>
                  </View>
                </View>
              ) : null}

              {chat?.isGroup ? (
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Group name</Text>
                  <TextInput
                    style={styles.input}
                    value={newTitle}
                    onChangeText={setNewTitle}
                    placeholder="New group name"
                    placeholderTextColor="#000000"
                  />
                  <Pressable style={styles.primaryButton} onPress={handleRename} disabled={renaming || !newTitle.trim()}>
                    <Text style={styles.primaryButtonText}>{renaming ? 'Renaming…' : 'Rename group'}</Text>
                  </Pressable>
                </View>
              ) : null}

              {chat?.isGroup ? (
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Members</Text>
                  <FlatList
                    data={chat.members ?? []}
                    keyExtractor={(item) => `member-${item.id}`}
                    renderItem={({ item }) => (
                      <View style={styles.memberRow}>
                        <Text style={styles.memberText}>{`${item.firstName ?? ''} ${item.lastName ?? item.username ?? ''}`.trim()}</Text>
                        <Text style={styles.memberDetail}>{item.username}</Text>
                      </View>
                    )}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                  <Pressable style={styles.primaryButton} onPress={() => setShowUserPicker(true)}>
                    <Text style={styles.primaryButtonText}>Add Participant</Text>
                  </Pressable>
                </View>
              ) : null}

              {showUserPicker ? (
                <View style={styles.card}>
                  <Text style={styles.sectionLabel}>Find users</Text>
                  <TextInput
                    style={styles.input}
                    value={searchTerm}
                    onChangeText={handleSearch}
                    placeholder="Search users"
                    placeholderTextColor="#000000"
                  />
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => `search-user-${item.id}`}
                    renderItem={({ item }) => {
                      const selected = selectedUsers.some((user) => user.id === item.id);
                      return (
                        <Pressable style={styles.userRow} onPress={() => toggleSelectedUser(item)}>
                          <Text style={styles.userRowText}>{`${item.firstName ?? ''} ${item.lastName ?? item.username ?? ''}`.trim()}</Text>
                          <Text style={styles.userRowText}>{selected ? '✓' : '+'}</Text>
                        </Pressable>
                      );
                    }}
                    ListEmptyComponent={<Text style={styles.emptyText}>No users found.</Text>}
                    style={styles.userList}
                  />
                  <View style={styles.actionRow}>
                    <Pressable style={styles.secondaryButton} onPress={() => setShowUserPicker(false)}>
                      <Text style={styles.secondaryButtonText}>Close</Text>
                    </Pressable>
                    <Pressable style={styles.primaryButton} onPress={handleAddParticipants} disabled={adding || selectedUsers.length === 0}>
                      <Text style={styles.primaryButtonText}>{adding ? 'Adding…' : 'Add'}</Text>
                    </Pressable>
                  </View>
                </View>
              ) : null}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
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
  bodyContainer: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  input: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
    marginBottom: 12,
  },
  primaryButton: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginRight: 8,
  },
  secondaryButtonText: {
    color: '#000000',
    fontWeight: '700',
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 52,
    height: 52,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '700',
  },
  profileMeta: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 14,
    color: '#000000',
  },
  memberRow: {
    paddingVertical: 12,
  },
  memberText: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '700',
  },
  memberDetail: {
    fontSize: 13,
    color: '#000000',
    marginTop: 4,
  },
  separator: {
    height: 2,
    backgroundColor: '#000000',
  },
  userRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000000',
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  userRowText: {
    color: '#000000',
    fontSize: 15,
  },
  userList: {
    maxHeight: 220,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#000000',
    fontSize: 16,
    marginTop: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#000000',
  },
  errorText: {
    color: '#000000',
    fontSize: 14,
    marginTop: 12,
  },
});
