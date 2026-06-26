/**
 * Authentication HTTP controller.
 * Thin layer that maps HTTP requests to AuthService calls and formats responses.
 */
import type { Request, Response } from "express";
import type { AuthService } from "../service/auth.service.js";
import type { RegisterDto } from "../dto/register.dto.js";
import type { LoginDto } from "../dto/login.dto.js";
import type { RefreshDto } from "../dto/refresh.dto.js";
import {
  successResponse,
  createdResponse,
} from "../../../shared/utils/response.util.js";

export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** `POST /auth/register` — creates a new user account. */
  register = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as RegisterDto;
    const result = await this.authService.register(dto);
    res
      .status(201)
      .json(createdResponse(result, "User registered successfully"));
  };

  /** `POST /auth/login` — authenticates and returns tokens. */
  login = async (req: Request, res: Response): Promise<void> => {
    const dto = req.body as LoginDto;
    const result = await this.authService.login(dto);
    res.json(successResponse(result, "Login successful"));
  };

  /** `POST /auth/refresh` — exchanges a refresh token for a new access token. */
  refresh = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as RefreshDto;
    const tokens = await this.authService.refresh(refreshToken);
    res.json(successResponse(tokens, "Token refreshed successfully"));
  };

  /** `POST /auth/logout` — invalidates the provided refresh token. */
  logout = async (req: Request, res: Response): Promise<void> => {
    const { refreshToken } = req.body as RefreshDto;
    await this.authService.logout(refreshToken);
    res.json(successResponse(null, "Logged out successfully"));
  };

  /** `GET /auth/me` — returns the authenticated user's JWT payload. */
  me = (req: Request, res: Response): void => {
    res.json(successResponse(req.user, "User info retrieved"));
  };
}
