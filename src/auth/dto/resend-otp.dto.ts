import {
  IsEmail,
  IsNotEmpty,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';

export class ReSendOtpDto {
  @ValidateIf((o) => !o.email) // Validate if email is empty or undefined
  @IsPhoneNumber(null, { message: 'Invalid phone number' }) // Assuming you're validating phone numbers
  phone: string;

  @ValidateIf((o) => !o.phone) // Validate if phone is empty or undefined
  @IsNotEmpty({ message: 'Email should not be empty' })
  @IsEmail({}, { message: 'Invalid email' })
  email: string;
}
