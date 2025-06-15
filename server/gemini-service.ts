import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Request, Response } from 'express';
import { geminiRateLimiter } from './gemini-rate-limiter';
import { db } from './db';
import { docs, blogPosts } from '@shared/schemas';
import { sql, desc, ilike, or } from 'drizzle-orm';

/**
 * Service for interacting with Google's Gemini AI API
 * Rate limiting is applied based on Google's usage limits:
 * - 15 requests per minute (RPM)
 * - 1,500 requests per day (RPD)
 */
export class GeminiService {
  private static instance: GeminiService;
  private genAI: GoogleGenerativeAI | null = null;
  private isConfigured: boolean = false;

  private constructor() {
    this.initialize();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): GeminiService {
    if (!GeminiService.instance) {
      GeminiService.instance = new GeminiService();
    }
    return GeminiService.instance;
  }

  /**
   * Initialize the service with API key from environment
   */
  public initialize(): boolean {
    try {
      // Try both environment variable names for backward compatibility
      const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        console.log('Neither GOOGLE_AI_API_KEY nor GEMINI_API_KEY found in environment variables');
        this.isConfigured = false;
        return false;
      }

      // Initialize with just API key
      this.genAI = new GoogleGenerativeAI(apiKey);
      this.isConfigured = true;

      // Log success
      console.log('Gemini AI service initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Gemini AI service:', error);
      this.isConfigured = false;
      return false;
    }
  }

  /**
   * Check if the service is configured
   */
  public isReady(): boolean {
    // Debug the state
    console.log(`Gemini service state - isConfigured: ${this.isConfigured}, genAI available: ${!!this.genAI}`);

    // If API keys are in env, force to true for consistent behavior
    const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (apiKey) {
      // Ensure the service is initialized if keys are available
      if (!this.isConfigured || !this.genAI) {
        console.log("API keys available but service not initialized, attempting to initialize now");
        this.initialize();
      }
      return true;
    }

    return this.isConfigured && !!this.genAI;
  }

  /**
   * Check if a question is asking about the AI's identity
   * @param question The question from the user
   * @returns True if it's an identity question
   */
  private isIdentityQuestion(question: string): boolean {
    const identityPatterns = [
      /who are you/i,
      /what are you/i,
      /tell me about yourself/i,
      /what's your name/i,
      /what is your name/i,
      /your identity/i,
      /identify yourself/i,
      /who created you/i,
      /who made you/i
    ];

    return identityPatterns.some(pattern => pattern.test(question));
  }

  /**
   * Get a fixed identity response for the AI
   * @returns A consistent identity statement
   */
  private getIdentityResponse(): string {
    const companyName = process.env.COMPANY_NAME || "";
    return `I am SkyAI, a virtual assistant created by ${companyName} to help with questions about our VPS hosting services. I can answer questions about our hosting plans, features, and provide basic technical support. For more complex issues, I can help guide you to our support ticket system.

- SkyAI`;
  }
  /**
   * Filter AI responses to ensure consistent identity
   * @param response The raw response from the AI
   * @returns The filtered response
   */
  private filterAIResponse(response: string): string {
    const companyName = process.env.COMPANY_NAME || "";

    // Replace generic AI introductions with our branded identity
    const genericIntros = [
      /I am (a|an) (large language model|AI assistant|artificial intelligence|AI|language model)( trained by | from | developed by |, trained by )?(Google|Anthropic|OpenAI)?\.?/gi,
      /As (a|an) (AI language model|AI assistant|artificial intelligence|language model)( trained by | from | developed by |, trained by )?(Google|Anthropic|OpenAI)?\.?/gi,
      /I'm (a|an) (AI assistant|artificial intelligence|AI|language model)( trained by | from | developed by |, trained by )?(Google|Anthropic|OpenAI)?\.?/gi
    ];

    let filteredResponse = response;

    // Replace generic AI identifications
    for (const pattern of genericIntros) {
      filteredResponse = filteredResponse.replace(pattern, `I am ${companyName} AI Helper, a virtual assistant for ${companyName}.`);
    }

    // Ensure the response is signed properly
    if (!filteredResponse.includes(`- ${companyName} AI Helper`)) {
      filteredResponse = filteredResponse.trim() + `\n\n- ${companyName} AI Helper`;
    }

    return filteredResponse;
  }

  /**
   * Search for relevant documentation based on keywords
   * @param keywords Array of keywords to search for
   * @returns Array of relevant documentation
   */
  private async searchDocumentation(keywords: string[]): Promise<Array<{ title: string; content: string }>> {
    try {
      if (keywords.length === 0) return [];

      // Create search conditions for title and content
      const searchConditions = keywords.map(keyword => 
        or(
          ilike(docs.title, `%${keyword}%`),
          ilike(docs.content, `%${keyword}%`)
        )
      );

      const relevantDocs = await db
        .select({
          title: docs.title,
          content: docs.content
        })
        .from(docs)
        .where(or(...searchConditions))
        .orderBy(desc(docs.updatedAt))
        .limit(3); // Limit to top 3 most relevant docs

      return relevantDocs;
    } catch (error: any) {
      console.error('Error searching documentation:', error.message);
      return [];
    }
  }

  /**
   * Search for relevant blog posts based on keywords
   * @param keywords Array of keywords to search for
   * @returns Array of relevant blog posts
   */
  private async searchBlogPosts(keywords: string[]): Promise<Array<{ title: string; content: string }>> {
    try {
      if (keywords.length === 0) return [];

      // Create search conditions for title and content
      const searchConditions = keywords.map(keyword => 
        or(
          ilike(blogPosts.title, `%${keyword}%`),
          ilike(blogPosts.content, `%${keyword}%`)
        )
      );

      const relevantPosts = await db
        .select({
          title: blogPosts.title,
          content: blogPosts.content
        })
        .from(blogPosts)
        .where(or(...searchConditions))
        .orderBy(desc(blogPosts.published))
        .limit(2); // Limit to top 2 most relevant blog posts

      return relevantPosts;
    } catch (error: any) {
      console.error('Error searching blog posts:', error.message);
      return [];
    }
  }

  /**
   * Extract keywords from user prompt for content searching
   * @param prompt The user's prompt
   * @returns Array of relevant keywords
   */
  private extractKeywords(prompt: string): string[] {
    // Convert to lowercase and remove common stop words
    const stopWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'cannot', 'what', 'where', 'when', 'why', 'how', 'who'];
    
    const words = prompt.toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.includes(word))
      .slice(0, 5); // Take first 5 relevant words

    return words;
  }

  /**
   * Format additional context from documentation and blog posts
   * @param docs Array of documentation articles
   * @param blogs Array of blog posts
   * @returns Formatted context string
   */
  private formatAdditionalContext(
    docs: Array<{ title: string; content: string }>,
    blogs: Array<{ title: string; content: string }>
  ): string {
    let context = '';

    if (docs.length > 0) {
      context += '\n\nRELEVANT DOCUMENTATION:\n';
      docs.forEach((doc, index) => {
        // Truncate content to prevent token limit issues
        const truncatedContent = doc.content.length > 500 
          ? doc.content.substring(0, 500) + '...' 
          : doc.content;
        context += `${index + 1}. ${doc.title}\n${truncatedContent}\n\n`;
      });
    }

    if (blogs.length > 0) {
      context += '\nRELEVANT BLOG POSTS:\n';
      blogs.forEach((blog, index) => {
        // Truncate content to prevent token limit issues
        const truncatedContent = blog.content.length > 300 
          ? blog.content.substring(0, 300) + '...' 
          : blog.content;
        context += `${index + 1}. ${blog.title}\n${truncatedContent}\n\n`;
      });
    }

    return context;
  }

  /**
   * Generate a suggested response for a support ticket
   * @param ticketSubject The ticket subject
   * @param ticketMessages Array of messages in the ticket
   * @param additionalContext Additional context about the ticket (optional)
   * @param req Express request object for rate limiting
   * @param res Express response object for rate limiting
   * @returns Generated response or error message
   */
  public async generateTicketResponse(
    ticketSubject: string,
    ticketMessages: Array<{ message: string, userId: number, user?: { fullName: string, role: string } }>,
    additionalContext?: string,
    req?: Request,
    res?: Response
  ): Promise<{ success: boolean; response: string }> {
    if (!this.isReady()) {
      return { 
        success: false, 
        response: 'Gemini AI service is not configured. Please add GOOGLE_AI_API_KEY to your environment variables.' 
      };
    }

    // Apply rate limiting if request and response objects are provided
    if (req && res) {
      const rateCheck = geminiRateLimiter.checkUserAllowed(req, res);
      if (!rateCheck.allowed) {
        return {
          success: false,
          response: rateCheck.message || 'Rate limit exceeded. Please try again later.'
        };
      }    }    try {      // Get the best available model dynamically
      const modelName = await this.getBestAvailableModel();
      console.log(`Using model for docs response: ${modelName}`);
      
      const model = this.genAI!.getGenerativeModel(
        { 
          model: modelName,
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        },
        // Request options to specify v1 API
        { apiVersion: "v1" }
      );

      // Get company name from environment or use default
      const companyName = process.env.COMPANY_NAME || "";

      // Format conversation context for the AI
      let prompt = `You are a helpful customer support assistant for a VPS hosting company called ${companyName}.
      You need to analyze the following support ticket conversation and suggest a professional, 
      helpful response from the support agent's perspective.

      Ticket Subject: "${ticketSubject}"
      `;

      if (additionalContext) {
        prompt += `\nAdditional Context: ${additionalContext}\n`;
      }

      prompt += "\nConversation:\n";

      // Add conversation history with clear indicators for users and agents
      ticketMessages.forEach((msg) => {
        const role = msg.user?.role === 'admin' ? 'SUPPORT AGENT' : 'CUSTOMER';
        const name = msg.user?.fullName || `User #${msg.userId}`;
        prompt += `[${role} - ${name}]: ${msg.message}\n`;
      });

      prompt += `\nPlease draft a professional and helpful response addressing the customer's concerns and questions. 
      The response should:
      1. Be concise but thorough
      2. Answer any questions asked in the last message
      3. Provide relevant information from the ticket history
      4. Always mention "${companyName}" at least once in your response
      5. Format the response with markdown for better readability (use bold, italics, lists as appropriate)
      6. Maintain a helpful and professional tone
      7. End with a clear next step, question or action item

      Begin your draft with "As a ${companyName} support team member, " to establish proper branding.

      Draft response:`;

      const result = await model.generateContent(prompt);
      const response = this.filterAIResponse(result.response.text());

      return { success: true, response };
    } catch (error: any) {
      console.error('Error generating ticket response:', error);
      return { 
        success: false, 
        response: `Failed to generate response: ${error.message || 'Unknown error'}` 
      };
    }
  }

  /**
   * Generate a response to a question about documentation
   * @param question The user's question
   * @param docsContent Content from relevant documentation articles
   * @param req Express request object for rate limiting
   * @param res Express response object for rate limiting
   * @returns Generated response or error message
   */
  public async generateDocsResponse(
    question: string,
    docsContent: Array<{ title: string; content: string }>,
    req?: Request,
    res?: Response
  ): Promise<{ success: boolean; response: string }> {
    // This feature has been deprecated - always return a deprecation message
    return {
      success: false,
      response: "The AI documentation assistant has been deprecated."
    };
  }

  /**
   * Generate a response for a direct user question via Discord bot
   * @param question The user's question
   * @param username The Discord username asking the question
   * @param conversationHistory Optional array of previous messages in the conversation
   * @param req Express request object for rate limiting (optional)
   * @param res Express response object for rate limiting (optional)
   * @returns Generated response or error message
   */
  public async generateChatResponse(
    question: string,
    username: string,
    conversationHistory: Array<{role: string, parts: Array<{text: string}>}> = [],
    req?: Request,
    res?: Response
  ): Promise<{ success: boolean; response: string }> {
    if (!this.isReady()) {
      return { 
        success: false, 
        response: 'AI service is not configured. Please contact an administrator.' 
      };
    }

    // Apply rate limiting if request and response objects are provided
    if (req && res) {
      const rateCheck = geminiRateLimiter.checkUserAllowed(req, res);
      if (!rateCheck.allowed) {
        return {
          success: false,
          response: rateCheck.message || 'Rate limit exceeded. Please try again later.'
        };
      }
    }

    try {
      // Check if this is a question about the AI's identity, handle it directly
      if (this.isIdentityQuestion(question)) {
        const identityResponse = this.getIdentityResponse();
        return { success: true, response: identityResponse };      }      // Get the best available model dynamically
      const modelName = await this.getBestAvailableModel();
      console.log(`Using model for chat response: ${modelName}`);
      
      const model = this.genAI!.getGenerativeModel(
        { 
          model: modelName,
          safetySettings: [
            {
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
        },
        { apiVersion: "v1" }
      );      // Get company name from environment or use default
      const companyName = process.env.COMPANY_NAME || "";

      // Extract keywords from the user's question for content searching
      const keywords = this.extractKeywords(question);
      
      // Search for relevant documentation and blog content
      const [relevantDocs, relevantBlogs] = await Promise.all([
        this.searchDocumentation(keywords),
        this.searchBlogPosts(keywords)
      ]);

      // Format additional context from documentation and blog posts
      const additionalContext = this.formatAdditionalContext(relevantDocs, relevantBlogs);

      // Build system prompt with context about the company and services
      let systemPrompt = `IMPORTANT: You are ${companyName}'s AI Helper, a virtual assistant created specifically for ${companyName}. 
      You are NOT a general AI, large language model, or Google product. You are a specialized customer support assistant owned by ${companyName}.

      IDENTITY REQUIREMENTS:
      - ALWAYS introduce yourself as "${companyName}'s AI Helper" when asked who you are
      - NEVER say you are "a large language model" or "an AI trained by Google"
      - NEVER refer to yourself as an AI model, LLM, or similar technical terms
      - If asked about your capabilities, say you are a specialized support assistant for ${companyName}
      - ALWAYS sign your responses with "- ${companyName}'s AI Helper"

      YOUR JOB:
      Your job is to answer questions about our VPS hosting services. Be concise, professional, and helpful.

      ABOUT OUR SERVICES:
      - We offer VPS (Virtual Private Server) hosting with various plans and resources
      - Our plans include flexible resource allocation (CPU, RAM, Storage, Bandwidth)
      - We support various operating systems including Linux distributions
      - We have a control panel for managing servers
      - Users can create, manage, and delete their VPS instances
      - We offer shared network cables at 1Gbps
      - Our pricing starts at $2/month
      - We have a ticket system for technical support

      ENHANCED KNOWLEDGE BASE:
      You have access to our documentation and blog content to provide more detailed and accurate responses.
      ${additionalContext}

      When answering questions:
      1. Be concise and professional
      2. Use information from the documentation and blog posts when relevant
      3. If you don't know the specific answer about our services, suggest contacting support through the ticket system
      4. Don't make up specific features or prices that weren't mentioned above or in the provided content
      5. Always maintain a helpful and supportive tone
      6. For technical questions beyond basic info, suggest creating a support ticket
      7. Always sign your responses with "- ${companyName}'s AI Helper" at the end
      `;

      // Set up basic generation config without system instructions
      const generationConfig = {
        temperature: 0.3, // Slightly higher for more natural responses with additional context
        maxOutputTokens: 1000 // Increased to accommodate additional context
      };      // For Gemini API, we need to handle system context differently
      // We'll prepend the system prompt to the user's question instead of using conversation history
      let chat;
      
      if (conversationHistory.length === 0) {
        // If no conversation history, start fresh chat
        chat = model.startChat({
          generationConfig: generationConfig
        });
        
        // Prepend system prompt to the user's question for context
        const contextualQuestion = `${systemPrompt}\n\nUser Question: ${question}`;
        
        // Track this request for rate limiting
        if (req) {
          geminiRateLimiter.trackUsageForRequest(req);
        }

        const result = await chat.sendMessage(contextualQuestion);
        const response = result.response;
        const responseText = this.filterAIResponse(response.text());

        // Log the successful interaction
        console.log(`Generated chat response for ${username}'s question`);

        return { success: true, response: responseText };
      } else {
        // If we have conversation history, we need to ensure it starts with a user message
        let history = [...conversationHistory];
        
        // If the first message is not from user, we need to restructure
        if (history.length > 0 && history[0].role !== 'user') {
          // Find the first user message and start from there
          const firstUserIndex = history.findIndex(msg => msg.role === 'user');
          if (firstUserIndex > 0) {
            history = history.slice(firstUserIndex);
          } else if (firstUserIndex === -1) {
            // No user messages found, start fresh
            history = [];
          }
        }

        // Start the chat with cleaned history
        chat = model.startChat({
          history: history,
          generationConfig: generationConfig
        });
      }

      // Track this request for rate limiting
      if (req) {
        geminiRateLimiter.trackUsageForRequest(req);
      }

      const result = await chat.sendMessage(question);
      const response = result.response;
      const responseText = this.filterAIResponse(response.text());

      // Log the successful interaction
      console.log(`Generated chat response for ${username}'s question`);

      return { success: true, response: responseText };
    } catch (error: any) {
      console.error('Error generating chat response:', error);
      return { 
        success: false, 
        response: `Sorry, I encountered an error while processing your question: ${error.message}. Please try again later or create a support ticket for assistance.` 
      };
    }
  }

  /**
   * List all available models from the Gemini API
   * @returns Promise with list of available models
   */
  public async listAvailableModels(): Promise<{ success: boolean; models: any[] | null; error?: string }> {
    if (!this.isReady()) {
      return { 
        success: false, 
        models: null,
        error: 'AI service is not configured. Please contact an administrator.' 
      };
    }    try {
      // Use fetch to directly call the Google AI API listModels endpoint
      const apiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      const models = data.models || [];
      
      console.log('Available Gemini models:');
      models.forEach((model: any) => {
        console.log(`- ${model.name} (${model.displayName})`);
      });

      return { 
        success: true, 
        models: models.map((model: any) => ({
          name: model.name,
          displayName: model.displayName,
          description: model.description,
          inputTokenLimit: model.inputTokenLimit,
          outputTokenLimit: model.outputTokenLimit,
          supportedGenerationMethods: model.supportedGenerationMethods
        }))
      };
    } catch (error: any) {
      console.error('Error listing available models:', error);
      return { 
        success: false, 
        models: null,
        error: error.message 
      };
    }
  }

  /**
   * Find the best available model for our use case
   * Prioritizes newer models while ensuring they support generateContent
   * @returns The model name to use
   */
  public async getBestAvailableModel(): Promise<string> {
    const modelsList = await this.listAvailableModels();
    
    if (!modelsList.success || !modelsList.models) {
      console.warn('Could not fetch models list, falling back to gemini-1.5-flash');
      return 'gemini-1.5-flash';
    }

    // Priority order for models (newest/best first)
    const preferredModels = [
      'models/gemini-2.5-flash-preview-05-20',
      'models/gemini-2.0-flash-exp',
      'models/gemini-2.0-flash',
      'models/gemini-1.5-pro',
      'models/gemini-1.5-flash',
    ];

    // Find the first available model from our preferred list
    for (const preferredModel of preferredModels) {
      const foundModel = modelsList.models.find((model: any) => 
        model.name === preferredModel && 
        model.supportedGenerationMethods?.includes('generateContent')
      );
      
      if (foundModel) {
        console.log(`Selected model: ${foundModel.name} (${foundModel.displayName})`);
        return foundModel.name;
      }
    }

    // If none of our preferred models are available, use the first available one that supports generateContent
    const fallbackModel = modelsList.models.find((model: any) => 
      model.supportedGenerationMethods?.includes('generateContent')
    );

    if (fallbackModel) {
      console.log(`Using fallback model: ${fallbackModel.name} (${fallbackModel.displayName})`);
      return fallbackModel.name;
    }

    // Last resort
    console.warn('No suitable models found, falling back to gemini-1.5-flash');
    return 'gemini-1.5-flash';
  }

  /**
   * Test function to list and display available models
   * Call this to see what models are available in your API
   */
  public async testAvailableModels(): Promise<void> {
    console.log('=== Testing Available Gemini Models ===');
    
    const result = await this.listAvailableModels();
    
    if (result.success && result.models) {
      console.log(`Found ${result.models.length} available models:`);
      console.log('');
      
      result.models.forEach((model: any) => {
        console.log(`📋 ${model.name}`);
        console.log(`   Display Name: ${model.displayName}`);
        console.log(`   Description: ${model.description || 'No description'}`);
        console.log(`   Input Token Limit: ${model.inputTokenLimit || 'Unknown'}`);
        console.log(`   Output Token Limit: ${model.outputTokenLimit || 'Unknown'}`);
        console.log(`   Supported Methods: ${model.supportedGenerationMethods?.join(', ') || 'None'}`);
        console.log('');
      });
      
      // Test the best model selection
      const bestModel = await this.getBestAvailableModel();
      console.log(`🎯 Best selected model: ${bestModel}`);
      
    } else {
      console.error('❌ Failed to fetch models:', result.error);
    }
    
    console.log('=== End Test ===');
  }
}

export const geminiService = GeminiService.getInstance();
