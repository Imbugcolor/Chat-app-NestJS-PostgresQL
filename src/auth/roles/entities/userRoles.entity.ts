import {
  Entity,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from 'src/auth/users/entities/user.entity';
import { Role } from './role.entity';

@Entity()
export class UserRole {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => Role, { eager: true })
  @JoinColumn()
  role: Role;

  @ManyToOne(() => User, (user) => user.roles)
  user: User;
}
