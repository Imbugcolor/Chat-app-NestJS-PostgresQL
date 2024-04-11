import { User } from 'src/auth/users/entities/user.entity';
import { Participant } from 'src/conversations/entities/participant.entity';
import { Message } from 'src/messages/entities/message.entity';
import { UserLeavePayload } from '../types/userLeavePayload.type';
import { Conversation } from 'src/conversations/entities/conversation.entity';

export interface ServerToClientEvents {
  newMessage: (payload: Message) => void;
  updateMessage: (payload: Message) => void;
  deleteMessage: (payload: Message) => void;
  readMessage: (payload: Message) => void;
  userOnline: (payload: User) => void;
  userOffline: (payload: User) => void;
  newUsersJoinConversation: (payload: Participant[]) => void;
  userLeaveConversation: (payload: UserLeavePayload) => void;
  userCreateConversation: (payload: Conversation) => void;
}
