import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
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

  @Get()
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  getConversations(@GetUser() user: User) {
    return this.conversationsService.getConversations(user);
  }

  @Post('invite/:id')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  inviteJoinConversation(
    @GetUser() user: User,
    @Param('id') conversationId: number,
    @Body('userIds') userIds: number[],
  ) {
    return this.conversationsService.inviteJoinConversation(
      user,
      conversationId,
      userIds,
    );
  }

  @Delete('leave/:id')
  @UseGuards(AccessTokenGuard)
  leaveConversation(
    @GetUser() user: User,
    @Param('id') conversationId: number,
  ) {
    return this.conversationsService.leaveConversation(user, conversationId);
  }
}
