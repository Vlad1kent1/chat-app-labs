import { AxiosError } from 'axios';
import { axiosInstance } from '@/src/api/axiosInstance';
import { Chat } from '@/src/types/Chat';
import { Message } from '@/src/types/Message';
import { User } from '@/src/types/User';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

const mapUser = (raw: any): User => ({
  id: String(raw.id),
  email: String(raw.email),
  name: String(raw.name),
  avatarUrl: raw.avatarUrl ?? undefined,
  createdAt: String(raw.createdAt),
});

const mapMessage = (raw: any): Message => ({
  id: String(raw.id),
  content: String(raw.content),
  chatId: String(raw.chatId),
  createdAt: String(raw.createdAt),
  author: mapUser(raw.author),
});

const mapChat = (raw: any): Chat => {
  const lastMessageRaw = Array.isArray(raw.messages) ? raw.messages[raw.messages.length - 1] : undefined;

  return {
    id: String(raw.id),
    title: raw.title ? String(raw.title) : undefined,
    isGroup: Boolean(raw.isGroup),
    updatedAt: String(raw.updatedAt),
    lastMessage: lastMessageRaw ? mapMessage(lastMessageRaw) : undefined,
  };
};

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as { message?: string } | undefined;
    return responseData?.message ?? error.message ?? 'Unable to load data from server';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred while fetching data';
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
    throw new Error(extractErrorMessage(error));
  }
}

export async function getMessages(chatId: string): Promise<Message[]> {
  try {
    const response = await axiosInstance.get<ApiResponse<any[]>>(`/chats/${chatId}/messages`);
    const payload = response.data.data;

    if (!Array.isArray(payload)) {
      throw new Error('Unexpected server response for messages');
    }

    return payload.map(mapMessage);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
