import { Module } from '@nestjs/common';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { Message } from './entities/message.entity';
import { User } from 'src/auth/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, User])],
  controllers: [MessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
