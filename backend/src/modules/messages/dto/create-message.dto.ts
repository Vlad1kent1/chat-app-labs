import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';

/**
 * DTO for creating a new message.
 * Used in the POST /messages endpoint.
 * Validates that the message has content, is associated with a chat and author.
 */
export class CreateMessageDto {
  /**
   * The message content/text
   * Must be a non-empty string
   */
  @IsString()
  content: string;

  /**
   * The ID of the chat where this message is being sent
   * Must be a positive integer
   */
  @IsInt()
  chatId: number;

  /**
   * The ID of the user creating/authoring the message
   * Must be a positive integer
   * Typically extracted from JWT token via @GetUser() decorator
   */
  @IsInt()
  authorId: number;

  /**
   * The message type (TEXT or IMAGE)
   * Defaults to TEXT
   */
  @IsEnum(['TEXT', 'IMAGE'])
  @IsOptional()
  type?: 'TEXT' | 'IMAGE' = 'TEXT';
}
