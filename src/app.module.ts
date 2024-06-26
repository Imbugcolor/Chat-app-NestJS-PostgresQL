import { Module, OnApplicationBootstrap } from '@nestjs/common';
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
import { ConversationDeleted } from './conversations/entities/conversationDeleted.entity';
import { MessagesModule } from './messages/messages.module';
import { Message } from './messages/entities/message.entity';
import { Attachment } from './messages/entities/attachment.entity';
import { RedisModule } from './redis/redis.module';
import { UserReadMessage } from './messages/entities/userReadMessage.entity';
import { RedisService } from './redis/redis.service';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { configValidationSchema } from './config/config.schema';
import { OtpModule } from './otp/otp.module';
import { MailModule } from './mail/mail.module';

@Module({
  imports: [
    EventsModule,
    AuthModule,
    ConfigModule.forRoot({
      envFilePath: [`.env.stage.${process.env.STAGE}`],
      validationSchema: configValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const isProduction = configService.get('STAGE') === 'prod';
        return {
          ssl: isProduction,
          extra: {
            ssl: isProduction ? { rejectUnauthorized: false } : null,
          },
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
            UserReadMessage,
          ],
          synchronize: true,
        };
      },
    }),
    ConversationsModule,
    MessagesModule,
    RedisModule,
    CloudinaryModule,
    OtpModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private readonly redisService: RedisService) {}

  async onApplicationBootstrap(): Promise<void> {
    // Clear cache on application startup
    this.redisService.clearCacheStartingWith('userId');
  }
}
