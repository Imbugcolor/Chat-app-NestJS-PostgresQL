import {
  IsDate,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { GENDER } from '../users/enums/gender.enum';
import { Type } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  fullname: string;

  @IsOptional()
  @IsEnum(GENDER)
  gender: GENDER;

  @IsOptional()
  @IsString()
  bio: string;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  dateOfBirth: Date;
}
