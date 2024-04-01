import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Message, PaginatedMessages } from './entities/message.entity';
import { User } from 'src/auth/users/entities/user.entity';
import { EventsGateway } from 'src/events/events.gateway';
import { HttpResponse } from 'src/httpReponses/http.response';
import { UserReadMessage } from './entities/userReadMessage.entity';
import { PaginateOptions, paginate } from 'src/common/pagination/paginator';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserReadMessage)
    private userReadMessageRepository: Repository<UserReadMessage>,
    private eventsGateway: EventsGateway,
  ) {}

  private async getMessageByConversationIdQuery(
    user: User,
    conversationId: number,
  ): Promise<SelectQueryBuilder<Message>> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.conversation', 'conversation')
      .leftJoinAndSelect('message.senderId', 'senderId')
      .where('conversation.id = :conversationId', { conversationId })
      .orderBy('message.createdAt', 'DESC');
  }

  public async getMessageByConversationIdPaginated(
    user: User,
    conversationId: number,
    paginateOptions?: PaginateOptions,
  ): Promise<PaginatedMessages> {
    return await paginate(
      await this.getMessageByConversationIdQuery(user, conversationId),
      paginateOptions,
    );
  }

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

  async readMessage(user: User, messageId: number) {
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.senderId', 'senderId')
      .leftJoinAndSelect('message.usersRead', 'usersRead')
      .leftJoinAndSelect('usersRead.readBy', 'readBy')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .where('message.id = :messageId', { messageId })
      .getOne();

    if (!message) {
      throw new BadRequestException('Message is not exist.');
    }

    if (
      message.senderId.id === user.id ||
      message.usersRead.some((_user) => _user.readBy.id === user.id)
    ) {
      return message;
    }

    const userRead = new UserReadMessage({ message, readBy: user });

    await this.userReadMessageRepository.save(userRead);

    const userIds: number[] = [];
    message.conversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return userIds.push(participant.user.id);
      }
    });

    this.eventsGateway.readMessage(message, userIds);

    return new HttpResponse().success();
  }
}
