/** JWT access-token payload stored in the token and attached to `req.user`. */
export interface JwtPayload {
  /** User id (subject). */
  sub: string;
  email: string;
}
