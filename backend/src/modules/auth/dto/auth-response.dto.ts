import { UserDto } from '../../users/dto/user.dto';

/**
 * DTO for authentication responses.
 * Returned from login and register endpoints.
 *
 * Contains the authenticated user data and JWT access token.
 */
export class AuthResponseDto {
  /**
   * The authenticated user's information
   */
  user: UserDto;

  /**
   * JWT access token for subsequent authenticated requests
   * Include in Authorization header: Bearer <accessToken>
   */
  accessToken: string;
}
