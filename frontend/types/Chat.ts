import { Message } from './Message';

export interface Chat {
  id: string;
  title?: string;
  isGroup: boolean;
  updatedAt: string;
  lastMessage?: Message;
}
