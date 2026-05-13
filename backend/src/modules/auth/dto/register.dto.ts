import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

/**
 * DTO for user registration.
 * Used in the POST /auth/register endpoint.
 * 
 * Validation Rules:
 * - Email: Must be a valid email format
 * - Password: Minimum 8 characters, at least one uppercase, one number, one special char
 * - Phone: Optional, must be a valid phone format if provided
 * - FirstName: Required, minimum 2 characters
 */
export class RegisterDto {
  /**
   * User's email address (unique)
   * Used to generate username by removing domain and adding @ prefix
   * Example: john.doe@example.com -> @john.doe
   */
  @IsEmail()
  email: string;

  /**
   * User's password (minimum 8 characters)
   * Must contain uppercase, lowercase, number, and special character
   * Example: Password123!
   */
  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/
    , {
    message:
      'password must contain uppercase, lowercase, number and special character',
  })
  password: string;

  /**
   * User's first name
   */
  @IsString()
  @MinLength(2)
  firstName: string;

  /**
   * User's last name (optional)
   */
  @IsOptional()
  @IsString()
  lastName?: string;

  /**
   * User's phone number (optional during registration)
   */
  @IsOptional()
  @IsString()
  phone?: string;
}
