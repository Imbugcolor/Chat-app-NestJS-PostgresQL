import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from 'src/auth/users/entities/user.entity';
import { EventsGateway } from 'src/events/events.gateway';
import { HttpResponse } from 'src/httpReponses/http.response';

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

  async updateMessage(
    user: User,
    messageId: number,
    context: string,
  ): Promise<Message> {
    const message = await this.messageRepository.findOne({
      relations: {
        conversation: {
          participants: {
            user: true,
          },
        },
        senderId: true,
      },
      where: {
        id: messageId,
      },
    });

    message.text = context;

    await this.messageRepository.save(message);

    const userIds: number[] = [];
    message.conversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return userIds.push(participant.user.id);
      }
    });

    this.eventsGateway.updateMessage(message, userIds);

    return message;
  }

  async deleteMessage(user: User, messageId: number) {
    const message = await this.messageRepository.findOne({
      relations: {
        conversation: {
          participants: {
            user: true,
          },
        },
        senderId: true,
      },
      where: {
        id: messageId,
      },
    });

    if (!message) {
      throw new BadRequestException('Message is not exists.');
    }

    if (user.id !== message.senderId.id) {
      throw new BadRequestException('Invalid request.');
    }

    await this.messageRepository
      .createQueryBuilder()
      .delete()
      .from(Message)
      .where('id = :id', { id: messageId })
      .execute();

    const userIds: number[] = [];
    message.conversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return userIds.push(participant.user.id);
      }
    });

    this.eventsGateway.deleteMessage(message, userIds);

    return new HttpResponse().success();
  }
}