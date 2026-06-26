/**
 * Authentication domain model.
 * Defines the internal user entity and the public-safe projection returned by the API.
 */

/** Full user record stored in Redis (includes password hash). */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

/** User fields exposed to clients — never includes the password hash. */
export interface UserPublic {
  id: string;
  email: string;
  createdAt: string;
}

/**
 * Strips sensitive fields before returning user data in API responses.
 *
 * @param user - Internal user entity from the repository.
 */
export function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
}
