import { Router } from 'express';
import { storage } from "../storage";
import { virtFusionService } from "../virtfusion-service";
import { serverLoggingService } from "../server-logging-service";
import { z } from 'zod';
import { serverNotes, insertServerNoteSchema, updateServerNoteSchema } from '../../shared/schemas';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Get all servers
router.get('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const servers = await virtFusionService.getServers();
    return res.json(servers);
  } catch (error: any) {
    console.error('Error getting servers:', error);
    return res.status(500).json({ message: 'An error occurred while getting servers' });
  }
});

// Get server by ID
router.get('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const remoteState = req.query.remoteState === 'true';
    const server = await virtFusionService.getServer(serverId, remoteState);
    return res.json(server);
  } catch (error: any) {
    console.error('Error getting server:', error);
    return res.status(500).json({ message: 'An error occurred while getting the server' });
  }
});

// Boot server
router.post('/:id/boot', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    await virtFusionService.bootServer(serverId);
    await serverLoggingService.logServerAction(serverId, req.user.id, 'boot');
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error booting server:', error);
    return res.status(500).json({ message: 'An error occurred while booting the server' });
  }
});

// Restart server
router.post('/:id/restart', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    await virtFusionService.restartServer(serverId);
    await serverLoggingService.logServerAction(serverId, req.user.id, 'restart');
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error restarting server:', error);
    return res.status(500).json({ message: 'An error occurred while restarting the server' });
  }
});

// Shutdown server
router.post('/:id/shutdown', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    await virtFusionService.shutdownServer(serverId);
    await serverLoggingService.logServerAction(serverId, req.user.id, 'shutdown');
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error shutting down server:', error);
    return res.status(500).json({ message: 'An error occurred while shutting down the server' });
  }
});

// Power off server
router.post('/:id/poweroff', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    await virtFusionService.poweroffServer(serverId);
    await serverLoggingService.logServerAction(serverId, req.user.id, 'poweroff');
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error powering off server:', error);
    return res.status(500).json({ message: 'An error occurred while powering off the server' });
  }
});

// Reset server password
router.post('/:id/reset-password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const schema = z.object({
      password: z.string().min(8, 'Password must be at least 8 characters')
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const result = await virtFusionService.resetServerPassword(serverId, validationResult.data);
    await serverLoggingService.logServerAction(serverId, req.user.id, 'reset-password');
    return res.json(result);
  } catch (error: any) {
    console.error('Error resetting server password:', error);
    return res.status(500).json({ message: 'An error occurred while resetting the server password' });
  }
});

// Get server templates
router.get('/:id/templates', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const templates = await virtFusionService.getServerTemplates(serverId);
    return res.json(templates);
  } catch (error: any) {
    console.error('Error getting server templates:', error);
    return res.status(500).json({ message: 'An error occurred while getting server templates' });
  }
});

// Get server traffic
router.get('/:id/traffic', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const traffic = await virtFusionService.getServerTraffic(serverId);
    return res.json(traffic);
  } catch (error: any) {
    console.error('Error getting server traffic:', error);
    return res.status(500).json({ message: 'An error occurred while getting server traffic' });
  }
});

// Toggle server VNC
router.post('/:id/vnc', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const schema = z.object({
      enabled: z.boolean()
    });
    
    const validationResult = schema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const result = await virtFusionService.toggleServerVnc(serverId, validationResult.data);
    await serverLoggingService.logServerAction(serverId, req.user.id, validationResult.data.enabled ? 'enable-vnc' : 'disable-vnc');
    return res.json(result);
  } catch (error: any) {
    console.error('Error toggling server VNC:', error);
    return res.status(500).json({ message: 'An error occurred while toggling server VNC' });
  }
});

// Get server firewall
router.get('/:id/firewall/:interface', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const interfaceName = req.params.interface;
    const firewall = await virtFusionService.getServerFirewall(serverId, interfaceName);
    return res.json(firewall);
  } catch (error: any) {
    console.error('Error getting server firewall:', error);
    return res.status(500).json({ message: 'An error occurred while getting server firewall' });
  }
});

// Get server backups
router.get('/:id/backups', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const backups = await virtFusionService.getServerBackups(serverId);
    return res.json(backups);
  } catch (error: any) {
    console.error('Error getting server backups:', error);
    return res.status(500).json({ message: 'An error occurred while getting server backups' });
  }
});

// Get server notes
router.get('/:id/notes', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const notes = await storage.db
      .select()
      .from(serverNotes)
      .where(and(
        eq(serverNotes.serverId, serverId),
        eq(serverNotes.userId, req.user.id)
      ))
      .orderBy(desc(serverNotes.createdAt));
    
    return res.json(notes);
  } catch (error: any) {
    console.error('Error getting server notes:', error);
    return res.status(500).json({ message: 'An error occurred while getting server notes' });
  }
});

// Create server note
router.post('/:id/notes', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    if (isNaN(serverId)) {
      return res.status(400).json({ message: 'Invalid server ID' });
    }
    
    const validationResult = insertServerNoteSchema.safeParse({
      ...req.body,
      userId: req.user.id,
      serverId: serverId
    });
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const [note] = await storage.db
      .insert(serverNotes)
      .values(validationResult.data)
      .returning();
    
    return res.status(201).json(note);
  } catch (error: any) {
    console.error('Error creating server note:', error);
    return res.status(500).json({ message: 'An error occurred while creating the server note' });
  }
});

// Update server note
router.put('/:id/notes/:noteId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    const noteId = parseInt(req.params.noteId);
    
    if (isNaN(serverId) || isNaN(noteId)) {
      return res.status(400).json({ message: 'Invalid server ID or note ID' });
    }
    
    const validationResult = updateServerNoteSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        message: 'Invalid input',
        errors: validationResult.error.errors
      });
    }
    
    const [note] = await storage.db
      .update(serverNotes)
      .set({ ...validationResult.data, updatedAt: new Date() })
      .where(and(
        eq(serverNotes.id, noteId),
        eq(serverNotes.serverId, serverId),
        eq(serverNotes.userId, req.user.id)
      ))
      .returning();
    
    if (!note) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    return res.json(note);
  } catch (error: any) {
    console.error('Error updating server note:', error);
    return res.status(500).json({ message: 'An error occurred while updating the server note' });
  }
});

// Delete server note
router.delete('/:id/notes/:noteId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const serverId = parseInt(req.params.id);
    const noteId = parseInt(req.params.noteId);
    
    if (isNaN(serverId) || isNaN(noteId)) {
      return res.status(400).json({ message: 'Invalid server ID or note ID' });
    }
    
    const [deletedNote] = await storage.db
      .delete(serverNotes)
      .where(and(
        eq(serverNotes.id, noteId),
        eq(serverNotes.serverId, serverId),
        eq(serverNotes.userId, req.user.id)
      ))
      .returning();
    
    if (!deletedNote) {
      return res.status(404).json({ message: 'Note not found' });
    }
    
    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting server note:', error);
    return res.status(500).json({ message: 'An error occurred while deleting the server note' });
  }
});

export default router;