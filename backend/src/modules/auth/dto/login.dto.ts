import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO for user login.
 * Used in the POST /auth/login endpoint.
 * 
 * Supports two login methods:
 * 1. Email + Password
 * 2. Phone + Password
 * 
 * At least one of email or phone is required.
 */
export class LoginDto {
  /**
   * User's email address (optional if phone is provided)
   */
  @IsString()
  email?: string;

  /**
   * User's phone number (optional if email is provided)
   */
  @IsString()
  phone?: string;

  /**
   * User's password
   * Required for both login methods
   */
  @IsNotEmpty()
  @IsString()
  password: string;
}
