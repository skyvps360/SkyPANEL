import { Router } from 'express';
import { chatService } from '../chat-service';
import { storage } from '../storage';
import { requireAuth, requireAdmin } from '../middleware/auth';
import { emailService } from '../email';

const router = Router();

/**
 * Client Chat Routes
 */

// Get current user's active chat session
router.get('/session', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const session = await storage.getUserActiveChatSession(userId);
    
    if (session) {
      const messages = await storage.getChatMessagesWithUsers(session.id);
      res.json({
        session,
        messages
      });
    } else {
      res.json({ session: null, messages: [] });
    }
  } catch (error) {
    console.error('Error getting chat session:', error);
    res.status(500).json({ error: 'Failed to get chat session' });
  }
});

// Start a new chat session
router.post('/session', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { subject, department, departmentId } = req.body;

    // Check if user already has an active session
    const existingSession = await storage.getUserActiveChatSession(userId);
    if (existingSession) {
      return res.status(400).json({ error: 'You already have an active chat session' });
    }

    // Validate department if provided
    let validDepartmentId = null;

    if (departmentId) {
      const dept = await storage.getChatDepartment(departmentId);
      if (dept && dept.isActive) {
        validDepartmentId = departmentId;
      }
    } else {
      // Get default department
      const departments = await storage.getActiveChatDepartments();
      const defaultDept = departments.find(d => d.isDefault);
      if (defaultDept) {
        validDepartmentId = defaultDept.id;
      }
    }

    // Create new session
    const session = await storage.createChatSession({
      userId,
      subject: subject || 'General Support',
      department: department || 'general', // Legacy field
      departmentId: validDepartmentId,
      status: 'waiting',
      metadata: {
        userAgent: req.headers['user-agent'] || 'Unknown',
        startedFrom: 'dashboard'
      }
    });

    res.json({ session });
  } catch (error) {
    console.error('Error starting chat session:', error);
    res.status(500).json({ error: 'Failed to start chat session' });
  }
});

// End current chat session
router.delete('/session', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const session = await storage.getUserActiveChatSession(userId);
    
    if (!session) {
      return res.status(404).json({ error: 'No active chat session found' });
    }

    await chatService.endChatSession(session.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending chat session:', error);
    res.status(500).json({ error: 'Failed to end chat session' });
  }
});

// Get messages for current session
router.get('/messages', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const session = await storage.getUserActiveChatSession(userId);

    if (!session) {
      return res.status(404).json({ error: 'No active chat session found' });
    }

    const messages = await storage.getChatMessagesWithUsers(session.id);
    res.json({ messages });
  } catch (error) {
    console.error('Error getting chat messages:', error);
    res.status(500).json({ error: 'Failed to get chat messages' });
  }
});

// Get user's chat history
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    const history = await storage.getUserChatHistory(userId, limit, offset);
    res.json({ history });
  } catch (error) {
    console.error('Error getting chat history:', error);
    res.status(500).json({ error: 'Failed to get chat history' });
  }
});

// Get specific chat session from history with messages
router.get('/history/:sessionId', requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const sessionId = parseInt(req.params.sessionId);

    // Get the session and verify it belongs to the user
    const session = await storage.getChatSession(sessionId);
    if (!session || session.userId !== userId) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Get messages for this session
    const messages = await storage.getChatMessagesWithUsers(sessionId);

    // Get department info if available
    let department = null;
    if (session.departmentId) {
      department = await storage.getChatDepartment(session.departmentId);
    }

    res.json({
      session: {
        ...session,
        department
      },
      messages
    });
  } catch (error) {
    console.error('Error getting chat session from history:', error);
    res.status(500).json({ error: 'Failed to get chat session' });
  }
});

/**
 * Admin Chat Routes
 */

// Get all chat sessions with user details and departments
router.get('/admin/sessions', requireAdmin, async (req, res) => {
  try {
    const sessions = await storage.getChatSessionsWithDepartments();
    res.json({ sessions });
  } catch (error) {
    console.error('Error getting admin chat sessions:', error);
    res.status(500).json({ error: 'Failed to get chat sessions' });
  }
});

// Get active chat sessions only
router.get('/admin/sessions/active', requireAdmin, async (req, res) => {
  try {
    const sessions = await chatService.getActiveSessions();
    res.json({ sessions });
  } catch (error) {
    console.error('Error getting active chat sessions:', error);
    res.status(500).json({ error: 'Failed to get active chat sessions' });
  }
});

// Get specific session with messages
router.get('/admin/sessions/:sessionId', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const session = await storage.getChatSession(sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const messages = await storage.getChatMessagesWithUsers(sessionId);
    const user = await storage.getUser(session.userId);
    
    res.json({
      session: {
        ...session,
        user
      },
      messages
    });
  } catch (error) {
    console.error('Error getting chat session:', error);
    res.status(500).json({ error: 'Failed to get chat session' });
  }
});

// Assign session to admin
router.post('/admin/sessions/:sessionId/assign', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const adminId = req.user!.id;

    await chatService.assignSessionToAdmin(sessionId, adminId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error assigning chat session:', error);
    res.status(500).json({ error: 'Failed to assign chat session' });
  }
});

// End chat session (admin)
router.delete('/admin/sessions/:sessionId', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    await chatService.endChatSession(sessionId);
    res.json({ success: true });
  } catch (error) {
    console.error('Error ending chat session:', error);
    res.status(500).json({ error: 'Failed to end chat session' });
  }
});

// Get admin chat statistics
router.get('/admin/stats', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user!.id;
    const stats = await chatService.getAdminChatStats(adminId);
    res.json({ stats });
  } catch (error) {
    console.error('Error getting admin chat stats:', error);
    res.status(500).json({ error: 'Failed to get chat statistics' });
  }
});

// Update admin chat status
router.post('/admin/status', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user!.id;
    const { status, statusMessage, maxConcurrentChats, autoAssign } = req.body;

    console.log(`Admin ${adminId} updating status:`, { status, statusMessage, maxConcurrentChats, autoAssign });

    const updatedStatus = await storage.upsertAdminChatStatus(adminId, {
      status: status || 'offline',
      statusMessage,
      maxConcurrentChats: maxConcurrentChats || 5,
      autoAssign: autoAssign !== undefined ? autoAssign : true
    });

    // Trigger WebSocket broadcast to all clients about admin status change
    // This will be handled by the chat service's updateAdminStatus method
    await chatService.broadcastAdminStatusUpdate();

    console.log(`Status update successful for admin ${adminId}:`, updatedStatus);
    res.json({ success: true, status: updatedStatus });
  } catch (error) {
    console.error('Error updating admin status:', error);
    res.status(500).json({ error: 'Failed to update admin status' });
  }
});

// Get admin chat status
router.get('/admin/status', requireAdmin, async (req, res) => {
  try {
    const adminId = req.user!.id;
    const status = await storage.getAdminChatStatus(adminId);
    console.log(`Retrieved admin status for user ${adminId}:`, status);
    res.json({ status });
  } catch (error) {
    console.error('Error getting admin status:', error);
    res.status(500).json({ error: 'Failed to get admin status' });
  }
});

// Get all available admins
router.get('/admin/available', requireAdmin, async (req, res) => {
  try {
    const admins = await storage.getAvailableAdmins();
    res.json({ admins });
  } catch (error) {
    console.error('Error getting available admins:', error);
    res.status(500).json({ error: 'Failed to get available admins' });
  }
});

// Convert chat session to ticket (admin only)
router.post('/admin/:sessionId/convert-to-ticket', requireAdmin, async (req, res) => {
  try {
    const sessionId = parseInt(req.params.sessionId);
    const adminId = req.user!.id;
    const { subject, priority, departmentId } = req.body;

    if (isNaN(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID' });
    }

    if (!subject || !subject.trim()) {
      return res.status(400).json({ error: 'Subject is required' });
    }

    // Get the chat session
    const session = await storage.getChatSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    // Check if session is already converted
    if (session.convertedToTicketId) {
      return res.status(400).json({ error: 'Chat session has already been converted to a ticket' });
    }

    // Get chat messages to include in the ticket
    const chatMessages = await storage.getChatMessagesWithUsers(sessionId);

    // Determine the ticket department
    let ticketDepartmentId = departmentId;

    // If no department specified, try to map from chat department
    if (!ticketDepartmentId && session.departmentId) {
      const chatDepartment = await storage.getChatDepartment(session.departmentId);
      if (chatDepartment) {
        // Try to find a ticket department with the same name
        const ticketDepartments = await storage.getActiveTicketDepartments();
        const matchingDept = ticketDepartments.find(td => td.name === chatDepartment.name);
        if (matchingDept) {
          ticketDepartmentId = matchingDept.id;
        }
      }
    }

    // If still no department, use the default ticket department
    if (!ticketDepartmentId) {
      const ticketDepartments = await storage.getActiveTicketDepartments();
      const defaultDept = ticketDepartments.find(td => td.isDefault);
      if (defaultDept) {
        ticketDepartmentId = defaultDept.id;
      }
    }

    // Create the ticket (NOTE: This does NOT trigger Discord webhooks as per requirements)
    const ticket = await storage.createTicket({
      userId: session.userId,
      subject: subject.trim(),
      priority: priority || 'medium',
      departmentId: ticketDepartmentId
    });

    // Create initial ticket message with chat history
    let ticketContent = 'This ticket was converted from a live chat session.\n\n';
    ticketContent += '--- Chat History ---\n\n';

    for (const msg of chatMessages) {
      const timestamp = new Date(msg.createdAt).toLocaleString();
      const sender = msg.isFromAdmin ? `Admin (${msg.user?.fullName || 'Unknown'})` : `${msg.user?.fullName || 'User'}`;
      ticketContent += `[${timestamp}] ${sender}: ${msg.message}\n`;
    }

    await storage.createTicketMessage({
      ticketId: ticket.id,
      userId: adminId,
      message: ticketContent
    });

    // Update chat session to mark as converted
    await storage.updateChatSession(sessionId, {
      status: 'converted_to_ticket',
      convertedToTicketId: ticket.id,
      convertedAt: new Date(),
      convertedByAdminId: adminId,
      endedAt: new Date()
    });

    // Send email notification to client about the conversion
    try {
      const user = await storage.getUser(session.userId);
      if (user && user.email) {
        await emailService.sendChatToTicketNotification(
          user.email,
          user.fullName || user.username,
          ticket.id,
          ticket.subject,
          sessionId
        );
        console.log(`Chat-to-ticket notification sent to ${user.email} for ticket #${ticket.id}`);
      }
    } catch (emailError) {
      // Log but don't fail the conversion if email fails
      console.error('Error sending chat-to-ticket notification email:', emailError);
    }

    // End the chat session via chat service
    await chatService.endChatSession(sessionId);

    res.json({
      success: true,
      ticketId: ticket.id,
      message: 'Chat session successfully converted to ticket'
    });

  } catch (error) {
    console.error('Error converting chat to ticket:', error);
    res.status(500).json({ error: 'Failed to convert chat to ticket' });
  }
});

/**
 * Public Chat Routes (No authentication required)
 */

// Get admin availability status for clients
router.get('/availability', async (req, res) => {
  try {
    const availableAdmins = await storage.getAvailableAdmins();
    const isAvailable = availableAdmins.length > 0;

    // Get the most recent status message from available admins
    const statusMessage = availableAdmins.length > 0 && availableAdmins[0].statusMessage
      ? availableAdmins[0].statusMessage
      : '';

    res.json({
      available: isAvailable,
      adminCount: availableAdmins.length,
      statusMessage,
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting admin availability:', error);
    res.status(500).json({ error: 'Failed to get admin availability' });
  }
});

export default router;
