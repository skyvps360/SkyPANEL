/**
 * @fileoverview Chat API routes
 * @author SkyPANEL Development Team
 * @created 2025-01-14
 * @modified 2025-01-14
 * @version 1.0.0
 */

import { Router } from 'express';
import { db } from '../db';
import { chatSessions, chatMessages, chatDepartments, adminChatStatus } from '@shared/schema';
import { eq, and, desc, asc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

const router = Router();

// Get all active chat sessions (admin only)
router.get('/sessions', async (req, res) => {
    try {
        const sessions = await db.select()
            .from(chatSessions)
            .where(eq(chatSessions.status, 'active'))
            .orderBy(desc(chatSessions.lastActivityAt));

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching chat sessions:', error);
        res.status(500).json({ error: 'Failed to fetch chat sessions' });
    }
});

// Get chat session by ID
router.get('/sessions/:id', async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        if (isNaN(sessionId)) {
            return res.status(400).json({ error: 'Invalid session ID' });
        }

        const sessions = await db.select()
            .from(chatSessions)
            .where(eq(chatSessions.id, sessionId))
            .limit(1);

        if (sessions.length === 0) {
            return res.status(404).json({ error: 'Session not found' });
        }

        res.json(sessions[0]);
    } catch (error) {
        console.error('Error fetching chat session:', error);
        res.status(500).json({ error: 'Failed to fetch chat session' });
    }
});

// Get messages for a chat session
router.get('/sessions/:id/messages', async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        if (isNaN(sessionId)) {
            return res.status(400).json({ error: 'Invalid session ID' });
        }

        const messages = await db.select()
            .from(chatMessages)
            .where(eq(chatMessages.sessionId, sessionId))
            .orderBy(asc(chatMessages.createdAt));

        res.json(messages);
    } catch (error) {
        console.error('Error fetching chat messages:', error);
        res.status(500).json({ error: 'Failed to fetch chat messages' });
    }
});

// End a chat session
router.post('/sessions/:id/end', async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        if (isNaN(sessionId)) {
            return res.status(400).json({ error: 'Invalid session ID' });
        }

        await db.update(chatSessions)
            .set({
                status: 'ended',
                endedAt: new Date(),
                lastActivityAt: new Date()
            })
            .where(eq(chatSessions.id, sessionId));

        res.json({ success: true });
    } catch (error) {
        console.error('Error ending chat session:', error);
        res.status(500).json({ error: 'Failed to end chat session' });
    }
});

// Convert chat session to ticket
router.post('/sessions/:id/convert-to-ticket', async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id);
        const { ticketId } = req.body;

        if (isNaN(sessionId)) {
            return res.status(400).json({ error: 'Invalid session ID' });
        }

        if (!ticketId || isNaN(ticketId)) {
            return res.status(400).json({ error: 'Invalid ticket ID' });
        }

        await db.update(chatSessions)
            .set({
                status: 'converted_to_ticket',
                convertedToTicketId: ticketId,
                convertedAt: new Date(),
                lastActivityAt: new Date()
            })
            .where(eq(chatSessions.id, sessionId));

        res.json({ success: true });
    } catch (error) {
        console.error('Error converting chat session to ticket:', error);
        res.status(500).json({ error: 'Failed to convert chat session to ticket' });
    }
});

// Get chat statistics (admin only)
router.get('/stats', async (req, res) => {
    try {
        const [totalSessions] = await db.select({ count: sql<number>`count(*)` })
            .from(chatSessions);

        const [activeSessions] = await db.select({ count: sql<number>`count(*)` })
            .from(chatSessions)
            .where(eq(chatSessions.status, 'active'));

        const [totalMessages] = await db.select({ count: sql<number>`count(*)` })
            .from(chatMessages);

        res.json({
            totalSessions: totalSessions?.count || 0,
            activeSessions: activeSessions?.count || 0,
            totalMessages: totalMessages?.count || 0
        });
    } catch (error) {
        console.error('Error fetching chat stats:', error);
        res.status(500).json({ error: 'Failed to fetch chat stats' });
    }
});

// Get user chat history
router.get('/user/:userId/history', async (req, res) => {
    try {
        const userId = parseInt(req.params.userId);
        if (isNaN(userId)) {
            return res.status(400).json({ error: 'Invalid user ID' });
        }

        const sessions = await db.select()
            .from(chatSessions)
            .where(eq(chatSessions.userId, userId))
            .orderBy(desc(chatSessions.lastActivityAt));

        res.json(sessions);
    } catch (error) {
        console.error('Error fetching user chat history:', error);
        res.status(500).json({ error: 'Failed to fetch user chat history' });
    }
});

// Check admin availability
router.get('/admin/availability', async (req, res) => {
    try {
        const availableAdmins = await db.select()
            .from(adminChatStatus)
            .where(and(
                eq(adminChatStatus.isOnline, true),
                eq(adminChatStatus.isAvailable, true)
            ));

        res.json({
            available: availableAdmins.length > 0,
            count: availableAdmins.length
        });
    } catch (error) {
        console.error('Error checking admin availability:', error);
        res.status(500).json({ error: 'Failed to check admin availability' });
    }
});

export default router; 