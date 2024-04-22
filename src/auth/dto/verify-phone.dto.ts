import { IsNotEmpty, IsPhoneNumber, IsString } from 'class-validator';

export class VerifyPhoneDto {
  @IsString()
  @IsPhoneNumber(null, { message: 'Invalid phone number' })
  phone: string;

  @IsString()
  @IsNotEmpty()
  code: string;
}
