/**
 * User repository contract.
 * Abstracts user and refresh-token persistence so the auth service stays storage-agnostic.
 */
import type { User } from "../domain/user.entity.js";

export interface IUserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  create(user: User): Promise<void>;
  saveRefreshToken(
    userId: string,
    token: string,
    ttlSeconds: number,
  ): Promise<void>;
  findRefreshToken(token: string): Promise<string | null>;
  deleteRefreshToken(token: string): Promise<void>;
}
