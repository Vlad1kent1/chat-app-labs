import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Input, InputField } from '@/components/ui/input';

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
  const {
    items,
    searchUsers,
    searchChats: searchChatItems,
    searchLoading,
    groupLoading,
    error,
  } = useAppSelector((state) => state.chat);
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
      if (!socket) return;

      unsubscribe = subscribeChatCreated(({ chat }) => {
        if (chat?.id) {
          dispatch(
            addChat({
              id: String(chat.id),
              title: chat.title ?? undefined,
              type: chat.type ?? undefined,
              chatImageUrl: chat.chatImageUrl ?? undefined,
              isGroup: chat.type === 'GROUP',
              updatedAt: String(chat.updatedAt),
              lastMessage: chat.lastMessage
                ? {
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
                  }
                : undefined,
            }),
          );
        }
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
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
    if (!trimmedName || selectedUsers.length === 0) return;
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
      // slice sets error state
    }
  };

  const searchActive = Boolean(searchQuery.trim());
  const chatList = useMemo(
    () => (searchActive ? searchChatItems : items),
    [searchActive, searchChatItems, items],
  );

  const getChatDisplayTitle = (chat: Chat): string => {
    if (chat.isGroup) return chat.title?.trim() || `Group ${chat.id}`;
    const member = chat.members?.find((p) => p.id !== authUserId);
    if (member) {
      return `${member.firstName ?? ''} ${member.lastName ?? member.username ?? ''}`.trim() || `Chat ${chat.id}`;
    }
    return `Chat ${chat.id}`;
  };

  const handleUserPress = async (user: User) => {
    if (!authUserId) {
      router.push(`/chat/direct-${user.id}`);
      return;
    }
    const existingLocalChat = items.find(
      (chat) =>
        chat.type === 'DIRECT' &&
        chat.members?.some((m) => m.id === user.id) &&
        chat.members?.some((m) => m.id === authUserId),
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
      // fallback
    }
    router.push(`/chat/direct-${user.id}`);
  };

  const renderChatItem: ListRenderItem<Chat> = ({ item }) => (
    <Pressable
      className="flex-row items-center justify-between p-4 mb-3 border-2 border-black bg-white"
      onPress={() => router.push(`/chat/${item.id}`)}
    >
      <Box className="flex-1 mr-3">
        <Text className="text-base font-bold text-black mb-1">{getChatDisplayTitle(item)}</Text>
        <Text className="text-sm text-black" numberOfLines={1}>
          {item.lastMessage?.content ?? 'No messages yet'}
        </Text>
      </Box>
      <Text className="text-xs text-black">
        {item.lastMessage
          ? formatTimestamp(item.lastMessage.createdAt)
          : formatTimestamp(item.updatedAt)}
      </Text>
    </Pressable>
  );

  const renderUserResult: ListRenderItem<User> = ({ item }) => (
    <Pressable
      className="p-3.5 mb-3 border-2 border-black bg-white"
      onPress={() => handleUserPress(item)}
    >
      <Text className="text-base font-bold text-black mb-1">{item.username}</Text>
      <Text className="text-sm text-black">{`${item.firstName} ${item.lastName ?? ''}`.trim()}</Text>
    </Pressable>
  );

  const renderGroupSearchUser: ListRenderItem<User> = ({ item }) => {
    const selected = selectedUsers.some((user) => user.id === item.id);
    return (
      <Pressable
        className="flex-row items-center justify-between p-3.5 mb-2.5 border-2 border-black bg-white"
        onPress={() => onToggleUserSelection(item)}
      >
        <Text className="text-[15px] text-black">{item.username}</Text>
        <Box
          className={`w-6 h-6 border-2 border-black items-center justify-center ${
            selected ? 'bg-black' : 'bg-white'
          }`}
        >
          {selected && <Text className="text-white font-bold">✓</Text>}
        </Box>
      </Pressable>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────────
  const emptyState = (
    <Box className="flex-1 items-center justify-center p-6">
      <Text className="text-base text-black text-center">
        {searchQuery.trim() ? 'Nothing matched your search.' : 'No chats available yet.'}
      </Text>
    </Box>
  );

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white">
      <Box className="flex-row items-center px-4 py-4 gap-3">
        <Input className="flex-1 border-2 border-black rounded-none" size="md">
          <InputField
            placeholder="Search users or groups"
            placeholderTextColor="#000000"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            className="text-black px-3.5 py-3"
          />
        </Input>
        <Pressable
          className="w-11 h-11 border-2 border-black bg-black items-center justify-center"
          onPress={() => setShowGroupModal(true)}
        >
          <Text className="text-white text-2xl leading-6">＋</Text>
        </Pressable>
      </Box>

      {searchLoading && (
        <Box className="flex-row items-center px-4 pb-2 gap-2.5">
          <ActivityIndicator size="small" color="#000000" />
          <Text className="text-black">Searching…</Text>
        </Box>
      )}

      {error ? (
        <ErrorMessage message={error} onRetry={() => dispatch(fetchChats())} />
      ) : searchActive ? (
        <Box className="px-4 pb-6">
          {/* Users */}
          <Text className="text-sm font-bold text-black my-3 uppercase tracking-wide">Users</Text>
          {searchUsers.length > 0 ? (
            <FlatList
              data={searchUsers}
              keyExtractor={(item) => `user-${item.id}`}
              renderItem={renderUserResult}
              contentContainerClassName="pb-3"
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text className="text-black">No matching users.</Text>}
            />
          ) : (
            <Text className="text-black mb-2">No matching users.</Text>
          )}

          {/* Groups */}
          <Text className="text-sm font-bold text-black my-3 uppercase tracking-wide">Groups</Text>
          {searchChatItems.length > 0 ? (
            <FlatList
              data={searchChatItems}
              keyExtractor={(item) =>
                `${item.type ?? (item.isGroup ? 'group' : 'direct')}-${item.id}`
              }
              renderItem={renderChatItem}
              contentContainerClassName="pb-3"
              ListEmptyComponent={<Text className="text-black">No matching groups.</Text>}
            />
          ) : (
            <Text className="text-black">No matching groups.</Text>
          )}
        </Box>
      ) : (
        <FlatList
          data={chatList}
          keyExtractor={(item) =>
            `${item.type ?? (item.isGroup ? 'group' : 'direct')}-${item.id}`
          }
          renderItem={renderChatItem}
          contentContainerClassName="px-4 pb-6"
          ListEmptyComponent={emptyState}
        />
      )}

      <Modal animationType="slide" visible={showGroupModal} transparent>
        <Box className="flex-1 bg-black/35 justify-end">
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 justify-end"
          >
            <Box className="bg-white border-t-2 border-black p-5 min-h-[420px]">
              <Text className="text-lg font-bold text-black mb-3">New Group Chat</Text>

              {/* Group name */}
              <Input className="border-2 border-black rounded-none mb-3" size="md">
                <InputField
                  placeholder="Group name"
                  placeholderTextColor="#000000"
                  value={groupName}
                  onChangeText={setGroupName}
                  className="text-black px-3.5 py-3"
                />
              </Input>

              {/* User search */}
              <Input className="border-2 border-black rounded-none mb-3" size="md">
                <InputField
                  placeholder="Search users to add"
                  placeholderTextColor="#000000"
                  value={groupSearch}
                  onChangeText={setGroupSearch}
                  className="text-black px-3.5 py-3"
                />
              </Input>

              {/* Selected users chips */}
              {selectedUsers.length > 0 && (
                <Box className="flex-row flex-wrap gap-2.5 mb-3">
                  {selectedUsers.map((user) => (
                    <Box
                      key={user.id}
                      className="flex-row items-center py-2 px-3 border-2 border-black bg-white mb-2"
                    >
                      <Text className="text-black mr-2">{user.username}</Text>
                      <Pressable
                        className="w-6 h-6 border-2 border-black items-center justify-center"
                        onPress={() => onToggleUserSelection(user)}
                      >
                        <Text className="text-black font-bold">×</Text>
                      </Pressable>
                    </Box>
                  ))}
                </Box>
              )}

              {/* Group search results */}
              <FlatList
                data={groupSearchResults}
                keyExtractor={(item) => `user-${item.id}`}
                renderItem={renderGroupSearchUser}
                className="max-h-[220px]"
                keyboardShouldPersistTaps="handled"
              />

              {/* Action buttons */}
              <Box className="flex-row justify-between mt-4 gap-2">
                <Pressable
                  className="flex-1 border-2 border-black py-3.5 items-center bg-white"
                  onPress={() => setShowGroupModal(false)}
                >
                  <Text className="text-black font-bold uppercase tracking-wide">Cancel</Text>
                </Pressable>
                <Pressable
                  className={`flex-1 py-3.5 items-center border-2 ${
                    groupLoading || !groupName.trim() || selectedUsers.length === 0
                      ? 'bg-[#E5E7EB] border-[#E5E7EB]'
                      : 'bg-black border-black'
                  }`}
                  disabled={groupLoading || !groupName.trim() || selectedUsers.length === 0}
                  onPress={handleCreateGroup}
                >
                  <Text
                    className={`font-bold uppercase tracking-wide ${
                      groupLoading || !groupName.trim() || selectedUsers.length === 0
                        ? 'text-[#9CA3AF]'
                        : 'text-white'
                    }`}
                  >
                    {groupLoading ? 'Creating…' : 'Create Group'}
                  </Text>
                </Pressable>
              </Box>
            </Box>
          </KeyboardAvoidingView>
        </Box>
      </Modal>
    </SafeAreaView>
  );
}
