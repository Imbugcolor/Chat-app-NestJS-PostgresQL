import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RedisService } from 'src/redis/redis.service';
import { ServerToClientEvents } from './interfaces/events.interface';
import { Message } from 'src/messages/entities/message.entity';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebsocketExceptionsFilter } from './exception/wsExceptionFilter';
import { User } from 'src/auth/users/entities/user.entity';
import { Participant } from 'src/conversations/entities/participant.entity';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import {
  CREATE_MESSAGE,
  DELETE_MESSAGE,
  UPDATE_MESSAGE,
} from './constants/messageEvent.contanst';

@WebSocketGateway()
@UseFilters(WebsocketExceptionsFilter)
@UsePipes(new ValidationPipe({ transform: true }))
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  @WebSocketServer()
  server: Server<any, ServerToClientEvents>;

  afterInit(server: Server) {
    // console.log(server);
  }

  async handleConnection(client: Socket) {
    const { authorization } = client.handshake.headers;

    if (authorization && (authorization as string)?.split(' ')[1]) {
      try {
        client.data.user = await this.jwtService.verifyAsync(
          (authorization as string).split(' ')[1],
          {
            secret: this.configService.get('JWT_SECRET'),
          },
        );

        // store client into Redis
        await this.redisService.addClient(client.data.user.id, client.id);
      } catch (error) {
        client.disconnect();
      }
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    await this.redisService.removeClient(client.data?.user?.id, client.id);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any = 'Hello'): any {
    return { clientId: client.id, payload };
  }

  async handleMessageEvent(
    message: Message,
    usersId: number[],
    eventName: any,
  ) {
    if (usersId.length > 0) {
      const serializeSenderData = this.serializeUserData(message.senderId);
      const serializeUserParticipantsData: Participant[] =
        message.conversation.participants.map((participant) => {
          return {
            ...participant,
            user: this.serializeUserData(participant.user),
          };
        });

      const conversation: Conversation = {
        ...message.conversation,
        participants: serializeUserParticipantsData,
      };

      const serialData = {
        ...message,
        senderId: serializeSenderData,
        conversation,
      };

      await Promise.all(
        usersId.map(async (id) => {
          const clients = await this.redisService.getClient(id);
          clients.forEach((client) => {
            this.server.to(`${client}`).emit(eventName, serialData);
          });
        }),
      );
    }
    return;
  }

  async sendMessage(message: Message, usersId: number[]) {
    await this.handleMessageEvent(message, usersId, CREATE_MESSAGE);
  }

  async updateMessage(message: Message, usersId: number[]) {
    await this.handleMessageEvent(message, usersId, UPDATE_MESSAGE);
  }

  async deleteMessage(message: Message, usersId: number[]) {
    await this.handleMessageEvent(message, usersId, DELETE_MESSAGE);
  }

  private serializeUserData(data: User): User {
    delete data.password;
    delete data.rf_token;
    delete data.conversations;
    delete data.participants;
    delete data.messages;
    return data;
  }
}
