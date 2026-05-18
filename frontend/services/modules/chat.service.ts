import { AxiosError } from 'axios';
import { axiosInstance } from '@services/api/axiosInstance';
import type { Chat, Message, User } from '@types';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

const mapUser = (raw: any): User => ({
  id: Number(raw.id),
  email: String(raw.email),
  phone: raw.phone ?? null,
  firstName: String(raw.firstName),
  lastName: raw.lastName ?? null,
  username: String(raw.username),
  avatarUrl: raw.avatarUrl ?? null,
  fcmToken: raw.fcmToken ?? null,
  isOnline: Boolean(raw.isOnline),
  lastSeen: String(raw.lastSeen),
  createdAt: String(raw.createdAt),
  updatedAt: String(raw.updatedAt),
});

const mapMessage = (raw: any): Message => ({
  id: String(raw.id),
  content: String(raw.content),
  chatId: String(raw.chatId),
  createdAt: String(raw.createdAt),
  author: mapUser(raw.author),
});

const mapChat = (raw: any): Chat => ({
  id: String(raw.id),
  title: raw.title ? String(raw.title) : undefined,
  isGroup: raw.type === 'GROUP',
  updatedAt: String(raw.updatedAt),
  lastMessage: raw.lastMessage ? mapMessage(raw.lastMessage) : undefined,
  members: Array.isArray(raw.members)
    ? raw.members.map((m: any) => mapUser(m.user ?? m))
    : undefined,
});

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as { message?: string } | undefined;
    return responseData?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
};

export async function getChats(): Promise<Chat[]> {
  try {
    const response = await axiosInstance.get<ApiResponse<any[]>>('/chats');
    const payload = response.data.data;

    if (!Array.isArray(payload)) {
      throw new Error('Unexpected server response for chats');
    }

    return payload.map(mapChat);
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Unable to load chats'));
  }
}

export async function searchChatEntities(query: string): Promise<{ users: User[]; chats: Chat[] }> {
  try {
    const response = await axiosInstance.get<ApiResponse<{ users: any[]; chats: any[] }>>(
      `/chats/search?query=${encodeURIComponent(query)}`,
    );
    const payload = response.data.data;

    return {
      users: Array.isArray(payload.users) ? payload.users.map(mapUser) : [],
      chats: Array.isArray(payload.chats) ? payload.chats.map(mapChat) : [],
    };
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Unable to perform search'));
  }
}

export async function createGroupChat(title: string, memberIds: number[]): Promise<Chat> {
  try {
    const response = await axiosInstance.post<ApiResponse<any>>('/chats/group', {
      title,
      isGroup: true,
      memberIds,
    });

    const payload = response.data.data;
    return mapChat(payload);
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Unable to create group chat'));
  }
}

export async function addParticipants(chatId: number, userIds: number[]): Promise<Chat> {
  try {
    await axiosInstance.post(`/chats/${chatId}/participants`, { userIds });
    const response = await axiosInstance.get<ApiResponse<any>>(`/chats/${chatId}`);
    return mapChat(response.data.data);
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Unable to add participants'));
  }
}

export async function updateChatTitle(chatId: number, title: string): Promise<Chat> {
  try {
    const response = await axiosInstance.patch<ApiResponse<any>>(`/chats/${chatId}`, { title });
    return mapChat(response.data.data);
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Unable to update chat title'));
  }
}

export async function getChat(chatId: string): Promise<Chat> {
  try {
    const response = await axiosInstance.get<ApiResponse<any>>(`/chats/${chatId}`);
    return mapChat(response.data.data);
  } catch (error) {
    throw new Error(extractErrorMessage(error, 'Unable to load chat')); 
  }
}

export async function checkDirectChat(recipientId: number): Promise<Chat | null> {
  try {
    const response = await axiosInstance.get<ApiResponse<any>>(`/chats/check-direct/${recipientId}`);
    return mapChat(response.data.data);
  } catch (error) {
    if (error instanceof AxiosError && error.response?.status === 404) {
      return null;
    }
    throw new Error(extractErrorMessage(error, 'Unable to check direct chat'));
  }
}
