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
  NEW_USERS_JOIN_CONVERSATION,
  READ_MESSAGE,
  UPDATE_MESSAGE,
  USER_LEAVE_CONVERSATION,
  USER_CREATE_CONVERSATION,
  USER_REMOVED_CONVERSATION,
} from './constants/messageEvent.contanst';
import { UserLeavePayload } from './types/userLeavePayload.type';
import { UserRemovedPayload } from './types/userRemovedPayload.type';
import { NewUsersJoinPayload } from './types/newUsersJoinPayload.type';

@WebSocketGateway({ cors: true })
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

        // emit online status user to client when loggin first time
        const logginTimes = await this.redisService.getClient(
          client.data.user.id,
        );

        if (logginTimes.length === 1) {
          const clients = await this.redisService.getAllClients();
          const socketClients = Object.keys(clients)
            .filter((key) => key !== `userId:${client.data.user.id}`) // Exclude 'userId:1'
            .flatMap((key) => clients[key]);
          socketClients.forEach((_client) => {
            this.server
              .to(`${_client}`)
              .emit('userOnline', client.data.user.id);
          });
        }
      } catch (error) {
        client.disconnect();
      }
    } else {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    if (client.data && client.data.user && client.data.user.id) {
      await this.redisService.removeClient(client.data.user.id, client.id);

      // emit offline status user to client when logout all session loggin
      const logginTimes = await this.redisService.getClient(
        client.data.user.id,
      );

      if (!logginTimes || logginTimes.length < 1) {
        const clients = await this.redisService.getAllClients();
        const socketClients = Object.keys(clients).flatMap(
          (key) => clients[key],
        );
        socketClients.forEach((_client) => {
          this.server.to(`${_client}`).emit('userOffline', client.data.user.id);
        });
      }
    }
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
      await Promise.all(
        usersId.map(async (id) => {
          const clients = await this.redisService.getClient(id);
          clients.forEach((client) => {
            this.server.to(`${client}`).emit(eventName, message);
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

  async readMessage(message: Message, usersId: number[]) {
    await this.handleMessageEvent(message, usersId, READ_MESSAGE);
  }

  async newConversation(conversation: Conversation, userIds: number[]) {
    await Promise.all(
      userIds.map(async (id) => {
        const clients = await this.redisService.getClient(id);
        clients.forEach((client) => {
          this.server
            .to(`${client}`)
            .emit(USER_CREATE_CONVERSATION, conversation);
        });
      }),
    );
  }

  async newUsersJoinConversation(
    payload: NewUsersJoinPayload,
    userIds: number[],
  ) {
    await Promise.all(
      userIds.map(async (id) => {
        const clients = await this.redisService.getClient(id);
        clients.forEach((client) => {
          this.server
            .to(`${client}`)
            .emit(NEW_USERS_JOIN_CONVERSATION, payload);
        });
      }),
    );
  }

  async leaveConversation(payload: UserLeavePayload, clientIds: number[]) {
    await Promise.all(
      clientIds.map(async (id) => {
        const clients = await this.redisService.getClient(id);
        clients.forEach((client) => {
          this.server.to(`${client}`).emit(USER_LEAVE_CONVERSATION, payload);
        });
      }),
    );
  }

  async userRemovedFromConversation(
    payload: UserRemovedPayload,
    clientIds: number[],
  ) {
    await Promise.all(
      clientIds.map(async (id) => {
        const clients = await this.redisService.getClient(id);
        clients.forEach((client) => {
          this.server.to(`${client}`).emit(USER_REMOVED_CONVERSATION, payload);
        });
      }),
    );
  }
}
