import { User } from './User';

export interface Message {
  id: string;
  content: string;
  chatId: string;
  author: User;
  createdAt: string;
}
