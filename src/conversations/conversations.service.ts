import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { In, Repository } from 'typeorm';
import { Participant } from './entities/participant.entity';
import { User } from 'src/auth/users/entities/user.entity';
import { Message } from 'src/messages/entities/message.entity';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Participant)
    private participantRepository: Repository<Participant>,
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

    return newConversation;
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
      const lastMessage: Message = conversation.messages[0]; // Assuming messages are sorted in descending order of createdAt

      if (lastMessage.senderId.id === user.id) {
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
    const _conversation = await this.conversationRepository.find({
      relations: {
        participants: {
          user: true,
        },
      },
      where: { id: In(ids) },
    });

    const __conversations = _conversation.map((conversation) => {
      if (conversationsRead.some((cv) => cv === conversation.id)) {
        return new Conversation({ ...conversation, isRead: true });
      } else {
        return new Conversation({ ...conversation, isRead: false });
      }
    });

    return __conversations;
  }
}
