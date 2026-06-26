/**
 * UUID generation wrapper.
 * Abstracted so unit tests can mock ID generation without touching the ESM-only `uuid` package.
 */
import { v4 } from "uuid";

/** Generates a new RFC 4122 version-4 UUID string. */
export function generateId(): string {
  return v4();
}
