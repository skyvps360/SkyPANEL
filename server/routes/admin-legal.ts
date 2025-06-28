import { Router } from 'express';
import { geminiService } from '../gemini-service';

const router = Router();

// Function to check if user is admin (reused from admin-settings.ts)
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// New endpoint for Gemini AI legal assistance
router.post('/api/admin/legal/gemini-assist', isAdmin, async (req, res) => {
  try {
    const { prompt } = req.body;
    console.log('[admin-legal.ts] Received prompt:', prompt);

    if (!prompt) {
      console.log('[admin-legal.ts] Prompt is missing.');
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await geminiService.generateLegalContent(prompt, req, res);
    console.log('[admin-legal.ts] Result from geminiService:', result);

    if (result.success) {
      console.log('[admin-legal.ts] Sending successful response:', { response: result.response });
      return res.json({ response: result.response });
    } else {
      console.error('[admin-legal.ts] Error from geminiService:', result.response);
      return res.status(500).json({ error: result.response || 'Failed to generate legal content' });
    }
  } catch (error) {
    console.error('[admin-legal.ts] Error generating legal content:', error);
    return res.status(500).json({ error: 'Failed to generate legal content' });
  }
});

export default router;