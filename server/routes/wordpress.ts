import { Router } from 'express';
import { wordpressService } from '../services/wordpress-service';
import { storage } from '../storage';

const router = Router();

// Middleware to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Get WordPress configuration
router.get('/config', isAdmin, async (req, res) => {
  try {
    const siteUrl = await storage.getSetting('wordpress_site_url');
    const apiKey = await storage.getSetting('wordpress_api_key');
    const username = await storage.getSetting('wordpress_username');
    const password = await storage.getSetting('wordpress_password');
    const isEnabled = await storage.getSetting('wordpress_enabled');
    const autoSync = await storage.getSetting('wordpress_auto_sync');
    const syncInterval = await storage.getSetting('wordpress_sync_interval');

    return res.json({
      siteUrl: siteUrl || '',
      apiKey: apiKey ? '********' : '',
      username: username || '',
      password: password ? '********' : '',
      isEnabled: isEnabled === 'true',
      autoSync: autoSync === 'true',
      syncInterval: parseInt(syncInterval) || 60
    });
  } catch (error) {
    console.error('Error fetching WordPress config:', error);
    return res.status(500).json({ error: 'Failed to fetch WordPress configuration' });
  }
});

// Update WordPress configuration
router.post('/config', isAdmin, async (req, res) => {
  try {
    const { siteUrl, apiKey, username, password, isEnabled, autoSync, syncInterval } = req.body;

    if (!siteUrl || !apiKey || !username || !password) {
      return res.status(400).json({ error: 'Site URL, API Key, Username, and Password are required' });
    }

    await storage.setSetting('wordpress_site_url', siteUrl);
    await storage.setSetting('wordpress_api_key', apiKey);
    await storage.setSetting('wordpress_username', username);
    await storage.setSetting('wordpress_password', password);
    await storage.setSetting('wordpress_enabled', isEnabled ? 'true' : 'false');
    await storage.setSetting('wordpress_auto_sync', autoSync ? 'true' : 'false');
    await storage.setSetting('wordpress_sync_interval', syncInterval?.toString() || '60');

    return res.json({ success: true, message: 'WordPress configuration updated successfully' });
  } catch (error) {
    console.error('Error updating WordPress config:', error);
    return res.status(500).json({ error: 'Failed to update WordPress configuration' });
  }
});

// Test WordPress connection
router.post('/test-connection', isAdmin, async (req, res) => {
  try {
    const result = await wordpressService.testConnection();
    return res.json(result);
  } catch (error) {
    console.error('Error testing WordPress connection:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to test WordPress connection' 
    });
  }
});

// Get WordPress pages
router.get('/pages', isAdmin, async (req, res) => {
  try {
    const pages = await wordpressService.getPages();
    return res.json(pages);
  } catch (error) {
    console.error('Error fetching WordPress pages:', error);
    return res.status(500).json({ error: 'Failed to fetch WordPress pages' });
  }
});

// Get WordPress posts
router.get('/posts', isAdmin, async (req, res) => {
  try {
    const posts = await wordpressService.getPosts();
    return res.json(posts);
  } catch (error) {
    console.error('Error fetching WordPress posts:', error);
    return res.status(500).json({ error: 'Failed to fetch WordPress posts' });
  }
});

// Create WordPress page
router.post('/pages', isAdmin, async (req, res) => {
  try {
    const { title, content, slug, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const page = await wordpressService.createPage({
      title,
      content,
      slug,
      status: status || 'publish'
    });

    return res.json(page);
  } catch (error) {
    console.error('Error creating WordPress page:', error);
    return res.status(500).json({ error: 'Failed to create WordPress page' });
  }
});

// Create WordPress post
router.post('/posts', isAdmin, async (req, res) => {
  try {
    const { title, content, excerpt, slug, status, categories, tags } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const post = await wordpressService.createPost({
      title,
      content,
      excerpt,
      slug,
      status: status || 'publish',
      categories,
      tags
    });

    return res.json(post);
  } catch (error) {
    console.error('Error creating WordPress post:', error);
    return res.status(500).json({ error: 'Failed to create WordPress post' });
  }
});

// Update WordPress page
router.put('/pages/:id', isAdmin, async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    const { title, content, slug, status } = req.body;

    const page = await wordpressService.updatePage(pageId, {
      title,
      content,
      slug,
      status
    });

    return res.json(page);
  } catch (error) {
    console.error('Error updating WordPress page:', error);
    return res.status(500).json({ error: 'Failed to update WordPress page' });
  }
});

// Update WordPress post
router.put('/posts/:id', isAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    const { title, content, excerpt, slug, status, categories, tags } = req.body;

    const post = await wordpressService.updatePost(postId, {
      title,
      content,
      excerpt,
      slug,
      status,
      categories,
      tags
    });

    return res.json(post);
  } catch (error) {
    console.error('Error updating WordPress post:', error);
    return res.status(500).json({ error: 'Failed to update WordPress post' });
  }
});

// Delete WordPress page
router.delete('/pages/:id', isAdmin, async (req, res) => {
  try {
    const pageId = parseInt(req.params.id);
    await wordpressService.deletePage(pageId);
    return res.json({ success: true, message: 'Page deleted successfully' });
  } catch (error) {
    console.error('Error deleting WordPress page:', error);
    return res.status(500).json({ error: 'Failed to delete WordPress page' });
  }
});

// Delete WordPress post
router.delete('/posts/:id', isAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.id);
    await wordpressService.deletePost(postId);
    return res.json({ success: true, message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting WordPress post:', error);
    return res.status(500).json({ error: 'Failed to delete WordPress post' });
  }
});

// Get WordPress categories
router.get('/categories', isAdmin, async (req, res) => {
  try {
    const categories = await wordpressService.getCategories();
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching WordPress categories:', error);
    return res.status(500).json({ error: 'Failed to fetch WordPress categories' });
  }
});

// Get WordPress tags
router.get('/tags', isAdmin, async (req, res) => {
  try {
    const tags = await wordpressService.getTags();
    return res.json(tags);
  } catch (error) {
    console.error('Error fetching WordPress tags:', error);
    return res.status(500).json({ error: 'Failed to fetch WordPress tags' });
  }
});

// Sync WordPress content
router.post('/sync', isAdmin, async (req, res) => {
  try {
    const result = await wordpressService.syncContent();
    return res.json(result);
  } catch (error) {
    console.error('Error syncing WordPress content:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to sync WordPress content' 
    });
  }
});

// Get WordPress sync status
router.get('/sync-status', isAdmin, async (req, res) => {
  try {
    const status = await wordpressService.getSyncStatus();
    return res.json(status);
  } catch (error) {
    console.error('Error getting WordPress sync status:', error);
    return res.status(500).json({ error: 'Failed to get WordPress sync status' });
  }
});

// Get synced content (cached)
router.get('/synced-content', isAdmin, async (req, res) => {
  try {
    const syncedPages = await storage.getSetting('wordpress_synced_pages');
    const syncedPosts = await storage.getSetting('wordpress_synced_posts');

    const pages = syncedPages ? JSON.parse(syncedPages) : [];
    const posts = syncedPosts ? JSON.parse(syncedPosts) : [];

    return res.json({
      pages,
      posts,
      totalPages: pages.length,
      totalPosts: posts.length
    });
  } catch (error) {
    console.error('Error fetching synced content:', error);
    return res.status(500).json({ error: 'Failed to fetch synced content' });
  }
});

export default router; 