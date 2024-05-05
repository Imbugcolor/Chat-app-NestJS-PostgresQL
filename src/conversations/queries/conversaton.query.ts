import { IsOptional } from 'class-validator';

export class ConversationQuery {
  @IsOptional()
  name?: string;
}
