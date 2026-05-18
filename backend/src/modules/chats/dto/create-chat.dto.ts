import { IsString, IsOptional, IsBoolean, IsUrl, IsArray, ArrayNotEmpty, ArrayUnique, IsInt } from 'class-validator';

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
   * Alternate title field for compatibility.
   */
  @IsOptional()
  @IsString()
  name?: string;

  /**
   * URL to chat group image/avatar (optional)
   */
  @IsOptional()
  @IsUrl()
  chatImageUrl?: string;

  /**
   * Flag indicating if this is a group chat.
   * If false, it will be created as a direct chat.
   * Defaults to false.
   */
  @IsOptional()
  @IsBoolean()
  isGroup?: boolean;

  /**
   * Member IDs to add to a group chat.
   * The creator is always added automatically.
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  memberIds?: number[];

  /**
   * Alternate member ID array field for compatibility.
   */
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  userIds?: number[];
}
