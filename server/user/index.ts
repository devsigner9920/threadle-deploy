/**
 * User Module - Public API
 * Exports all user-related services and utilities
 */

export { UserService, CreateUserSchema, UpdateUserSchema } from './UserService.js';
export type { CreateUserData, UpdateUserData } from './UserService.js';
export { JWTAuth, createJWTAuth } from './jwtAuth.js';
export type { JWTPayload } from './jwtAuth.js';
