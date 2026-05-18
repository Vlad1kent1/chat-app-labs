import { io, type Socket } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const defaultBaseURL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';
const socketURL = process.env.EXPO_PUBLIC_API_URL ?? defaultBaseURL;

let socket: Socket | null = null;

export async function connectSocket(): Promise<Socket | null> {
  if (socket?.connected) {
    return socket;
  }

  const token = await SecureStore.getItemAsync('authToken');
  if (!token) {
    return null;
  }

  socket = io(socketURL, {
    auth: { token },
    transports: ['websocket'],
    autoConnect: true,
    forceNew: true,
  });

  socket.on('connect_error', (error) => {
    console.warn('[SOCKET] connect_error', error instanceof Error ? error.message : error);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeStatusChanged(
  handler: (payload: { userId: number; isOnline: boolean; lastSeen?: string }) => void,
) {
  if (!socket) {
    return () => undefined;
  }

  socket.on('statusChanged', handler);

  return () => {
    if (socket) {
      socket.off('statusChanged', handler);
    }
  };
}

export function subscribeChatCreated(handler: (payload: { chat: any }) => void) {
  if (!socket) {
    return () => undefined;
  }

  socket.on('chat_created', handler);

  return () => {
    if (socket) {
      socket.off('chat_created', handler);
    }
  };
}

export function subscribeMessageCreated(handler: (payload: { message: any }) => void) {
  if (!socket) {
    return () => undefined;
  }

  socket.on('message_created', handler);

  return () => {
    if (socket) {
      socket.off('message_created', handler);
    }
  };
}
