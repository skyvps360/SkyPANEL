import { db } from '../db';
import { sql, eq, and, or } from 'drizzle-orm';
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

export class DepartmentMigrationService {
  
  /**
   * Check if migration is needed
   */
  async checkMigrationStatus(): Promise<{
    needsMigration: boolean;
    ticketDepartmentCount: number;
    chatDepartmentCount: number;
    supportDepartmentCount: number;
  }> {
    try {
      // Check if support_departments table exists
      const supportTableExists = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'support_departments'
        );
      `);

      if (!supportTableExists.rows[0]?.exists) {
        // Table doesn't exist, definitely needs migration
        const ticketCount = await db.select({ count: sql`count(*)` }).from(ticketDepartments);
        const chatCount = await db.select({ count: sql`count(*)` }).from(chatDepartments);
        
        return {
          needsMigration: true,
          ticketDepartmentCount: Number(ticketCount[0]?.count || 0),
          chatDepartmentCount: Number(chatCount[0]?.count || 0),
          supportDepartmentCount: 0
        };
      }

      // Table exists, check if it has data
      const supportCount = await db.select({ count: sql`count(*)` }).from(supportDepartments);
      const ticketCount = await db.select({ count: sql`count(*)` }).from(ticketDepartments);
      const chatCount = await db.select({ count: sql`count(*)` }).from(chatDepartments);

      const needsMigration = Number(supportCount[0]?.count || 0) === 0 && 
                            (Number(ticketCount[0]?.count || 0) > 0 || Number(chatCount[0]?.count || 0) > 0);

      return {
        needsMigration,
        ticketDepartmentCount: Number(ticketCount[0]?.count || 0),
        chatDepartmentCount: Number(chatCount[0]?.count || 0),
        supportDepartmentCount: Number(supportCount[0]?.count || 0)
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
   * Perform the department migration
   */
  async migrateDepartments(): Promise<MigrationResult> {
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
      // Start transaction
      await db.transaction(async (tx) => {
        console.log('Starting department migration...');

        // 1. Create support_departments table if it doesn't exist
        await this.createSupportDepartmentsTable(tx);

        // 2. Get existing departments
        const ticketDepts = await tx.select().from(ticketDepartments);
        const chatDepts = await tx.select().from(chatDepartments);

        console.log(`Found ${ticketDepts.length} ticket departments and ${chatDepts.length} chat departments`);

        // 3. Merge departments and handle conflicts
        const mergedDepartments = await this.mergeDepartments(tx, ticketDepts, chatDepts, result);

        // 4. Migrate tickets to use unified departments
        await this.migrateTickets(tx, ticketDepts, mergedDepartments, result);

        // 5. Migrate chat sessions to use unified departments
        await this.migrateChatSessions(tx, chatDepts, mergedDepartments, result);

        // 6. Migrate admin assignments
        await this.migrateAdminAssignments(tx, chatDepts, mergedDepartments, result);

        result.success = true;
        result.message = 'Department migration completed successfully';
        
        console.log('Department migration completed successfully');
      });

    } catch (error) {
      console.error('Department migration failed:', error);
      result.success = false;
      result.message = `Migration failed: ${error.message}`;
    }

    return result;
  }

  /**
   * Create the support_departments table
   */
  private async createSupportDepartmentsTable(tx: any): Promise<void> {
    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "support_departments" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL UNIQUE,
        "description" TEXT,
        "is_default" BOOLEAN DEFAULT false,
        "requires_vps" BOOLEAN DEFAULT false,
        "is_active" BOOLEAN DEFAULT true,
        "display_order" INTEGER DEFAULT 0,
        "color" TEXT DEFAULT '#3b82f6',
        "icon" TEXT DEFAULT 'MessageCircle',
        "created_at" TIMESTAMP DEFAULT NOW(),
        "updated_at" TIMESTAMP DEFAULT NOW()
      );
    `);

    await tx.execute(sql`
      CREATE TABLE IF NOT EXISTS "support_department_admins" (
        "id" SERIAL PRIMARY KEY,
        "department_id" INTEGER NOT NULL REFERENCES "support_departments"("id") ON DELETE CASCADE,
        "admin_id" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "can_manage" BOOLEAN DEFAULT false,
        "is_active" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL,
        UNIQUE("department_id", "admin_id")
      );
    `);

    // Add new columns to existing tables for migration compatibility
    await tx.execute(sql`
      ALTER TABLE "tickets" 
      ADD COLUMN IF NOT EXISTS "legacy_department_id" INTEGER REFERENCES "ticket_departments"("id") ON DELETE SET NULL;
    `);

    await tx.execute(sql`
      ALTER TABLE "chat_sessions" 
      ADD COLUMN IF NOT EXISTS "legacy_chat_department_id" INTEGER REFERENCES "chat_departments"("id") ON DELETE SET NULL;
    `);

    console.log('Support departments table structure created');
  }

  /**
   * Merge ticket and chat departments into unified support departments
   */
  private async mergeDepartments(
    tx: any, 
    ticketDepts: TicketDepartment[], 
    chatDepts: ChatDepartment[], 
    result: MigrationResult
  ): Promise<Map<string, { supportId: number; ticketId?: number; chatId?: number }>> {
    const mergedMap = new Map<string, { supportId: number; ticketId?: number; chatId?: number }>();
    
    // Create a map of all unique department names
    const allDepartments = new Map<string, {
      ticket?: TicketDepartment;
      chat?: ChatDepartment;
    }>();

    // Add ticket departments
    for (const dept of ticketDepts) {
      allDepartments.set(dept.name.toLowerCase(), { ticket: dept });
    }

    // Add chat departments, merging with ticket departments if names match
    for (const dept of chatDepts) {
      const key = dept.name.toLowerCase();
      const existing = allDepartments.get(key);
      if (existing) {
        existing.chat = dept;
        // Record conflict for reporting
        result.details.conflicts.push({
          type: 'name_conflict',
          ticketDept: existing.ticket,
          chatDept: dept,
          resolution: 'Merged departments with same name'
        });
      } else {
        allDepartments.set(key, { chat: dept });
      }
    }

    // Create unified departments
    let displayOrder = 1;
    let hasDefault = false;

    for (const [name, depts] of allDepartments) {
      const ticketDept = depts.ticket;
      const chatDept = depts.chat;

      // Determine properties for the unified department
      const unifiedDept = {
        name: ticketDept?.name || chatDept?.name || name,
        description: ticketDept?.description || chatDept?.description || '',
        isDefault: ticketDept?.isDefault || chatDept?.isDefault || false,
        requiresVps: ticketDept?.requiresVps || false,
        isActive: (ticketDept?.isActive ?? true) && (chatDept?.isActive ?? true),
        displayOrder: ticketDept?.displayOrder || chatDept?.displayOrder || displayOrder++,
        color: chatDept?.color || '#3b82f6',
        icon: chatDept?.icon || 'MessageCircle'
      };

      // Handle multiple defaults
      if (unifiedDept.isDefault && hasDefault) {
        unifiedDept.isDefault = false;
        result.details.conflicts.push({
          type: 'default_conflict',
          ticketDept,
          chatDept,
          resolution: 'Removed default status to avoid multiple defaults'
        });
      } else if (unifiedDept.isDefault) {
        hasDefault = true;
      }

      // Insert the unified department
      const [createdDept] = await tx.insert(supportDepartments).values(unifiedDept).returning();
      
      mergedMap.set(name, {
        supportId: createdDept.id,
        ticketId: ticketDept?.id,
        chatId: chatDept?.id
      });

      result.details.supportDepartmentsCreated++;
      if (ticketDept) result.details.ticketDepartmentsMigrated++;
      if (chatDept) result.details.chatDepartmentsMigrated++;
    }

    console.log(`Created ${result.details.supportDepartmentsCreated} unified support departments`);
    return mergedMap;
  }

  /**
   * Migrate tickets to use unified departments
   */
  private async migrateTickets(
    tx: any,
    ticketDepts: TicketDepartment[],
    mergedMap: Map<string, { supportId: number; ticketId?: number; chatId?: number }>,
    result: MigrationResult
  ): Promise<void> {
    for (const ticketDept of ticketDepts) {
      const mapping = mergedMap.get(ticketDept.name.toLowerCase());
      if (mapping) {
        // Update tickets to reference the new unified department
        await tx.execute(sql`
          UPDATE "tickets" 
          SET 
            "department_id" = ${mapping.supportId},
            "legacy_department_id" = "department_id"
          WHERE "department_id" = ${ticketDept.id}
        `);

        const updateResult = await tx.execute(sql`
          SELECT COUNT(*) as count FROM "tickets" WHERE "department_id" = ${mapping.supportId}
        `);
        
        result.details.ticketsMigrated += Number(updateResult.rows[0]?.count || 0);
      }
    }

    console.log(`Migrated ${result.details.ticketsMigrated} tickets to unified departments`);
  }

  /**
   * Migrate chat sessions to use unified departments
   */
  private async migrateChatSessions(
    tx: any,
    chatDepts: ChatDepartment[],
    mergedMap: Map<string, { supportId: number; ticketId?: number; chatId?: number }>,
    result: MigrationResult
  ): Promise<void> {
    for (const chatDept of chatDepts) {
      const mapping = mergedMap.get(chatDept.name.toLowerCase());
      if (mapping) {
        // Update chat sessions to reference the new unified department
        await tx.execute(sql`
          UPDATE "chat_sessions" 
          SET 
            "department_id" = ${mapping.supportId},
            "legacy_chat_department_id" = "department_id"
          WHERE "department_id" = ${chatDept.id}
        `);

        const updateResult = await tx.execute(sql`
          SELECT COUNT(*) as count FROM "chat_sessions" WHERE "department_id" = ${mapping.supportId}
        `);
        
        result.details.chatSessionsMigrated += Number(updateResult.rows[0]?.count || 0);
      }
    }

    console.log(`Migrated ${result.details.chatSessionsMigrated} chat sessions to unified departments`);
  }

  /**
   * Migrate admin assignments to unified departments
   */
  private async migrateAdminAssignments(
    tx: any,
    chatDepts: ChatDepartment[],
    mergedMap: Map<string, { supportId: number; ticketId?: number; chatId?: number }>,
    result: MigrationResult
  ): Promise<void> {
    // Get existing chat department admin assignments
    const chatAdminAssignments = await tx.select().from(chatDepartmentAdmins);

    for (const assignment of chatAdminAssignments) {
      // Find the chat department
      const chatDept = chatDepts.find(d => d.id === assignment.departmentId);
      if (chatDept) {
        const mapping = mergedMap.get(chatDept.name.toLowerCase());
        if (mapping) {
          // Create new assignment in unified table
          await tx.insert(supportDepartmentAdmins).values({
            departmentId: mapping.supportId,
            adminId: assignment.adminId,
            canManage: assignment.canManage,
            isActive: assignment.isActive
          }).onConflictDoNothing();

          result.details.adminAssignmentsMigrated++;
        }
      }
    }

    console.log(`Migrated ${result.details.adminAssignmentsMigrated} admin assignments to unified departments`);
  }
}

export const departmentMigrationService = new DepartmentMigrationService();
