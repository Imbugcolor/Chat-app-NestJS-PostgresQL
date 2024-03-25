import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './auth/users/entities/user.entity';
import { Role } from './auth/roles/entities/role.entity';
import { UserRole } from './auth/roles/entities/userRoles.entity';
import { ConversationsModule } from './conversations/conversations.module';
import { Conversation } from './conversations/entities/conversation.entity';
import { Participant } from './conversations/entities/participant.entity';
import { ConversationDeleted } from './conversations/entities/conversationdeleted.entity';
import { MessagesModule } from './messages/messages.module';
import { Message } from './messages/entities/message.entity';
import { Attachment } from './messages/entities/attachment.entity';
import { MessageDeleted } from './messages/entities/messageDeleted.entity';

@Module({
  imports: [
    EventsModule,
    AuthModule,
    ConfigModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: configService.get('DB_PORT'),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          User,
          Role,
          UserRole,
          Conversation,
          Participant,
          ConversationDeleted,
          Message,
          Attachment,
          MessageDeleted,
        ],
        synchronize: true,
      }),
    }),
    ConversationsModule,
    MessagesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
