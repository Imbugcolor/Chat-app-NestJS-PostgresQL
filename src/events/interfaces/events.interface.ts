import { User } from 'src/auth/users/entities/user.entity';
import { Message } from 'src/messages/entities/message.entity';

export interface ServerToClientEvents {
  newMessage: (payload: Message) => void;
  updateMessage: (payload: Message) => void;
  deleteMessage: (payload: Message) => void;
  readMessage: (payload: Message) => void;
  userOnline: (payload: User) => void;
  userOffline: (payload: User) => void;
}
