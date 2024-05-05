import { User } from 'src/auth/users/entities/user.entity';
import { Message } from 'src/messages/entities/message.entity';
import { UserLeavePayload } from '../types/userLeavePayload.type';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { UserRemovedPayload } from '../types/userRemovedPayload.type';
import { NewUsersJoinPayload } from '../types/newUsersJoinPayload.type';

export interface ServerToClientEvents {
  newMessage: (payload: Message) => void;
  updateMessage: (payload: Message) => void;
  deleteMessage: (payload: Message) => void;
  readMessage: (payload: Message) => void;
  userOnline: (payload: User) => void;
  userOffline: (payload: User) => void;
  newUsersJoinConversation: (payload: NewUsersJoinPayload) => void;
  userLeaveConversation: (payload: UserLeavePayload) => void;
  userCreateConversation: (payload: Conversation) => void;
  userRemovedConversation: (payload: UserRemovedPayload) => void;
}
