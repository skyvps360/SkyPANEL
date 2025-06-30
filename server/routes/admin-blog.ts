import { Router } from 'express';
import { geminiService } from '../gemini-service';
import { db } from '../db';
import { blogPosts, blogCategories } from '../../shared/schema';
import { desc, eq, sql } from 'drizzle-orm';

const router = Router();

// Function to check if user is admin
function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user?.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Admin access required' });
}

// Get all blog posts
router.get('/api/admin/blog', isAdmin, async (req, res) => {
  try {
    const posts = await db.select().from(blogPosts).orderBy(desc(blogPosts.createdAt));
    return res.json(posts);
  } catch (error) {
    console.error('Error fetching blog posts:', error);
    return res.status(500).json({ error: 'Failed to fetch blog posts' });
  }
});

// Create blog post
router.post('/api/admin/blog', isAdmin, async (req, res) => {
  try {
    const {
      title, slug, content, snippet, excerpt, featuredImageUrl,
      author, date, categoryId, tags, displayOrder, published
    } = req.body;

    const newPost = await db.insert(blogPosts).values({
      title, 
      slug, 
      content, 
      snippet, 
      excerpt, 
      featuredImageUrl, 
      author, 
      date: new Date(date), 
      categoryId, 
      tags, 
      displayOrder, 
      published
    }).returning();

    return res.json(newPost[0]);
  } catch (error) {
    console.error('Error creating blog post:', error);
    return res.status(500).json({ error: 'Failed to create blog post' });
  }
});

// Update blog post
router.put('/api/admin/blog/:id', isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      title, slug, content, snippet, excerpt, featuredImageUrl,
      author, date, categoryId, tags, displayOrder, published
    } = req.body;

    const updatedPost = await db.update(blogPosts)
      .set({
        title, 
        slug, 
        content, 
        snippet, 
        excerpt, 
        featuredImageUrl, 
        author, 
        date: new Date(date), 
        categoryId, 
        tags, 
        displayOrder, 
        published,
        updatedAt: new Date()
      })
      .where(eq(blogPosts.id, id))
      .returning();

    if (updatedPost.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    return res.json(updatedPost[0]);
  } catch (error) {
    console.error('Error updating blog post:', error);
    return res.status(500).json({ error: 'Failed to update blog post' });
  }
});

// Delete blog post
router.delete('/api/admin/blog/:id', isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(blogPosts).where(eq(blogPosts.id, id));
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog post:', error);
    return res.status(500).json({ error: 'Failed to delete blog post' });
  }
});

// Toggle blog post published status
router.put('/api/admin/blog/:id/toggle-published', isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { published } = req.body;

    const updatedPost = await db.update(blogPosts)
      .set({ 
        published, 
        updatedAt: new Date() 
      })
      .where(eq(blogPosts.id, id))
      .returning();

    if (updatedPost.length === 0) {
      return res.status(404).json({ error: 'Blog post not found' });
    }

    return res.json(updatedPost[0]);
  } catch (error) {
    console.error('Error toggling blog post status:', error);
    return res.status(500).json({ error: 'Failed to toggle blog post status' });
  }
});

// Get all blog categories
router.get('/api/admin/blog-categories', isAdmin, async (req, res) => {
  try {
    const categories = await db.select().from(blogCategories).orderBy(blogCategories.displayOrder);
    return res.json(categories);
  } catch (error) {
    console.error('Error fetching blog categories:', error);
    return res.status(500).json({ error: 'Failed to fetch blog categories' });
  }
});

// Create blog category
router.post('/api/admin/blog-categories', isAdmin, async (req, res) => {
  try {
    const { name, slug, description, displayOrder, active } = req.body;
    const newCategory = await db.insert(blogCategories).values({
      name, slug, description, displayOrder, active
    }).returning();
    return res.json(newCategory[0]);
  } catch (error) {
    console.error('Error creating blog category:', error);
    return res.status(500).json({ error: 'Failed to create blog category' });
  }
});

// Update blog category
router.put('/api/admin/blog-categories/:id', isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, slug, description, displayOrder, active } = req.body;
    const updatedCategory = await db.update(blogCategories)
      .set({ 
        name, 
        slug, 
        description, 
        displayOrder, 
        active, 
        updatedAt: new Date() 
      })
      .where(eq(blogCategories.id, id))
      .returning();

    if (updatedCategory.length === 0) {
      return res.status(404).json({ error: 'Blog category not found' });
    }

    return res.json(updatedCategory[0]);
  } catch (error) {
    console.error('Error updating blog category:', error);
    return res.status(500).json({ error: 'Failed to update blog category' });
  }
});

// Delete blog category
router.delete('/api/admin/blog-categories/:id', isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(blogCategories).where(eq(blogCategories.id, id));
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting blog category:', error);
    return res.status(500).json({ error: 'Failed to delete blog category' });
  }
});

// Toggle blog category active status
router.put('/api/admin/blog-categories/:id/toggle-active', isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { active } = req.body;
    const updatedCategory = await db.update(blogCategories)
      .set({ 
        active, 
        updatedAt: new Date() 
      })
      .where(eq(blogCategories.id, id))
      .returning();

    if (updatedCategory.length === 0) {
      return res.status(404).json({ error: 'Blog category not found' });
    }

    return res.json(updatedCategory[0]);
  } catch (error) {
    console.error('Error toggling blog category status:', error);
    return res.status(500).json({ error: 'Failed to toggle blog category status' });
  }
});

// New endpoint for Gemini AI blog content generation
router.post('/api/admin/blog/gemini-assist', isAdmin, async (req, res) => {
  try {
    const { context } = req.body;
    
    if (!context) {
      return res.status(400).json({ error: 'Context is required for generating blog content' });
    }

    // Create a prompt for generating blog content
    const prompt = `Generate a comprehensive, engaging blog post based on the following context: ${context}. 
    The blog post should include both the main content and a brief excerpt/snippet that can be used as a summary. 
    
    Format your response as JSON with two fields: 'content' for the full blog post and 'snippet' for a brief 
    summary (3-5 sentences). The content should be formatted in Markdown.
    
    IMPORTANT: Return ONLY the raw JSON object. DO NOT wrap the JSON in markdown code blocks or any other formatting.
    The response should be a valid JSON object that can be directly parsed, starting with { and ending with }.
    
    Example of expected format:
    {
      "content": "# Blog Title\\n\\nContent paragraphs here...",
      "snippet": "Brief summary of the blog post in 3-5 sentences."
    }`;

    // Call Gemini service to generate content
    const result = await geminiService.generateBlogContent(prompt, req, res);

    if (result.success) {
      return res.json({ response: result.response });
    } else {
      return res.status(500).json({ error: result.response || 'Failed to generate blog content' });
    }
  } catch (error: any) {
    console.error('Error generating blog content:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate blog content' });
  }
});

export default router; 