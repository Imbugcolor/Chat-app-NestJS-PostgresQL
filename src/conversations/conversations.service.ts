import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from './entities/conversation.entity';
import { Repository } from 'typeorm';
import { Participant } from './entities/participant.entity';
import { User } from 'src/auth/users/entities/user.entity';

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

    const newConversation = new Conversation({
      createdBy: user,
      participants,
    });

    await this.conversationRepository.save(newConversation);

    return newConversation;
  }
}
