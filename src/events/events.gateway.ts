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

@WebSocketGateway()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // console.log(server);
  }

  async handleConnection(client: Socket) {
    const { authorization } = client.handshake.headers;
    console.log((authorization as string).split(' ')[1]);

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
        console.log(error);
        return client.disconnect();
      }
    } else {
      return client.disconnect();
    }
    console.log(
      'Client connected: ',
      client.id,
      'User connected: ',
      client.data.user.id,
    );
    console.log(await this.redisService.getClient(client.data.user.id));
  }

  async handleDisconnect(client: Socket) {
    await this.redisService.removeClient(client.data?.user?.id, client.id);
    console.log('Disconnected: ', client.id, client.data.user.id);
  }

  @SubscribeMessage('message')
  handleMessage(client: Socket, payload: any = 'Hello'): any {
    return { clientId: client.id, payload };
  }
}
