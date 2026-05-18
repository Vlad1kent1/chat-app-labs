import { AxiosError } from 'axios';
import { axiosInstance } from '@services/api/axiosInstance';
import type { Message, User } from '@types';

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

const extractErrorMessage = (error: unknown): string => {
  if (error instanceof AxiosError) {
    const responseData = error.response?.data as { message?: string } | undefined;
    return responseData?.message ?? error.message ?? 'Unable to load messages from server';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unknown error occurred while fetching messages';
};

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

export async function sendMessage(
  content: string,
  chatId?: string,
  recipientId?: number,
): Promise<Message> {
  try {
    const response = await axiosInstance.post<ApiResponse<any>>('/messages', {
      content,
      chatId: chatId ? Number(chatId) : undefined,
      recipientId,
    });

    return mapMessage(response.data.data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function updateMessage(messageId: string, content: string): Promise<Message> {
  try {
    const response = await axiosInstance.patch<ApiResponse<any>>(`/messages/${messageId}`, { content });
    return mapMessage(response.data.data);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}

export async function deleteMessage(messageId: string): Promise<void> {
  try {
    await axiosInstance.delete(`/messages/${messageId}`);
  } catch (error) {
    throw new Error(extractErrorMessage(error));
  }
}
