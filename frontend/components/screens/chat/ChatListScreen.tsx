import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useAppDispatch, useAppSelector } from '@store/hooks';
import { fetchChats, searchChats, clearSearch, createChatGroup, addChat } from '@store/slices/chatSlice';
import { connectSocket, subscribeChatCreated } from '@services/modules/socket.service';
import { searchChatEntities, checkDirectChat } from '@services/modules/chat.service';
import type { Chat, User } from '@types';
import { ErrorMessage } from '@common/ErrorMessage';

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  return `${date.getHours().toString().padStart(2, '0')}:${date
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;
};

export default function ChatListScreen() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, searchUsers, searchChats: searchChatItems, loading, searchLoading, groupLoading, error } = useAppSelector(
    (state) => state.chat,
  );
  const authUserId = useAppSelector((state) => state.auth.user?.id);

  const [searchQuery, setSearchQuery] = useState('');
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupSearch, setGroupSearch] = useState('');
  const [groupSearchResults, setGroupSearchResults] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);

  useEffect(() => {
    dispatch(fetchChats());

    let unsubscribe: (() => void) | undefined;
    connectSocket().then((socket) => {
      if (!socket) {
        return;
      }

      unsubscribe = subscribeChatCreated(({ chat }) => {
        if (chat?.id) {
          dispatch(addChat({
            id: String(chat.id),
            title: chat.title ?? undefined,
            type: chat.type ?? undefined,
            chatImageUrl: chat.chatImageUrl ?? undefined,
            isGroup: chat.type === 'GROUP',
            updatedAt: String(chat.updatedAt),
            lastMessage: chat.lastMessage ? {
              id: String(chat.lastMessage.id),
              content: String(chat.lastMessage.content),
              chatId: String(chat.lastMessage.chatId),
              createdAt: String(chat.lastMessage.createdAt),
              author: {
                id: Number(chat.lastMessage.author.id),
                email: String(chat.lastMessage.author.email),
                phone: chat.lastMessage.author.phone ?? null,
                firstName: String(chat.lastMessage.author.firstName),
                lastName: chat.lastMessage.author.lastName ?? null,
                username: String(chat.lastMessage.author.username),
                avatarUrl: chat.lastMessage.author.avatarUrl ?? null,
                fcmToken: chat.lastMessage.author.fcmToken ?? null,
                isOnline: Boolean(chat.lastMessage.author.isOnline),
                lastSeen: String(chat.lastMessage.author.lastSeen),
                createdAt: String(chat.lastMessage.author.createdAt),
                updatedAt: String(chat.lastMessage.author.updatedAt),
              },
            } : undefined,
          }));
        }
      });
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [dispatch]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      dispatch(clearSearch());
      return;
    }

    const timeout = setTimeout(() => {
      dispatch(searchChats(query));
    }, 300);

    return () => clearTimeout(timeout);
  }, [dispatch, searchQuery]);

  useEffect(() => {
    const term = groupSearch.trim();
    if (!term) {
      setGroupSearchResults([]);
      return;
    }

    const timeout = setTimeout(async () => {
      try {
        const result = await searchChatEntities(term);
        setGroupSearchResults(result.users);
      } catch {
        setGroupSearchResults([]);
      }
    }, 250);

    return () => clearTimeout(timeout);
  }, [groupSearch]);

  const onToggleUserSelection = (user: User) => {
    setSelectedUsers((prev) => {
      const exists = prev.some((item) => item.id === user.id);
      return exists ? prev.filter((item) => item.id !== user.id) : [...prev, user];
    });
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName || selectedUsers.length === 0) {
      return;
    }

    try {
      await dispatch(
        createChatGroup({
          title: trimmedName,
          memberIds: selectedUsers.map((user) => user.id),
        }),
      ).unwrap();
      setGroupName('');
      setGroupSearch('');
      setSelectedUsers([]);
      setShowGroupModal(false);
      dispatch(fetchChats());
    } catch {
      // fallback: the slice will set error state
    }
  };

  const searchActive = Boolean(searchQuery.trim());
  const chatList = useMemo(() => (searchActive ? searchChatItems : items), [searchActive, searchChatItems, items]);

  const getChatDisplayTitle = (chat: Chat): string => {
    if (chat.isGroup) {
      return chat.title?.trim() || `Group ${chat.id}`;
    }

    const member = chat.members?.find((participant) => participant.id !== authUserId);
    if (member) {
      return `${member.firstName ?? ''} ${member.lastName ?? member.username ?? ''}`.trim() || `Chat ${chat.id}`;
    }

    return `Chat ${chat.id}`;
  };

  const renderChatItem: ListRenderItem<Chat> = ({ item }) => (
    <TouchableOpacity
      style={styles.chatCard}
      onPress={() => router.push(`/chat/${item.id}`)}>
      <View style={styles.chatInfo}>
        <Text style={styles.chatTitle}>{getChatDisplayTitle(item)}</Text>
        <Text style={styles.chatPreview} numberOfLines={1}>
          {item.lastMessage?.content ?? 'No messages yet'}
        </Text>
      </View>
      <Text style={styles.chatTime}>
        {item.lastMessage ? formatTimestamp(item.lastMessage.createdAt) : formatTimestamp(item.updatedAt)}
      </Text>
    </TouchableOpacity>
  );

  const handleUserPress = async (user: User) => {
    if (!authUserId) {
      router.push(`/chat/direct-${user.id}`);
      return;
    }

    const existingLocalChat = items.find(
      (chat) =>
        chat.type === 'DIRECT' &&
        chat.members?.some((member) => member.id === user.id) &&
        chat.members?.some((member) => member.id === authUserId),
    );

    if (existingLocalChat) {
      router.push(`/chat/${existingLocalChat.id}`);
      return;
    }

    try {
      const directChat = await checkDirectChat(user.id);
      if (directChat) {
        dispatch(addChat(directChat));
        router.push(`/chat/${directChat.id}`);
        return;
      }
    } catch {
      // fallback to direct route if the API check fails or no direct chat exists
    }

    router.push(`/chat/direct-${user.id}`);
  };

  const renderUserResult: ListRenderItem<User> = ({ item }) => {
    const selected = selectedUsers.some((user) => user.id === item.id);
    return (
      <Pressable
        style={[styles.userResultCard, selected && styles.userResultSelected]}
        onPress={() => handleUserPress(item)}>
        <View>
          <Text style={styles.chatTitle}>{item.username}</Text>
          <Text style={styles.chatPreview}>{`${item.firstName} ${item.lastName ?? ''}`.trim()}</Text>
        </View>
      </Pressable>
    );
  };

  const renderGroupSearchUser: ListRenderItem<User> = ({ item }) => {
    const selected = selectedUsers.some((user) => user.id === item.id);
    return (
      <Pressable style={styles.userRow} onPress={() => onToggleUserSelection(item)}>
        <Text style={styles.userRowText}>{item.username}</Text>
        <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
          {selected && <Text style={styles.checkboxLabel}>✓</Text>}
        </View>
      </Pressable>
    );
  };

  const emptyState = (
    <View style={styles.emptyState}>
      <Text style={styles.emptyText}>{searchQuery.trim() ? 'Nothing matched your search.' : 'No chats available yet.'}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search users or groups"
          placeholderTextColor="#000000"
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.newGroupButton} onPress={() => setShowGroupModal(true)}>
          <Text style={styles.newGroupButtonText}>＋</Text>
        </TouchableOpacity>
      </View>

      {searchLoading && (
        <View style={styles.loadingArea}>
          <ActivityIndicator size="small" color="#000000" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      )}

      {error ? (
        <ErrorMessage message={error} onRetry={() => dispatch(fetchChats())} />
      ) : searchActive ? (
        <View style={styles.searchResultSection}>
          <Text style={styles.sectionLabel}>Users</Text>
          {searchUsers.length > 0 ? (
            <FlatList
              data={searchUsers}
              keyExtractor={(item) => `user-${item.id}`}
              renderItem={renderUserResult}
              contentContainerStyle={styles.searchSectionList}
              ListEmptyComponent={<Text style={styles.emptyText}>No matching users.</Text>}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <Text style={styles.emptyText}>No matching users.</Text>
          )}

          <Text style={styles.sectionLabel}>Groups</Text>
          {searchChatItems.length > 0 ? (
            <FlatList
              data={searchChatItems}
              keyExtractor={(item) => `${item.type ?? (item.isGroup ? 'group' : 'direct')}-${item.id}`}
              renderItem={renderChatItem}
              contentContainerStyle={styles.searchSectionList}
              ListEmptyComponent={<Text style={styles.emptyText}>No matching groups.</Text>}
            />
          ) : (
            <Text style={styles.emptyText}>No matching groups.</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={chatList}
          keyExtractor={(item) => `${item.type ?? (item.isGroup ? 'group' : 'direct')}-${item.id}`}
          renderItem={renderChatItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={emptyState}
        />
      )}

      <Modal animationType="slide" visible={showGroupModal} transparent>
        <View style={styles.modalOverlay}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.modalContainer}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>New Group Chat</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Group name"
                placeholderTextColor="#000000"
                value={groupName}
                onChangeText={setGroupName}
              />
              <TextInput
                style={styles.modalInput}
                placeholder="Search users to add"
                placeholderTextColor="#000000"
                value={groupSearch}
                onChangeText={setGroupSearch}
              />
              {selectedUsers.length > 0 ? (
                <View style={styles.selectedUsersContainer}>
                  {selectedUsers.map((user) => (
                    <View key={user.id} style={styles.selectedUserChip}>
                      <Text style={styles.selectedUserChipText}>{user.username}</Text>
                      <Pressable style={styles.selectedUserRemove} onPress={() => onToggleUserSelection(user)}>
                        <Text style={styles.selectedUserRemoveText}>×</Text>
                      </Pressable>
                    </View>
                  ))}
                </View>
              ) : null}
              <FlatList
                data={groupSearchResults}
                keyExtractor={(item) => `user-${item.id}`}
                renderItem={renderGroupSearchUser}
                style={styles.groupSearchList}
                keyboardShouldPersistTaps="handled"
              />
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowGroupModal(false)}>
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.primaryButton}
                  disabled={groupLoading || !groupName.trim() || selectedUsers.length === 0}
                  onPress={handleCreateGroup}
                >
                  <Text style={styles.primaryButtonText}>{groupLoading ? 'Creating…' : 'Create Group'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  newGroupButton: {
    width: 44,
    height: 44,
    borderWidth: 2,
    borderColor: '#000000',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGroupButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 24,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 12,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  chatInfo: {
    flex: 1,
    marginRight: 12,
  },
  chatTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 4,
  },
  chatPreview: {
    fontSize: 14,
    color: '#000000',
  },
  chatTime: {
    fontSize: 12,
    color: '#000000',
  },
  userResultCard: {
    padding: 14,
    marginBottom: 12,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  userResultSelected: {
    borderWidth: 2,
    borderColor: '#000000',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 10,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
  },
  userRowText: {
    fontSize: 15,
    color: '#000000',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkboxSelected: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  checkboxLabel: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  loadingArea: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  loadingText: {
    marginLeft: 10,
    color: '#000000',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: '#000000',
    padding: 20,
    minHeight: 420,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 2,
    borderColor: '#000000',
    borderRadius: 0,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  groupSearchList: {
    maxHeight: 220,
  },
  selectedUsersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 12,
  },
  selectedUserChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    marginBottom: 8,
  },
  selectedUserChipText: {
    color: '#000000',
    marginRight: 8,
  },
  selectedUserRemove: {
    width: 24,
    height: 24,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#000000',
  },
  selectedUserRemoveText: {
    color: '#000000',
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  primaryButton: {
    flex: 1,
    borderRadius: 0,
    backgroundColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 0,
    borderWidth: 2,
    borderColor: '#000000',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: '#FFFFFF',
  },
  secondaryButtonText: {
    color: '#000000',
    fontWeight: '700',
  },
  searchResultSection: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000',
    marginVertical: 12,
  },
  searchSectionList: {
    paddingBottom: 12,
  },
});
