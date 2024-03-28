import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from 'src/auth/users/entities/user.entity';
import { EventsGateway } from 'src/events/events.gateway';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(User) private userRepository: Repository<User>,
    private eventsGateway: EventsGateway,
  ) {}

  async getMessageByConversationId(user: User, conversationId: number) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
      relations: {
        messages: {
          senderId: true,
        },
      },
    });

    return conversation;
  }

  // async getParticipantsByConversation(conversationId: number) {
  //   const participants = await this.conversationRepository.findOne({
  //     relations: {

  //     },
  //     where: {
  //       id: conversationId,
  //     },
  //   })
  // }

  async createMessage(
    user: User,
    conversationId: number,
    context: string,
  ): Promise<Message> {
    const conversation = await this.conversationRepository.findOne({
      relations: {
        participants: {
          user: true,
        },
      },
      where: { id: conversationId },
    });

    const message = new Message({
      senderId: user,
      text: context,
      conversation,
    });

    await this.messageRepository.save(message);

    const userIds: number[] = [];
    conversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return userIds.push(participant.user.id);
      }
    });

    this.eventsGateway.sendMessage(message, userIds);

    return message;
  }
}
