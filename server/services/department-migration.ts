import { db } from '../db';
import { sql, eq, and } from 'drizzle-orm';
import { 
  supportDepartments, 
  ticketDepartments, 
  chatDepartments,
  supportDepartmentAdmins,
  chatDepartmentAdmins,
  tickets,
  chatSessions,
  type SupportDepartment,
  type TicketDepartment,
  type ChatDepartment
} from '@shared/schema';

export interface MigrationResult {
  success: boolean;
  message: string;
  details: {
    supportDepartmentsCreated: number;
    ticketDepartmentsMigrated: number;
    chatDepartmentsMigrated: number;
    ticketsMigrated: number;
    chatSessionsMigrated: number;
    adminAssignmentsMigrated: number;
    conflicts: Array<{
      type: 'name_conflict' | 'default_conflict';
      ticketDept?: TicketDepartment;
      chatDept?: ChatDepartment;
      resolution: string;
    }>;
  };
}

export interface SyncStatus {
  needsSync: boolean;
  newTicketDepartments: TicketDepartment[];
  newChatDepartments: ChatDepartment[];
  totalNewDepartments: number;
}

/**
 * Simplified Department Migration Service
 * 
 * Since the main migration from legacy department tables to the unified system has been completed,
 * this service now focuses on:
 * 1. Status checking for admin interface
 * 2. Incremental sync of any new departments added to legacy tables
 * 3. Unified department CRUD operations
 * 
 * Legacy migration methods have been removed as they are no longer needed.
 */
export class DepartmentMigrationService {
  
  /**
   * Check migration status and sync requirements
   */
  async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    ticketDepartmentCount: number;
    chatDepartmentCount: number;
    supportDepartmentCount: number;
    syncStatus?: SyncStatus;
  }> {
    try {
      // Get current counts
      const supportCount = await db.select({ count: sql`count(*)` }).from(supportDepartments);
      const ticketCount = await db.select({ count: sql`count(*)` }).from(ticketDepartments);
      const chatCount = await db.select({ count: sql`count(*)` }).from(chatDepartments);

      const supportDepartmentCount = Number(supportCount[0]?.count || 0);

      // Migration is considered complete if we have support departments
      const needsMigration = supportDepartmentCount === 0;

      // Check for incremental sync needs
      let syncStatus: SyncStatus | undefined;
      if (!needsMigration) {
        syncStatus = await this.checkSyncStatus();
      }

      return {
        needsMigration,
        ticketDepartmentCount: Number(ticketCount[0]?.count || 0),
        chatDepartmentCount: Number(chatCount[0]?.count || 0),
        supportDepartmentCount,
        syncStatus
      };
    } catch (error) {
      console.error('Error checking migration status:', error);
      return {
        needsMigration: false,
        ticketDepartmentCount: 0,
        chatDepartmentCount: 0,
        supportDepartmentCount: 0
      };
    }
  }

  /**
   * Check for new departments in legacy tables that need to be synced to unified system
   */
  async checkSyncStatus(): Promise<SyncStatus> {
    try {
      // Get all existing support departments
      const existingSupportDepts = await db.select().from(supportDepartments);
      const existingSupportNames = new Set(existingSupportDepts.map(dept => dept.name.toLowerCase()));

      // Get all ticket and chat departments
      const allTicketDepts = await db.select().from(ticketDepartments);
      const allChatDepts = await db.select().from(chatDepartments);

      // Find departments that don't exist in support_departments
      const newTicketDepartments = allTicketDepts.filter(dept =>
        !existingSupportNames.has(dept.name.toLowerCase())
      );

      const newChatDepartments = allChatDepts.filter(dept =>
        !existingSupportNames.has(dept.name.toLowerCase())
      );

      const totalNewDepartments = newTicketDepartments.length + newChatDepartments.length;

      return {
        needsSync: totalNewDepartments > 0,
        newTicketDepartments,
        newChatDepartments,
        totalNewDepartments
      };
    } catch (error) {
      console.error('Error checking sync status:', error);
      return {
        needsSync: false,
        newTicketDepartments: [],
        newChatDepartments: [],
        totalNewDepartments: 0
      };
    }
  }

  /**
   * Sync new departments from legacy tables to unified system
   */
  async syncNewDepartments(): Promise<MigrationResult> {
    const result: MigrationResult = {
      success: false,
      message: '',
      details: {
        supportDepartmentsCreated: 0,
        ticketDepartmentsMigrated: 0,
        chatDepartmentsMigrated: 0,
        ticketsMigrated: 0,
        chatSessionsMigrated: 0,
        adminAssignmentsMigrated: 0,
        conflicts: []
      }
    };

    try {
      // Check if sync is needed
      const syncStatus = await this.checkSyncStatus();
      if (!syncStatus.needsSync) {
        result.success = true;
        result.message = 'No new departments to sync';
        return result;
      }

      await db.transaction(async (tx) => {
        console.log(`Starting incremental sync of ${syncStatus.totalNewDepartments} new departments...`);

        // Create a map for the new departments
        const newDepartments = new Map<string, { supportId: number; ticketId?: number; chatId?: number }>();

        // Process new ticket departments
        for (const ticketDept of syncStatus.newTicketDepartments) {
          const unifiedDept = {
            name: ticketDept.name,
            description: ticketDept.description || '',
            isDefault: ticketDept.isDefault || false,
            requiresVps: ticketDept.requiresVps || false,
            isActive: ticketDept.isActive ?? true,
            displayOrder: ticketDept.displayOrder || 0,
            color: '#3b82f6', // Default color
            icon: 'MessageCircle' // Default icon
          };

          const [created] = await tx.insert(supportDepartments).values(unifiedDept).returning();
          newDepartments.set(ticketDept.name.toLowerCase(), {
            supportId: created.id,
            ticketId: ticketDept.id
          });
          result.details.supportDepartmentsCreated++;
          result.details.ticketDepartmentsMigrated++;

          console.log(`Created unified department from ticket dept: ${ticketDept.name} (ID: ${created.id})`);
        }

        // Process new chat departments
        for (const chatDept of syncStatus.newChatDepartments) {
          const unifiedDept = {
            name: chatDept.name,
            description: chatDept.description || '',
            isDefault: chatDept.isDefault || false,
            requiresVps: false, // Chat departments don't have requiresVps
            isActive: chatDept.isActive ?? true,
            displayOrder: chatDept.displayOrder || 0,
            color: chatDept.color || '#3b82f6',
            icon: chatDept.icon || 'MessageCircle'
          };

          const [created] = await tx.insert(supportDepartments).values(unifiedDept).returning();
          newDepartments.set(chatDept.name.toLowerCase(), {
            supportId: created.id,
            chatId: chatDept.id
          });
          result.details.supportDepartmentsCreated++;
          result.details.chatDepartmentsMigrated++;

          console.log(`Created unified department from chat dept: ${chatDept.name} (ID: ${created.id})`);
        }

        // Migrate tickets for new ticket departments
        for (const ticketDept of syncStatus.newTicketDepartments) {
          const mapping = newDepartments.get(ticketDept.name.toLowerCase());
          if (mapping) {
            // Update tickets to reference the new unified department
            const updateResult = await tx.execute(sql`
              UPDATE "tickets"
              SET "department_id" = ${mapping.supportId}
              WHERE "department_id" = ${ticketDept.id}
            `);

            const affectedRows = updateResult.rowCount || 0;
            result.details.ticketsMigrated += affectedRows;

            console.log(`Migrated ${affectedRows} tickets from new ticket department ${ticketDept.id} to unified department ${mapping.supportId}`);
          }
        }

        // Migrate chat sessions for new chat departments
        for (const chatDept of syncStatus.newChatDepartments) {
          const mapping = newDepartments.get(chatDept.name.toLowerCase());
          if (mapping) {
            // Update chat sessions to reference the new unified department
            const updateResult = await tx.execute(sql`
              UPDATE "chat_sessions"
              SET "department_id" = ${mapping.supportId}
              WHERE "department_id" = ${chatDept.id}
            `);

            const affectedRows = updateResult.rowCount || 0;
            result.details.chatSessionsMigrated += affectedRows;

            console.log(`Migrated ${affectedRows} chat sessions from new chat department ${chatDept.id} to unified department ${mapping.supportId}`);
          }
        }

        // Migrate admin assignments for new chat departments
        for (const chatDept of syncStatus.newChatDepartments) {
          const mapping = newDepartments.get(chatDept.name.toLowerCase());
          if (mapping) {
            // Get existing admin assignments for this chat department
            const adminAssignments = await tx.select().from(chatDepartmentAdmins)
              .where(eq(chatDepartmentAdmins.departmentId, chatDept.id));

            for (const assignment of adminAssignments) {
              await tx.insert(supportDepartmentAdmins).values({
                departmentId: mapping.supportId,
                adminId: assignment.adminId,
                canManage: assignment.canManage || false,
                isActive: assignment.isActive ?? true
              }).onConflictDoNothing();

              result.details.adminAssignmentsMigrated++;
            }
          }
        }

        result.success = true;
        result.message = `Successfully synced ${syncStatus.totalNewDepartments} new departments`;

        console.log('Incremental department sync completed successfully');
      });

    } catch (error) {
      console.error('Department sync failed:', error);
      result.success = false;
      result.message = `Department sync failed: ${error.message}`;
    }

    return result;
  }

  /**
   * Create a unified department (simplified - no legacy table sync)
   */
  async createUnifiedDepartment(departmentData: {
    name: string;
    description?: string;
    isDefault?: boolean;
    requiresVps?: boolean;
    isActive?: boolean;
    displayOrder?: number;
    color?: string;
    icon?: string;
  }): Promise<SupportDepartment> {
    return await db.transaction(async (tx) => {
      // If this is set as default, unset other defaults
      if (departmentData.isDefault) {
        await tx.update(supportDepartments)
          .set({ isDefault: false })
          .where(eq(supportDepartments.isDefault, true));
      }

      // Create in unified table only (no more legacy table sync)
      const [unifiedDept] = await tx.insert(supportDepartments).values({
        name: departmentData.name,
        description: departmentData.description || '',
        isDefault: departmentData.isDefault || false,
        requiresVps: departmentData.requiresVps || false,
        isActive: departmentData.isActive ?? true,
        displayOrder: departmentData.displayOrder || 0,
        color: departmentData.color || '#3b82f6',
        icon: departmentData.icon || 'MessageCircle'
      }).returning();

      return unifiedDept;
    });
  }

  /**
   * Update a unified department (simplified - no legacy table sync)
   */
  async updateUnifiedDepartment(id: number, updates: Partial<SupportDepartment>): Promise<void> {
    await db.transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await tx.update(supportDepartments)
          .set({ isDefault: false })
          .where(and(eq(supportDepartments.isDefault, true), sql`id != ${id}`));
      }

      // Update unified table only
      await tx.update(supportDepartments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(supportDepartments.id, id));
    });
  }

  /**
   * Delete a unified department (simplified - no legacy table sync)
   */
  async deleteUnifiedDepartment(id: number): Promise<void> {
    await db.transaction(async (tx) => {
      // Get the department before deletion
      const [deptToDelete] = await tx.select().from(supportDepartments)
        .where(eq(supportDepartments.id, id));

      if (!deptToDelete) {
        throw new Error('Department not found');
      }

      // Check for dependencies
      const ticketCount = await tx.select({ count: sql`count(*)` })
        .from(tickets)
        .where(eq(tickets.departmentId, id));

      const chatSessionCount = await tx.select({ count: sql`count(*)` })
        .from(chatSessions)
        .where(eq(chatSessions.departmentId, id));

      if (Number(ticketCount[0]?.count || 0) > 0 || Number(chatSessionCount[0]?.count || 0) > 0) {
        throw new Error('Cannot delete department with existing tickets or chat sessions');
      }

      // Delete from unified table only
      await tx.delete(supportDepartments).where(eq(supportDepartments.id, id));
    });
  }

  /**
   * Get all unified departments
   */
  async getUnifiedDepartments(): Promise<SupportDepartment[]> {
    return await db.select().from(supportDepartments)
      .orderBy(supportDepartments.displayOrder, supportDepartments.name);
  }

  /**
   * Get active unified departments
   */
  async getActiveUnifiedDepartments(): Promise<SupportDepartment[]> {
    return await db.select().from(supportDepartments)
      .where(eq(supportDepartments.isActive, true))
      .orderBy(supportDepartments.displayOrder, supportDepartments.name);
  }

  /**
   * Get a specific unified department
   */
  async getUnifiedDepartment(id: number): Promise<SupportDepartment | undefined> {
    const [department] = await db.select().from(supportDepartments)
      .where(eq(supportDepartments.id, id));
    return department;
  }
}

// Export singleton instance
export const departmentMigrationService = new DepartmentMigrationService();
