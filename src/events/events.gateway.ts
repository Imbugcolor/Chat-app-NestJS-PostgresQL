import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway()
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    // console.log(server);
  }

  handleConnection(client: Socket) {
    // const authHeader = client.handshake.headers.authorization;

    // if (authHeader && (authHeader as string).split(' ')[1]) {

    // } else {
    //   client.disconnect();
    // }
    console.log('Connected: ', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Disconnected: ', client.id);
  }

  @SubscribeMessage('message')
  handleMessage(client: any, payload: any): string {
    return 'Hello world!';
  }
}
