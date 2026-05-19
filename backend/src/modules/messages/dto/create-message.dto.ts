import { IsString, IsInt, IsOptional, IsEnum } from 'class-validator';

// DTO for creating a new message.
export class CreateMessageDto {

  @IsString()
  content!: string;

  @IsOptional()
  @IsInt()
  chatId?: number;

  @IsOptional()
  @IsInt()
  recipientId?: number;

  @IsOptional()
  @IsInt()
  authorId?: number;

  @IsEnum(['TEXT', 'IMAGE'])
  @IsOptional()
  type?: 'TEXT' | 'IMAGE' = 'TEXT';
}
