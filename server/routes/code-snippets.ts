import { Router } from 'express';
import { db } from '../db';
import { codeSnippets } from '../../shared/schemas/code-snippets-schema';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// Function to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Get all code snippets
router.get('/', isAdmin, async (req, res) => {
  try {
    const snippets = await db
      .select()
      .from(codeSnippets)
      .orderBy(desc(codeSnippets.createdAt));
    
    return res.json(snippets);
  } catch (error) {
    console.error('Error fetching code snippets:', error);
    return res.status(500).json({ error: 'Failed to fetch code snippets' });
  }
});

// Get a specific code snippet
router.get('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const snippet = await db
      .select()
      .from(codeSnippets)
      .where(eq(codeSnippets.id, parseInt(id)))
      .limit(1);
    
    if (snippet.length === 0) {
      return res.status(404).json({ error: 'Code snippet not found' });
    }
    
    return res.json(snippet[0]);
  } catch (error) {
    console.error('Error fetching code snippet:', error);
    return res.status(500).json({ error: 'Failed to fetch code snippet' });
  }
});

// Create a new code snippet
router.post('/', isAdmin, async (req, res) => {
  try {
    const { name, code, displayLocation, customUrl, description, isActive = true } = req.body;
    
    if (!name || !code || !displayLocation) {
      return res.status(400).json({ 
        error: 'Name, code, and display location are required' 
      });
    }
    
    // Validate custom URL if display location is custom
    if (displayLocation === 'custom' && !customUrl) {
      return res.status(400).json({ 
        error: 'Custom URL is required when display location is custom' 
      });
    }
    
    const newSnippet = await db
      .insert(codeSnippets)
      .values({
        name,
        code,
        displayLocation,
        customUrl: displayLocation === 'custom' ? customUrl : null,
        description,
        isActive
      })
      .returning();
    
    return res.status(201).json(newSnippet[0]);
  } catch (error) {
    console.error('Error creating code snippet:', error);
    return res.status(500).json({ error: 'Failed to create code snippet' });
  }
});

// Update a code snippet
router.put('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, code, displayLocation, customUrl, description, isActive } = req.body;
    
    // Validate custom URL if display location is custom
    if (displayLocation === 'custom' && !customUrl) {
      return res.status(400).json({ 
        error: 'Custom URL is required when display location is custom' 
      });
    }
    
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (code !== undefined) updateData.code = code;
    if (displayLocation !== undefined) updateData.displayLocation = displayLocation;
    if (customUrl !== undefined) updateData.customUrl = displayLocation === 'custom' ? customUrl : null;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    updateData.updatedAt = new Date();
    
    const updatedSnippet = await db
      .update(codeSnippets)
      .set(updateData)
      .where(eq(codeSnippets.id, parseInt(id)))
      .returning();
    
    if (updatedSnippet.length === 0) {
      return res.status(404).json({ error: 'Code snippet not found' });
    }
    
    return res.json(updatedSnippet[0]);
  } catch (error) {
    console.error('Error updating code snippet:', error);
    return res.status(500).json({ error: 'Failed to update code snippet' });
  }
});

// Delete a code snippet
router.delete('/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const deletedSnippet = await db
      .delete(codeSnippets)
      .where(eq(codeSnippets.id, parseInt(id)))
      .returning();
    
    if (deletedSnippet.length === 0) {
      return res.status(404).json({ error: 'Code snippet not found' });
    }
    
    return res.json({ message: 'Code snippet deleted successfully' });
  } catch (error) {
    console.error('Error deleting code snippet:', error);
    return res.status(500).json({ error: 'Failed to delete code snippet' });
  }
});

// Get active code snippets by location (for frontend use)
router.get('/location/:location', async (req, res) => {
  try {
    const { location } = req.params;
    
    const snippets = await db
      .select()
      .from(codeSnippets)
      .where(eq(codeSnippets.displayLocation, location))
      .where(eq(codeSnippets.isActive, true))
      .orderBy(desc(codeSnippets.createdAt));
    
    return res.json(snippets);
  } catch (error) {
    console.error('Error fetching code snippets by location:', error);
    return res.status(500).json({ error: 'Failed to fetch code snippets' });
  }
});

// Get available routes for custom URL selection
router.get('/available-routes', isAdmin, async (req, res) => {
  try {
    // Define available client-facing routes
    const availableRoutes = [
      { value: '/', label: 'Home Page' },
      { value: '/plans', label: 'Plans Page' },
      { value: '/servers', label: 'Servers Page' },
      { value: '/dns', label: 'DNS Management' },
      { value: '/billing', label: 'Billing Page' },
      { value: '/tickets', label: 'Support Tickets' },
      { value: '/profile', label: 'User Profile' },
      { value: '/dashboard', label: 'Dashboard' },
      { value: '/blog', label: 'Blog' },
      { value: '/docs', label: 'Documentation' },
      { value: '/status', label: 'Status Page' },
      { value: '/teams', label: 'Teams' },
      { value: '/packages', label: 'Packages' },
      { value: '/dns-plans', label: 'DNS Plans' },
      { value: '/dns-domains', label: 'DNS Domains' },
      { value: '/dns-records', label: 'DNS Records' },
      { value: '/auth', label: 'Authentication' },
      { value: '/maintenance', label: 'Maintenance Page' },
      { value: '/vnc-console', label: 'VNC Console' },
      { value: '/speed-test', label: 'Speed Test' },
    ];
    
    return res.json(availableRoutes);
  } catch (error) {
    console.error('Error fetching available routes:', error);
    return res.status(500).json({ error: 'Failed to fetch available routes' });
  }
});

export default router; 