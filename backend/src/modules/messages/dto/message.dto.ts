import { UserDto } from '../../users/dto/user.dto';

// DTO for returning message data to the client.
export class MessageDto {
  id!: number;

  content!: string;
  type!: string;

  chatId!: number;
  authorId!: number;

  author!: UserDto;

  createdAt!: Date;

  isRead!: boolean;
}
