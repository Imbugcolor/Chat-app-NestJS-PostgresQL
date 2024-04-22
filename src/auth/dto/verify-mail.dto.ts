import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class VerifyMailDto {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}
