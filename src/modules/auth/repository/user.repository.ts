/**
 * Redis implementation of the user repository.
 * Stores users by email with a secondary id→email index for lookups.
 */
import type Redis from "ioredis";
import type { IUserRepository } from "./user.repository.interface.js";
import type { User } from "../domain/user.entity.js";
import {
  REDIS_KEYS,
  REFRESH_TOKEN_TTL_SECONDS,
} from "../../../shared/constants/index.js";

export class UserRepository implements IUserRepository {
  constructor(private readonly redis: Redis) {}

  /** Looks up a user by email address. */
  async findByEmail(email: string): Promise<User | null> {
    const data = await this.redis.get(REDIS_KEYS.USER(email));
    if (!data) return null;
    return JSON.parse(data) as User;
  }

  /** Resolves a user id to an email via the id index, then fetches the full record. */
  async findById(id: string): Promise<User | null> {
    const indexKey = `user:id:${id}`;
    const email = await this.redis.get(indexKey);
    if (!email) return null;
    return this.findByEmail(email);
  }

  /** Persists the user record and maintains the id→email index atomically. */
  async create(user: User): Promise<void> {
    const pipeline = this.redis.pipeline();
    pipeline.set(REDIS_KEYS.USER(user.email), JSON.stringify(user));
    pipeline.set(`user:id:${user.id}`, user.email);
    await pipeline.exec();
  }

  /** Stores a refresh token mapping to a user id with a TTL. */
  async saveRefreshToken(
    userId: string,
    token: string,
    ttlSeconds: number = REFRESH_TOKEN_TTL_SECONDS,
  ): Promise<void> {
    await this.redis.setex(REDIS_KEYS.REFRESH_TOKEN(token), ttlSeconds, userId);
  }

  /** Returns the user id associated with a refresh token, or null if expired. */
  async findRefreshToken(token: string): Promise<string | null> {
    return this.redis.get(REDIS_KEYS.REFRESH_TOKEN(token));
  }

  /** Invalidates a refresh token on logout or rotation. */
  async deleteRefreshToken(token: string): Promise<void> {
    await this.redis.del(REDIS_KEYS.REFRESH_TOKEN(token));
  }
}
