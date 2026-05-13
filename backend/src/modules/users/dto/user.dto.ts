/**
 * DTO for returning user data to the client.
 * Used in API responses to ensure consistent user representation.
 * 
 * Important: Password is NOT included in this DTO for security reasons.
 * This ensures passwords are never exposed in API responses.
 */
export class UserDto {
  /** Unique user identifier */
  id: number;

  /** User's email address (unique) */
  email: string;

  /** User's phone number (unique) */
  phone: string;

  /** User's first name */
  firstName: string;

  /** User's last name (optional) */
  lastName?: string;

  /** User's unique username (starts with @) */
  username: string;

  /** URL to user's avatar image (optional) */
  avatarUrl?: string;

  /** Firebase Cloud Messaging token (optional) */
  fcmToken?: string;

  /** Flag indicating if user is currently online */
  isOnline: boolean;

  /** Timestamp of user's last seen activity */
  lastSeen: Date;

  /** Timestamp when user account was created */
  createdAt: Date;

  /** Timestamp of last profile update */
  updatedAt: Date;
}
