// DTO for returning chat data to the client.
import { MessageDto } from '../../messages/dto/message.dto';

export class ChatDto {
  id!: number;

  title?: string;
  chatImageUrl?: string;

  type!: string;

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
