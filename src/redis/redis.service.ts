import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class RedisService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  async getKeys() {
    return await this.cacheManager.store.keys();
  }

  async addClient(userId: number, socketId: string) {
    try {
      const existingSocketIds = await this.getClient(userId);
      existingSocketIds.push(socketId);
      return await this.cacheManager.set(
        `userId:${userId.toString()}`,
        existingSocketIds,
      );
    } catch (error) {
      console.log(error);
    }
  }

  async getAllClients(): Promise<{ [key: string]: string }> {
    const keys = await this.cacheManager.store.keys();

    const result: { [key: string]: string } = {};

    for (const key of keys) {
      result[key] = await this.cacheManager.get(key);
    }

    return result;
  }

  async getClient(userId: number) {
    try {
      const cachedSocketIds = await this.cacheManager.get<string[]>(
        `userId:${userId.toString()}`,
      );

      if (cachedSocketIds && cachedSocketIds.length > 0) {
        return cachedSocketIds;
      }

      return [];
    } catch (error) {
      console.log(error);
    }
  }

  async removeClient(userId: number, socketId: string): Promise<string[]> {
    try {
      let existingSocketIds = await this.getClient(userId);
      existingSocketIds = existingSocketIds.filter((id) => id !== socketId);
      if (existingSocketIds.length < 1) {
        return await this.cacheManager.del(`userId:${userId.toString()}`);
      }
      return await this.cacheManager.set(
        `userId:${userId.toString()}`,
        existingSocketIds,
      );
    } catch (error) {
      console.log(error);
    }
  }

  async clearCacheStartingWith(pattern: string): Promise<void> {
    const keys = await this.cacheManager.store.keys();
    const keysToDelete = keys.filter((key: string) => key.startsWith(pattern));
    await Promise.all(
      keysToDelete.map((key: string) => this.cacheManager.del(key)),
    );
  }

  async delKey(key: string) {
    try {
      return await this.cacheManager.del(key);
    } catch (error) {
      console.log(error);
    }
  }

  async setOtp(email: string, otp: string): Promise<string> {
    try {
      return await this.cacheManager.set(email, otp);
    } catch (error) {
      console.log(error);
    }
  }

  async getOtp(email: string): Promise<string> {
    try {
      return await this.cacheManager.get(email);
    } catch (error) {
      console.log(error);
    }
  }
}
