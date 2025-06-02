import {
  users,
  sessions,
  transactions,
  tickets,
  ticketMessages,
  settings,
  serverPowerStatus,
  serverLogs,
  notifications,
  apiKeys,
  passwordResetTokens,
  emailVerificationTokens,
  packagePricing,
  emailLogs,
  discordTicketThreads,
  docs,
  docCategories,
  blogPosts,
  blogCategories,
  datacenterLocations,
  planFeatures,
  faqItems,
  legalContent,
  ticketDepartments,
  teamMembers,
  chatSessions,
  chatMessages,
  adminChatStatus,
  chatTypingIndicators,
  type User,
  type InsertUser,
  type Transaction,
  type InsertTransaction,
  type Ticket,
  type InsertTicket,
  type TicketMessage,
  type InsertTicketMessage,
  type TicketDepartment,
  type InsertTicketDepartment,
  type Settings,
  type InsertSettings,
  type Notification,
  type InsertNotification,
  type TeamMember,
  type InsertTeamMember,

  type PasswordResetToken,
  type InsertPasswordResetToken,
  type EmailVerificationToken,
  type LegalContent,
  type InsertLegalContent,
  type Doc,
  type InsertDoc,
  type DocCategory,
  type InsertDocCategory,
  type BlogPost,
  type InsertBlogPost,
  type BlogCategory,
  type InsertBlogCategory,
  type InsertEmailVerificationToken,
  type PackagePricing,
  type EmailLog,
  type InsertEmailLog,
  type InsertPackagePricing,
  type DiscordTicketThread,
  type InsertDiscordTicketThread,
  type DatacenterLocation,
  type InsertDatacenterLocation,
  type PlanFeature,
  type InsertPlanFeature,
  type FaqItem,
  type InsertFaqItem,
  type ServerPowerStatus,
  type InsertServerPowerStatus,
  type ServerLog,
  type InsertServerLog,
  type ChatSession,
  type InsertChatSession,
  type ChatMessage,
  type InsertChatMessage,
  type AdminChatStatus,
  type InsertAdminChatStatus,
  type ChatTypingIndicator,
  type InsertChatTypingIndicator
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, gte, lte, count, inArray, or, ilike, lt, sql, not } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Server power status operations
  getServerPowerStatus(serverId: number): Promise<ServerPowerStatus | undefined>;
  updateServerPowerStatus(serverId: number, data: Partial<ServerPowerStatus>): Promise<void>;
  upsertServerPowerStatus(serverId: number, powerState: string): Promise<void>;

  // Server logs operations
  createServerLog(log: InsertServerLog): Promise<ServerLog>;
  getServerLogs(serverId: number, options?: {
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<ServerLog[]>;
  getServerLogsWithUser(serverId: number, options?: {
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }): Promise<(ServerLog & { user: User })[]>;
  getServerLogCount(serverId: number, options?: {
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<number>;

  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<void>;
  deleteUser(id: number): Promise<void>;
  getUsersByIds(ids: number[]): Promise<User[]>;

  // Transaction operations
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  searchTransactions(params: {
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    type?: string;
    search?: string;
  }): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<void>;
  getTransaction(id: number): Promise<Transaction | undefined>;



  // Ticket Department operations
  getAllTicketDepartments(): Promise<TicketDepartment[]>;
  getActiveTicketDepartments(): Promise<TicketDepartment[]>;
  getTicketDepartment(id: number): Promise<TicketDepartment | undefined>;
  getDefaultTicketDepartment(): Promise<TicketDepartment | undefined>;
  createTicketDepartment(department: InsertTicketDepartment): Promise<TicketDepartment>;
  updateTicketDepartment(id: number, updates: Partial<TicketDepartment>): Promise<void>;
  deleteTicketDepartment(id: number): Promise<void>;

  // Ticket operations
  getUserTickets(userId: number): Promise<Ticket[]>;
  getTicket(id: number): Promise<Ticket | undefined>;
  createTicket(ticket: InsertTicket): Promise<Ticket>;
  updateTicket(id: number, updates: Partial<Ticket>): Promise<void>;
  deleteTicket(id: number): Promise<void>;
  getAllTickets(): Promise<Ticket[]>;
  getTicketsByDepartment(departmentId: number): Promise<Ticket[]>;
  getRecentOpenTickets(limit?: number): Promise<Ticket[]>;

  // Ticket message operations
  getTicketMessages(ticketId: number): Promise<TicketMessage[]>;
  createTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;

  // Discord ticket thread operations
  getDiscordTicketThread(ticketId: number): Promise<DiscordTicketThread | undefined>;
  createDiscordTicketThread(thread: InsertDiscordTicketThread): Promise<DiscordTicketThread>;
  updateDiscordTicketThread(ticketId: number, updates: Partial<DiscordTicketThread>): Promise<void>;
  deleteDiscordTicketThread(ticketId: number): Promise<void>;

  // Package pricing operations
  getAllPackagePricing(): Promise<PackagePricing[]>;
  getEnabledPackagePricing(): Promise<PackagePricing[]>;
  getPackagePricingById(id: number): Promise<PackagePricing | undefined>;
  getPackagePricingByVirtFusionId(virtFusionPackageId: number): Promise<PackagePricing | undefined>;
  createPackagePricing(data: InsertPackagePricing): Promise<PackagePricing>;
  updatePackagePricing(id: number, updates: Partial<PackagePricing>): Promise<void>;
  deletePackagePricing(id: number): Promise<void>;

  // Settings operations
  getSetting(key: string): Promise<Settings | undefined>;
  getAllSettings(): Promise<Settings[]>;
  upsertSetting(key: string, value: string): Promise<void>;
  saveOrUpdateSetting(key: string, value: string): Promise<void>;
  deleteSetting(key: string): Promise<void>;

  // Admin operations
  getAdminUsers(): Promise<User[]>;

  // Notification operations
  getUserNotifications(userId: number): Promise<Notification[]>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationAsRead(id: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
  deleteNotification(id: number): Promise<void>;

  // Password reset operations
  createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken>;
  getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined>;
  markPasswordResetTokenAsUsed(id: number): Promise<void>;
  invalidatePasswordResetTokens(userId: number): Promise<void>;

  // Email verification operations
  createEmailVerificationToken(userId: number, token: string, expiresAt: Date): Promise<EmailVerificationToken>;
  getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined>;
  markEmailVerificationTokenAsUsed(id: number): Promise<void>;
  invalidateEmailVerificationTokens(userId: number): Promise<void>;
  verifyUserEmail(userId: number): Promise<void>;

  // Email logs operations
  logEmail(emailLog: InsertEmailLog): Promise<EmailLog>;
  getEmailLogs(): Promise<EmailLog[]>;
  getEmailLogsByType(type: string): Promise<EmailLog[]>;
  getEmailLogsByStatus(status: string): Promise<EmailLog[]>;
  getEmailLogsByUser(userId: number): Promise<EmailLog[]>;
  searchEmailLogs(params: {
    type?: string;
    status?: string;
    userId?: number;
    recipient?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: EmailLog[];
    totalCount: number;
    totalPages: number;
  }>;
  getEmailLog(id: number): Promise<EmailLog | undefined>;

  // Session store
  sessionStore: session.Store;

  // Documentation category operations
  getAllDocCategories(): Promise<DocCategory[]>;
  getDocCategoryById(id: number): Promise<DocCategory | undefined>;
  getDocCategoryBySlug(slug: string): Promise<DocCategory | undefined>;
  createDocCategory(category: InsertDocCategory): Promise<DocCategory>;
  updateDocCategory(id: number, updates: Partial<DocCategory>): Promise<void>;
  deleteDocCategory(id: number): Promise<void>;

  // Documentation operations
  getAllDocs(includeUnpublished?: boolean, categoryId?: number): Promise<Doc[]>;
  getPublishedDocs(categoryId?: number): Promise<Doc[]>;
  getDocById(id: number): Promise<Doc | undefined>;
  getDocBySlug(slug: string): Promise<Doc | undefined>;
  createDoc(doc: InsertDoc): Promise<Doc>;
  updateDoc(id: number, updates: Partial<Doc>): Promise<void>;
  deleteDoc(id: number): Promise<void>;

  // Blog category operations
  getAllBlogCategories(): Promise<BlogCategory[]>;
  getBlogCategoryById(id: number): Promise<BlogCategory | undefined>;
  getBlogCategoryBySlug(slug: string): Promise<BlogCategory | undefined>;
  createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory>;
  updateBlogCategory(id: number, updates: Partial<BlogCategory>): Promise<void>;
  deleteBlogCategory(id: number): Promise<void>;

  // Blog post operations
  getAllBlogPosts(includeUnpublished?: boolean): Promise<BlogPost[]>;
  getPublishedBlogPosts(): Promise<BlogPost[]>;
  getBlogPostsByCategory(categoryId: number, includeUnpublished?: boolean): Promise<BlogPost[]>;
  getBlogPostsWithCategories(includeUnpublished?: boolean): Promise<(BlogPost & { categoryName?: string })[]>;
  getBlogPostById(id: number): Promise<BlogPost | undefined>;
  getBlogPostBySlug(slug: string): Promise<BlogPost | undefined>;
  createBlogPost(post: InsertBlogPost): Promise<BlogPost>;
  updateBlogPost(id: number, updates: Partial<BlogPost>): Promise<void>;
  deleteBlogPost(id: number): Promise<void>;

  // Datacenter location operations
  getAllDatacenterLocations(): Promise<DatacenterLocation[]>;
  getActiveDatacenterLocations(): Promise<DatacenterLocation[]>;
  getDatacenterLocationById(id: number): Promise<DatacenterLocation | undefined>;
  getDatacenterLocationByCode(code: string): Promise<DatacenterLocation | undefined>;
  createDatacenterLocation(location: InsertDatacenterLocation): Promise<DatacenterLocation>;
  updateDatacenterLocation(id: number, updates: Partial<DatacenterLocation>): Promise<void>;
  deleteDatacenterLocation(id: number): Promise<void>;

  // Plan features operations
  getAllPlanFeatures(): Promise<PlanFeature[]>;
  getActivePlanFeatures(): Promise<PlanFeature[]>;
  getPlanFeatureById(id: number): Promise<PlanFeature | undefined>;
  createPlanFeature(feature: InsertPlanFeature): Promise<PlanFeature>;
  updatePlanFeature(id: number, updates: Partial<PlanFeature>): Promise<void>;
  deletePlanFeature(id: number): Promise<void>;

  // FAQ operations
  getAllFaqItems(): Promise<FaqItem[]>;
  getActiveFaqItems(): Promise<FaqItem[]>;
  getFaqItemById(id: number): Promise<FaqItem | undefined>;
  getFaqItemsByCategory(category: string): Promise<FaqItem[]>;
  createFaqItem(item: InsertFaqItem): Promise<FaqItem>;
  updateFaqItem(id: number, updates: Partial<FaqItem>): Promise<FaqItem>;
  deleteFaqItem(id: number): Promise<void>;

  // Legal content operations
  getLegalContent(type: string): Promise<LegalContent | undefined>;
  getAllLegalContent(): Promise<LegalContent[]>;
  createLegalContent(content: InsertLegalContent): Promise<LegalContent>;
  updateLegalContent(id: number, updates: Partial<LegalContent>): Promise<void>;

  // Team member operations
  getAllTeamMembers(): Promise<TeamMember[]>;
  getActiveTeamMembers(): Promise<TeamMember[]>;
  getTeamMemberById(id: number): Promise<TeamMember | undefined>;
  getTeamMemberByDiscordId(discordUserId: string): Promise<TeamMember | undefined>;
  createTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  updateTeamMember(id: number, updates: Partial<TeamMember>): Promise<void>;
  deleteTeamMember(id: number): Promise<void>;

  // Chat session operations
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  getChatSession(id: number): Promise<ChatSession | undefined>;
  updateChatSession(id: number, updates: Partial<ChatSession>): Promise<void>;
  getActiveChatSessions(): Promise<ChatSession[]>;
  getUserActiveChatSession(userId: number): Promise<ChatSession | undefined>;
  getAdminChatSessions(adminId: number): Promise<ChatSession[]>;
  getChatSessionsWithUsers(): Promise<(ChatSession & { user: User; assignedAdmin?: User })[]>;

  // Chat message operations
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  getChatMessages(sessionId: number): Promise<ChatMessage[]>;
  getChatMessagesWithUsers(sessionId: number): Promise<(ChatMessage & { user: User })[]>;
  markChatMessageAsRead(messageId: number): Promise<void>;

  // Admin chat status operations
  getAdminChatStatus(userId: number): Promise<AdminChatStatus | undefined>;
  upsertAdminChatStatus(userId: number, status: InsertAdminChatStatus): Promise<AdminChatStatus>;
  getAvailableAdmins(): Promise<AdminChatStatus[]>;
  updateAdminLastSeen(userId: number): Promise<void>;

  // Chat typing indicator operations
  upsertChatTypingIndicator(indicator: InsertChatTypingIndicator): Promise<ChatTypingIndicator>;
  getChatTypingIndicators(sessionId: number): Promise<ChatTypingIndicator[]>;
  clearChatTypingIndicator(sessionId: number, userId: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: {
        connectionString: process.env.DATABASE_URL,
      },
      createTableIfMissing: true
    });
  }

  // Server power status operations
  async getServerPowerStatus(serverId: number): Promise<ServerPowerStatus | undefined> {
    const [status] = await db.select()
      .from(serverPowerStatus)
      .where(eq(serverPowerStatus.serverId, serverId));
    return status;
  }

  async updateServerPowerStatus(serverId: number, data: Partial<ServerPowerStatus>): Promise<void> {
    const status = await this.getServerPowerStatus(serverId);

    if (status) {
      // Update existing status
      await db.update(serverPowerStatus)
        .set({
          ...data,
          updatedAt: new Date()
        })
        .where(eq(serverPowerStatus.serverId, serverId));
    } else {
      // Create new status record
      await db.insert(serverPowerStatus)
        .values({
          serverId,
          ...data,
          updatedAt: new Date()
        });
    }
  }

  async upsertServerPowerStatus(serverId: number, powerState: string): Promise<void> {
    await this.updateServerPowerStatus(serverId, { powerState });
  }

  // Server logs operations
  async createServerLog(log: InsertServerLog): Promise<ServerLog> {
    const [serverLog] = await db.insert(serverLogs).values(log).returning();
    return serverLog;
  }

  async getServerLogs(serverId: number, options: {
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<ServerLog[]> {
    let query = db.select().from(serverLogs);

    // Build filters
    const filters = [eq(serverLogs.serverId, serverId)];

    if (options.actionType) {
      filters.push(eq(serverLogs.actionType, options.actionType));
    }

    if (options.startDate) {
      filters.push(gte(serverLogs.createdAt, options.startDate));
    }

    if (options.endDate) {
      // Add one day to include the end date fully
      const endDate = new Date(options.endDate);
      endDate.setDate(endDate.getDate() + 1);
      filters.push(lt(serverLogs.createdAt, endDate));
    }

    // Apply filters
    query = query.where(and(...filters));

    // Order by created date descending (newest first)
    query = query.orderBy(desc(serverLogs.createdAt));

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async getServerLogsWithUser(serverId: number, options: {
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  } = {}): Promise<(ServerLog & { user: User })[]> {
    let query = db.select({
      id: serverLogs.id,
      serverId: serverLogs.serverId,
      userId: serverLogs.userId,
      action: serverLogs.action,
      actionType: serverLogs.actionType,
      status: serverLogs.status,
      details: serverLogs.details,
      metadata: serverLogs.metadata,
      userAgent: serverLogs.userAgent,
      ipAddress: serverLogs.ipAddress,
      queueId: serverLogs.queueId,
      errorMessage: serverLogs.errorMessage,
      createdAt: serverLogs.createdAt,
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        password: users.password,
        fullName: users.fullName,
        role: users.role,
        virtFusionId: users.virtFusionId,
        isVerified: users.isVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(serverLogs)
    .leftJoin(users, eq(serverLogs.userId, users.id));

    // Build filters
    const filters = [eq(serverLogs.serverId, serverId)];

    if (options.actionType) {
      filters.push(eq(serverLogs.actionType, options.actionType));
    }

    if (options.startDate) {
      filters.push(gte(serverLogs.createdAt, options.startDate));
    }

    if (options.endDate) {
      // Add one day to include the end date fully
      const endDate = new Date(options.endDate);
      endDate.setDate(endDate.getDate() + 1);
      filters.push(lt(serverLogs.createdAt, endDate));
    }

    // Apply filters
    query = query.where(and(...filters));

    // Order by created date descending (newest first)
    query = query.orderBy(desc(serverLogs.createdAt));

    // Apply pagination
    if (options.limit) {
      query = query.limit(options.limit);
    }

    if (options.offset) {
      query = query.offset(options.offset);
    }

    return await query;
  }

  async getServerLogCount(serverId: number, options: {
    actionType?: string;
    startDate?: Date;
    endDate?: Date;
  } = {}): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` })
      .from(serverLogs);

    // Build filters
    const filters = [eq(serverLogs.serverId, serverId)];

    if (options.actionType) {
      filters.push(eq(serverLogs.actionType, options.actionType));
    }

    if (options.startDate) {
      filters.push(gte(serverLogs.createdAt, options.startDate));
    }

    if (options.endDate) {
      // Add one day to include the end date fully
      const endDate = new Date(options.endDate);
      endDate.setDate(endDate.getDate() + 1);
      filters.push(lt(serverLogs.createdAt, endDate));
    }

    // Apply filters
    query = query.where(and(...filters));

    const result = await query;
    return result[0].count;
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<void> {
    console.log(`Updating user ${id} with:`, updates);
    await db.update(users).set(updates).where(eq(users.id, id));
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUsersByIds(ids: number[]): Promise<User[]> {
    if (!ids.length) return [];

    return await db.select()
      .from(users)
      .where(inArray(users.id, ids));
  }

  async updateUserRole(id: number, role: string): Promise<void> {
    await db.update(users).set({ role }).where(eq(users.id, id));
  }



  async deleteUser(id: number): Promise<void> {
    console.log(`Deleting user with ID: ${id} and all related data`);

    try {
      // Start a transaction to ensure all deletions succeed or fail together
      await db.transaction(async (tx) => {
        // Delete related data in the correct order (children first, then parent)

        // 1. Delete sessions
        console.log(`Deleting sessions for user ${id}`);
        await tx.delete(sessions).where(eq(sessions.userId, id));

        // 2. Delete transactions
        console.log(`Deleting transactions for user ${id}`);
        await tx.delete(transactions).where(eq(transactions.userId, id));

        // 3. Delete ticket messages (via tickets)
        console.log(`Deleting ticket messages for user ${id}`);
        const userTickets = await tx.select({ id: tickets.id }).from(tickets).where(eq(tickets.userId, id));
        for (const ticket of userTickets) {
          await tx.delete(ticketMessages).where(eq(ticketMessages.ticketId, ticket.id));
        }

        // 4. Delete tickets
        console.log(`Deleting tickets for user ${id}`);
        await tx.delete(tickets).where(eq(tickets.userId, id));

        // 5. Delete notifications
        console.log(`Deleting notifications for user ${id}`);
        await tx.delete(notifications).where(eq(notifications.userId, id));

        // 6. Delete password reset tokens
        console.log(`Deleting password reset tokens for user ${id}`);
        await tx.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));

        // 7. Delete email verification tokens
        console.log(`Deleting email verification tokens for user ${id}`);
        await tx.delete(emailVerificationTokens).where(eq(emailVerificationTokens.userId, id));

        // 8. Delete API keys
        console.log(`Deleting API keys for user ${id}`);
        await tx.delete(apiKeys).where(eq(apiKeys.userId, id));

        // 9. Delete server logs
        console.log(`Deleting server logs for user ${id}`);
        await tx.delete(serverLogs).where(eq(serverLogs.userId, id));

        // 10. Finally, delete the user record
        console.log(`Deleting user record for user ${id}`);
        await tx.delete(users).where(eq(users.id, id));

        console.log(`Successfully deleted user ${id} and all related data`);
      });
    } catch (error) {
      console.error(`Error deleting user ${id}:`, error);
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  // Transaction operations
  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(): Promise<Transaction[]> {
    return await db.select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(insertTransaction).returning();
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<void> {
    console.log(`Updating transaction ${id} with:`, updates);
    await db.update(transactions).set(updates).where(eq(transactions.id, id));
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }

  async searchTransactions(params: {
    userId?: number;
    startDate?: Date;
    endDate?: Date;
    status?: string;
    type?: string;
    search?: string;
  }): Promise<Transaction[]> {
    let query = db.select().from(transactions);

    // Build filters
    const filters = [];

    if (params.userId) {
      filters.push(eq(transactions.userId, params.userId));
    }

    if (params.startDate) {
      filters.push(gte(transactions.createdAt, params.startDate));
    }

    if (params.endDate) {
      // Add one day to include the end date fully
      const endDate = new Date(params.endDate);
      endDate.setDate(endDate.getDate() + 1);
      filters.push(lt(transactions.createdAt, endDate));
    }

    if (params.status) {
      filters.push(eq(transactions.status, params.status));
    }

    if (params.type) {
      filters.push(eq(transactions.type, params.type));
    }

    if (params.search) {
      filters.push(or(
        ilike(transactions.description, `%${params.search}%`),
        ilike(transactions.paymentId, `%${params.search}%`)
      ));
    }

    // Apply filters if any
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    // Order by created date descending
    return await query.orderBy(desc(transactions.createdAt));
  }



  // Ticket Department operations
  async getAllTicketDepartments(): Promise<TicketDepartment[]> {
    return await db.select()
      .from(ticketDepartments)
      .orderBy(ticketDepartments.displayOrder);
  }

  async getActiveTicketDepartments(): Promise<TicketDepartment[]> {
    return await db.select()
      .from(ticketDepartments)
      .where(eq(ticketDepartments.isActive, true))
      .orderBy(ticketDepartments.displayOrder);
  }

  async getTicketDepartment(id: number): Promise<TicketDepartment | undefined> {
    const [department] = await db.select().from(ticketDepartments).where(eq(ticketDepartments.id, id));
    return department;
  }

  async getDefaultTicketDepartment(): Promise<TicketDepartment | undefined> {
    const [department] = await db.select()
      .from(ticketDepartments)
      .where(and(
        eq(ticketDepartments.isDefault, true),
        eq(ticketDepartments.isActive, true)
      ));
    return department;
  }

  async createTicketDepartment(department: InsertTicketDepartment): Promise<TicketDepartment> {
    // If this department is set as default, we need to unset any existing defaults
    if (department.isDefault) {
      await db.update(ticketDepartments)
        .set({ isDefault: false })
        .where(eq(ticketDepartments.isDefault, true));
    }

    const [newDepartment] = await db.insert(ticketDepartments).values(department).returning();
    return newDepartment;
  }

  async updateTicketDepartment(id: number, updates: Partial<TicketDepartment>): Promise<void> {
    // If this department is being set as default, we need to unset any existing defaults
    if (updates.isDefault) {
      await db.update(ticketDepartments)
        .set({ isDefault: false })
        .where(and(
          eq(ticketDepartments.isDefault, true),
          not(eq(ticketDepartments.id, id))
        ));
    }

    await db.update(ticketDepartments)
      .set(updates)
      .where(eq(ticketDepartments.id, id));
  }

  async deleteTicketDepartment(id: number): Promise<void> {
    await db.delete(ticketDepartments).where(eq(ticketDepartments.id, id));
  }

  // Ticket operations
  async getUserTickets(userId: number): Promise<Ticket[]> {
    return await db.select()
      .from(tickets)
      .where(eq(tickets.userId, userId))
      .orderBy(desc(tickets.createdAt));
  }

  async getUserTicketsCount(userId: number, status?: string): Promise<number> {
    const filters = [eq(tickets.userId, userId)];

    if (status) {
      filters.push(eq(tickets.status, status));
    }

    const result = await db.select({ count: sql<number>`count(*)` })
      .from(tickets)
      .where(and(...filters));

    return result[0].count;
  }

  async getUserTicketsPaginated(userId: number, limit: number, offset: number, status?: string): Promise<Ticket[]> {
    const filters = [eq(tickets.userId, userId)];

    if (status) {
      filters.push(eq(tickets.status, status));
    }

    return await db.select()
      .from(tickets)
      .where(and(...filters))
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getTicket(id: number): Promise<Ticket | undefined> {
    const [ticket] = await db.select().from(tickets).where(eq(tickets.id, id));
    return ticket;
  }

  async createTicket(insertTicket: InsertTicket): Promise<Ticket> {
    const [ticket] = await db.insert(tickets).values(insertTicket).returning();
    return ticket;
  }

  async updateTicket(id: number, updates: Partial<Ticket>): Promise<void> {
    await db.update(tickets)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(tickets.id, id));
  }

  async deleteTicket(id: number): Promise<void> {
    // First delete all messages associated with this ticket
    await db.delete(ticketMessages).where(eq(ticketMessages.ticketId, id));

    // Then delete the ticket itself
    await db.delete(tickets).where(eq(tickets.id, id));
    console.log(`Deleted ticket with ID ${id} and all associated messages`);
  }

  async getAllTickets(): Promise<Ticket[]> {
    return await db.select()
      .from(tickets)
      .orderBy(desc(tickets.createdAt));
  }

  async getAllTicketsCount(status?: string): Promise<number> {
    let query = db.select({ count: sql<number>`count(*)` })
      .from(tickets);

    if (status) {
      query = query.where(eq(tickets.status, status));
    }

    const result = await query;
    return result[0].count;
  }

  async getAllTicketsPaginated(limit: number, offset: number, status?: string): Promise<Ticket[]> {
    let query = db.select()
      .from(tickets);

    if (status) {
      query = query.where(eq(tickets.status, status));
    }

    return await query
      .orderBy(desc(tickets.createdAt))
      .limit(limit)
      .offset(offset);
  }



  async getTicketsByStatus(statuses: string[]): Promise<Ticket[]> {
    return await db.select()
      .from(tickets)
      .where(inArray(tickets.status, statuses))
      .orderBy(desc(tickets.createdAt));
  }

  async getRecentOpenTickets(limit: number = 10): Promise<Ticket[]> {
    // Get tickets that are open and have not been responded to by admin
    // We'll need to join with ticket messages to check for admin responses

    // First get all open tickets
    const openTickets = await db.select({
      id: tickets.id,
      userId: tickets.userId,
      departmentId: tickets.departmentId,
      subject: tickets.subject,
      status: tickets.status,
      priority: tickets.priority,
      vpsId: tickets.vpsId,
      vpsData: tickets.vpsData,
      createdAt: tickets.createdAt,
      updatedAt: tickets.updatedAt
    })
    .from(tickets)
    .where(eq(tickets.status, 'Open'))
    .orderBy(desc(tickets.createdAt))
    .limit(limit * 2); // Get more than we need since we'll filter some out

    // For each ticket, get the last message to see if it was from an admin
    const result: Ticket[] = [];

    for (const ticket of openTickets) {
      // Get the last message for this ticket
      const [lastMessage] = await db.select({
        userId: ticketMessages.userId,
        createdAt: ticketMessages.createdAt
      })
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticket.id))
      .orderBy(desc(ticketMessages.createdAt))
      .limit(1);

      if (!lastMessage || lastMessage.userId === ticket.userId) {
        // If there's no message or the last message was from the ticket creator
        // This ticket needs a response
        result.push(ticket);

        // If we have enough tickets, stop processing
        if (result.length >= limit) {
          break;
        }
      }
    }

    return result;
  }

  // Ticket message operations
  async getTicketMessages(ticketId: number): Promise<TicketMessage[]> {
    return await db.select()
      .from(ticketMessages)
      .where(eq(ticketMessages.ticketId, ticketId))
      .orderBy(ticketMessages.createdAt);
  }

  async createTicketMessage(insertMessage: InsertTicketMessage): Promise<TicketMessage> {
    const [message] = await db.insert(ticketMessages).values(insertMessage).returning();
    return message;
  }

  // Discord ticket thread operations
  async getDiscordTicketThread(ticketId: number): Promise<DiscordTicketThread | undefined> {
    const [thread] = await db.select()
      .from(discordTicketThreads)
      .where(eq(discordTicketThreads.ticketId, ticketId));
    return thread;
  }

  async createDiscordTicketThread(thread: InsertDiscordTicketThread): Promise<DiscordTicketThread> {
    const [createdThread] = await db.insert(discordTicketThreads).values(thread).returning();
    return createdThread;
  }

  async updateDiscordTicketThread(ticketId: number, updates: Partial<DiscordTicketThread>): Promise<void> {
    await db.update(discordTicketThreads)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(discordTicketThreads.ticketId, ticketId));
  }

  async deleteDiscordTicketThread(ticketId: number): Promise<void> {
    await db.delete(discordTicketThreads)
      .where(eq(discordTicketThreads.ticketId, ticketId));
  }

  // Settings operations
  async getSetting(key: string): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async getAllSettings(): Promise<Settings[]> {
    return await db.select().from(settings);
  }

  async upsertSetting(key: string, value: string): Promise<void> {
    console.log(`Storage: Upserting setting ${key} = ${key.includes('token') ? '***' : value}`);
    try {
      const [existingSetting] = await db.select().from(settings).where(eq(settings.key, key));

      console.log(`Storage: Existing setting found: ${existingSetting ? 'yes' : 'no'}`);

      if (existingSetting) {
        console.log(`Storage: Updating existing setting ${key}`);
        await db.update(settings)
          .set({ value, updatedAt: new Date() })
          .where(eq(settings.key, key));

        console.log(`Storage: Updated setting ${key}`);
      } else {
        console.log(`Storage: Inserting new setting ${key}`);
        await db.insert(settings).values({ key, value });
        console.log(`Storage: Inserted setting ${key}`);
      }

      // Verify the setting was saved correctly
      const [verifiedSetting] = await db.select().from(settings).where(eq(settings.key, key));
      console.log(`Storage: Verification - Setting ${key} exists: ${verifiedSetting ? 'yes' : 'no'}`);
      if (verifiedSetting) {
        console.log(`Storage: Verification - Value matches: ${verifiedSetting.value === value}`);
      }
    } catch (error) {
      console.error(`Storage: Error upserting setting ${key}:`, error);
      throw error; // Rethrow to allow caller to handle
    }
  }

  /**
   * Save or update a setting
   * @param key The setting key
   * @param value The setting value
   * @returns Promise that resolves when done
   */
  async saveOrUpdateSetting(key: string, value: string): Promise<void> {
    return this.upsertSetting(key, value);
  }

  /**
   * Delete a setting
   * @param key The setting key
   * @returns Promise that resolves when done
   */
  async deleteSetting(key: string): Promise<void> {
    await db.delete(settings).where(eq(settings.key, key));
  }

  /**
   * Get all admin users
   * @returns Promise that resolves with all admin users
   */
  async getAdminUsers(): Promise<User[]> {
    return await db.select()
      .from(users)
      .where(eq(users.role, 'admin'));
  }

  // Notification operations
  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await db.select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    const result = await db.select({ count: count() })
      .from(notifications)
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));

    return result[0]?.count || 0;
  }

  async createNotification(insertNotification: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values(insertNotification).returning();
    return notification;
  }

  async markNotificationAsRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(and(
        eq(notifications.userId, userId),
        eq(notifications.read, false)
      ));
  }

  async deleteNotification(id: number): Promise<void> {
    await db.delete(notifications).where(eq(notifications.id, id));
  }

  // Password reset operations
  async createPasswordResetToken(userId: number, token: string, expiresAt: Date): Promise<PasswordResetToken> {
    const [resetToken] = await db.insert(passwordResetTokens)
      .values({
        userId,
        token,
        expiresAt
      })
      .returning();
    return resetToken;
  }

  async getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
    const [resetToken] = await db.select()
      .from(passwordResetTokens)
      .where(eq(passwordResetTokens.token, token));
    return resetToken;
  }

  async markPasswordResetTokenAsUsed(id: number): Promise<void> {
    await db.update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, id));
  }

  async invalidatePasswordResetTokens(userId: number): Promise<void> {
    // Find all unused tokens for this user
    const tokensToInvalidate = await db.select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt)
        )
      );

    // Mark them all as used
    for (const token of tokensToInvalidate) {
      await this.markPasswordResetTokenAsUsed(token.id);
    }
  }

  // Email verification operations
  async createEmailVerificationToken(userId: number, token: string, expiresAt: Date): Promise<EmailVerificationToken> {
    const [verificationToken] = await db.insert(emailVerificationTokens)
      .values({
        userId,
        token,
        expiresAt
      })
      .returning();
    return verificationToken;
  }

  async getEmailVerificationToken(token: string): Promise<EmailVerificationToken | undefined> {
    const [verificationToken] = await db.select()
      .from(emailVerificationTokens)
      .where(eq(emailVerificationTokens.token, token));
    return verificationToken;
  }

  async markEmailVerificationTokenAsUsed(id: number): Promise<void> {
    await db.update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(eq(emailVerificationTokens.id, id));
  }

  async invalidateEmailVerificationTokens(userId: number): Promise<void> {
    // Find all unused tokens for this user
    const tokensToInvalidate = await db.select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          isNull(emailVerificationTokens.usedAt)
        )
      );

    // Mark them all as used
    for (const token of tokensToInvalidate) {
      await this.markEmailVerificationTokenAsUsed(token.id);
    }
  }

  async verifyUserEmail(userId: number): Promise<void> {
    await db.update(users)
      .set({ isVerified: true, updatedAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Email logs operations
  async logEmail(emailLog: InsertEmailLog): Promise<EmailLog> {
    const [log] = await db.insert(emailLogs).values(emailLog).returning();
    return log;
  }

  async getEmailLogs(): Promise<EmailLog[]> {
    return await db.select()
      .from(emailLogs)
      .orderBy(desc(emailLogs.sentAt));
  }

  async getEmailLogsByType(type: string): Promise<EmailLog[]> {
    return await db.select()
      .from(emailLogs)
      .where(eq(emailLogs.type, type))
      .orderBy(desc(emailLogs.sentAt));
  }

  async getEmailLogsByStatus(status: string): Promise<EmailLog[]> {
    return await db.select()
      .from(emailLogs)
      .where(eq(emailLogs.status, status))
      .orderBy(desc(emailLogs.sentAt));
  }

  async getEmailLogsByUser(userId: number): Promise<EmailLog[]> {
    return await db.select()
      .from(emailLogs)
      .where(eq(emailLogs.userId, userId))
      .orderBy(desc(emailLogs.sentAt));
  }

  async searchEmailLogs(params: {
    type?: string;
    status?: string;
    userId?: number;
    recipient?: string;
    startDate?: Date;
    endDate?: Date;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    logs: EmailLog[];
    totalCount: number;
    totalPages: number;
  }> {
    console.log('Searching email logs with params:', params);

    try {
      // Set default pagination values
      const page = params.page || 1;
      const limit = params.limit || 10;
      const offset = (page - 1) * limit;

      // Build query with filters
      let queryBuilder = db.select().from(emailLogs);
      let countQueryBuilder = db.select({ count: sql`count(*)` }).from(emailLogs);

      // Build filters
      const filters = [];

      if (params.type) {
        filters.push(eq(emailLogs.type, params.type));
      }

      if (params.status) {
        filters.push(eq(emailLogs.status, params.status));
      }

      if (params.userId) {
        filters.push(eq(emailLogs.userId, params.userId));
      }

      if (params.recipient) {
        filters.push(ilike(emailLogs.recipientEmail, `%${params.recipient}%`));
      }

      if (params.startDate) {
        filters.push(gte(emailLogs.sentAt, params.startDate));
      }

      if (params.endDate) {
        // Add one day to include the end date fully
        const endDate = new Date(params.endDate);
        endDate.setDate(endDate.getDate() + 1);
        filters.push(lt(emailLogs.sentAt, endDate));
      }

      if (params.search) {
        filters.push(or(
          ilike(emailLogs.recipientEmail, `%${params.search}%`),
          ilike(emailLogs.subject, `%${params.search}%`),
          ilike(emailLogs.type, `%${params.search}%`)
        ));
      }

      // Apply filters if any
      if (filters.length > 0) {
        queryBuilder = queryBuilder.where(and(...filters));
        countQueryBuilder = countQueryBuilder.where(and(...filters));
      }

      // Get total count for pagination
      const [countResult] = await countQueryBuilder;
      const totalCount = Number(countResult?.count || 0);
      const totalPages = Math.ceil(totalCount / limit);

      // Get paginated data
      queryBuilder = queryBuilder
        .orderBy(desc(emailLogs.sentAt))
        .limit(limit)
        .offset(offset);

      const logs = await queryBuilder;

      console.log(`Found ${logs.length} email logs (page ${page} of ${totalPages}, total: ${totalCount})`);

      return {
        logs,
        totalCount,
        totalPages
      };
    } catch (error) {
      console.error('Error searching email logs:', error);
      // Return empty result rather than failing completely
      return {
        logs: [],
        totalCount: 0,
        totalPages: 0
      };
    }
  }

  async getEmailLog(id: number): Promise<EmailLog | undefined> {
    const [log] = await db.select().from(emailLogs).where(eq(emailLogs.id, id));
    return log;
  }

  // ---- Implementation of Documentation operations ----
  // ---- Implementation of Documentation Category operations ----
  async getAllDocCategories(): Promise<DocCategory[]> {
    return await db.select().from(docCategories)
      .orderBy(docCategories.displayOrder)
      .orderBy(docCategories.name);
  }

  async getDocCategoryById(id: number): Promise<DocCategory | undefined> {
    const [category] = await db.select().from(docCategories).where(eq(docCategories.id, id));
    return category;
  }

  async getDocCategoryBySlug(slug: string): Promise<DocCategory | undefined> {
    const [category] = await db.select().from(docCategories).where(eq(docCategories.slug, slug));
    return category;
  }

  async createDocCategory(category: InsertDocCategory): Promise<DocCategory> {
    const [createdCategory] = await db.insert(docCategories).values(category).returning();
    return createdCategory;
  }

  async updateDocCategory(id: number, updates: Partial<DocCategory>): Promise<void> {
    await db.update(docCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(docCategories.id, id));
  }

  async deleteDocCategory(id: number): Promise<void> {
    // First update any docs in this category to remove the category link
    await db.update(docs)
      .set({ categoryId: null })
      .where(eq(docs.categoryId, id));

    // Then delete the category
    await db.delete(docCategories).where(eq(docCategories.id, id));
  }

  // ---- Implementation of Documentation operations ----
  async getAllDocs(includeUnpublished: boolean = false, categoryId?: number): Promise<Doc[]> {
    let query = db.select().from(docs);

    // Build filters for query
    const filters = [];

    if (!includeUnpublished) {
      filters.push(eq(docs.published, true));
    }

    if (categoryId) {
      filters.push(eq(docs.categoryId, categoryId));
    }

    // Apply filters if any
    if (filters.length > 0) {
      query = query.where(and(...filters));
    }

    return await query.orderBy(docs.displayOrder)
      .orderBy(docs.title);
  }

  async getPublishedDocs(categoryId?: number): Promise<Doc[]> {
    return this.getAllDocs(false, categoryId);
  }

  async getDocById(id: number): Promise<Doc | undefined> {
    const [doc] = await db.select().from(docs).where(eq(docs.id, id));
    return doc;
  }

  async getDocBySlug(slug: string): Promise<Doc | undefined> {
    const [doc] = await db.select().from(docs).where(eq(docs.slug, slug));
    return doc;
  }

  async createDoc(doc: InsertDoc): Promise<Doc> {
    const [createdDoc] = await db.insert(docs).values(doc).returning();
    return createdDoc;
  }

  async updateDoc(id: number, updates: Partial<Doc>): Promise<void> {
    await db.update(docs)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(docs.id, id));
  }

  async deleteDoc(id: number): Promise<void> {
    await db.delete(docs).where(eq(docs.id, id));
  }

  // ---- Implementation of Blog Category operations ----
  async getAllBlogCategories(): Promise<BlogCategory[]> {
    return await db.select().from(blogCategories)
      .orderBy(blogCategories.displayOrder)
      .orderBy(blogCategories.name);
  }

  async getBlogCategoryById(id: number): Promise<BlogCategory | undefined> {
    const [category] = await db.select().from(blogCategories).where(eq(blogCategories.id, id));
    return category;
  }

  async getBlogCategoryBySlug(slug: string): Promise<BlogCategory | undefined> {
    const [category] = await db.select().from(blogCategories).where(eq(blogCategories.slug, slug));
    return category;
  }

  async createBlogCategory(category: InsertBlogCategory): Promise<BlogCategory> {
    const [createdCategory] = await db.insert(blogCategories).values(category).returning();
    return createdCategory;
  }

  async updateBlogCategory(id: number, updates: Partial<BlogCategory>): Promise<void> {
    await db.update(blogCategories)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogCategories.id, id));
  }

  async deleteBlogCategory(id: number): Promise<void> {
    await db.delete(blogCategories).where(eq(blogCategories.id, id));
  }

  // ---- Implementation of Blog Post operations ----
  async getAllBlogPosts(includeUnpublished: boolean = false): Promise<BlogPost[]> {
    let query = db.select().from(blogPosts);

    if (!includeUnpublished) {
      query = query.where(eq(blogPosts.published, true));
    }

    return await query.orderBy(desc(blogPosts.date))
      .orderBy(blogPosts.displayOrder)
      .orderBy(blogPosts.title);
  }

  async getPublishedBlogPosts(): Promise<BlogPost[]> {
    return this.getAllBlogPosts(false);
  }

  async getBlogPostsWithCategories(includeUnpublished: boolean = false): Promise<(BlogPost & { categoryName?: string })[]> {
    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        snippet: blogPosts.snippet,
        content: blogPosts.content,
        author: blogPosts.author,
        featuredImageUrl: blogPosts.featuredImageUrl,
        excerpt: blogPosts.excerpt,
        tags: blogPosts.tags,
        date: blogPosts.date,
        published: blogPosts.published,
        displayOrder: blogPosts.displayOrder,
        categoryId: blogPosts.categoryId,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
        createdBy: blogPosts.createdBy,
        updatedBy: blogPosts.updatedBy,
        categoryName: blogCategories.name
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(includeUnpublished ? undefined : eq(blogPosts.published, true))
      .orderBy(desc(blogPosts.date), blogPosts.displayOrder, blogPosts.title);

    return posts;
  }

  async getBlogPostsByCategory(categoryId: number, includeUnpublished: boolean = false): Promise<(BlogPost & { categoryName?: string })[]> {
    const posts = await db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        snippet: blogPosts.snippet,
        content: blogPosts.content,
        author: blogPosts.author,
        featuredImageUrl: blogPosts.featuredImageUrl,
        excerpt: blogPosts.excerpt,
        tags: blogPosts.tags,
        date: blogPosts.date,
        published: blogPosts.published,
        displayOrder: blogPosts.displayOrder,
        categoryId: blogPosts.categoryId,
        createdAt: blogPosts.createdAt,
        updatedAt: blogPosts.updatedAt,
        createdBy: blogPosts.createdBy,
        updatedBy: blogPosts.updatedBy,
        categoryName: blogCategories.name
      })
      .from(blogPosts)
      .leftJoin(blogCategories, eq(blogPosts.categoryId, blogCategories.id))
      .where(
        and(
          includeUnpublished ? undefined : eq(blogPosts.published, true),
          eq(blogPosts.categoryId, categoryId)
        )
      )
      .orderBy(desc(blogPosts.date), blogPosts.displayOrder, blogPosts.title);

    return posts;
  }

  async getBlogPostById(id: number): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return post;
  }

  async getBlogPostBySlug(slug: string): Promise<BlogPost | undefined> {
    const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug));
    return post;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const [createdPost] = await db.insert(blogPosts).values(post).returning();
    return createdPost;
  }

  async updateBlogPost(id: number, updates: Partial<BlogPost>): Promise<void> {
    await db.update(blogPosts)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(blogPosts.id, id));
  }

  async deleteBlogPost(id: number): Promise<void> {
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
  }

  // Datacenter location operations
  async getAllDatacenterLocations(): Promise<DatacenterLocation[]> {
    try {
      // Try to query with new fields
      const locations = await db.select()
        .from(datacenterLocations)
        .orderBy(datacenterLocations.displayOrder)
        .orderBy(datacenterLocations.regionCode)
        .orderBy(datacenterLocations.name);

      // Post-process to handle status field if it exists
      return locations.map(location => {
        // Add default values for new fields if they don't exist in the database
        return {
          ...location,
          status: location.status || (location.isActive ? 'active' : 'inactive'),
          displayOrder: location.displayOrder !== undefined ? location.displayOrder : 0,
          uptime: location.uptime || 99.9,
          networkSpeedMbps: location.networkSpeedMbps || 10000,
        };
      });
    } catch (error) {
      console.error("Error in getAllDatacenterLocations:", error);
      // Fallback to simpler query if the new fields are not available
      const locations = await db.select()
        .from(datacenterLocations)
        .orderBy(datacenterLocations.regionCode, datacenterLocations.name);

      return locations;
    }
  }

  async getActiveDatacenterLocations(): Promise<DatacenterLocation[]> {
    try {
      // Use a simpler query that only references existing columns
      const locations = await db.select()
        .from(datacenterLocations)
        .where(eq(datacenterLocations.isActive, true))
        .orderBy(datacenterLocations.regionCode, datacenterLocations.name);

      // Post-process to handle fields that might not exist in the database
      return locations.map(loc => {
        return {
          ...loc,
          // Add default values for new fields if they don't exist
          status: loc.status || (loc.isActive ? 'active' : 'inactive'),
          displayOrder: typeof loc.displayOrder === 'number' ? loc.displayOrder : 0,
          uptime: typeof loc.uptime === 'number' ? loc.uptime : 99.9,
          networkSpeedMbps: typeof loc.networkSpeedMbps === 'number' ? loc.networkSpeedMbps : 10000,
        };
      });
    } catch (error) {
      console.error("Error in getActiveDatacenterLocations:", error);
      throw error;
    }
  }

  async getDatacenterLocationById(id: number): Promise<DatacenterLocation | undefined> {
    const [location] = await db.select()
      .from(datacenterLocations)
      .where(eq(datacenterLocations.id, id));
    return location;
  }

  async getDatacenterLocationByCode(code: string): Promise<DatacenterLocation | undefined> {
    const [location] = await db.select()
      .from(datacenterLocations)
      .where(eq(datacenterLocations.code, code));
    return location;
  }

  async createDatacenterLocation(location: InsertDatacenterLocation): Promise<DatacenterLocation> {
    const [createdLocation] = await db.insert(datacenterLocations).values(location).returning();
    return createdLocation;
  }

  async updateDatacenterLocation(id: number, updates: Partial<DatacenterLocation>): Promise<void> {
    await db.update(datacenterLocations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(datacenterLocations.id, id));
  }

  async deleteDatacenterLocation(id: number): Promise<void> {
    await db.delete(datacenterLocations).where(eq(datacenterLocations.id, id));
  }

  // Plan Features operations
  async getAllPlanFeatures(): Promise<PlanFeature[]> {
    return await db.select()
      .from(planFeatures)
      .orderBy(planFeatures.displayOrder, planFeatures.title);
  }

  async getActivePlanFeatures(): Promise<PlanFeature[]> {
    return await db.select()
      .from(planFeatures)
      .where(eq(planFeatures.isActive, true))
      .orderBy(planFeatures.displayOrder, planFeatures.title);
  }

  async getPlanFeatureById(id: number): Promise<PlanFeature | undefined> {
    const [feature] = await db.select()
      .from(planFeatures)
      .where(eq(planFeatures.id, id));
    return feature;
  }

  async createPlanFeature(feature: InsertPlanFeature): Promise<PlanFeature> {
    const [createdFeature] = await db.insert(planFeatures).values(feature).returning();
    return createdFeature;
  }

  async updatePlanFeature(id: number, updates: Partial<PlanFeature>): Promise<void> {
    await db.update(planFeatures)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(planFeatures.id, id));
  }

  async deletePlanFeature(id: number): Promise<void> {
    await db.delete(planFeatures).where(eq(planFeatures.id, id));
  }

  // FAQ operations
  async getAllFaqItems(): Promise<FaqItem[]> {
    return await db.select()
      .from(faqItems)
      .orderBy(faqItems.displayOrder, faqItems.question);
  }

  async getActiveFaqItems(): Promise<FaqItem[]> {
    return await db.select()
      .from(faqItems)
      .where(eq(faqItems.isActive, true))
      .orderBy(faqItems.displayOrder, faqItems.question);
  }

  async getFaqItemById(id: number): Promise<FaqItem | undefined> {
    const [item] = await db.select()
      .from(faqItems)
      .where(eq(faqItems.id, id));
    return item;
  }

  async getFaqItemsByCategory(category: string): Promise<FaqItem[]> {
    return await db.select()
      .from(faqItems)
      .where(eq(faqItems.category, category))
      .orderBy(faqItems.displayOrder, faqItems.question);
  }

  async createFaqItem(item: InsertFaqItem): Promise<FaqItem> {
    const [createdItem] = await db.insert(faqItems).values(item).returning();
    return createdItem;
  }

  async updateFaqItem(id: number, updates: Partial<FaqItem>): Promise<FaqItem> {
    const [updatedItem] = await db.update(faqItems)
      .set(updates)
      .where(eq(faqItems.id, id))
      .returning();

    return updatedItem;
  }

  async deleteFaqItem(id: number): Promise<void> {
    await db.delete(faqItems).where(eq(faqItems.id, id));
  }

  // Legal content operations
  async getLegalContent(type: string): Promise<LegalContent | undefined> {
    const [content] = await db.select()
      .from(legalContent)
      .where(eq(legalContent.type, type));
    return content;
  }

  async getAllLegalContent(): Promise<LegalContent[]> {
    return await db.select()
      .from(legalContent)
      .orderBy(legalContent.type);
  }

  async createLegalContent(content: InsertLegalContent): Promise<LegalContent> {
    const [createdContent] = await db.insert(legalContent)
      .values(content)
      .returning();
    return createdContent;
  }

  async updateLegalContent(id: number, updates: Partial<LegalContent>): Promise<void> {
    await db.update(legalContent)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(legalContent.id, id));
  }

  // Team member operations
  async getAllTeamMembers(): Promise<TeamMember[]> {
    return await db.select()
      .from(teamMembers)
      .orderBy(teamMembers.displayOrder, teamMembers.role);
  }

  async getActiveTeamMembers(): Promise<TeamMember[]> {
    return await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.isActive, true))
      .orderBy(teamMembers.displayOrder, teamMembers.role);
  }

  async getTeamMemberById(id: number): Promise<TeamMember | undefined> {
    const [member] = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.id, id));
    return member;
  }

  async getTeamMemberByDiscordId(discordUserId: string): Promise<TeamMember | undefined> {
    const [member] = await db.select()
      .from(teamMembers)
      .where(eq(teamMembers.discordUserId, discordUserId));
    return member;
  }

  async createTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [createdMember] = await db.insert(teamMembers)
      .values(member)
      .returning();
    return createdMember;
  }

  async updateTeamMember(id: number, updates: Partial<TeamMember>): Promise<void> {
    await db.update(teamMembers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(teamMembers.id, id));
  }

  async deleteTeamMember(id: number): Promise<void> {
    await db.delete(teamMembers).where(eq(teamMembers.id, id));
  }

  // Chat session operations
  async createChatSession(session: InsertChatSession): Promise<ChatSession> {
    const [createdSession] = await db.insert(chatSessions).values(session).returning();
    return createdSession;
  }

  async getChatSession(id: number): Promise<ChatSession | undefined> {
    const [session] = await db.select().from(chatSessions).where(eq(chatSessions.id, id));
    return session;
  }

  async updateChatSession(id: number, updates: Partial<ChatSession>): Promise<void> {
    await db.update(chatSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(chatSessions.id, id));
  }

  async getActiveChatSessions(): Promise<ChatSession[]> {
    return await db.select()
      .from(chatSessions)
      .where(inArray(chatSessions.status, ['waiting', 'active']))
      .orderBy(desc(chatSessions.lastActivityAt));
  }

  async getUserActiveChatSession(userId: number): Promise<ChatSession | undefined> {
    const [session] = await db.select()
      .from(chatSessions)
      .where(and(
        eq(chatSessions.userId, userId),
        inArray(chatSessions.status, ['waiting', 'active'])
      ))
      .orderBy(desc(chatSessions.lastActivityAt))
      .limit(1);
    return session;
  }

  async getAdminChatSessions(adminId: number): Promise<ChatSession[]> {
    return await db.select()
      .from(chatSessions)
      .where(eq(chatSessions.assignedAdminId, adminId))
      .orderBy(desc(chatSessions.lastActivityAt));
  }

  async getChatSessionsWithUsers(): Promise<(ChatSession & { user: User; assignedAdmin?: User })[]> {
    const sessions = await db.select({
      id: chatSessions.id,
      userId: chatSessions.userId,
      assignedAdminId: chatSessions.assignedAdminId,
      status: chatSessions.status,
      priority: chatSessions.priority,
      subject: chatSessions.subject,
      department: chatSessions.department,
      metadata: chatSessions.metadata,
      startedAt: chatSessions.startedAt,
      endedAt: chatSessions.endedAt,
      lastActivityAt: chatSessions.lastActivityAt,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        password: users.password,
        fullName: users.fullName,
        role: users.role,
        virtFusionId: users.virtFusionId,
        isVerified: users.isVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(chatSessions)
    .leftJoin(users, eq(chatSessions.userId, users.id))
    .orderBy(desc(chatSessions.lastActivityAt));

    // Get assigned admins separately to avoid complex joins
    const result = [];
    for (const session of sessions) {
      let assignedAdmin = undefined;
      if (session.assignedAdminId) {
        assignedAdmin = await this.getUser(session.assignedAdminId);
      }
      result.push({
        ...session,
        assignedAdmin
      });
    }

    return result;
  }

  // Chat message operations
  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [createdMessage] = await db.insert(chatMessages).values(message).returning();
    return createdMessage;
  }

  async getChatMessages(sessionId: number): Promise<ChatMessage[]> {
    return await db.select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(chatMessages.createdAt);
  }

  async getChatMessagesWithUsers(sessionId: number): Promise<(ChatMessage & { user: User })[]> {
    return await db.select({
      id: chatMessages.id,
      sessionId: chatMessages.sessionId,
      userId: chatMessages.userId,
      message: chatMessages.message,
      messageType: chatMessages.messageType,
      isFromAdmin: chatMessages.isFromAdmin,
      readAt: chatMessages.readAt,
      metadata: chatMessages.metadata,
      createdAt: chatMessages.createdAt,
      user: {
        id: users.id,
        email: users.email,
        username: users.username,
        password: users.password,
        fullName: users.fullName,
        role: users.role,
        virtFusionId: users.virtFusionId,
        isVerified: users.isVerified,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      }
    })
    .from(chatMessages)
    .leftJoin(users, eq(chatMessages.userId, users.id))
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);
  }

  async markChatMessageAsRead(messageId: number): Promise<void> {
    await db.update(chatMessages)
      .set({ readAt: new Date() })
      .where(eq(chatMessages.id, messageId));
  }

  // Admin chat status operations
  async getAdminChatStatus(userId: number): Promise<AdminChatStatus | undefined> {
    const [status] = await db.select()
      .from(adminChatStatus)
      .where(eq(adminChatStatus.userId, userId));
    return status;
  }

  async upsertAdminChatStatus(userId: number, statusData: InsertAdminChatStatus): Promise<AdminChatStatus> {
    console.log(`Upserting admin chat status for user ${userId}:`, statusData);
    const existingStatus = await this.getAdminChatStatus(userId);

    if (existingStatus) {
      console.log(`Updating existing status for user ${userId}`);
      const [updatedStatus] = await db.update(adminChatStatus)
        .set({ ...statusData, updatedAt: new Date() })
        .where(eq(adminChatStatus.userId, userId))
        .returning();
      console.log(`Updated status:`, updatedStatus);
      return updatedStatus;
    } else {
      console.log(`Creating new status for user ${userId}`);
      const [newStatus] = await db.insert(adminChatStatus)
        .values({ ...statusData, userId })
        .returning();
      console.log(`Created status:`, newStatus);
      return newStatus;
    }
  }

  async getAvailableAdmins(): Promise<AdminChatStatus[]> {
    return await db.select()
      .from(adminChatStatus)
      .where(and(
        inArray(adminChatStatus.status, ['online', 'away']),
        eq(adminChatStatus.autoAssign, true)
      ))
      .orderBy(adminChatStatus.lastSeenAt);
  }

  async updateAdminLastSeen(userId: number): Promise<void> {
    await db.update(adminChatStatus)
      .set({ lastSeenAt: new Date(), updatedAt: new Date() })
      .where(eq(adminChatStatus.userId, userId));
  }

  // Chat typing indicator operations
  async upsertChatTypingIndicator(indicator: InsertChatTypingIndicator): Promise<ChatTypingIndicator> {
    const existing = await db.select()
      .from(chatTypingIndicators)
      .where(and(
        eq(chatTypingIndicators.sessionId, indicator.sessionId),
        eq(chatTypingIndicators.userId, indicator.userId)
      ))
      .limit(1);

    if (existing.length > 0) {
      await db.update(chatTypingIndicators)
        .set({
          isTyping: indicator.isTyping,
          lastTypingAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(chatTypingIndicators.sessionId, indicator.sessionId),
          eq(chatTypingIndicators.userId, indicator.userId)
        ));
      return { ...existing[0], ...indicator };
    } else {
      const [newIndicator] = await db.insert(chatTypingIndicators)
        .values(indicator)
        .returning();
      return newIndicator;
    }
  }

  async getChatTypingIndicators(sessionId: number): Promise<ChatTypingIndicator[]> {
    return await db.select()
      .from(chatTypingIndicators)
      .where(and(
        eq(chatTypingIndicators.sessionId, sessionId),
        eq(chatTypingIndicators.isTyping, true)
      ));
  }

  async clearChatTypingIndicator(sessionId: number, userId: number): Promise<void> {
    await db.update(chatTypingIndicators)
      .set({ isTyping: false, updatedAt: new Date() })
      .where(and(
        eq(chatTypingIndicators.sessionId, sessionId),
        eq(chatTypingIndicators.userId, userId)
      ));
  }
}

export const storage = new DatabaseStorage();
