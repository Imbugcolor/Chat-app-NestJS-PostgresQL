import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Post,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/getUser.decorator';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { User } from 'src/auth/users/entities/user.entity';
import { ConversationsService } from './conversations.service';

@Controller('conversations')
@SerializeOptions({ strategy: 'excludeAll' })
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  createConversation(
    @GetUser() user: User,
    @Body('userIds') userIds: number[],
  ) {
    return this.conversationsService.createConversation(user, userIds);
  }
}
