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
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { Attachment } from './entities/attachment.entity';
import { MESSAGETYPE } from './enums/messageType.enum';
import { plainToClass } from 'class-transformer';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectRepository(UserReadMessage)
    private userReadMessageRepository: Repository<UserReadMessage>,
    @InjectRepository(Attachment)
    private attachmentRepository: Repository<Attachment>,
    private eventsGateway: EventsGateway,
    private cloudinaryService: CloudinaryService,
  ) {}

  private async getMessageByConversationIdQuery(
    user: User,
    conversationId: number,
  ): Promise<SelectQueryBuilder<Message>> {
    return this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .leftJoin('message.conversation', 'conversation')
      .leftJoin('conversation.participants', 'participants')
      .leftJoin('participants.user', 'user')
      .leftJoinAndSelect('message.senderId', 'senderId')
      .where('conversation.id = :conversationId', { conversationId })
      .andWhere('user.id = :userId', { userId: user.id })
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
    text: string,
    files?: Express.Multer.File[],
  ): Promise<Message> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();

    let message: Message;

    if (files && files.length > 0) {
      const attachments: Attachment[] = [];
      const imagesResponse = await this.cloudinaryService.uploadFiles(files);

      await Promise.all(
        imagesResponse.images.map(async (img) => {
          const attachment = new Attachment({
            url: img.url,
            public_id: img.public_id,
          });
          await this.attachmentRepository.save(attachment);
          attachments.push(attachment);
        }),
      );

      message = new Message({
        senderId: user,
        text: JSON.parse(text),
        conversation,
        attachments,
        message_type: MESSAGETYPE.PHOTOS,
      });
    } else {
      message = new Message({
        senderId: user,
        text,
        conversation,
        attachments: [],
      });
    }

    await this.messageRepository.save(message);

    const userIds: number[] = [];
    conversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return userIds.push(participant.user.id);
      }
    });

    this.eventsGateway.sendMessage(plainToClass(Message, message), userIds);

    return message;
  }

  async updateMessage(
    user: User,
    messageId: number,
    updateMessage: string,
  ): Promise<Message> {
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .leftJoinAndSelect('message.senderId', 'senderId')
      .where('message.id = :id', { id: messageId })
      .getOne();

    message.text = updateMessage;
    message.isUpdated = true;

    const updatedMessage = await this.messageRepository.save(message);

    const userIds: number[] = [];
    message.conversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return userIds.push(participant.user.id);
      }
    });

    this.eventsGateway.updateMessage(
      plainToClass(Message, updatedMessage),
      userIds,
    );

    return new Message(updatedMessage);
  }

  async deleteMessage(user: User, messageId: number) {
    const message = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .leftJoinAndSelect('message.senderId', 'senderId')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .where('message.id = :id', { id: messageId })
      .getOne();

    if (!message) {
      throw new BadRequestException('Message is not exists.');
    }

    if (user.id !== message.senderId.id) {
      throw new BadRequestException('Invalid request.');
    }

    if (message.attachments && message.attachments.length > 0) {
      const public_ids = [];
      message.attachments.map((att) => public_ids.push(att.public_id));
      await this.cloudinaryService.destroyFiles(public_ids);
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

    this.eventsGateway.deleteMessage(plainToClass(Message, message), userIds);

    return new HttpResponse().success();
  }

  async readMessage(user: User, conversationId: number) {
    const _conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.createdBy', 'createdBy')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .leftJoinAndSelect('messages.senderId', 'senderId')
      .leftJoinAndSelect('messages.usersRead', 'usersRead')
      .leftJoinAndSelect('usersRead.readBy', 'readBy')
      .where('conversation.id = :cvId', { cvId: conversationId })
      .orderBy('messages.createdAt', 'DESC')
      .getOne();

    if (!_conversation) {
      throw new BadRequestException('Conversation not exists.');
    }

    if (_conversation.messages.length < 1) {
      return;
    }

    if (
      _conversation.messages[0].senderId.id === user.id ||
      _conversation.messages[0].usersRead.some(
        (_user) => _user.readBy.id === user.id,
      )
    ) {
      return _conversation.messages[0];
    }

    const userRead = new UserReadMessage({
      message: _conversation.messages[0],
      readBy: user,
    });

    await this.userReadMessageRepository.save(userRead);

    const userIds: number[] = [];
    _conversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return userIds.push(participant.user.id);
      }
    });

    const newUsersRead = [..._conversation.messages[0].usersRead, userRead];

    const messageReponseData = new Message({
      ..._conversation.messages[0],
      conversation: _conversation,
      usersRead: newUsersRead,
    });

    this.eventsGateway.readMessage(
      plainToClass(Message, messageReponseData),
      userIds,
    );

    return messageReponseData;
  }
}
