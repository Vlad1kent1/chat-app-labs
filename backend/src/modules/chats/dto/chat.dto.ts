/**
 * DTO for returning chat data to the client.
 * Used in API responses from chat endpoints.
 * Ensures type safety and consistent chat representation.
 */
export class ChatDto {
  /** Unique chat identifier */
  id: number;

  /** Chat title (for group chats) */
  title?: string;

  /** URL to chat image/avatar */
  chatImageUrl?: string;

  /** Flag indicating if this is a group chat */
  isGroup: boolean;

  /** Timestamp when chat was created */
  createdAt: Date;

  /** Timestamp of last update */
  updatedAt: Date;
}
