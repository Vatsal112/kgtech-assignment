import { AuthService } from "../../../src/modules/auth/service/auth.service";
import type { IUserRepository } from "../../../src/modules/auth/repository/user.repository.interface";
import type { User } from "../../../src/modules/auth/domain/user.entity";
import {
  ConflictError,
  UnauthorizedError,
} from "../../../src/core/errors/app.error";
import bcrypt from "bcrypt";

jest.mock("bcrypt");

jest.mock("../../../src/shared/utils/uuid.util", () => ({
  generateId: jest.fn(() => "mock-uuid-1234"),
}));

jest.mock("../../../src/config/index", () => ({
  config: {
    JWT_SECRET: "test-secret-12345678",
    JWT_REFRESH_SECRET: "test-refresh-secret-1",
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
    NODE_ENV: "test",
  },
}));

jest.mock("../../../src/core/logger/logger", () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// jsonwebtoken with esModuleInterop requires explicit default mock
jest.mock("jsonwebtoken", () => {
  const mockSign = jest.fn().mockReturnValue("mock.jwt.token");
  const mockVerify = jest
    .fn()
    .mockReturnValue({ sub: "user-123", email: "test@example.com" });
  return {
    __esModule: true,
    default: { sign: mockSign, verify: mockVerify },
    sign: mockSign,
    verify: mockVerify,
  };
});

const mockUser: User = {
  id: "user-123",
  email: "test@example.com",
  passwordHash: "hashed-password",
  createdAt: "2024-01-01T00:00:00.000Z",
};

function createMockRepository(): jest.Mocked<IUserRepository> {
  return {
    findByEmail: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    saveRefreshToken: jest.fn(),
    findRefreshToken: jest.fn(),
    deleteRefreshToken: jest.fn(),
  };
}

describe("AuthService", () => {
  let authService: AuthService;
  let mockRepository: jest.Mocked<IUserRepository>;

  beforeEach(() => {
    mockRepository = createMockRepository();
    authService = new AuthService(mockRepository);
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(undefined);
      mockRepository.saveRefreshToken.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue("hashed-password");

      const result = await authService.register({
        email: "new@example.com",
        password: "Password1",
      });

      expect(result.user.email).toBe("new@example.com");
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      expect(mockRepository.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it("should throw ConflictError if user already exists", async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: "test@example.com",
          password: "Password1",
        }),
      ).rejects.toThrow(ConflictError);
    });

    it("should not store raw password in user entity", async () => {
      mockRepository.findByEmail.mockResolvedValue(null);
      mockRepository.create.mockResolvedValue(undefined);
      mockRepository.saveRefreshToken.mockResolvedValue(undefined);
      (bcrypt.hash as jest.Mock).mockResolvedValue("$2b$12$hashedpassword");

      await authService.register({
        email: "new@example.com",
        password: "Password1",
      });

      const createdUser = mockRepository.create.mock.calls[0]?.[0];
      expect(createdUser?.passwordHash).toBe("$2b$12$hashedpassword");
      expect(createdUser?.passwordHash).not.toBe("Password1");
    });
  });

  describe("login", () => {
    it("should login successfully with correct credentials", async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);
      mockRepository.saveRefreshToken.mockResolvedValue(undefined);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await authService.login({
        email: "test@example.com",
        password: "Password1",
      });

      expect(result.user.email).toBe("test@example.com");
      expect(result.tokens.accessToken).toBeDefined();
      expect(result.tokens.refreshToken).toBeDefined();
    });

    it("should throw UnauthorizedError if user not found", async () => {
      mockRepository.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: "notfound@example.com",
          password: "Password1",
        }),
      ).rejects.toThrow(UnauthorizedError);
    });

    it("should throw UnauthorizedError if password is wrong", async () => {
      mockRepository.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.login({ email: "test@example.com", password: "WrongPass" }),
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe("refresh", () => {
    it("should refresh tokens successfully", async () => {
      mockRepository.findRefreshToken.mockResolvedValue("user-123");
      mockRepository.findById.mockResolvedValue(mockUser);
      mockRepository.deleteRefreshToken.mockResolvedValue(undefined);
      mockRepository.saveRefreshToken.mockResolvedValue(undefined);

      const tokens = await authService.refresh("valid-refresh-token");

      expect(tokens.accessToken).toBeDefined();
      expect(mockRepository.deleteRefreshToken).toHaveBeenCalledWith(
        "valid-refresh-token",
      );
      expect(mockRepository.saveRefreshToken).toHaveBeenCalledTimes(1);
    });

    it("should throw UnauthorizedError if refresh token is invalid", async () => {
      mockRepository.findRefreshToken.mockResolvedValue(null);

      await expect(authService.refresh("invalid-token")).rejects.toThrow(
        UnauthorizedError,
      );
    });

    it("should throw UnauthorizedError if user no longer exists", async () => {
      mockRepository.findRefreshToken.mockResolvedValue("user-123");
      mockRepository.findById.mockResolvedValue(null);

      await expect(authService.refresh("valid-token")).rejects.toThrow(
        UnauthorizedError,
      );
    });
  });

  describe("logout", () => {
    it("should delete the refresh token", async () => {
      mockRepository.deleteRefreshToken.mockResolvedValue(undefined);

      await authService.logout("valid-refresh-token");

      expect(mockRepository.deleteRefreshToken).toHaveBeenCalledWith(
        "valid-refresh-token",
      );
    });
  });

  describe("verifyAccessToken", () => {
    it("should return a payload for a valid token", () => {
      const payload = authService.verifyAccessToken("valid.jwt.token");

      expect(payload).toBeDefined();
      expect(payload.sub).toBeDefined();
    });

    it("should throw UnauthorizedError for invalid token", () => {
      const jwtMock = jest.requireMock("jsonwebtoken") as unknown as { verify: jest.Mock };
      jwtMock.verify.mockImplementationOnce(() => {
        throw new Error("Invalid token");
      });

      expect(() => authService.verifyAccessToken("bad-token")).toThrow(
        UnauthorizedError,
      );
    });
  });
});
