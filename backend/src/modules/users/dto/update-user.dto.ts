import { IsOptional, IsString, IsEmail, IsUrl } from 'class-validator';

/**
 * DTO for updating user profile information.
 * Used in PATCH /users/profile endpoint.
 * Note: email is included but should be treated as read-only in the frontend for UX purposes.
 */
export class UpdateUserDto {
  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}
