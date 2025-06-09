# SkyPANEL AI-Powered Support System

## Overview

SkyPANEL integrates Google Gemini 2.5 Flash for intelligent customer support automation. This system provides AI-generated responses for support tickets, chat interactions, and knowledge base searches while maintaining proper context and brand-specific information.

## Core Components

### Gemini API Integration

- **API Client**: Handles communication with Google's Gemini API
- **Authentication**: Manages API keys and authentication
- **Request Formatting**: Properly structures prompts for optimal responses
- **Response Processing**: Parses and formats AI responses for display

### Conversation Management

- **Context Tracking**: Maintains conversation history for contextual responses
- **Session Management**: Tracks user sessions for continuous conversations
- **Topic Detection**: Identifies conversation topics for better routing
- **Fallback Handling**: Graceful degradation when AI cannot provide answers

### Support Ticket Integration

- **Ticket Analysis**: Analyzes support ticket content for appropriate responses
- **Response Generation**: Creates intelligent responses to common issues
- **Agent Assistance**: Provides suggestions to human support agents
- **Knowledge Base Linking**: Connects responses to relevant knowledge base articles

### Safety & Moderation

- **Content Filtering**: Prevents inappropriate content in AI responses
- **Input Validation**: Validates user input before sending to API
- **Rate Limiting**: Controls API usage to prevent abuse
- **Error Handling**: Manages API failures and fallback mechanisms

## Implementation

### API Client

```typescript
export class GeminiService {
  private apiKey: string;
  private apiUrl: string = 'https://generativelanguage.googleapis.com/v1';
  
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY!;
    
    if (!this.apiKey) {
      console.error('GEMINI_API_KEY is not defined in environment variables');
    }
  }
  
  async generateResponse(options: {
    prompt: string;
    maxTokens?: number;
    temperature?: number;
    systemInstructions?: string;
    conversationHistory?: Message[];
  }): Promise<string> {
    const { 
      prompt, 
      maxTokens = 1024, 
      temperature = 0.7,
      systemInstructions,
      conversationHistory = []
    } = options;
    
    try {
      // Format messages for Gemini API
      const messages = this.formatMessages(
        systemInstructions,
        conversationHistory,
        prompt
      );
      
      const response = await axios.post(
        `${this.apiUrl}/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`,
        {
          contents: messages,
          generationConfig: {
            maxOutputTokens: maxTokens,
            temperature: temperature,
            topP: 0.95,
            topK: 40
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        }
      );
      
      // Extract and return the generated text
      return this.extractResponseText(response.data);
    } catch (error) {
      console.error('Error generating response from Gemini:', error);
      throw new Error('Failed to generate AI response');
    }
  }
  
  private formatMessages(
    systemInstructions?: string,
    history: Message[] = [],
    currentPrompt?: string
  ): any[] {
    const messages: any[] = [];
    
    // Add system instructions if provided
    if (systemInstructions) {
      messages.push({
        role: 'system',
        parts: [{ text: systemInstructions }]
      });
    }
    
    // Add conversation history
    for (const message of history) {
      messages.push({
        role: message.role === 'user' ? 'user' : 'model',
        parts: [{ text: message.content }]
      });
    }
    
    // Add current prompt if provided
    if (currentPrompt) {
      messages.push({
        role: 'user',
        parts: [{ text: currentPrompt }]
      });
    }
    
    return messages;
  }
  
  private extractResponseText(response: any): string {
    try {
      return response.candidates[0].content.parts[0].text;
    } catch (error) {
      console.error('Error extracting response text:', error);
      return '';
    }
  }
}
```

### Ticket Response Generation

```typescript
export async function generateTicketResponse(
  ticketContent: string,
  ticketHistory: TicketMessage[],
  userData: UserData
): Promise<string> {
  const geminiService = new GeminiService();
  
  // Create system instructions with branding
  const systemInstructions = `
    You are an AI assistant for ${userData.companyName || 'SkyPANEL'}, a hosting provider.
    Your name is ${userData.brandedAiName || 'Support AI'}.
    Be professional, helpful, and concise in your responses.
    Focus on technical accuracy for VPS and hosting-related questions.
    When you don't know an answer, acknowledge this and suggest contacting human support.
    Include knowledge about VirtFusion, DNS management, and hosting services.
  `;
  
  // Format ticket history for context
  const conversationHistory = ticketHistory.map(message => ({
    role: message.isFromStaff ? 'assistant' : 'user',
    content: message.content
  }));
  
  // Generate the response
  try {
    const response = await geminiService.generateResponse({
      prompt: ticketContent,
      systemInstructions,
      conversationHistory,
      maxTokens: 500,
      temperature: 0.7
    });
    
    return response;
  } catch (error) {
    console.error('Error generating ticket response:', error);
    return 'I apologize, but I encountered an error while generating a response. Please try again or contact our support team for assistance.';
  }
}
```

### Live Chat Integration

```typescript
export function AIAssistantChat({ userId }: { userId: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { data: userData } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUserData(userId)
  });
  
  const sendMessage = async (content: string) => {
    // Add user message to chat
    const userMessage: ChatMessage = {
      id: uuidv4(),
      content,
      sender: 'user',
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    try {
      // Generate AI response
      const aiResponse = await generateChatResponse(
        content,
        messages,
        userData || {}
      );
      
      // Add AI response to chat
      const aiMessage: ChatMessage = {
        id: uuidv4(),
        content: aiResponse,
        sender: 'ai',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error in AI chat:', error);
      
      // Add error message
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        content: 'I apologize, but I encountered an error. Please try again or contact support.',
        sender: 'ai',
        timestamp: new Date(),
        isError: true
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <ChatBubble 
            key={message.id}
            message={message}
            isUser={message.sender === 'user'}
          />
        ))}
        
        {isLoading && <TypingIndicator />}
      </div>
      
      <div className="border-t p-4">
        <ChatInput
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
```

## Common Usage Patterns

### Generating Knowledge Base Suggestions

```typescript
export async function generateKnowledgeBaseSuggestions(query: string): Promise<KnowledgeBaseArticle[]> {
  const geminiService = new GeminiService();
  
  try {
    // First, search for relevant articles in the database
    const relevantArticles = await searchKnowledgeBase(query);
    
    if (relevantArticles.length === 0) {
      // If no articles found, generate a suggested article
      const generatedContent = await geminiService.generateResponse({
        prompt: `Create a helpful knowledge base article about: ${query}. 
                Include technical details and step-by-step instructions if applicable.
                Format the response in markdown.`,
        maxTokens: 1000,
        temperature: 0.5
      });
      
      return [{
        id: 'generated',
        title: `Guide: ${query}`,
        content: generatedContent,
        isGenerated: true
      }];
    }
    
    // If articles were found, return them
    return relevantArticles;
  } catch (error) {
    console.error('Error generating knowledge base suggestions:', error);
    return [];
  }
}
```

### Analyzing Support Ticket Sentiment

```typescript
export async function analyzeTicketSentiment(ticketContent: string): Promise<TicketAnalysis> {
  const geminiService = new GeminiService();
  
  try {
    const analysisPrompt = `
      Analyze the following support ticket content and provide:
      1. The overall sentiment (positive, neutral, negative)
      2. The main issue category (billing, technical, account, feature request, other)
      3. The urgency level (low, medium, high)
      4. A brief summary of the issue
      
      Format the response as JSON.
      
      Ticket content: "${ticketContent}"
    `;
    
    const response = await geminiService.generateResponse({
      prompt: analysisPrompt,
      maxTokens: 500,
      temperature: 0.2
    });
    
    // Parse the JSON response
    try {
      return JSON.parse(response);
    } catch (jsonError) {
      console.error('Error parsing sentiment analysis JSON:', jsonError);
      return {
        sentiment: 'neutral',
        category: 'other',
        urgency: 'medium',
        summary: 'Unable to analyze ticket content'
      };
    }
  } catch (error) {
    console.error('Error analyzing ticket sentiment:', error);
    return {
      sentiment: 'neutral',
      category: 'other',
      urgency: 'medium',
      summary: 'Error analyzing ticket'
    };
  }
}
```

### Enhancing Human Agent Responses

```typescript
export async function enhanceAgentResponse(
  agentDraft: string,
  ticketContent: string,
  userData: UserData
): Promise<string> {
  const geminiService = new GeminiService();
  
  try {
    const enhancementPrompt = `
      Improve the following support agent response to make it more:
      - Professional and courteous
      - Clear and concise
      - Technically accurate
      - Helpful and solution-oriented
      
      Maintain the core information and solutions provided by the agent.
      Use ${userData.companyName || 'SkyPANEL'}'s brand voice.
      
      Original ticket: "${ticketContent}"
      
      Agent draft response: "${agentDraft}"
    `;
    
    return await geminiService.generateResponse({
      prompt: enhancementPrompt,
      maxTokens: 800,
      temperature: 0.3
    });
  } catch (error) {
    console.error('Error enhancing agent response:', error);
    return agentDraft; // Return original if enhancement fails
  }
}
```
