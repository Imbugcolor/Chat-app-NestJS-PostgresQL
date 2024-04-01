import { User } from 'src/auth/users/entities/user.entity';

export type UserLeavePayload = {
  user: User;
  conversation: number;
};
