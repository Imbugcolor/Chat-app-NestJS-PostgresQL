import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  SerializeOptions,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { GetUser } from 'src/auth/decorators/getUser.decorator';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { User } from 'src/auth/users/entities/user.entity';
import { ConversationsService } from './conversations.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { Attachment } from 'src/messages/entities/attachment.entity';
import { ConversationQuery } from './queries/conversaton.query';

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
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(ClassSerializerInterceptor)
  getConversations(@GetUser() user: User, @Query() filter: ConversationQuery) {
    return this.conversationsService.getConversations(user, filter);
  }

  @Post('invite/:id')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  inviteJoinConversation(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) conversationId: number,
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

  @Delete(':conversationId/user/:userId')
  @UseGuards(AccessTokenGuard)
  removeUserFromConversation(
    @GetUser() user: User,
    @Param('conversationId') conversationId: number,
    @Param('userId') userId: number,
  ) {
    return this.conversationsService.removeUserFromConversation(
      user,
      conversationId,
      userId,
    );
  }

  @Patch('name/:id')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  updateNameConversation(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) conversationId: number,
    @Body('name') updateName: string,
  ) {
    return this.conversationsService.updateNameConversation(
      user,
      conversationId,
      updateName,
    );
  }

  @Patch('thumbnail/:id')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(FileInterceptor('file'))
  updateThumbnail(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) conversationId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.conversationsService.updateThumbnail(
      user,
      conversationId,
      file,
    );
  }

  @Get('photos/:id')
  @UseGuards(AccessTokenGuard)
  getPhotosByConversation(
    @GetUser() user: User,
    @Param('id', ParseIntPipe) conversationId: number,
  ): Promise<Attachment[]> {
    return this.conversationsService.getPhotosByConversation(
      user,
      conversationId,
    );
  }
}
