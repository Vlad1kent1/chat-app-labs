import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';

/**
 * DTO for creating a new message.
 * Used in the POST /messages endpoint.
 * Validates that the message has content and is associated with a chat or recipient.
 */
export class CreateMessageDto {
  /**
   * The message content/text
   * Must be a non-empty string
   */
  @IsString()
  content!: string;

  /**
   * The ID of the chat where this message is being sent.
   * If omitted, recipientId must be provided to create a direct chat lazily.
   */
  @IsOptional()
  @IsInt()
  chatId?: number;

  /**
   * The ID of the recipient user when creating a new direct chat lazily.
   */
  @IsOptional()
  @IsInt()
  recipientId?: number;

  /**
   * The ID of the user creating/authoring the message.
   * This value is populated on the server side from the authenticated token.
   */
  @IsOptional()
  @IsInt()
  authorId?: number;

  /**
   * The message type (TEXT or IMAGE)
   * Defaults to TEXT
   */
  @IsEnum(['TEXT', 'IMAGE'])
  @IsOptional()
  type?: 'TEXT' | 'IMAGE' = 'TEXT';
}
