/**
 * @fileoverview Script to migrate chat departments
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { db } from '../server/db';
import { chatDepartments, chatDepartmentAdmins } from '../shared/schemas/chat-schema';
import { eq } from 'drizzle-orm';

async function migrateChatDepartments() {
    try {
        console.log('Migrating chat departments...');

        // Add default chat departments
        const defaultDepartments = [
            {
                name: 'General Support',
                description: 'General questions and support',
                isDefault: true,
                isActive: true,
                displayOrder: 1,
                color: '#3b82f6',
                icon: 'MessageCircle',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Technical Support',
                description: 'Technical issues and server problems',
                isDefault: false,
                isActive: true,
                displayOrder: 2,
                color: '#10b981',
                icon: 'Wrench',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Billing Support',
                description: 'Billing and payment questions',
                isDefault: false,
                isActive: true,
                displayOrder: 3,
                color: '#f59e0b',
                icon: 'CreditCard',
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Sales',
                description: 'Sales and product inquiries',
                isDefault: false,
                isActive: true,
                displayOrder: 4,
                color: '#8b5cf6',
                icon: 'ShoppingCart',
                createdAt: new Date(),
                updatedAt: new Date()
            }
        ];

        for (const dept of defaultDepartments) {
            const existing = await db.select()
                .from(chatDepartments)
                .where(eq(chatDepartments.name, dept.name))
                .limit(1);

            if (existing.length === 0) {
                await db.insert(chatDepartments).values(dept);
                console.log(`Added department: ${dept.name}`);
            } else {
                console.log(`Department already exists: ${dept.name}`);
            }
        }

        console.log('Chat departments migration complete!');
    } catch (error) {
        console.error('Error migrating chat departments:', error);
    }
}

migrateChatDepartments(); 