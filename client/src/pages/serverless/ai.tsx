import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Send,
  Bot,
  User,
  Loader2,
  Settings,
  Copy,
  Check,
  Trash2,
  MessageSquare,
  LogOut,
  LogIn,
  ChevronDown,
  Info,
  Sliders
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { getBrandColors } from '@/lib/brand-theme';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface BrandingSettings {
  company_name?: string;
  primary_color?: string;
  secondary_color?: string;
  accent_color?: string;
}

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model?: string;
}

// Group AI models by vendor for better organization
const AI_MODELS_BY_VENDOR = {
  'OpenAI': [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Default)' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'o1', label: 'O1' },
    { value: 'o1-mini', label: 'O1 Mini' },
    { value: 'o1-pro', label: 'O1 Pro' },
    { value: 'o3', label: 'O3' },
    { value: 'o3-mini', label: 'O3 Mini' },
    { value: 'o4-mini', label: 'O4 Mini' },
    { value: 'gpt-4.1', label: 'GPT-4.1' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano' },
    { value: 'gpt-4.5-preview', label: 'GPT-4.5 Preview' },
  ],
  'Anthropic': [
    { value: 'claude-sonnet-4', label: 'Claude Sonnet 4' },
    { value: 'claude-opus-4', label: 'Claude Opus 4' },
    { value: 'claude-3-7-sonnet', label: 'Claude 3.7 Sonnet' },
    { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet' },
  ],
  'Google': [
    { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash' },
    { value: 'google/gemma-2-27b-it', label: 'Gemma 2 27B' },
  ],
  'Meta': [
    { value: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', label: 'Llama 3.1 8B' },
    { value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', label: 'Llama 3.1 70B' },
    { value: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', label: 'Llama 3.1 405B' },
  ],
  'Mistral AI': [
    { value: 'mistral-large-latest', label: 'Mistral Large' },
    { value: 'pixtral-large-latest', label: 'Pixtral Large' },
    { value: 'codestral-latest', label: 'Codestral' },
  ],
  'Others': [
    { value: 'deepseek-chat', label: 'DeepSeek Chat' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
    { value: 'grok-beta', label: 'Grok Beta' },
  ]
};

// Flat list for lookups
const AI_MODELS = Object.entries(AI_MODELS_BY_VENDOR).flatMap(([vendor, models]) => 
  models.map(model => ({ ...model, vendor }))
);

const ServerlessAiPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('gpt-4o-mini');
  const [streamMode, setStreamMode] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [showModelDetails, setShowModelDetails] = useState(false);
  const { user } = useAuth();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  // Fetch branding settings
  const { data: brandingData } = useQuery<BrandingSettings>({
    queryKey: ["/api/settings/branding"],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  });

  // Memoize brand colors to prevent infinite re-renders
  const brandColors = useMemo(() => {
    if (!brandingData) return null;

    return getBrandColors({
      primaryColor: brandingData.primary_color || '2563eb',
      secondaryColor: brandingData.secondary_color || '10b981',
      accentColor: brandingData.accent_color || 'f59e0b'
    });
  }, [
    brandingData?.primary_color,
    brandingData?.secondary_color,
    brandingData?.accent_color
  ]);

  // Apply brand colors only when they change
  useEffect(() => {
    if (brandColors && brandingData) {
      // Import and apply the brand color variables to both CSS variables and Shadcn theme
      import('@/lib/brand-theme').then(({ applyBrandColorVars, applyToShadcnTheme }) => {
        applyBrandColorVars({
          primaryColor: brandingData.primary_color || '2563eb',
          secondaryColor: brandingData.secondary_color || '10b981',
          accentColor: brandingData.accent_color || 'f59e0b'
        });

        // Apply the colors to the Shadcn theme as well
        applyToShadcnTheme(brandColors);
        console.log('Applied brand colors to Shadcn theme in Serverless AI page');
      });
    }
  }, [brandColors, brandingData?.primary_color, brandingData?.secondary_color, brandingData?.accent_color]);

  // Auto-scroll within chat container only when new messages are added
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      const chatContainer = messagesEndRef.current.closest('.overflow-y-auto');
      if (chatContainer) {
        chatContainer.scrollTop = chatContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Load Puter.js SDK
  useEffect(() => {
    // Check if Puter.js is already loaded
    if ((window as any).puter) {
      console.log('Puter.js already loaded');
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://js.puter.com/v2/';
    script.async = true;

    script.onload = () => {
      console.log('Puter.js SDK loaded successfully');
      // Verify the API is available
      if ((window as any).puter && (window as any).puter.ai && (window as any).puter.ai.chat) {
        console.log('Puter.js AI API is ready');
        // Check authentication status
        checkAuthStatus();
      } else {
        console.error('Puter.js loaded but AI API not available');
        toast({
          title: "Error",
          description: "Puter.js AI API not available",
          variant: "destructive",
        });
      }
    };

    script.onerror = () => {
      console.error('Failed to load Puter.js SDK');
      toast({
        title: "Error",
        description: "Failed to load Puter.js SDK. Please refresh the page.",
        variant: "destructive",
      });
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, [toast]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check if Puter is available
      if (typeof window === 'undefined' || !(window as any).puter) {
        throw new Error('Puter.js SDK not loaded. Please refresh the page.');
      }

      const puter = (window as any).puter;
      console.log('Sending message with Puter.js:', { messageContent, selectedModel, streamMode });

      if (streamMode) {
        // Streaming response - exact syntax from Puter.js docs
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          model: selectedModel
        };

        setMessages(prev => [...prev, assistantMessage]);

        // Use exact Puter.js streaming syntax: puter.ai.chat(prompt, { model: 'model', stream: true })
        const response = await puter.ai.chat(messageContent, {
          model: selectedModel,
          stream: true
        });

        console.log('Streaming response received:', response);

        // Stream the response using for await...of as documented
        for await (const part of response) {
          console.log('Stream part:', part);
          if (part && part.text) {
            setMessages(prev => prev.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, content: msg.content + part.text }
                : msg
            ));
          }
        }
      } else {
        // Non-streaming response - exact syntax from Puter.js docs
        console.log('Making non-streaming call...');

        // Use exact Puter.js syntax: puter.ai.chat(prompt, { model: 'model' })
        const response = await puter.ai.chat(messageContent, {
          model: selectedModel
        });

        console.log('Non-streaming response received:', response);

        let responseContent = '';

        // Handle response according to Puter.js documentation
        if (typeof response === 'string') {
          // Direct string response
          responseContent = response;
        } else if (response && typeof response === 'object') {
          // Object response - check for message.content first
          if (response.message && response.message.content) {
            responseContent = response.message.content;
          } else if (response.content) {
            responseContent = response.content;
          } else if (response.text) {
            responseContent = response.text;
          } else {
            // Fallback - stringify the response
            responseContent = JSON.stringify(response);
          }
        } else {
          responseContent = String(response);
        }

        console.log('Parsed response content:', responseContent);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date(),
          model: selectedModel
        };

        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Puter.js API Error:', error);

      let errorMessage = 'Failed to send message. Please try again.';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      toast({
        title: "AI Chat Error",
        description: errorMessage,
        variant: "destructive",
      });

      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Error: ${errorMessage}. Please try again or refresh the page.`,
        timestamp: new Date(),
        model: selectedModel
      };

      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
      toast({
        title: "Copied",
        description: "Message copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy message",
        variant: "destructive",
      });
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const checkAuthStatus = async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).puter) {
        return;
      }

      const puter = (window as any).puter;

      // Check if user is signed in using Puter.js API
      const signedIn = puter.auth.isSignedIn();
      setIsSignedIn(signedIn);

      if (signedIn) {
        // Get user information
        const user = await puter.auth.getUser();
        setUserInfo(user);
        console.log('User is signed in:', user);
      } else {
        setUserInfo(null);
        console.log('User is not signed in');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const loginToPuter = async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).puter) {
        throw new Error('Puter.js SDK not loaded');
      }

      const puter = (window as any).puter;
      console.log('Initiating Puter.js sign in...');

      // Use Puter.js signIn API as documented
      const result = await puter.auth.signIn();
      console.log('Sign in result:', result);

      // Update auth status after successful login
      await checkAuthStatus();

      toast({
        title: "Success",
        description: "Successfully signed in to Puter.com!",
      });
    } catch (error) {
      console.error('Puter.js sign in failed:', error);
      toast({
        title: "Error",
        description: `Sign in failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const signOutPuter = async () => {
    try {
      if (typeof window === 'undefined' || !(window as any).puter) {
        throw new Error('Puter.js SDK not loaded');
      }

      const puter = (window as any).puter;
      console.log('Signing out from Puter...');

      // Use Puter.js sign out API as documented
      puter.auth.signOut();

      // Update auth status after sign out
      setIsSignedIn(false);
      setUserInfo(null);

      toast({
        title: "Signed Out",
        description: "Successfully signed out from Puter.com",
      });
    } catch (error) {
      console.error('Puter.js sign out failed:', error);
      toast({
        title: "Error",
        description: `Sign out failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      e.stopPropagation();
      sendMessage();
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Modern Hero Header matching tickets page */}
        <div className="rounded-2xl bg-card border border-border shadow-md">
          <div className="p-8 md:p-12">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-primary text-primary-foreground shadow-lg">
                    <Bot className="h-6 w-6" />
                  </div>
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                      AI Assistant
                    </h1>
                    <p className="text-muted-foreground text-lg mt-1">
                      Chat with AI using various models
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6 lg:mt-0">
                {!isSignedIn ? (
                  <Button
                    onClick={loginToPuter}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    <LogIn className="h-4 w-4 mr-2" />
                    Sign In to Puter
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={signOutPuter}
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign Out
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Tabs - Only visible on small screens */}
        <div className="block lg:hidden mb-4">
          <Tabs defaultValue="chat" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="chat" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Settings Panel - Hidden on mobile when chat tab is active */}
          <div className={`lg:col-span-1 ${activeTab === 'chat' ? 'hidden lg:block' : 'block'}`}>
            <Card className="shadow-sm">
              <CardHeader className="py-3">
                <CardTitle className="text-lg flex items-center">
                  <Settings className="h-5 w-5 mr-2" />
                  AI Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 p-3">
                {/* Model Selection with Grouped Options */}
                <Collapsible open={true} className="space-y-2">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium">
                    <div className="flex items-center">
                      <Bot className="h-4 w-4 mr-2" />
                      <span>AI Model</span>
                    </div>
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    <Select value={selectedModel} onValueChange={setSelectedModel}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a model" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(AI_MODELS_BY_VENDOR).map(([vendor, models]) => (
                          <SelectGroup key={vendor}>
                            <SelectLabel>{vendor}</SelectLabel>
                            {models.map((model) => (
                              <SelectItem key={model.value} value={model.value}>
                                {model.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-gray-500 flex items-center">
                      <Info className="h-3 w-3 mr-1" />
                      <span>
                        {AI_MODELS.find(m => m.value === selectedModel)?.vendor || 'Unknown'} model
                      </span>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Stream Mode Toggle */}
                <div className="flex items-center justify-between py-2">
                  <Label htmlFor="stream-mode" className="flex items-center text-sm cursor-pointer">
                    <Sliders className="h-4 w-4 mr-2" />
                    Stream responses
                  </Label>
                  <Switch
                    id="stream-mode"
                    checked={streamMode}
                    onCheckedChange={setStreamMode}
                  />
                </div>

                {/* Authentication Section */}
                <Collapsible className="pt-2 border-t">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-2">
                    <span>Authentication</span>
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-2">
                    {userInfo ? (
                      <div className="text-sm text-gray-600 space-y-1 py-1">
                        <p className="flex items-center">
                          <span className="font-medium">Signed in as:</span>
                          <Badge variant="secondary" className="ml-2 text-xs">
                            {userInfo.username}
                          </Badge>
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={signOutPuter}
                          className="w-full mt-2"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loginToPuter}
                        className="w-full"
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        Login to Puter.js
                      </Button>
                    )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Features Section */}
                <Collapsible className="pt-2 border-t">
                  <CollapsibleTrigger className="flex items-center justify-between w-full text-sm font-medium py-2">
                    <span>Features</span>
                    <ChevronDown className="h-4 w-4 transition-transform" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="text-xs text-gray-600 space-y-1 py-1">
                      <ul className="list-disc list-inside space-y-1">
                        <li>28 different AI models</li>
                        <li>Unlimited conversations</li>
                        <li>Streaming responses</li>
                        <li>Copy & share messages</li>
                      </ul>
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Clear Chat Button */}
                <div className="pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChat}
                    className="w-full"
                    disabled={messages.length === 0}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear Chat
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Area - Full width on mobile when chat tab is active */}
          <div className={`lg:col-span-3 ${activeTab === 'settings' ? 'hidden lg:block' : 'block'}`}>
            <Card className="shadow-sm h-[calc(100vh-250px)] flex flex-col">
              <CardHeader className="py-3">
                <CardTitle className="text-lg flex items-center justify-between">
                  <div className="flex items-center">
                    <Bot className="h-5 w-5 mr-2" />
                    <span>AI Chat</span>
                  </div>
                  <span className="text-xs font-normal text-muted-foreground">
                    {selectedModel && (
                      <Badge variant="outline" className="ml-2">
                        {AI_MODELS.find(m => m.value === selectedModel)?.label || selectedModel}
                      </Badge>
                    )}
                  </span>
                </CardTitle>
                <CardDescription>
                  Chat with an AI assistant using the selected model
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-grow overflow-auto p-3">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-16">
                    <Bot className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p>Start a conversation with AI</p>
                    <p className="text-xs mt-1">Try asking: "What is artificial intelligence?"</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] rounded-lg p-3 ${
                          message.role === 'user'
                            ? 'text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                        style={message.role === 'user' ? {
                          backgroundColor: brandColors?.primary.full || '#2563eb'
                        } : {}}
                      >
                        <div className="flex items-start space-x-2">
                          <div className="flex-shrink-0">
                            {message.role === 'user' ? (
                              <User className="h-4 w-4" />
                            ) : (
                              <Bot className="h-4 w-4" />
                            )}
                          </div>
                          <div className="flex-1 text-sm">
                            <div className="whitespace-pre-wrap">{message.content}</div>
                            {message.model && (
                              <div className="text-xs opacity-70 mt-1">
                                {AI_MODELS.find(m => m.value === message.model)?.label}
                              </div>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyMessage(message.content, message.id)}
                            className={`h-5 w-5 p-0 ${
                              message.role === 'user' ? 'text-white hover:bg-white/20' : 'text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {copiedMessageId === message.id ? (
                              <Check className="h-3 w-3" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-100 rounded-lg p-3 max-w-[85%]">
                      <div className="flex items-center space-x-2">
                        <Bot className="h-4 w-4" />
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span className="text-gray-600 text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </CardContent>
              <div className="p-3 border-t">
                <div className="flex items-start gap-2">
                  <Textarea
                    ref={textareaRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type your message..."
                    className="resize-none"
                    rows={2}
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={sendMessage} 
                    size="icon" 
                    className="mt-1"
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    {isLoading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center space-x-2">
                    {messages.length > 0 && (
                      <Button variant="outline" size="sm" onClick={clearChat} disabled={isLoading}>
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear chat
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      <Label htmlFor="stream-mode" className="text-xs">Stream</Label>
                      <Switch
                        id="stream-mode"
                        checked={streamMode}
                        onCheckedChange={setStreamMode}
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">
                  Powered by Puter.js
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default ServerlessAiPage;
