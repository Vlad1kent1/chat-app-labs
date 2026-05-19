import { UserDto } from '../../users/dto/user.dto';

// DTO for authentication responses.
export class AuthResponseDto {
  user!: UserDto;
  accessToken!: string;
}
