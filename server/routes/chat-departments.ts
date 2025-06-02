import { Router } from 'express';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();

/**
 * Public Chat Department Routes (for clients)
 */

// Get active chat departments for client selection
router.get('/departments', requireAuth, async (req, res) => {
  try {
    const departments = await storage.getActiveChatDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error getting chat departments:', error);
    res.status(500).json({ error: 'Failed to get chat departments' });
  }
});

/**
 * Admin Chat Department Management Routes
 */

// Get all chat departments (admin only)
router.get('/admin/departments', requireAdmin, async (req, res) => {
  try {
    const departments = await storage.getChatDepartments();
    res.json(departments);
  } catch (error) {
    console.error('Error getting all chat departments:', error);
    res.status(500).json({ error: 'Failed to get chat departments' });
  }
});

// Create new chat department (admin only)
router.post('/admin/departments', requireAdmin, async (req, res) => {
  try {
    const { name, description, isDefault, displayOrder, color, icon } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    // If this is set as default, unset other defaults
    if (isDefault) {
      const existingDepartments = await storage.getChatDepartments();
      for (const dept of existingDepartments) {
        if (dept.isDefault) {
          await storage.updateChatDepartment(dept.id, { isDefault: false });
        }
      }
    }

    const department = await storage.createChatDepartment({
      name,
      description,
      isDefault: isDefault || false,
      displayOrder: displayOrder || 0,
      color: color || '#3b82f6',
      icon: icon || 'MessageCircle',
      isActive: true
    });

    res.status(201).json(department);
  } catch (error) {
    console.error('Error creating chat department:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Department name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to create chat department' });
    }
  }
});

// Update chat department (admin only)
router.put('/admin/departments/:id', requireAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const { name, description, isDefault, isActive, displayOrder, color, icon } = req.body;

    // Check if department exists
    const existingDepartment = await storage.getChatDepartment(departmentId);
    if (!existingDepartment) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // If this is set as default, unset other defaults
    if (isDefault && !existingDepartment.isDefault) {
      const allDepartments = await storage.getChatDepartments();
      for (const dept of allDepartments) {
        if (dept.isDefault && dept.id !== departmentId) {
          await storage.updateChatDepartment(dept.id, { isDefault: false });
        }
      }
    }

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isDefault !== undefined) updates.isDefault = isDefault;
    if (isActive !== undefined) updates.isActive = isActive;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;
    if (color !== undefined) updates.color = color;
    if (icon !== undefined) updates.icon = icon;

    await storage.updateChatDepartment(departmentId, updates);

    const updatedDepartment = await storage.getChatDepartment(departmentId);
    res.json(updatedDepartment);
  } catch (error) {
    console.error('Error updating chat department:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Department name already exists' });
    } else {
      res.status(500).json({ error: 'Failed to update chat department' });
    }
  }
});

// Delete chat department (admin only)
router.delete('/admin/departments/:id', requireAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);

    // Check if department exists
    const existingDepartment = await storage.getChatDepartment(departmentId);
    if (!existingDepartment) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department is default
    if (existingDepartment.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default department' });
    }

    // Check if department has active sessions
    const activeSessions = await storage.getChatSessionsByDepartment(departmentId);
    const activeSessionsCount = activeSessions.filter(s => s.status !== 'closed').length;
    
    if (activeSessionsCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete department with ${activeSessionsCount} active chat sessions` 
      });
    }

    await storage.deleteChatDepartment(departmentId);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Error deleting chat department:', error);
    res.status(500).json({ error: 'Failed to delete chat department' });
  }
});

/**
 * Department Admin Assignment Routes
 */

// Get department admins
router.get('/admin/departments/:id/admins', requireAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const admins = await storage.getDepartmentAdmins(departmentId);
    res.json(admins);
  } catch (error) {
    console.error('Error getting department admins:', error);
    res.status(500).json({ error: 'Failed to get department admins' });
  }
});

// Assign admin to department
router.post('/admin/departments/:id/admins', requireAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.id);
    const { adminId, canManage } = req.body;

    if (!adminId) {
      return res.status(400).json({ error: 'Admin ID is required' });
    }

    // Check if department exists
    const department = await storage.getChatDepartment(departmentId);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if admin exists and is actually an admin
    const admin = await storage.getUser(adminId);
    if (!admin || admin.role !== 'admin') {
      return res.status(400).json({ error: 'Invalid admin user' });
    }

    const assignment = await storage.assignAdminToDepartment({
      departmentId,
      adminId,
      canManage: canManage || false,
      isActive: true
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error assigning admin to department:', error);
    if (error.code === '23505') { // Unique constraint violation
      res.status(400).json({ error: 'Admin is already assigned to this department' });
    } else {
      res.status(500).json({ error: 'Failed to assign admin to department' });
    }
  }
});

// Remove admin from department
router.delete('/admin/departments/:departmentId/admins/:adminId', requireAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.departmentId);
    const adminId = parseInt(req.params.adminId);

    await storage.removeAdminFromDepartment(departmentId, adminId);
    res.json({ message: 'Admin removed from department successfully' });
  } catch (error) {
    console.error('Error removing admin from department:', error);
    res.status(500).json({ error: 'Failed to remove admin from department' });
  }
});

// Update admin department permissions
router.put('/admin/departments/:departmentId/admins/:adminId', requireAdmin, async (req, res) => {
  try {
    const departmentId = parseInt(req.params.departmentId);
    const adminId = parseInt(req.params.adminId);
    const { canManage, isActive } = req.body;

    const updates: any = {};
    if (canManage !== undefined) updates.canManage = canManage;
    if (isActive !== undefined) updates.isActive = isActive;

    await storage.updateDepartmentAdminPermissions(departmentId, adminId, updates);
    res.json({ message: 'Admin permissions updated successfully' });
  } catch (error) {
    console.error('Error updating admin department permissions:', error);
    res.status(500).json({ error: 'Failed to update admin permissions' });
  }
});

// Get admin's assigned departments
router.get('/admin/my-departments', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user!.id;
    const departments = await storage.getAdminDepartments(adminId);
    res.json(departments);
  } catch (error) {
    console.error('Error getting admin departments:', error);
    res.status(500).json({ error: 'Failed to get admin departments' });
  }
});

export default router;
