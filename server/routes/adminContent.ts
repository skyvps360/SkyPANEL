import type { Express, Request, Response } from "express";
import { z, ZodError } from "zod"; // For potential validation if needed
import { fromZodError } from "zod-validation-error"; // For potential validation if needed
import { storage } from "../storage";
import { db } from "../db"; // For package categories, if those are managed here.
import * as schema from "../../shared/schema"; // For Drizzle schema if directly used.

// Helper functions (copied for now)
function isAdmin(req: Request, res: Response, next: Function) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user && (req.user as any).role === "admin") {
    return next();
  }
  res.status(403).json({ error: "Forbidden: Admin access required" });
}

function handleZodError(error: ZodError, res: Response) { // If Zod is used
  const validationError = fromZodError(error);
  res.status(400).json({ error: validationError.message });
}

const router = (app: Express) => {
  // Admin Blog Category API endpoints
  app.get("/api/admin/blog-categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllBlogCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching admin blog categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // This one seems like a duplicate of the above, but was present in original file. Keeping for now.
  app.get("/api/admin/blog/categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllBlogCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching admin blog/categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/blog-categories/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID" });
      const category = await storage.getBlogCategoryById(id);
      if (!category) return res.status(404).json({ error: "Category not found" });
      res.json(category);
    } catch (error: any) {
      console.error(`Error fetching admin blog category ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/blog-categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const userId = (req.user! as any).id;
      const { name, slug, description, displayOrder } = req.body;
      if (!name || !slug) return res.status(400).json({ error: "Name and slug are required" });
      // Slug generation logic might be needed here if slug is not directly provided or needs uniqueness check
      const category = await storage.createBlogCategory({ name, slug, description, displayOrder: displayOrder || 0, createdBy: userId, updatedBy: userId });
      res.status(201).json(category);
    } catch (error: any) {
      console.error("Error creating admin blog category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/blog-categories/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID" });
      const userId = (req.user! as any).id;
      const category = await storage.getBlogCategoryById(id);
      if (!category) return res.status(404).json({ error: "Category not found" });

      const { name, slug, description, displayOrder, active } = req.body;
      const updates: any = { updatedBy: userId, updatedAt: new Date() }; // Ensure updatedAt is set
      if (name !== undefined) updates.name = name;
      if (slug !== undefined) updates.slug = slug; // Consider slug regeneration/uniqueness
      if (description !== undefined) updates.description = description;
      if (displayOrder !== undefined) updates.displayOrder = displayOrder;
      if (active !== undefined) updates.active = active;

      await storage.updateBlogCategory(id, updates);
      const updatedCategory = await storage.getBlogCategoryById(id);
      res.json(updatedCategory);
    } catch (error: any) {
      console.error(`Error updating admin blog category ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/blog-categories/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) return res.status(400).json({ error: "Invalid category ID" });
      const category = await storage.getBlogCategoryById(id);
      if (!category) return res.status(404).json({ error: "Category not found" });

      // Dissociate posts before deleting category
      const postsInCategory = await storage.getBlogPostsByCategory(id);
      for (const post of postsInCategory) {
        await storage.updateBlogPost(post.id, { categoryId: null });
      }
      await storage.deleteBlogCategory(id);
      res.json({ success: true, message: "Category deleted successfully" });
    } catch (error: any) {
      console.error(`Error deleting admin blog category ${req.params.id}:`, error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Blog Posts
  app.get("/api/admin/blog", isAdmin, async (req: Request, res: Response) => {
    try {
      const posts = await storage.getBlogPostsWithCategories(true); // true for include unpublished
      res.json(posts);
    } catch (error: any) {
      console.error("Error fetching admin blog posts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/blog/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ error: "Invalid post ID" });
      const post = await storage.getBlogPostById(postId); // This should fetch regardless of published status for admin
      if (!post) return res.status(404).json({ error: "Blog post not found" });
      res.json(post);
    } catch (error: any) {
      console.error("Error fetching admin blog post by ID:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/blog", isAdmin, async (req: Request, res: Response) => {
    try {
      const { title, content, snippet, author, featuredImageUrl, excerpt, tags, categoryId, date, published, displayOrder } = req.body;
      if (!title || !content || !snippet) return res.status(400).json({ error: "Title, content, and snippet are required" });

      let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slug = baseSlug;
      let existingPost = await storage.getBlogPostBySlug(slug);
      if (existingPost) slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

      let postDateObj = date ? new Date(date) : new Date();
      if (isNaN(postDateObj.getTime())) postDateObj = new Date();

      const newPost = await storage.createBlogPost({
        title, slug, content, snippet, author: author || null,
        featuredImageUrl: featuredImageUrl || null, excerpt: excerpt || null, tags: tags || null,
        categoryId: categoryId || null, date: postDateObj,
        published: published === undefined ? false : published,
        displayOrder: displayOrder || 0,
        createdBy: (req.user! as any).id, updatedBy: (req.user! as any).id
      });
      res.status(201).json(newPost);
    } catch (error: any) {
      console.error("Error creating admin blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/blog/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ error: "Invalid post ID" });
      const existingPost = await storage.getBlogPostById(postId);
      if (!existingPost) return res.status(404).json({ error: "Blog post not found" });

      const updates = { ...req.body };
      if (updates.date) {
        try { updates.date = new Date(updates.date); if(isNaN(updates.date.getTime())) updates.date = existingPost.date; }
        catch (err) { updates.date = existingPost.date; }
      }
      if (updates.title && updates.title !== existingPost.title) {
        let baseSlug = updates.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        updates.slug = baseSlug; // Simplified slug update, might need collision check
        let potentialConflict = await storage.getBlogPostBySlug(updates.slug);
        if(potentialConflict && potentialConflict.id !== postId) updates.slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
      }

      await storage.updateBlogPost(postId, { ...updates, updatedBy: (req.user! as any).id, updatedAt: new Date() });
      const updatedPost = await storage.getBlogPostById(postId);
      res.json(updatedPost);
    } catch (error: any) {
      console.error("Error updating admin blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/blog/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const postId = parseInt(req.params.id);
      if (isNaN(postId)) return res.status(400).json({ error: "Invalid post ID" });
      const existingPost = await storage.getBlogPostById(postId);
      if (!existingPost) return res.status(404).json({ error: "Blog post not found" });
      await storage.deleteBlogPost(postId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting admin blog post:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Doc Categories
  app.get("/api/admin/doc-categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const categories = await storage.getAllDocCategories();
      res.json(categories);
    } catch (error: any) {
      console.error("Error fetching admin doc categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/doc-categories", isAdmin, async (req: Request, res: Response) => {
    try {
      const { name, description, displayOrder } = req.body;
      if (!name) return res.status(400).json({ error: "Category name is required" });
      let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slug = baseSlug;
      let existingCategory = await storage.getDocCategoryBySlug(slug);
      if (existingCategory) slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

      const newCategory = await storage.createDocCategory({
        name, slug, description: description || '', displayOrder: displayOrder || 0,
        createdBy: (req.user! as any).id, updatedBy: (req.user! as any).id
      });
      res.status(201).json(newCategory);
    } catch (error: any) {
      console.error("Error creating admin doc category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/doc-categories/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) return res.status(400).json({ error: "Invalid category ID" });
      const existingCategory = await storage.getDocCategoryById(categoryId);
      if (!existingCategory) return res.status(404).json({ error: "Category not found" });

      const { name, description, displayOrder } = req.body;
      const updates: any = {updatedBy: (req.user! as any).id, updatedAt: new Date()};
      if(name !== undefined) updates.name = name;
      // Slug might need update if name changes, similar to post/blog category slug logic
      if (name && name !== existingCategory.name) {
        let baseSlug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        updates.slug = baseSlug;
        let potentialConflict = await storage.getDocCategoryBySlug(updates.slug);
        if(potentialConflict && potentialConflict.id !== categoryId) updates.slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
      }
      if(description !== undefined) updates.description = description;
      if(displayOrder !== undefined) updates.displayOrder = displayOrder;

      await storage.updateDocCategory(categoryId, updates);
      const updatedCategory = await storage.getDocCategoryById(categoryId);
      res.json(updatedCategory);
    } catch (error: any) {
      console.error("Error updating admin doc category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/doc-categories/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) return res.status(400).json({ error: "Invalid category ID" });
      const existingCategory = await storage.getDocCategoryById(categoryId);
      if (!existingCategory) return res.status(404).json({ error: "Category not found" });
      // Dissociate docs before deleting category
      await storage.updateDocsCategoryIdToNull(categoryId);
      await storage.deleteDocCategory(categoryId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting admin doc category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin Docs
  app.get("/api/admin/docs", isAdmin, async (req: Request, res: Response) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const docs = await storage.getAllDocs(true, categoryId); // true for include unpublished
      res.json(docs || []);
    } catch (error: any) {
      console.error("Error fetching admin docs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/docs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const docId = parseInt(req.params.id);
      if (isNaN(docId)) return res.status(400).json({ error: "Invalid doc ID" });
      // Fetch actual doc for admin, not placeholder
      const doc = await storage.getDocById(docId);
      if (!doc) return res.status(404).json({ error: "Document not found" });
      res.json(doc);
    } catch (error: any) {
      console.error("Error fetching admin doc by ID:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/docs", isAdmin, async (req: Request, res: Response) => {
    try {
      const { title, content, published, displayOrder, categoryId } = req.body;
      if (!title || !content) return res.status(400).json({ error: "Title and content are required" });
      let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      let slug = baseSlug;
      let existingDoc = await storage.getDocBySlug(slug);
      if(existingDoc) slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;

      const newDoc = await storage.createDoc({
        title, content, slug, categoryId: categoryId || null,
        published: published || false, displayOrder: displayOrder || 0,
        createdBy: (req.user! as any).id, updatedBy: (req.user! as any).id
      });
      res.status(201).json(newDoc);
    } catch (error: any) {
      console.error("Error creating admin doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/docs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const docId = parseInt(req.params.id);
      if (isNaN(docId)) return res.status(400).json({ error: "Invalid doc ID" });
      const existingDoc = await storage.getDocById(docId);
      if (!existingDoc) return res.status(404).json({ error: "Document not found" });

      const { title, content, published, displayOrder, categoryId } = req.body;
      const updates:any = {updatedBy: (req.user! as any).id, updatedAt: new Date()};
      if(title !== undefined) updates.title = title;
      if (title && title !== existingDoc.title) {
        let baseSlug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        updates.slug = baseSlug;
        let potentialConflict = await storage.getDocBySlug(updates.slug);
        if(potentialConflict && potentialConflict.id !== docId) updates.slug = `${baseSlug}-${Math.floor(Math.random() * 10000)}`;
      }
      if(content !== undefined) updates.content = content;
      if(published !== undefined) updates.published = published;
      if(displayOrder !== undefined) updates.displayOrder = displayOrder;
      if(categoryId !== undefined) updates.categoryId = categoryId;


      await storage.updateDoc(docId, updates);
      const updatedDoc = await storage.getDocById(docId);
      res.json(updatedDoc);
    } catch (error: any) {
      console.error("Error updating admin doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/docs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const docId = parseInt(req.params.id);
      if (isNaN(docId)) return res.status(400).json({ error: "Invalid doc ID" });
      const existingDoc = await storage.getDocById(docId);
      if (!existingDoc) return res.status(404).json({ error: "Document not found" });
      await storage.deleteDoc(docId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("Error deleting admin doc:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin FAQs
  app.get("/api/admin/faqs", isAdmin, async (req: Request, res: Response) => {
    try {
      const faqs = await storage.getAllFaqItems(); // Get all, including inactive
      res.json(faqs);
    } catch (error: any) {
      console.error("Error fetching admin FAQs:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/faqs", isAdmin, async (req: Request, res: Response) => {
    try {
      const { question, answer, category, displayOrder, isActive } = req.body; // Added isActive
      if (!question || !answer) return res.status(400).json({ error: "Question and answer are required" });
      const newFaq = await storage.createFaqItem({
        question, answer, category: category || 'general',
        displayOrder: typeof displayOrder === 'number' ? displayOrder : 0,
        isActive: isActive !== undefined ? isActive : true // Default to true if not provided
      });
      res.status(201).json(newFaq);
    } catch (error: any) {
      console.error("Error creating admin FAQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch("/api/admin/faqs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const faqId = parseInt(req.params.id);
      if (isNaN(faqId)) return res.status(400).json({ error: "Invalid FAQ ID" });
      const existingFaq = await storage.getFaqItemById(faqId);
      if (!existingFaq) return res.status(404).json({ error: "FAQ not found" });

      const { question, answer, category, displayOrder, isActive } = req.body;
      const updateData: Partial<schema.FaqItem> = { updatedAt: new Date() }; // Use schema.FaqItem
      if (question !== undefined) updateData.question = question;
      if (answer !== undefined) updateData.answer = answer;
      if (category !== undefined) updateData.category = category;
      if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
      if (isActive !== undefined) updateData.isActive = isActive;

      const updatedFaq = await storage.updateFaqItem(faqId, updateData);
      res.json(updatedFaq);
    } catch (error: any) {
      console.error("Error updating admin FAQ:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/faqs/:id", isAdmin, async (req: Request, res: Response) => {
    try {
      const faqId = parseInt(req.params.id);
      if (isNaN(faqId)) return res.status(400).json({ error: "Invalid FAQ ID" });
      const existingFaq = await storage.getFaqItemById(faqId);
      if (!existingFaq) return res.status(404).json({ error: "FAQ not found" });
      await storage.deleteFaqItem(faqId);
      res.json({ success: true, message: "FAQ deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting admin FAQ:", error);
      res.status(500).json({ error: error.message });
    }
  });
};

export default router;
