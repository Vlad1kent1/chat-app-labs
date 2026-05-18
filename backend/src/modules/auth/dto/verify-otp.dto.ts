import { IsEmail, IsString, Length, IsIn } from 'class-validator';

export class VerifyOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @Length(6, 6)
  code!: string;

  @IsString()
  @IsIn(['REGISTER', 'RESET'])
  type!: 'REGISTER' | 'RESET';
}