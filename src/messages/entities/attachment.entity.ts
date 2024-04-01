import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Message } from './message.entity';
import { Expose } from 'class-transformer';

@Entity()
export class Attachment {
  constructor(partial: Partial<Attachment>) {
    Object.assign(this, partial);
  }

  @PrimaryGeneratedColumn()
  @Expose()
  id: number;

  @Column()
  @Expose()
  public_id: string;

  @Column()
  @Expose()
  url: string;

  @ManyToOne(() => Message, (message) => message.attachments, {
    onDelete: 'CASCADE',
  })
  message: Message;
}
