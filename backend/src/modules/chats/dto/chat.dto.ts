/**
 * DTO for returning chat data to the client.
 * Used in API responses from chat endpoints.
 * Ensures type safety and consistent chat representation.
 */
import { MessageDto } from '../../messages/dto/message.dto';

export class ChatDto {
  /** Unique chat identifier */
  id!: number;

  /** Chat title (for group chats) */
  title?: string;

  /** URL to chat image/avatar */
  chatImageUrl?: string;

  /** Chat type: DIRECT or GROUP */
  type!: string;

  /** Computed group flag */
  isGroup!: boolean;

  /** Latest message preview */
  lastMessage?: MessageDto;

  /** Timestamp when chat was created */
  createdAt!: Date;

  /** Timestamp of last update */
  updatedAt!: Date;

  /** Members of the chat (users) */
  members?: Array<{
    id: number;
    username: string;
    firstName: string;
    lastName?: string | null;
    avatarUrl?: string | null;
  }>;
}
