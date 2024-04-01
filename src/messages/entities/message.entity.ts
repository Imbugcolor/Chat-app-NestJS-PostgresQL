import { User } from 'src/auth/users/entities/user.entity';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  JoinColumn,
  OneToMany,
  CreateDateColumn,
  ManyToOne,
  UpdateDateColumn,
} from 'typeorm';
import { MESSAGETYPE } from '../enums/messageType.enum';
import { Attachment } from './attachment.entity';
import { Expose } from 'class-transformer';
import { UserReadMessage } from './userReadMessage.entity';
import { PaginationResult } from 'src/common/pagination/paginator';

@Entity()
export class Message {
  constructor(partial: Partial<Message>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @ManyToOne(() => Conversation, (cv) => cv.messages)
  @JoinColumn()
  @Expose()
  conversation: Conversation;

  @ManyToOne(() => User, (user) => user.messages)
  @JoinColumn()
  @Expose()
  senderId: User;

  @Column({ enum: MESSAGETYPE, default: MESSAGETYPE.TEXT })
  @Expose()
  message_type: MESSAGETYPE;

  @Column({ nullable: true })
  @Expose()
  text: string;

  @OneToMany(() => Attachment, (att) => att.message, {
    onDelete: 'CASCADE',
  })
  @Expose()
  attachments: Attachment[];

  @OneToMany(() => UserReadMessage, (user) => user.message)
  @Expose()
  usersRead: UserReadMessage[];

  @Column({ default: false })
  @Expose()
  isUpdated: boolean;

  @CreateDateColumn()
  @Expose()
  createdAt: Date;

  @UpdateDateColumn()
  @Expose()
  updatedAt: Date;
}

export type PaginatedMessages = PaginationResult<Message>;
