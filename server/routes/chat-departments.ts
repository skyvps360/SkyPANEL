/**
 * @fileoverview Chat departments API routes
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { Router } from 'express';
import { db } from '../db';
import { chatDepartments, chatDepartmentAdmins } from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';

const router = Router();

// Get all active chat departments (public)
router.get('/departments', async (req, res) => {
    try {
        const departments = await db.select()
            .from(chatDepartments)
            .where(eq(chatDepartments.isActive, true))
            .orderBy(asc(chatDepartments.displayOrder), asc(chatDepartments.name));

        res.json(departments);
    } catch (error) {
        console.error('Error fetching chat departments:', error);
        res.status(500).json({ error: 'Failed to fetch chat departments' });
    }
});

// Get all chat departments (admin only)
router.get('/admin/departments', async (req, res) => {
    try {
        const departments = await db.select()
            .from(chatDepartments)
            .orderBy(asc(chatDepartments.displayOrder), asc(chatDepartments.name));

        res.json(departments);
    } catch (error) {
        console.error('Error fetching chat departments:', error);
        res.status(500).json({ error: 'Failed to fetch chat departments' });
    }
});

// Create new chat department (admin only)
router.post('/admin/departments', async (req, res) => {
    try {
        const { name, description, isDefault, isActive, displayOrder, color, icon } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Department name is required' });
        }

        const newDepartment = await db.insert(chatDepartments).values({
            name,
            description,
            isDefault: isDefault || false,
            isActive: isActive !== undefined ? isActive : true,
            displayOrder: displayOrder || 0,
            color: color || '#3b82f6',
            icon: icon || 'MessageCircle',
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        res.status(201).json(newDepartment[0]);
    } catch (error) {
        console.error('Error creating chat department:', error);
        res.status(500).json({ error: 'Failed to create chat department' });
    }
});

// Update chat department (admin only)
router.put('/admin/departments/:id', async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id);
        if (isNaN(departmentId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }

        const { name, description, isDefault, isActive, displayOrder, color, icon } = req.body;

        const updatedDepartment = await db.update(chatDepartments)
            .set({
                name,
                description,
                isDefault,
                isActive,
                displayOrder,
                color,
                icon,
                updatedAt: new Date()
            })
            .where(eq(chatDepartments.id, departmentId))
            .returning();

        if (updatedDepartment.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json(updatedDepartment[0]);
    } catch (error) {
        console.error('Error updating chat department:', error);
        res.status(500).json({ error: 'Failed to update chat department' });
    }
});

// Delete chat department (admin only)
router.delete('/admin/departments/:id', async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id);
        if (isNaN(departmentId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }

        const deletedDepartment = await db.delete(chatDepartments)
            .where(eq(chatDepartments.id, departmentId))
            .returning();

        if (deletedDepartment.length === 0) {
            return res.status(404).json({ error: 'Department not found' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting chat department:', error);
        res.status(500).json({ error: 'Failed to delete chat department' });
    }
});

// Get department admins (admin only)
router.get('/admin/departments/:id/admins', async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id);
        if (isNaN(departmentId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }

        const admins = await db.select()
            .from(chatDepartmentAdmins)
            .where(eq(chatDepartmentAdmins.departmentId, departmentId));

        res.json(admins);
    } catch (error) {
        console.error('Error fetching department admins:', error);
        res.status(500).json({ error: 'Failed to fetch department admins' });
    }
});

// Add admin to department (admin only)
router.post('/admin/departments/:id/admins', async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id);
        const { adminId, canManage } = req.body;

        if (isNaN(departmentId)) {
            return res.status(400).json({ error: 'Invalid department ID' });
        }

        if (!adminId || isNaN(adminId)) {
            return res.status(400).json({ error: 'Invalid admin ID' });
        }

        const newAdmin = await db.insert(chatDepartmentAdmins).values({
            departmentId,
            adminId,
            canManage: canManage || false,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();

        res.status(201).json(newAdmin[0]);
    } catch (error) {
        console.error('Error adding admin to department:', error);
        res.status(500).json({ error: 'Failed to add admin to department' });
    }
});

// Remove admin from department (admin only)
router.delete('/admin/departments/:id/admins/:adminId', async (req, res) => {
    try {
        const departmentId = parseInt(req.params.id);
        const adminId = parseInt(req.params.adminId);

        if (isNaN(departmentId) || isNaN(adminId)) {
            return res.status(400).json({ error: 'Invalid department or admin ID' });
        }

        await db.delete(chatDepartmentAdmins)
            .where(and(
                eq(chatDepartmentAdmins.departmentId, departmentId),
                eq(chatDepartmentAdmins.adminId, adminId)
            ));

        res.json({ success: true });
    } catch (error) {
        console.error('Error removing admin from department:', error);
        res.status(500).json({ error: 'Failed to remove admin from department' });
    }
});

export default router; 