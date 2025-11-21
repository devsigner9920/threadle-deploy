/**
 * UserService - Manages user profiles and operations
 * Handles user creation, retrieval, updates, and role inference from Slack
 */

import { getPrismaClient } from '../database/client.js';
import { SlackClient } from '../slack/slackClient.js';
import { UserRole, Language, User } from '@prisma/client';
import { z } from 'zod';

/**
 * Zod schema for user creation
 */
export const CreateUserSchema = z.object({
  slackUserId: z.string().min(1),
  slackWorkspaceId: z.string().min(1),
  role: z.nativeEnum(UserRole),
  language: z.nativeEnum(Language),
  customInstructions: z.string().optional(),
  preferredStyle: z.string().optional(),
  isAdmin: z.boolean().default(false),
});

/**
 * Zod schema for user updates
 */
export const UpdateUserSchema = z.object({
  role: z.nativeEnum(UserRole).optional(),
  language: z.nativeEnum(Language).optional(),
  customInstructions: z.string().optional(),
  preferredStyle: z.string().optional(),
});

export type CreateUserData = Omit<z.infer<typeof CreateUserSchema>, "isAdmin"> & { isAdmin?: boolean; };
export type UpdateUserData = z.infer<typeof UpdateUserSchema>;

/**
 * Role keyword mapping for inference from Slack profiles
 */
const ROLE_KEYWORDS: Record<string, UserRole> = {
  'backend': UserRole.Engineering_Backend,
  'back-end': UserRole.Engineering_Backend,
  'back end': UserRole.Engineering_Backend,
  'server': UserRole.Engineering_Backend,
  'api': UserRole.Engineering_Backend,
  'database': UserRole.Engineering_Backend,

  'frontend': UserRole.Engineering_Frontend,
  'front-end': UserRole.Engineering_Frontend,
  'front end': UserRole.Engineering_Frontend,
  'react': UserRole.Engineering_Frontend,
  'vue': UserRole.Engineering_Frontend,
  'angular': UserRole.Engineering_Frontend,
  'ui engineer': UserRole.Engineering_Frontend,
  'web developer': UserRole.Engineering_Frontend,

  'mobile': UserRole.Engineering_Mobile,
  'ios': UserRole.Engineering_Mobile,
  'android': UserRole.Engineering_Mobile,
  'react native': UserRole.Engineering_Mobile,
  'flutter': UserRole.Engineering_Mobile,

  'designer': UserRole.Design,
  'design': UserRole.Design,
  'ux': UserRole.Design,
  'ui': UserRole.Design,
  'product design': UserRole.Design,
  'visual': UserRole.Design,

  'product': UserRole.Product,
  'product manager': UserRole.Product,
  'pm': UserRole.Product,
  'product owner': UserRole.Product,
  'po': UserRole.Product,

  'marketing': UserRole.Marketing,
  'growth': UserRole.Marketing,
  'demand gen': UserRole.Marketing,
  'content': UserRole.Marketing,

  'qa': UserRole.QA,
  'quality': UserRole.QA,
  'test': UserRole.QA,
  'sdet': UserRole.QA,

  'data': UserRole.Data,
  'analytics': UserRole.Data,
  'analyst': UserRole.Data,
  'data engineer': UserRole.Data,
  'data scientist': UserRole.Data,
  'bi': UserRole.Data,
};

/**
 * UserService class - manages user operations
 */
export class UserService {
  private prisma: ReturnType<typeof getPrismaClient>;
  private slackClient: SlackClient;

  /**
   * Create a new UserService instance
   * @param slackClient - Slack API client for fetching user profiles
   */
  constructor(slackClient: SlackClient) {
    this.prisma = getPrismaClient();
    this.slackClient = slackClient;
  }

  /**
   * Create a new user
   * @param data - User creation data
   * @returns Created user
   */
  async createUser(data: CreateUserData): Promise<User> {
    // Validate input
    const validated = CreateUserSchema.parse(data);

    console.log(`[UserService] Creating user with Slack ID: ${validated.slackUserId}`);

    // Create user in database
    const user = await this.prisma.user.create({
      data: {
        slackUserId: validated.slackUserId,
        slackWorkspaceId: validated.slackWorkspaceId,
        role: validated.role,
        language: validated.language,
        customInstructions: validated.customInstructions,
        preferredStyle: validated.preferredStyle,
        isAdmin: validated.isAdmin,
      },
    });

    console.log(`[UserService] User created successfully: ${user.id}`);

    return user;
  }

  /**
   * Update an existing user
   * @param userId - Database user ID
   * @param data - User update data
   * @returns Updated user
   */
  async updateUser(userId: string, data: UpdateUserData): Promise<User> {
    // Validate input
    const validated = UpdateUserSchema.parse(data);

    console.log(`[UserService] Updating user: ${userId}`);

    // Check if user exists
    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new Error(`User not found: ${userId}`);
    }

    // Update user
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: validated,
    });

    console.log(`[UserService] User updated successfully: ${user.id}`);

    return user;
  }

  /**
   * Get user by Slack user ID
   * @param slackUserId - Slack user ID
   * @returns User or null if not found
   */
  async getUserBySlackId(slackUserId: string): Promise<User | null> {
    console.log(`[UserService] Fetching user by Slack ID: ${slackUserId}`);

    const user = await this.prisma.user.findUnique({
      where: { slackUserId },
    });

    return user;
  }

  /**
   * Get user by database ID
   * @param userId - Database user ID
   * @returns User or null if not found
   */
  async getUserById(userId: string): Promise<User | null> {
    console.log(`[UserService] Fetching user by ID: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    return user;
  }

  /**
   * Set admin status for a user
   * @param userId - Database user ID
   * @param isAdmin - Admin status
   * @returns Updated user
   */
  async setAdmin(userId: string, isAdmin: boolean): Promise<User> {
    console.log(`[UserService] Setting admin status for ${userId} to ${isAdmin}`);

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { isAdmin },
    });

    console.log(`[UserService] Admin status updated for ${user.id}`);

    return user;
  }

  /**
   * Infer user role from Slack profile
   * Fetches user profile from Slack and attempts to determine role from title/department
   * @param slackUserId - Slack user ID
   * @returns Inferred UserRole
   */
  async inferRoleFromSlack(slackUserId: string): Promise<UserRole> {
    console.log(`[UserService] Inferring role from Slack profile: ${slackUserId}`);

    try {
      // Fetch user profile from Slack
      const slackUser = await this.slackClient.getUser(slackUserId);

      // Extract title from profile
      const title = slackUser.profile?.title?.toLowerCase() || '';

      console.log(`[UserService] Slack user title: "${title}"`);

      // Attempt to match title to role keywords
      for (const [keyword, role] of Object.entries(ROLE_KEYWORDS)) {
        if (title.includes(keyword.toLowerCase())) {
          console.log(`[UserService] Matched keyword "${keyword}" to role: ${role}`);
          return role;
        }
      }

      // Default to Engineering-Backend if no match found
      console.log('[UserService] No role match found, defaulting to Engineering_Backend');
      return UserRole.Engineering_Backend;
    } catch (error) {
      console.error('[UserService] Error inferring role from Slack:', error);
      // On error, default to Engineering-Backend
      return UserRole.Engineering_Backend;
    }
  }

  /**
   * Get or create user from Slack ID
   * If user doesn't exist, creates one with inferred role
   * @param slackUserId - Slack user ID
   * @param slackWorkspaceId - Slack workspace ID
   * @returns User
   */
  async getOrCreateUser(slackUserId: string, slackWorkspaceId: string): Promise<User> {
    // Check if user exists
    let user = await this.getUserBySlackId(slackUserId);

    if (user) {
      return user;
    }

    // User doesn't exist, create with inferred role
    console.log(`[UserService] User not found, creating with inferred role...`);

    const inferredRole = await this.inferRoleFromSlack(slackUserId);

    user = await this.createUser({
      slackUserId,
      slackWorkspaceId,
      role: inferredRole,
      language: Language.English, // Default language
      isAdmin: false,
    });

    return user;
  }

  /**
   * List all users in the workspace
   * @returns Array of users
   */
  async listUsers(): Promise<User[]> {
    console.log('[UserService] Listing all users');

    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  /**
   * Count users by role
   * @returns Object with role counts
   */
  async countUsersByRole(): Promise<Record<UserRole, number>> {
    console.log('[UserService] Counting users by role');

    const users = await this.prisma.user.findMany({
      select: { role: true },
    });

    const counts: Record<UserRole, number> = {} as any;

    for (const role of Object.values(UserRole)) {
      counts[role] = users.filter((u) => u.role === role).length;
    }

    return counts;
  }
}
