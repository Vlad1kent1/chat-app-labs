import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Pressable } from '@/components/ui/pressable';
import { Input, InputField } from '@/components/ui/input';

import { checkDirectChat, getChat, searchChatEntities, addParticipants, updateChatTitle } from '@services/modules/chat.service';
import type { Chat, User } from '@types';
import { useAppSelector } from '@store/hooks';

export default function ChatInfoScreen() {
  const router = useRouter();
  const authUser = useAppSelector((state) => state.auth.user);
  const { chatId } = useLocalSearchParams<{ chatId?: string }>();
  const resolvedChatId = Array.isArray(chatId) ? chatId[0] : chatId;
  const isDirectRoute = resolvedChatId?.startsWith('direct-');
  const directRecipientId = isDirectRoute
    ? Number(resolvedChatId?.replace('direct-', ''))
    : undefined;

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

  // ── Loading chat ──────────────────────────────────────────────────────────────
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

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const getHeaderTitle = (): string => {
    if (chat) {
      if (chat.isGroup) return chat.title?.trim() || `Group ${chat.id}`;
      const other = chat.members?.find((m) => m.id !== authUser?.id);
      return other
        ? `${other.firstName ?? ''} ${other.lastName ?? other.username ?? ''}`.trim()
        : `Chat ${chat.id}`;
    }
    if (isDirectRoute && directRecipientId) return 'New Conversation';
    return 'Chat Info';
  };

  const getRecipient = () => {
    if (!chat || chat.isGroup) return null;
    return chat.members?.find((m) => m.id !== authUser?.id) ?? null;
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
      const existingIds = new Set(chat?.members?.map((m) => m.id));
      setSearchResults(result.users.filter((u) => !existingIds.has(u.id)));
    } catch {
      setSearchResults([]);
    }
  };

  const toggleSelectedUser = (user: User) => {
    setSelectedUsers((prev) =>
      prev.some((item) => item.id === user.id)
        ? prev.filter((item) => item.id !== user.id)
        : [...prev, user],
    );
  };

  const handleAddParticipants = async () => {
    if (!chat || !chat.isGroup || selectedUsers.length === 0) return;
    setAdding(true);
    setError(null);
    try {
      const updated = await addParticipants(
        Number(chat.id),
        selectedUsers.map((u) => u.id),
      );
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
    if (!chat || !chat.isGroup || !newTitle.trim()) return;
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

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center"
          showsVerticalScrollIndicator={false}
        >
          <Stack.Screen options={{ headerShown: false }} />

          {/* ── Header ── */}
          <Box className="w-full flex-row items-center px-4 py-3.5 border-b-2 border-black bg-white">
            <Pressable
              className="w-10 h-10 border-2 border-black items-center justify-center"
              onPress={() => router.back()}
            >
              <Text className="text-black text-lg font-bold">{'<'}</Text>
            </Pressable>
            <Box className="flex-1 ml-3">
              <Text className="text-black text-[17px] font-bold">{getHeaderTitle()}</Text>
            </Box>
          </Box>

          {/* ── Content ── */}
          {loading ? (
            <Box className="flex-1 items-center justify-center py-10 gap-3">
              <ActivityIndicator size="large" color="#000000" />
              <Text className="text-base text-black mt-3">Loading chat info...</Text>
            </Box>
          ) : (
            <Box className="flex-1 p-4">

              {/* ── Recipient card (direct chat) ── */}
              {recipient ? (
                <Box className="border-2 border-black bg-white p-4 mb-4">
                  <Text className="text-sm font-bold text-black mb-3 uppercase tracking-wide">
                    Recipient
                  </Text>
                  <Box className="flex-row items-center">
                    <Box className="w-[52px] h-[52px] border-2 border-black items-center justify-center mr-3.5">
                      <Text className="text-black text-lg font-bold">
                        {`${recipient.firstName?.charAt(0) ?? ''}${recipient.lastName?.charAt(0) ?? ''}`.toUpperCase()}
                      </Text>
                    </Box>
                    <Box className="flex-1">
                      <Text className="text-base font-bold text-black mb-1">
                        {`${recipient.firstName ?? ''} ${recipient.lastName ?? recipient.username ?? ''}`.trim()}
                      </Text>
                      <Text className="text-sm text-black">{recipient.username}</Text>
                    </Box>
                  </Box>
                </Box>
              ) : null}

              {/* ── Rename group card ── */}
              {chat?.isGroup ? (
                <Box className="border-2 border-black bg-white p-4 mb-4">
                  <Text className="text-sm font-bold text-black mb-3 uppercase tracking-wide">
                    Group name
                  </Text>
                  <Input className="border-2 border-black rounded-none mb-3" size="md">
                    <InputField
                      value={newTitle}
                      onChangeText={setNewTitle}
                      placeholder="New group name"
                      placeholderTextColor="#000000"
                      className="text-black px-3.5 py-3"
                    />
                  </Input>
                  <Pressable
                    className={`border-2 py-3.5 items-center ${
                      renaming || !newTitle.trim()
                        ? 'bg-[#E5E7EB] border-[#E5E7EB]'
                        : 'bg-black border-black'
                    }`}
                    onPress={handleRename}
                    disabled={renaming || !newTitle.trim()}
                  >
                    <Text
                      className={`font-bold uppercase tracking-wide ${
                        renaming || !newTitle.trim() ? 'text-[#9CA3AF]' : 'text-white'
                      }`}
                    >
                      {renaming ? 'Renaming…' : 'Rename group'}
                    </Text>
                  </Pressable>
                </Box>
              ) : null}

              {/* ── Members card ── */}
              {chat?.isGroup ? (
                <Box className="border-2 border-black bg-white p-4 mb-4">
                  <Text className="text-sm font-bold text-black mb-3 uppercase tracking-wide">
                    Members
                  </Text>
                  <FlatList
                    data={chat.members ?? []}
                    keyExtractor={(item) => `member-${item.id}`}
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <Box className="py-3">
                        <Text className="text-[15px] font-bold text-black">
                          {`${item.firstName ?? ''} ${item.lastName ?? item.username ?? ''}`.trim()}
                        </Text>
                        <Text className="text-[13px] text-black mt-1">{item.username}</Text>
                      </Box>
                    )}
                    ItemSeparatorComponent={() => <Box className="h-0.5 bg-black" />}
                  />
                  <Pressable
                    className="border-2 border-black bg-black py-3.5 items-center mt-3"
                    onPress={() => setShowUserPicker(true)}
                  >
                    <Text className="text-white font-bold uppercase tracking-wide">
                      Add Participant
                    </Text>
                  </Pressable>
                </Box>
              ) : null}

              {/* ── User picker card ── */}
              {showUserPicker ? (
                <Box className="border-2 border-black bg-white p-4 mb-4">
                  <Text className="text-sm font-bold text-black mb-3 uppercase tracking-wide">
                    Find users
                  </Text>
                  <Input className="border-2 border-black rounded-none mb-3" size="md">
                    <InputField
                      value={searchTerm}
                      onChangeText={handleSearch}
                      placeholder="Search users"
                      placeholderTextColor="#000000"
                      className="text-black px-3.5 py-3"
                    />
                  </Input>
                  <FlatList
                    data={searchResults}
                    keyExtractor={(item) => `search-user-${item.id}`}
                    scrollEnabled={false}
                    renderItem={({ item }) => {
                      const selected = selectedUsers.some((u) => u.id === item.id);
                      return (
                        <Pressable
                          className="w-full flex-row justify-between items-center border-2 border-black p-3.5 mb-2.5 bg-white"
                          onPress={() => toggleSelectedUser(item)}
                        >
                          <Text className="text-black text-[15px]">
                            {`${item.firstName ?? ''} ${item.lastName ?? item.username ?? ''}`.trim()}
                          </Text>
                          <Text className="text-black text-[15px] font-bold">
                            {selected ? '✓' : '+'}
                          </Text>
                        </Pressable>
                      );
                    }}
                    ListEmptyComponent={
                      <Text className="text-black text-base mt-3">No users found.</Text>
                    }
                    className="max-h-[220px] mb-3"
                  />
                  <Box className="flex-row gap-2">
                    <Pressable
                      className="flex-1 border-2 border-black bg-white py-3.5 items-center"
                      onPress={() => setShowUserPicker(false)}
                    >
                      <Text className="text-black font-bold uppercase tracking-wide">Close</Text>
                    </Pressable>
                    <Pressable
                      className={`flex-1 border-2 py-3.5 items-center ${
                        adding || selectedUsers.length === 0
                          ? 'bg-[#E5E7EB] border-[#E5E7EB]'
                          : 'bg-black border-black'
                      }`}
                      onPress={handleAddParticipants}
                      disabled={adding || selectedUsers.length === 0}
                    >
                      <Text
                        className={`font-bold uppercase tracking-wide ${
                          adding || selectedUsers.length === 0 ? 'text-[#9CA3AF]' : 'text-white'
                        }`}
                      >
                        {adding ? 'Adding…' : 'Add'}
                      </Text>
                    </Pressable>
                  </Box>
                </Box>
              ) : null}

              {/* ── Error ── */}
              {error ? (
                <Text className="text-black text-sm mt-3">{error}</Text>
              ) : null}

            </Box>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
