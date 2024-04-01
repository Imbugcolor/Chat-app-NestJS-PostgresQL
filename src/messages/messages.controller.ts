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
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { MessagesService } from './messages.service';
import { GetUser } from 'src/auth/decorators/getUser.decorator';
import { AccessTokenGuard } from 'src/auth/guards/accessToken.guard';
import { User } from 'src/auth/users/entities/user.entity';
import { ListMessages } from './dto/getMessages.dto';

@Controller('messages')
@SerializeOptions({ strategy: 'excludeAll' })
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('/:conversationId')
  @UseGuards(AccessTokenGuard)
  @UsePipes(new ValidationPipe({ transform: true }))
  @UseInterceptors(ClassSerializerInterceptor)
  async getMessagesByConversationId(
    @GetUser() user: User,
    @Param('conversationId', ParseIntPipe) id: number,
    @Query() filter: ListMessages,
  ) {
    return this.messagesService.getMessageByConversationIdPaginated(user, id, {
      currentPage: filter.page,
      limit: filter.limit,
    });
  }

  @Post('/:conversationId')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async createMessage(
    @GetUser() user: User,
    @Param('conversationId', ParseIntPipe) id: number,
    @Body('context') context: string,
  ) {
    return this.messagesService.createMessage(user, id, context);
  }

  @Patch('/:messageId')
  @UseGuards(AccessTokenGuard)
  @UseInterceptors(ClassSerializerInterceptor)
  async updateMessage(
    @GetUser() user: User,
    @Param('messageId', ParseIntPipe) id: number,
    @Body('context') context: string,
  ) {
    return this.messagesService.updateMessage(user, id, context);
  }

  @Delete('/:messageId')
  @UseGuards(AccessTokenGuard)
  async deleteMessage(
    @GetUser() user: User,
    @Param('messageId', ParseIntPipe) id: number,
  ) {
    return this.messagesService.deleteMessage(user, id);
  }

  @Patch('read/:messageId')
  @UseGuards(AccessTokenGuard)
  async readMessage(
    @GetUser() user: User,
    @Param('messageId', ParseIntPipe) id: number,
  ) {
    return this.messagesService.readMessage(user, id);
  }
}
