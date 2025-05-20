import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { Request, Response } from 'express';
import { geminiRateLimiter } from './gemini-rate-limiter';

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
      const response = result.response.text();
      
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
}

export const geminiService = GeminiService.getInstance();