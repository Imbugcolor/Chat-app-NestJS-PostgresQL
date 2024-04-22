import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { GENDER } from '../enums/gender.enum';
import { AUTHSTRATEGY } from '../enums/authStrategy.enum';
import { UserRole } from 'src/auth/roles/entities/userRoles.entity';
import { Expose } from 'class-transformer';
import { Conversation } from 'src/conversations/entities/conversation.entity';
import { Message } from 'src/messages/entities/message.entity';
import { Participant } from 'src/conversations/entities/participant.entity';
import { UserReadMessage } from 'src/messages/entities/userReadMessage.entity';

@Entity()
export class User {
  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @Column({ unique: true })
  @Expose()
  username: string;

  @Column({ unique: true, nullable: true })
  @Expose()
  email: string;

  @Column({ unique: true, nullable: true })
  @Expose()
  phone: string;

  @Column({ length: 500 })
  @Expose()
  fullname: string;

  @Column()
  password: string;

  @Column({
    default:
      'https://res.cloudinary.com/dnv2v2tiz/image/upload/v1679802559/instagram-avt-profile/unknow_fc0uaf.jpg',
  })
  @Expose()
  avatar: string;

  @OneToMany(() => UserRole, (userRole) => userRole.user, {
    cascade: true,
    eager: true,
  })
  @Expose()
  roles: UserRole[];

  @Column({ enum: GENDER, default: GENDER.MALE })
  @Expose()
  gender: GENDER;

  @Column({ nullable: true })
  rf_token: string;

  @Column({ enum: AUTHSTRATEGY, default: AUTHSTRATEGY.LOCAL })
  @Expose()
  authStrategy: AUTHSTRATEGY;

  @OneToMany(() => Conversation, (cv) => cv.createdBy, {
    eager: true,
  })
  conversations: Conversation[];

  @OneToMany(() => Message, (msg) => msg.senderId, {
    cascade: true,
    eager: true,
  })
  messages: Message[];

  @OneToMany(() => Participant, (parts) => parts.user, {
    cascade: true,
    eager: true,
  })
  participants: Participant[];

  @OneToMany(() => UserReadMessage, (rdmsg) => rdmsg.readBy, {
    cascade: true,
    eager: true,
  })
  readMessages: UserReadMessage[];

  @Expose()
  accessToken?: string;

  @Column({ default: false })
  @Expose()
  isActive: boolean;
}
