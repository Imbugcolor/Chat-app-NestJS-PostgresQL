import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { User } from 'src/auth/users/entities/user.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Conversation)
    private conversationRepository: Repository<Conversation>,
    @InjectRepository(Message) private messageRepository: Repository<Message>,
    @InjectRepository(User) private userRepository: Repository<User>,
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

  async createMessage(user: User, conversationId: number, context: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id: conversationId },
    });

    const message = new Message({
      senderId: user,
      text: context,
      conversation,
    });

    await this.messageRepository.save(message);

    return message;
  }
}
