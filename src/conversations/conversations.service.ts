import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Repository, UpdateResult } from 'typeorm';
import { Participant } from './entities/participant.entity';
import { User } from 'src/auth/users/entities/user.entity';
import { HttpResponse } from 'src/httpReponses/http.response';
import { EventsGateway } from 'src/events/events.gateway';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
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

    const ids: number[] = [];
    newConversation.participants.map((participant) => {
      if (participant.user.id !== user.id) {
        return ids.push(participant.user.id);
      }
    });

    this.eventsGateway.newConversation(newConversation, userIds);

    return newConversation;
  }

  async getConversation(user: User, conversationId: number) {
    try {
      const conversation = await this.conversationRepository
        .createQueryBuilder('conversation')
        .leftJoinAndSelect('conversation.createdBy', 'createdBy')
        .leftJoinAndSelect('conversation.participants', 'participants')
        .leftJoinAndSelect('participants.user', 'user')
        .where('conversation.id = :conversationId', { conversationId })
        .andWhere('user.id = :userId', { userId: user.id })
        .getOne();
      if (conversation === null) {
        throw new BadRequestException('Conversation not exists.');
      }
      return conversation;
    } catch (error) {
      throw new BadRequestException(error);
    }
  }

  async getConversations(user: User) {
    const conversations = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.messages', 'message')
      .leftJoinAndSelect('message.senderId', 'sender')
      .leftJoinAndSelect('message.usersRead', 'usersRead')
      .leftJoinAndSelect('usersRead.readBy', 'readBy')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .where('user.id = :userId', { userId: user.id })
      .orderBy('message.createdAt', 'DESC')
      .getMany();

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

    const ids = conversations.map((cv) => cv.id);

    // retrive conversations with all participants in each conversation
    const _conversation = await this.conversationRepository
      .createQueryBuilder('conversation')
      .leftJoinAndSelect('conversation.createdBy', 'createdBy')
      .leftJoinAndSelect('conversation.participants', 'participants')
      .leftJoinAndSelect('participants.user', 'user')
      .leftJoinAndSelect('conversation.messages', 'messages')
      .leftJoinAndSelect('messages.senderId', 'senderId')
      .leftJoinAndSelect('messages.usersRead', 'usersRead')
      .leftJoinAndSelect('usersRead.readBy', 'readBy')
      .where('conversation.id IN (:...ids)', { ids: ids })
      .orderBy('messages.createdAt', 'DESC')
      .getMany();

    const __conversations = _conversation.map((conversation) => {
      if (conversationsRead.some((cv) => cv === conversation.id)) {
        return new Conversation({
          ...conversation,
          messages: [],
          lastMessage: conversation.messages[0],
          isRead: true,
        });
      } else {
        return new Conversation({
          ...conversation,
          messages: [],
          lastMessage: conversation.messages[0],
          isRead: false,
        });
      }
    });

    return __conversations;
  }

  private async getUsersParticipantByConversation(conversationId: number) {
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

  async inviteJoinConversation(
    user: User,
    conversationId: number,
    inviteUserIds: number[],
  ) {
    const conversation = await this.getConversation(user, conversationId);

    // get users will realtime event
    const userIds: number[] =
      await this.getUsersParticipantByConversation(conversationId);

    // create new participants
    const participants: Participant[] = [];
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

        const participant = await this.participantRepository.save(inviteUser);

        participants.push(participant);
      }),
    );

    // send new participants to eventsGateway
    this.eventsGateway.newUsersJoinConversation(participants, userIds);

    return participants;
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
        await this.getUsersParticipantByConversation(conversationId);

      this.eventsGateway.leaveConversation(
        { user, conversation: conversationId },
        participantIds,
      );
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    return new HttpResponse().success();
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
}
