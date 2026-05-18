import { Message } from './Message';

export interface Chat {
  id: string;
  title?: string;
  type?: string;
  chatImageUrl?: string;
  isGroup: boolean;
  updatedAt: string;
  lastMessage?: Message;
  members?: import('./index').User[];
}
