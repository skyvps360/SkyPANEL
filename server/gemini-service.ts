import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Request, Response } from 'express';
import { geminiRateLimiter } from './gemini-rate-limiter';

/**
 * Service for interacting with Google's Gemini AI API
 * Rate limiting is applied based on Google's usage limits:
 * - 15 requests per minute (RPM)
 * - 1,5      const result = await chat.sendMessage(question);
      const response = result.response;
      let responseText = response.text();
      
      // Apply filtering to enforce AI identity
      responseText = this.filterAIResponse(responseText);
      
      // Log the successful interaction
      console.log(`Generated chat response for ${username}'s question`);
      
      return { success: true, response: responseText };sts per day (RPD)
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
    const companyName = process.env.COMPANY_NAME || "SkyVPS360";
    return `I am SkyVPS360 AI Helper, a virtual assistant created by ${companyName} to help with questions about our VPS hosting services. I can answer questions about our hosting plans, features, and provide basic technical support. For more complex issues, I can help guide you to our support ticket system.

- SkyVPS360 AI Helper`;
  }

  /**
   * Filter AI responses to ensure consistent identity
   * @param response The raw response from the AI
   * @returns The filtered response
   */
  private filterAIResponse(response: string): string {
    const companyName = process.env.COMPANY_NAME || "SkyVPS360";
    
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
      }
    }

    try {
      // Initialize model with v1 API version specified and use gemini-1.5-flash
      const model = this.genAI!.getGenerativeModel(
        { 
          model: "gemini-1.5-flash",
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
      const companyName = process.env.COMPANY_NAME || "SkyVPS360";

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
    conversationHistory: Array<{role: string, content: string}> = [],
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
        return { success: true, response: identityResponse };
      }
      
      // Initialize model with same settings as ticket response generation
      const model = this.genAI!.getGenerativeModel(
        { 
          model: "gemini-1.5-flash",
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
      );

      // Get company name from environment or use default
      const companyName = process.env.COMPANY_NAME || "SkyVPS360";

      // Build system prompt with context about the company and services
      let systemPrompt = `IMPORTANT: You are SkyVPS360 AI Helper, a virtual assistant created specifically for ${companyName}. 
      You are NOT a general AI, large language model, or Google product. You are a specialized customer support assistant owned by ${companyName}.
      
      IDENTITY REQUIREMENTS:
      - ALWAYS introduce yourself as "SkyVPS360 AI Helper" when asked who you are
      - NEVER say you are "a large language model" or "an AI trained by Google"
      - NEVER refer to yourself as an AI model, LLM, or similar technical terms
      - If asked about your capabilities, say you are a specialized support assistant for ${companyName}
      - ALWAYS sign your responses with "- SkyVPS360 AI Helper"
      
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
      
      When answering questions:
      1. Be concise and professional
      2. If you don't know the specific answer about our services, suggest contacting support through the ticket system
      3. Don't make up specific features or prices that weren't mentioned above
      4. Always maintain a helpful and supportive tone
      5. For technical questions beyond basic info, suggest creating a support ticket
      6. Always sign your responses with "- SkyVPS360 AI Helper" at the end
      `;

      // Set up basic generation config without system instructions
      const generationConfig = {
        temperature: 0.2,
        maxOutputTokens: 800
      };
      
      // For Gemini API, we need a different approach to handle system context
      // Instead of using systemInstruction, we'll add the prompt as a model message
      // at the beginning of the conversation if there's no existing conversation
      let history = [...conversationHistory]; // Make a copy to avoid modifying the original
      
      // If the conversation is empty or just starting, add our system context
      // as the first message from the model
      if (history.length === 0) {
        history.unshift({
          role: "model",
          parts: [{text: systemPrompt}]
        });
      }
      
      // Start the chat with history including system prompt
      let chat = model.startChat({
        history: history,
        generationConfig: generationConfig
      });
      
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
}

export const geminiService = GeminiService.getInstance();