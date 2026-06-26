/**
 * Authentication service.
 * Handles registration, login, JWT issuance, token refresh, and logout.
 */
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { generateId } from "../../../shared/utils/uuid.util.js";
import type { IUserRepository } from "../repository/user.repository.interface.js";
import type { User, UserPublic } from "../domain/user.entity.js";
import { toPublicUser } from "../domain/user.entity.js";
import type { RegisterDto } from "../dto/register.dto.js";
import type { LoginDto } from "../dto/login.dto.js";
import type { JwtPayload } from "../types/jwt-payload.type.js";
import {
  ConflictError,
  UnauthorizedError,
} from "../../../core/errors/index.js";
import { config } from "../../../config/index.js";
import { REFRESH_TOKEN_TTL_SECONDS } from "../../../shared/constants/index.js";
import { logger } from "../../../core/logger/logger.js";

/** Access and refresh token pair returned after login or registration. */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

/** Combined user profile and tokens returned by register/login. */
export interface AuthResponse {
  user: UserPublic;
  tokens: AuthTokens;
}

export class AuthService {
  private static readonly BCRYPT_ROUNDS = 12;

  constructor(private readonly userRepository: IUserRepository) {}

  /**
   * Registers a new user, hashes the password, and returns JWT tokens.
   *
   * @throws {ConflictError} When the email is already registered.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictError(`User with email '${dto.email}' already exists`);
    }

    const passwordHash = await bcrypt.hash(
      dto.password,
      AuthService.BCRYPT_ROUNDS,
    );

    const user: User = {
      id: generateId(),
      email: dto.email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await this.userRepository.create(user);

    logger.info("User registered", { userId: user.id, email: user.email });

    const tokens = await this.generateTokens(user);

    return { user: toPublicUser(user), tokens };
  }

  /**
   * Authenticates a user with email and password.
   *
   * @throws {UnauthorizedError} When credentials are invalid.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    const passwordMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatch) {
      throw new UnauthorizedError("Invalid email or password");
    }

    logger.info("User logged in", { userId: user.id, email: user.email });

    const tokens = await this.generateTokens(user);

    return { user: toPublicUser(user), tokens };
  }

  /**
   * Issues a new token pair using a valid refresh token.
   * Rotates the refresh token by deleting the old one after use.
   *
   * @throws {UnauthorizedError} When the refresh token is invalid or the user no longer exists.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const userId = await this.userRepository.findRefreshToken(refreshToken);
    if (!userId) {
      throw new UnauthorizedError("Invalid or expired refresh token");
    }

    const user = await this.userRepository.findById(userId);
    if (!user) {
      throw new UnauthorizedError("User not found");
    }

    await this.userRepository.deleteRefreshToken(refreshToken);

    const tokens = await this.generateTokens(user);

    logger.info("Token refreshed", { userId: user.id });

    return tokens;
  }

  /** Revokes a refresh token, effectively logging the user out. */
  async logout(refreshToken: string): Promise<void> {
    await this.userRepository.deleteRefreshToken(refreshToken);
    logger.info("User logged out");
  }

  /**
   * Verifies a JWT access token and returns its payload.
   *
   * @throws {UnauthorizedError} When the token is invalid or expired.
   */
  verifyAccessToken(token: string): JwtPayload {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as JwtPayload;
      return payload;
    } catch {
      throw new UnauthorizedError("Invalid or expired access token");
    }
  }

  /** Signs a new access token and stores a refresh token in Redis. */
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = jwt.sign(payload, config.JWT_SECRET, {
      expiresIn: config.JWT_EXPIRES_IN,
    } as jwt.SignOptions);

    const refreshToken = generateId();

    await this.userRepository.saveRefreshToken(
      user.id,
      refreshToken,
      REFRESH_TOKEN_TTL_SECONDS,
    );

    return {
      accessToken,
      refreshToken,
      expiresIn: config.JWT_EXPIRES_IN,
    };
  }
}
