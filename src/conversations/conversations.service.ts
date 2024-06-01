import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Repository, UpdateResult } from 'typeorm';
import { Participant } from './entities/participant.entity';
import { User } from 'src/auth/users/entities/user.entity';
import { HttpResponse } from 'src/httpReponses/http.response';
import { EventsGateway } from 'src/events/events.gateway';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { MESSAGETYPE } from 'src/messages/enums/messageType.enum';
import { Message } from 'src/messages/entities/message.entity';
import { Attachment } from 'src/messages/entities/attachment.entity';
import { plainToClass } from 'class-transformer';
import { ConversationQuery } from './queries/conversaton.query';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
    @InjectRepository(Message)
    private messageRepository: Repository<Message>,
    private eventsGateway: EventsGateway,
    private cloudinaryService: CloudinaryService,
  ) {}

  async createConversation(user: User, userIds: number[]) {
    await Promise.all(
      userIds.map(async (id) => {
        const user = await this.userRepository.findOneBy({ id });

        if (!user) {
          throw new BadRequestException(`User ${id} not exists.`);
        }
      }),
    );

    const participants = await Promise.all(
      userIds.map(async (userId) => {
        const user = await this.userRepository.findOneBy({ id: userId });
        const participant = new Participant({ user });
        await this.participantRepository.save(participant);

        return participant;
      }),
    );

    const userCv = new Participant({ user });
    await this.participantRepository.save(userCv);
    participants.push(userCv);

    const newConversation = new Conversation({
      createdBy: user,
      participants,
    });

    await this.conversationRepository.save(newConversation);

    this.eventsGateway.newConversation(
      plainToClass(Conversation, newConversation),
      userIds,
    );

    return newConversation;
  }

  async getConversation(user: User, conversationId: number) {
    try {
      const conversation = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.createdBy', 'createdBy')
        .leftJoinAndSelect('conversation.participants', 'participants')
        .leftJoinAndSelect('participants.user', 'user')
        .leftJoinAndSelect('conversation.messages', 'messages')
        .leftJoinAndSelect('messages.senderId', 'senderId')
        .leftJoinAndSelect('messages.usersRead', 'usersRead')
        .leftJoinAndSelect('usersRead.readBy', 'readBy')
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('user.id = :userId', { userId: user.id })
        .getOne();
      if (conversation === null) {
        throw new BadRequestException('Conversation not exists.');
      }

      const lastMessage = conversation.messages[0]; // Assuming messages are sorted in descending order of createdAt

      let numUnReads = 0;
      for (const message of conversation.messages) {
        if (
          message.senderId.id === user.id ||
          message.usersRead.some((usr) => usr.readBy.id === user.id)
        ) {
          break; // Exit the loop when encountering a read message
        }
        numUnReads++;
      }

      if (lastMessage && lastMessage.senderId.id === user.id) {
        return new Conversation({
          ...conversation,
          messages: [],
          lastMessage: conversation.messages[0],
          isRead: true,
          numUnReads,
        });
      } else {
        if (
          lastMessage &&
          lastMessage.usersRead &&
          lastMessage.usersRead.some(
            (userRead) => userRead.readBy.id === user.id,
          )
        ) {
          return new Conversation({
            ...conversation,
            messages: [],
            lastMessage: conversation.messages[0],
            isRead: true,
            numUnReads,
          });
        }
        return new Conversation({
          ...conversation,
          messages: [],
          lastMessage: conversation.messages[0],
          isRead: false,
          numUnReads,
        });
      }
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  private async getConversationBaseQuery() {
    return this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.createdBy', 'createdBy')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .leftJoinAndSelect('messages.senderId', 'senderId')
      .leftJoinAndSelect('messages.usersRead', 'usersRead')
      .leftJoinAndSelect('usersRead.readBy', 'readBy')
      .leftJoinAndMapMany(
        'conversation.allParticipants',
        'conversation.participants',
        'allParticipants',
      )
      .leftJoinAndSelect('allParticipants.user', 'allUsers')
      .orderBy('messages.createdAt', 'DESC');
  }

  async getConversations(user: User, conversationQuery?: ConversationQuery) {
    let conversations: Conversation[];
    const query = await this.getConversationBaseQuery();

    if (conversationQuery && conversationQuery.name) {
      conversations = await query
        .where('allUsers.id = :userId', { userId: user.id })
        .andWhere('LOWER(conversation.name) like LOWER(:name)', {
          name: `%${conversationQuery.name}%`,
        })
        .getMany();
    } else {
      conversations = await query
        .where('allUsers.id = :userId', { userId: user.id })
        .getMany();
    }

    const conversationsRead: number[] = [];

    conversations.map((conversation) => {
      const lastMessage = conversation.messages[0]; // Assuming messages are sorted in descending order of createdAt

      if (lastMessage && lastMessage.senderId.id === user.id) {
        return conversationsRead.push(conversation.id);
      } else {
        if (
          lastMessage &&
          lastMessage.usersRead &&
          lastMessage.usersRead.some(
            (userRead) => userRead.readBy.id === user.id,
          )
        ) {
          return conversationsRead.push(conversation.id);
        }
        return;
      }
    });

    // const ids = conversations.map((cv) => cv.id);

    const __conversations = conversations.map((conversation) => {
      let numUnReads = 0;
      for (const message of conversation.messages) {
        if (
          message.senderId.id === user.id ||
          message.usersRead.some((usr) => usr.readBy.id === user.id)
        ) {
          break; // Exit the loop when encountering a read message
        }
        numUnReads++;
      }
      if (conversationsRead.some((cv) => cv === conversation.id)) {
        return new Conversation({
          ...conversation,
          messages: [],
          lastMessage: conversation.messages[0],
          isRead: true,
          numUnReads,
        });
      } else {
        return new Conversation({
          ...conversation,
          messages: [],
          lastMessage: conversation.messages[0],
          isRead: false,
          numUnReads,
        });
      }
    });

    return __conversations;
  }

  private async getUserIdsParticipantByConversation(conversationId: number) {
    const cv = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();

    const participantIds: number[] = [];

    cv?.participants.map((participant) =>
      participantIds.push(participant.user.id),
    );

    return participantIds;
  }

  private async getUsersParticipantByConversation(conversationId: number) {
    const cv = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .where('conversation.id = :conversationId', { conversationId })
      .getOne();

    const participants: Participant[] = [];

    cv?.participants.map((participant) =>
      participants.push(new Participant(participant)),
    );

    return participants;
  }

  async inviteJoinConversation(
    user: User,
    conversationId: number,
    inviteUserIds: number[],
  ) {
    const conversation = await this.getConversation(user, conversationId);

    // create new participants
    const participants: Participant[] =
      await this.getUsersParticipantByConversation(conversationId);

    const userIds: number[] = participants.map((part) => part.user.id);
    const usersJoin: number[] = [];
    await Promise.all(
      inviteUserIds.map(async (id) => {
        const user = await this.userRepository.findOneBy({ id });

        if (!user) {
          throw new BadRequestException(`User ${id} is not exists.`);
        }

        const isJoined = await this.participantRepository
          .createQueryBuilder('participant')
          .leftJoinAndSelect('participant.conversation', 'conversation')
          .leftJoinAndSelect('participant.user', 'user')
          .where('conversation.id = :conversationId', { conversationId })
          .andWhere('user.id = :userId', { userId: user.id })
          .getOne();

        if (isJoined) {
          return inviteUserIds.filter((_id) => _id !== id);
        }

        const inviteUser = new Participant({ user, conversation });

        await this.participantRepository.save(inviteUser);

        participants.push(inviteUser);

        usersJoin.push(id);
      }),
    );

    const newConversation = new Conversation({ ...conversation, participants });

    const userIdsOnEvent = [
      ...userIds.filter((id) => id !== user.id),
      ...inviteUserIds,
    ];

    // send new participants to eventsGateway
    this.eventsGateway.newUsersJoinConversation(
      {
        conversation: plainToClass(Conversation, newConversation),
        userIds: usersJoin,
      },
      userIdsOnEvent,
    );

    return newConversation;
  }

  async leaveConversation(user: User, conversationId: number) {
    try {
      await this.participantRepository
        .createQueryBuilder()
        .delete()
        .from(Participant)
        .where('conversationId = :conversationId', { conversationId })
        .andWhere('userId = :userId', { userId: user.id })
        .execute();

      const participantIds: number[] =
        await this.getUserIdsParticipantByConversation(conversationId);

      this.eventsGateway.leaveConversation(
        { user: plainToClass(User, user), conversation: conversationId },
        participantIds,
      );

      return new HttpResponse().success();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async removeUserFromConversation(
    user: User,
    conversationId: number,
    userId: number,
  ) {
    try {
      const isOwnConversation = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoin('conversation.createdBy', 'createdBy')
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('createdBy.id = :userId', { userId: user.id })
        .getOne();

      if (!isOwnConversation) {
        throw new HttpResponse('Conversation not exist.').notFound();
      }

      const removed_user = await this.participantRepository
        .createQueryBuilder('participant')
        .leftJoin('participant.conversation', 'conversation')
        .delete()
        .from(Participant)
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('userId = :userRemoveId', { userRemoveId: userId })
        .execute();

      const participantIds: number[] =
        await this.getUserIdsParticipantByConversation(conversationId);

      participantIds.push(userId);

      const clientIds: number[] = participantIds.filter((id) => id !== user.id);

      if (removed_user.affected && removed_user.affected > 0) {
        this.eventsGateway.userRemovedFromConversation(
          {
            user: plainToClass(User, new User({ id: userId })),
            conversation: conversationId,
          },
          clientIds,
        );
        return new HttpResponse().success();
      }

      throw new HttpResponse('User not exist in conversation.').notFound();
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async updateNameConversation(
    user: User,
    conversationId: number,
    updateName: string,
  ): Promise<UpdateResult> {
    const conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.createdBy', 'createdBy')
      .update(Conversation)
      .set({ name: updateName })
      .where('conversation.id = :id', { id: conversationId })
      .andWhere('createdBy.id = :userId', { userId: user.id })
      .execute();

    if (!conversation.affected) {
      throw new BadRequestException('Conversation not exists.');
    }

    return conversation;
  }

  async updateThumbnail(
    user: User,
    conversationId: number,
    file: Express.Multer.File,
  ): Promise<string> {
    const conversation = await this.conversationRepository.find({
      relations: {
        createdBy: true,
      },
      where: {
        createdBy: {
          id: user.id,
        },
        id: conversationId,
      },
    });

    if (!conversation) {
      throw new BadRequestException('Conversation not exists.');
    }

    const imageResponse = await this.cloudinaryService.uploadFile(file);

    const { secure_url } = imageResponse;

    const updateConversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.createdBy', 'createdBy')
      .update(Conversation)
      .set({ thumbnail: secure_url })
      .where('conversation.id = :id', { id: conversationId })
      .andWhere('createdBy.id = :userId', { userId: user.id })
      .execute();

    if (!updateConversation.affected) {
      throw new BadRequestException('Update thumbnail failed.');
    }

    return secure_url;
  }

  async getPhotosByConversation(
    user: User,
    conversationId: number,
  ): Promise<Attachment[]> {
    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.attachments', 'attachments')
      .leftJoinAndSelect('message.conversation', 'conversation')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .where('conversation.id = :id', { id: conversationId })
      .andWhere('message.message_type = :messageType', {
        messageType: MESSAGETYPE.PHOTOS,
      })
      .andWhere('user.id = :userId', { userId: user.id })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    const photos: Attachment[] = [];
    messages.map((msg) => {
      msg.attachments.map((att) => photos.push(att));
    });

    return photos;
  }
}
