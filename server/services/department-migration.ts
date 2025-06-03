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

export interface SyncStatus {
  needsSync: boolean;
  newTicketDepartments: TicketDepartment[];
  newChatDepartments: ChatDepartment[];
  totalNewDepartments: number;
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
    syncStatus?: SyncStatus;
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

      // If migration is not needed (already completed), check for post-migration sync needs
      let syncStatus: SyncStatus | undefined;
      if (!needsMigration && Number(supportCount[0]?.count || 0) > 0) {
        syncStatus = await this.checkSyncStatus();
      }

      return {
        needsMigration,
        ticketDepartmentCount: Number(ticketCount[0]?.count || 0),
        chatDepartmentCount: Number(chatCount[0]?.count || 0),
        supportDepartmentCount: Number(supportCount[0]?.count || 0),
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
   * Check for new departments that need to be synced after initial migration
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

        // 4. Validate migration mappings before proceeding
        await this.validateMigrationMappings(tx, ticketDepts, chatDepts, mergedDepartments);

        // 5. Migrate tickets to use unified departments
        await this.migrateTickets(tx, ticketDepts, mergedDepartments, result);

        // 6. Migrate chat sessions to use unified departments
        await this.migrateChatSessions(tx, chatDepts, mergedDepartments, result);

        // 7. Migrate admin assignments
        await this.migrateAdminAssignments(tx, chatDepts, mergedDepartments, result);

        // 8. Finalize migration by swapping columns and updating constraints
        await this.finalizeMigration(tx, result);

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
   * Create the support_departments table and prepare migration columns
   */
  private async createSupportDepartmentsTable(tx: any): Promise<void> {
    // Create unified support departments table
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

    // Create unified support department admins table
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

    // Add temporary migration columns to avoid foreign key constraint issues
    await tx.execute(sql`
      ALTER TABLE "tickets"
      ADD COLUMN IF NOT EXISTS "department_id_new" INTEGER REFERENCES "support_departments"("id") ON DELETE SET NULL;
    `);

    await tx.execute(sql`
      ALTER TABLE "chat_sessions"
      ADD COLUMN IF NOT EXISTS "department_id_new" INTEGER REFERENCES "support_departments"("id") ON DELETE SET NULL;
    `);

    // Add legacy backup columns for rollback capability
    await tx.execute(sql`
      ALTER TABLE "tickets"
      ADD COLUMN IF NOT EXISTS "legacy_department_id" INTEGER;
    `);

    await tx.execute(sql`
      ALTER TABLE "chat_sessions"
      ADD COLUMN IF NOT EXISTS "legacy_chat_department_id" INTEGER;
    `);

    console.log('Support departments table structure created with migration columns');
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
   * Validate migration mappings to ensure all department references can be migrated
   */
  private async validateMigrationMappings(
    tx: any,
    ticketDepts: TicketDepartment[],
    chatDepts: ChatDepartment[],
    mergedMap: Map<string, { supportId: number; ticketId?: number; chatId?: number }>
  ): Promise<void> {
    console.log('Validating migration mappings...');

    // Check for tickets with department_id values that don't have mappings
    const ticketDeptIds = ticketDepts.map(dept => dept.id);
    if (ticketDeptIds.length > 0) {
      const orphanedTicketsResult = await tx.execute(sql`
        SELECT DISTINCT department_id, COUNT(*) as count
        FROM "tickets"
        WHERE "department_id" IS NOT NULL
        AND "department_id" NOT IN (${sql.join(ticketDeptIds, sql`, `)})
        GROUP BY department_id
      `);

      if (orphanedTicketsResult.rows.length > 0) {
        const orphanedDepts = orphanedTicketsResult.rows.map(row => `department_id=${row.department_id} (${row.count} tickets)`).join(', ');
        throw new Error(`Found tickets with department_id values that don't exist in ticket_departments: ${orphanedDepts}. Please clean up orphaned references before migration.`);
      }
    }

    // Check for chat sessions with department_id values that don't have mappings
    const chatDeptIds = chatDepts.map(dept => dept.id);
    if (chatDeptIds.length > 0) {
      const orphanedChatSessionsResult = await tx.execute(sql`
        SELECT DISTINCT department_id, COUNT(*) as count
        FROM "chat_sessions"
        WHERE "department_id" IS NOT NULL
        AND "department_id" NOT IN (${sql.join(chatDeptIds, sql`, `)})
        GROUP BY department_id
      `);

      if (orphanedChatSessionsResult.rows.length > 0) {
        const orphanedDepts = orphanedChatSessionsResult.rows.map(row => `department_id=${row.department_id} (${row.count} sessions)`).join(', ');
        throw new Error(`Found chat sessions with department_id values that don't exist in chat_departments: ${orphanedDepts}. Please clean up orphaned references before migration.`);
      }
    }

    // Validate that all ticket departments have mappings
    for (const ticketDept of ticketDepts) {
      const mapping = mergedMap.get(ticketDept.name.toLowerCase());
      if (!mapping) {
        throw new Error(`No mapping found for ticket department: ${ticketDept.name} (id: ${ticketDept.id})`);
      }
    }

    // Validate that all chat departments have mappings
    for (const chatDept of chatDepts) {
      const mapping = mergedMap.get(chatDept.name.toLowerCase());
      if (!mapping) {
        throw new Error(`No mapping found for chat department: ${chatDept.name} (id: ${chatDept.id})`);
      }
    }

    console.log('Migration mapping validation completed successfully');
  }

  /**
   * Migrate tickets to use unified departments (using temporary column to avoid FK constraints)
   */
  private async migrateTickets(
    tx: any,
    ticketDepts: TicketDepartment[],
    mergedMap: Map<string, { supportId: number; ticketId?: number; chatId?: number }>,
    result: MigrationResult
  ): Promise<void> {
    console.log('Starting ticket migration to unified departments...');

    // First, backup existing department_id values to legacy_department_id
    await tx.execute(sql`
      UPDATE "tickets"
      SET "legacy_department_id" = "department_id"
      WHERE "department_id" IS NOT NULL AND "legacy_department_id" IS NULL
    `);

    // Migrate tickets using the temporary department_id_new column
    for (const ticketDept of ticketDepts) {
      const mapping = mergedMap.get(ticketDept.name.toLowerCase());
      if (mapping) {
        // Update tickets to reference the new unified department in the temporary column
        const updateResult = await tx.execute(sql`
          UPDATE "tickets"
          SET "department_id_new" = ${mapping.supportId}
          WHERE "department_id" = ${ticketDept.id}
        `);

        const affectedRows = updateResult.rowCount || 0;
        result.details.ticketsMigrated += affectedRows;

        console.log(`Migrated ${affectedRows} tickets from ticket department ${ticketDept.id} (${ticketDept.name}) to unified department ${mapping.supportId}`);
      } else {
        console.warn(`No mapping found for ticket department: ${ticketDept.name}`);
      }
    }

    // Handle tickets with NULL department_id (set department_id_new to NULL as well)
    await tx.execute(sql`
      UPDATE "tickets"
      SET "department_id_new" = NULL
      WHERE "department_id" IS NULL AND "department_id_new" IS NULL
    `);

    console.log(`Migrated ${result.details.ticketsMigrated} tickets to unified departments`);
  }

  /**
   * Migrate chat sessions to use unified departments (using temporary column to avoid FK constraints)
   */
  private async migrateChatSessions(
    tx: any,
    chatDepts: ChatDepartment[],
    mergedMap: Map<string, { supportId: number; ticketId?: number; chatId?: number }>,
    result: MigrationResult
  ): Promise<void> {
    console.log('Starting chat session migration to unified departments...');

    // First, backup existing department_id values to legacy_chat_department_id
    await tx.execute(sql`
      UPDATE "chat_sessions"
      SET "legacy_chat_department_id" = "department_id"
      WHERE "department_id" IS NOT NULL AND "legacy_chat_department_id" IS NULL
    `);

    // Migrate chat sessions using the temporary department_id_new column
    for (const chatDept of chatDepts) {
      const mapping = mergedMap.get(chatDept.name.toLowerCase());
      if (mapping) {
        // Update chat sessions to reference the new unified department in the temporary column
        const updateResult = await tx.execute(sql`
          UPDATE "chat_sessions"
          SET "department_id_new" = ${mapping.supportId}
          WHERE "department_id" = ${chatDept.id}
        `);

        const affectedRows = updateResult.rowCount || 0;
        result.details.chatSessionsMigrated += affectedRows;

        console.log(`Migrated ${affectedRows} chat sessions from chat department ${chatDept.id} (${chatDept.name}) to unified department ${mapping.supportId}`);
      } else {
        console.warn(`No mapping found for chat department: ${chatDept.name}`);
      }
    }

    // Handle chat sessions with NULL department_id (set department_id_new to NULL as well)
    await tx.execute(sql`
      UPDATE "chat_sessions"
      SET "department_id_new" = NULL
      WHERE "department_id" IS NULL AND "department_id_new" IS NULL
    `);

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

  /**
   * Finalize migration by swapping columns and updating foreign key constraints
   */
  private async finalizeMigration(tx: any, result: MigrationResult): Promise<void> {
    console.log('Finalizing migration: swapping columns and updating constraints...');

    try {
      // Step 1: Drop existing foreign key constraints on department_id columns
      console.log('Dropping existing foreign key constraints...');

      await tx.execute(sql`
        ALTER TABLE "tickets"
        DROP CONSTRAINT IF EXISTS "tickets_department_id_ticket_departments_id_fk"
      `);

      await tx.execute(sql`
        ALTER TABLE "chat_sessions"
        DROP CONSTRAINT IF EXISTS "chat_sessions_department_id_chat_departments_id_fk"
      `);

      // Step 2: Rename columns to swap them
      console.log('Swapping department_id columns...');

      // For tickets table
      await tx.execute(sql`
        ALTER TABLE "tickets"
        RENAME COLUMN "department_id" TO "department_id_old"
      `);

      await tx.execute(sql`
        ALTER TABLE "tickets"
        RENAME COLUMN "department_id_new" TO "department_id"
      `);

      await tx.execute(sql`
        ALTER TABLE "tickets"
        RENAME COLUMN "department_id_old" TO "legacy_department_id_temp"
      `);

      // Update legacy_department_id with the old values if not already set
      await tx.execute(sql`
        UPDATE "tickets"
        SET "legacy_department_id" = "legacy_department_id_temp"
        WHERE "legacy_department_id" IS NULL AND "legacy_department_id_temp" IS NOT NULL
      `);

      // Drop the temporary column
      await tx.execute(sql`
        ALTER TABLE "tickets"
        DROP COLUMN IF EXISTS "legacy_department_id_temp"
      `);

      // For chat_sessions table
      await tx.execute(sql`
        ALTER TABLE "chat_sessions"
        RENAME COLUMN "department_id" TO "department_id_old"
      `);

      await tx.execute(sql`
        ALTER TABLE "chat_sessions"
        RENAME COLUMN "department_id_new" TO "department_id"
      `);

      await tx.execute(sql`
        ALTER TABLE "chat_sessions"
        RENAME COLUMN "department_id_old" TO "legacy_chat_department_id_temp"
      `);

      // Update legacy_chat_department_id with the old values if not already set
      await tx.execute(sql`
        UPDATE "chat_sessions"
        SET "legacy_chat_department_id" = "legacy_chat_department_id_temp"
        WHERE "legacy_chat_department_id" IS NULL AND "legacy_chat_department_id_temp" IS NOT NULL
      `);

      // Drop the temporary column
      await tx.execute(sql`
        ALTER TABLE "chat_sessions"
        DROP COLUMN IF EXISTS "legacy_chat_department_id_temp"
      `);

      // Step 3: Add new foreign key constraints pointing to support_departments
      console.log('Adding new foreign key constraints to support_departments...');

      await tx.execute(sql`
        ALTER TABLE "tickets"
        ADD CONSTRAINT "tickets_department_id_support_departments_id_fk"
        FOREIGN KEY ("department_id") REFERENCES "support_departments"("id") ON DELETE SET NULL
      `);

      await tx.execute(sql`
        ALTER TABLE "chat_sessions"
        ADD CONSTRAINT "chat_sessions_department_id_support_departments_id_fk"
        FOREIGN KEY ("department_id") REFERENCES "support_departments"("id") ON DELETE SET NULL
      `);

      // Step 4: Add foreign key constraints for legacy columns (for rollback capability)
      await tx.execute(sql`
        ALTER TABLE "tickets"
        ADD CONSTRAINT "tickets_legacy_department_id_ticket_departments_id_fk"
        FOREIGN KEY ("legacy_department_id") REFERENCES "ticket_departments"("id") ON DELETE SET NULL
      `);

      await tx.execute(sql`
        ALTER TABLE "chat_sessions"
        ADD CONSTRAINT "chat_sessions_legacy_chat_department_id_chat_departments_id_fk"
        FOREIGN KEY ("legacy_chat_department_id") REFERENCES "chat_departments"("id") ON DELETE SET NULL
      `);

      console.log('Migration finalization completed successfully');

    } catch (error) {
      console.error('Error during migration finalization:', error);
      throw new Error(`Migration finalization failed: ${error.message}`);
    }
  }

  /**
   * Sync new departments added after initial migration
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
   * Create a unified department that operates on support_departments
   * and keeps legacy tables in sync for backward compatibility
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

      // Create in unified table
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

      // Keep legacy tables in sync for backward compatibility
      try {
        // Add to ticket_departments
        await tx.insert(ticketDepartments).values({
          name: unifiedDept.name,
          description: unifiedDept.description,
          isDefault: unifiedDept.isDefault,
          requiresVps: unifiedDept.requiresVps,
          isActive: unifiedDept.isActive,
          displayOrder: unifiedDept.displayOrder
        }).onConflictDoNothing();

        // Add to chat_departments
        await tx.insert(chatDepartments).values({
          name: unifiedDept.name,
          description: unifiedDept.description,
          isDefault: unifiedDept.isDefault,
          isActive: unifiedDept.isActive,
          displayOrder: unifiedDept.displayOrder,
          color: unifiedDept.color,
          icon: unifiedDept.icon
        }).onConflictDoNothing();
      } catch (error) {
        console.warn('Warning: Could not sync to legacy tables:', error.message);
        // Continue anyway - unified table is the source of truth
      }

      return unifiedDept;
    });
  }

  /**
   * Update a unified department and keep legacy tables in sync
   */
  async updateUnifiedDepartment(id: number, updates: Partial<SupportDepartment>): Promise<void> {
    await db.transaction(async (tx) => {
      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await tx.update(supportDepartments)
          .set({ isDefault: false })
          .where(and(eq(supportDepartments.isDefault, true), sql`id != ${id}`));
      }

      // Update unified table
      await tx.update(supportDepartments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(supportDepartments.id, id));

      // Get the updated department
      const [updatedDept] = await tx.select().from(supportDepartments)
        .where(eq(supportDepartments.id, id));

      if (updatedDept) {
        // Keep legacy tables in sync
        try {
          // Update ticket_departments
          await tx.update(ticketDepartments)
            .set({
              name: updatedDept.name,
              description: updatedDept.description,
              isDefault: updatedDept.isDefault,
              requiresVps: updatedDept.requiresVps,
              isActive: updatedDept.isActive,
              displayOrder: updatedDept.displayOrder
            })
            .where(eq(ticketDepartments.name, updatedDept.name));

          // Update chat_departments
          await tx.update(chatDepartments)
            .set({
              name: updatedDept.name,
              description: updatedDept.description,
              isDefault: updatedDept.isDefault,
              isActive: updatedDept.isActive,
              displayOrder: updatedDept.displayOrder,
              color: updatedDept.color,
              icon: updatedDept.icon,
              updatedAt: new Date()
            })
            .where(eq(chatDepartments.name, updatedDept.name));
        } catch (error) {
          console.warn('Warning: Could not sync updates to legacy tables:', error.message);
        }
      }
    });
  }

  /**
   * Delete a unified department and remove from legacy tables
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

      // Delete from unified table
      await tx.delete(supportDepartments).where(eq(supportDepartments.id, id));

      // Remove from legacy tables
      try {
        await tx.delete(ticketDepartments)
          .where(eq(ticketDepartments.name, deptToDelete.name));

        await tx.delete(chatDepartments)
          .where(eq(chatDepartments.name, deptToDelete.name));
      } catch (error) {
        console.warn('Warning: Could not remove from legacy tables:', error.message);
      }
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
   * Get a single unified department by ID
   */
  async getUnifiedDepartment(id: number): Promise<SupportDepartment | undefined> {
    const [department] = await db.select().from(supportDepartments)
      .where(eq(supportDepartments.id, id));
    return department;
  }

  /**
   * Rollback migration by restoring original foreign key constraints
   * This method can be used if migration needs to be reversed
   */
  async rollbackMigration(): Promise<{ success: boolean; message: string }> {
    try {
      await db.transaction(async (tx) => {
        console.log('Starting migration rollback...');

        // Check if rollback is possible (legacy columns exist)
        const ticketsTableInfo = await tx.execute(sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'tickets' AND column_name = 'legacy_department_id'
        `);

        const chatSessionsTableInfo = await tx.execute(sql`
          SELECT column_name
          FROM information_schema.columns
          WHERE table_name = 'chat_sessions' AND column_name = 'legacy_chat_department_id'
        `);

        if (ticketsTableInfo.rows.length === 0 || chatSessionsTableInfo.rows.length === 0) {
          throw new Error('Migration rollback not possible: legacy columns not found');
        }

        // Drop current foreign key constraints
        await tx.execute(sql`
          ALTER TABLE "tickets"
          DROP CONSTRAINT IF EXISTS "tickets_department_id_support_departments_id_fk"
        `);

        await tx.execute(sql`
          ALTER TABLE "chat_sessions"
          DROP CONSTRAINT IF EXISTS "chat_sessions_department_id_support_departments_id_fk"
        `);

        // Restore original department_id values from legacy columns
        await tx.execute(sql`
          UPDATE "tickets"
          SET "department_id" = "legacy_department_id"
          WHERE "legacy_department_id" IS NOT NULL
        `);

        await tx.execute(sql`
          UPDATE "chat_sessions"
          SET "department_id" = "legacy_chat_department_id"
          WHERE "legacy_chat_department_id" IS NOT NULL
        `);

        // Restore original foreign key constraints
        await tx.execute(sql`
          ALTER TABLE "tickets"
          ADD CONSTRAINT "tickets_department_id_ticket_departments_id_fk"
          FOREIGN KEY ("department_id") REFERENCES "ticket_departments"("id") ON DELETE SET NULL
        `);

        await tx.execute(sql`
          ALTER TABLE "chat_sessions"
          ADD CONSTRAINT "chat_sessions_department_id_chat_departments_id_fk"
          FOREIGN KEY ("department_id") REFERENCES "chat_departments"("id") ON DELETE SET NULL
        `);

        console.log('Migration rollback completed successfully');
      });

      return {
        success: true,
        message: 'Migration rollback completed successfully'
      };

    } catch (error) {
      console.error('Migration rollback failed:', error);
      return {
        success: false,
        message: `Migration rollback failed: ${error.message}`
      };
    }
  }
}

export const departmentMigrationService = new DepartmentMigrationService();
