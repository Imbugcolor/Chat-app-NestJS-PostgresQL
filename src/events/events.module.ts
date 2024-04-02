import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { RedisModule } from 'src/redis/redis.module';

@Module({
  imports: [ConfigModule, JwtModule.register({}), RedisModule],
  providers: [EventsGateway],
  exports: [EventsGateway],
})
export class EventsModule {}
