import axios from 'axios';
import { storage } from '../storage';

export interface WordPressConfig {
  siteUrl: string;
  apiKey: string;
  username: string;
  password: string;
  isEnabled: boolean;
  autoSync: boolean;
  syncInterval: number; // in minutes
}

export interface WordPressPage {
  id: number;
  title: string;
  content: string;
  slug: string;
  status: 'publish' | 'draft' | 'private';
  modified: string;
  link: string;
}

export interface WordPressPost {
  id: number;
  title: string;
  content: string;
  excerpt: string;
  slug: string;
  status: 'publish' | 'draft' | 'private';
  categories: string[];
  tags: string[];
  author: string;
  date: string;
  modified: string;
  link: string;
}

export interface WordPressUser {
  id: number;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  registered: string;
}

export class WordPressService {
  private config: WordPressConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    try {
      const siteUrl = await storage.getSetting('wordpress_site_url');
      const apiKey = await storage.getSetting('wordpress_api_key');
      const username = await storage.getSetting('wordpress_username');
      const password = await storage.getSetting('wordpress_password');
      const isEnabled = await storage.getSetting('wordpress_enabled');
      const autoSync = await storage.getSetting('wordpress_auto_sync');
      const syncInterval = await storage.getSetting('wordpress_sync_interval');

      if (siteUrl && apiKey && username && password) {
        this.config = {
          siteUrl: siteUrl,
          apiKey: apiKey,
          username: username,
          password: password,
          isEnabled: isEnabled === 'true',
          autoSync: autoSync === 'true',
          syncInterval: parseInt(syncInterval) || 60
        };
      }
    } catch (error) {
      console.error('Error loading WordPress config:', error);
    }
  }

  private async getAuthHeaders() {
    if (!this.config) {
      throw new Error('WordPress configuration not loaded');
    }

    // Use Basic Auth with username/password
    const auth = Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64');
    
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'X-API-Key': this.config.apiKey
    };
  }

  async testConnection(): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      await this.loadConfig();
      
      if (!this.config) {
        return { success: false, message: 'WordPress configuration not found' };
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.config.siteUrl}/wp-json/wp/v2/users/me`, {
        headers,
        timeout: 10000
      });

      return {
        success: true,
        message: 'WordPress connection successful',
        data: response.data
      };
    } catch (error: any) {
      console.error('WordPress connection test failed:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Connection failed'
      };
    }
  }

  async getPages(): Promise<WordPressPage[]> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.config.siteUrl}/wp-json/wp/v2/pages`, {
        headers,
        params: {
          per_page: 100,
          status: 'publish'
        }
      });

      return response.data.map((page: any) => ({
        id: page.id,
        title: page.title.rendered,
        content: page.content.rendered,
        slug: page.slug,
        status: page.status,
        modified: page.modified,
        link: page.link
      }));
    } catch (error) {
      console.error('Error fetching WordPress pages:', error);
      throw error;
    }
  }

  async getPosts(): Promise<WordPressPost[]> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.config.siteUrl}/wp-json/wp/v2/posts`, {
        headers,
        params: {
          per_page: 100,
          status: 'publish'
        }
      });

      return response.data.map((post: any) => ({
        id: post.id,
        title: post.title.rendered,
        content: post.content.rendered,
        excerpt: post.excerpt.rendered,
        slug: post.slug,
        status: post.status,
        categories: post.categories || [],
        tags: post.tags || [],
        author: post.author.toString(),
        date: post.date,
        modified: post.modified,
        link: post.link
      }));
    } catch (error) {
      console.error('Error fetching WordPress posts:', error);
      throw error;
    }
  }

  async createPage(pageData: {
    title: string;
    content: string;
    slug?: string;
    status?: 'publish' | 'draft' | 'private';
  }): Promise<WordPressPage> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${this.config.siteUrl}/wp-json/wp/v2/pages`, {
        title: pageData.title,
        content: pageData.content,
        slug: pageData.slug,
        status: pageData.status || 'publish'
      }, { headers });

      return {
        id: response.data.id,
        title: response.data.title.rendered,
        content: response.data.content.rendered,
        slug: response.data.slug,
        status: response.data.status,
        modified: response.data.modified,
        link: response.data.link
      };
    } catch (error) {
      console.error('Error creating WordPress page:', error);
      throw error;
    }
  }

  async createPost(postData: {
    title: string;
    content: string;
    excerpt?: string;
    slug?: string;
    status?: 'publish' | 'draft' | 'private';
    categories?: number[];
    tags?: number[];
  }): Promise<WordPressPost> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.post(`${this.config.siteUrl}/wp-json/wp/v2/posts`, {
        title: postData.title,
        content: postData.content,
        excerpt: postData.excerpt,
        slug: postData.slug,
        status: postData.status || 'publish',
        categories: postData.categories,
        tags: postData.tags
      }, { headers });

      return {
        id: response.data.id,
        title: response.data.title.rendered,
        content: response.data.content.rendered,
        excerpt: response.data.excerpt.rendered,
        slug: response.data.slug,
        status: response.data.status,
        categories: response.data.categories || [],
        tags: response.data.tags || [],
        author: response.data.author.toString(),
        date: response.data.date,
        modified: response.data.modified,
        link: response.data.link
      };
    } catch (error) {
      console.error('Error creating WordPress post:', error);
      throw error;
    }
  }

  async updatePage(pageId: number, pageData: {
    title?: string;
    content?: string;
    slug?: string;
    status?: 'publish' | 'draft' | 'private';
  }): Promise<WordPressPage> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.put(`${this.config.siteUrl}/wp-json/wp/v2/pages/${pageId}`, pageData, { headers });

      return {
        id: response.data.id,
        title: response.data.title.rendered,
        content: response.data.content.rendered,
        slug: response.data.slug,
        status: response.data.status,
        modified: response.data.modified,
        link: response.data.link
      };
    } catch (error) {
      console.error('Error updating WordPress page:', error);
      throw error;
    }
  }

  async updatePost(postId: number, postData: {
    title?: string;
    content?: string;
    excerpt?: string;
    slug?: string;
    status?: 'publish' | 'draft' | 'private';
    categories?: number[];
    tags?: number[];
  }): Promise<WordPressPost> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.put(`${this.config.siteUrl}/wp-json/wp/v2/posts/${postId}`, postData, { headers });

      return {
        id: response.data.id,
        title: response.data.title.rendered,
        content: response.data.content.rendered,
        excerpt: response.data.excerpt.rendered,
        slug: response.data.slug,
        status: response.data.status,
        categories: response.data.categories || [],
        tags: response.data.tags || [],
        author: response.data.author.toString(),
        date: response.data.date,
        modified: response.data.modified,
        link: response.data.link
      };
    } catch (error) {
      console.error('Error updating WordPress post:', error);
      throw error;
    }
  }

  async deletePage(pageId: number): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      await axios.delete(`${this.config.siteUrl}/wp-json/wp/v2/pages/${pageId}`, { headers });
      return true;
    } catch (error) {
      console.error('Error deleting WordPress page:', error);
      throw error;
    }
  }

  async deletePost(postId: number): Promise<boolean> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      await axios.delete(`${this.config.siteUrl}/wp-json/wp/v2/posts/${postId}`, { headers });
      return true;
    } catch (error) {
      console.error('Error deleting WordPress post:', error);
      throw error;
    }
  }

  async getCategories(): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.config.siteUrl}/wp-json/wp/v2/categories`, { headers });

      return response.data.map((category: any) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        count: category.count
      }));
    } catch (error) {
      console.error('Error fetching WordPress categories:', error);
      throw error;
    }
  }

  async getTags(): Promise<Array<{ id: number; name: string; slug: string; count: number }>> {
    try {
      if (!this.config) {
        throw new Error('WordPress configuration not loaded');
      }

      const headers = await this.getAuthHeaders();
      const response = await axios.get(`${this.config.siteUrl}/wp-json/wp/v2/tags`, { headers });

      return response.data.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug,
        count: tag.count
      }));
    } catch (error) {
      console.error('Error fetching WordPress tags:', error);
      throw error;
    }
  }

  async syncContent(): Promise<{ success: boolean; message: string; syncedItems?: number }> {
    try {
      if (!this.config) {
        return { success: false, message: 'WordPress configuration not loaded' };
      }

      // Sync pages and posts
      const pages = await this.getPages();
      const posts = await this.getPosts();

      // Store synced content in local database for caching
      await storage.setSetting('wordpress_synced_pages', JSON.stringify(pages));
      await storage.setSetting('wordpress_synced_posts', JSON.stringify(posts));
      await storage.setSetting('wordpress_last_sync', new Date().toISOString());

      return {
        success: true,
        message: `Successfully synced ${pages.length} pages and ${posts.length} posts`,
        syncedItems: pages.length + posts.length
      };
    } catch (error: any) {
      console.error('Error syncing WordPress content:', error);
      return {
        success: false,
        message: error.message || 'Failed to sync content'
      };
    }
  }

  async getSyncStatus(): Promise<{
    lastSync: string | null;
    totalPages: number;
    totalPosts: number;
    isEnabled: boolean;
    autoSync: boolean;
    syncInterval: number;
  }> {
    try {
      const lastSync = await storage.getSetting('wordpress_last_sync');
      const syncedPages = await storage.getSetting('wordpress_synced_pages');
      const syncedPosts = await storage.getSetting('wordpress_synced_posts');
      const isEnabled = await storage.getSetting('wordpress_enabled');
      const autoSync = await storage.getSetting('wordpress_auto_sync');
      const syncInterval = await storage.getSetting('wordpress_sync_interval');

      const pages = syncedPages ? JSON.parse(syncedPages) : [];
      const posts = syncedPosts ? JSON.parse(syncedPosts) : [];

      return {
        lastSync: lastSync || null,
        totalPages: pages.length,
        totalPosts: posts.length,
        isEnabled: isEnabled === 'true',
        autoSync: autoSync === 'true',
        syncInterval: parseInt(syncInterval) || 60
      };
    } catch (error) {
      console.error('Error getting WordPress sync status:', error);
      return {
        lastSync: null,
        totalPages: 0,
        totalPosts: 0,
        isEnabled: false,
        autoSync: false,
        syncInterval: 60
      };
    }
  }
}

export const wordpressService = new WordPressService(); 