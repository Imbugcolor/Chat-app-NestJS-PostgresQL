import { IsOptional } from 'class-validator';

export class ListMessages {
  @IsOptional()
  page?: number = 1;

  @IsOptional()
  limit?: number = 10;
}
