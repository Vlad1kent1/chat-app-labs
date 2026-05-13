import { IsOptional, IsString, IsUrl } from 'class-validator';

/**
 * DTO for updating user profile information.
 * Used in the PATCH /users/:id endpoint.
 * All fields are optional to allow partial updates.
 */
export class UpdateUserDto {
  /**
   * User's first name
   * Optional for partial updates
   */
  @IsOptional()
  @IsString()
  firstName?: string;

  /**
   * User's last name
   * Optional for partial updates
   */
  @IsOptional()
  @IsString()
  lastName?: string;

  /**
   * URL to user's avatar image
   * Must be a valid URL format if provided
   */
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  /**
   * Firebase Cloud Messaging token for push notifications
   * Optional - can be updated separately
   */
  @IsOptional()
  @IsString()
  fcmToken?: string;
}
