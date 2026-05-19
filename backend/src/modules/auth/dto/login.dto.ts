import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

// DTO for user login.
export class LoginDto {

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsNotEmpty()
  @IsString()
  password!: string;
}
