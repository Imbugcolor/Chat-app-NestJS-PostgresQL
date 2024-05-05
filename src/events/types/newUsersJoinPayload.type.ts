import { Conversation } from 'src/conversations/entities/conversation.entity';

export type NewUsersJoinPayload = {
  conversation: Conversation;
  userIds: number[];
};
