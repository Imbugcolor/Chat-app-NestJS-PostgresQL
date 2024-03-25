import { Module } from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { ConversationsController } from './conversations.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Participant } from './entities/participant.entity';
import { User } from 'src/auth/users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Participant, User])],
  providers: [ConversationsService],
  controllers: [ConversationsController],
})
export class ConversationsModule {}
