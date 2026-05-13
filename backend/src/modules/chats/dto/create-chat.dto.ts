import { IsString, IsOptional, IsBoolean, IsUrl } from 'class-validator';

/**
 * DTO for creating a new chat.
 * Used in the POST /chats endpoint.
 * Supports both individual chats and group chats.
 */
export class CreateChatDto {
  /**
   * Chat title (required for group chats, optional for DMs)
   * Example: "Project Team", "Friends"
   */
  @IsOptional()
  @IsString()
  title?: string;

  /**
   * URL to chat group image/avatar (optional)
   */
  @IsOptional()
  @IsUrl()
  chatImageUrl?: string;

  /**
   * Flag indicating if this is a group chat
   * If false, it's a direct message (DM) between two users
   * Defaults to false
   */
  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;
}
