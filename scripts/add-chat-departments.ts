/**
 * @fileoverview Script to add default chat departments
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { db } from '../server/db';
import { chatDepartments } from '../shared/schemas/chat-schema';
import { eq } from 'drizzle-orm';

async function addChatDepartments() {
    try {
        console.log('Adding default chat departments...');

        const defaultDepartments = [
            {
                name: 'General Support',
                description: 'General questions and support',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Technical Support',
                description: 'Technical issues and server problems',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Billing Support',
                description: 'Billing and payment questions',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            },
            {
                name: 'Sales',
                description: 'Sales and product inquiries',
                isActive: true,
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

        console.log('Chat departments setup complete!');
    } catch (error) {
        console.error('Error adding chat departments:', error);
    }
}

addChatDepartments(); 