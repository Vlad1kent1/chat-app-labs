import { IsEmail, IsString, IsIn } from 'class-validator';

export class SendOtpDto {
  @IsEmail()
  email!: string;

  @IsString()
  @IsIn(['REGISTER', 'RESET'])
  type!: 'REGISTER' | 'RESET';
}
