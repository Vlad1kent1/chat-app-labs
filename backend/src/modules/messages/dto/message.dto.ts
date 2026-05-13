/**
 * DTO for returning message data to the client.
 * Used in API responses from GET and POST message endpoints.
 * Ensures type safety and consistent message representation.
 */
export class MessageDto {
  /** Unique message identifier */
  id: number;

  /** The message content/text */
  content: string;

  /** Message type (TEXT or IMAGE) */
  type: string;

  /** The ID of the chat this message belongs to */
  chatId: number;

  /** The ID of the user who authored this message */
  authorId: number;

  /** Timestamp when the message was created */
  createdAt: Date;

  /** Flag indicating if the message has been read by recipients */
  isRead: boolean;
}
