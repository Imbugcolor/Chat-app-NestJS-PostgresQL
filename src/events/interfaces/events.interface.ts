import { Message } from 'src/messages/entities/message.entity';

export interface ServerToClientEvents {
  newMessage: (payload: Message) => void;
  updateMessage: (payload: Message) => void;
  deleteMessage: (payload: Message) => void;
}
