import { format } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback } from "react";
import { getBrandColors } from "@/lib/brand-theme";
import { getGravatarUrl, getUserInitials } from "@/lib/avatar-utils";
import axios from "axios";

interface TicketMessage {
  id: number;
  ticketId: number;
  userId: number;
  message: string;
  createdAt: string;
  user?: {
    fullName: string;
    email: string;
    role: string;
  };
}

interface MessageListProps {
  messages: TicketMessage[];
  currentUserId: number;
}

export function MessageList({ messages, currentUserId }: MessageListProps) {
  // Reference to the message container for auto-scrolling
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // State for storing company brand colors
  const [primaryColor, setPrimaryColor] = useState<string>("2563eb"); // Default blue
  const [secondaryColor, setSecondaryColor] = useState<string>("10b981"); // Default green
  const [accentColor, setAccentColor] = useState<string>("f59e0b"); // Default amber
  const [brandColorLoaded, setBrandColorLoaded] = useState<boolean>(false);
  
  // Generate brand colors based on company color
  const brandColors = getBrandColors({
    primaryColor,
    secondaryColor,
    accentColor
  });
  
  // Fetch company brand colors on component mount
  useEffect(() => {
    async function fetchBrandingSettings() {
      try {
        const response = await axios.get('/api/settings/branding');
        
        // Set primary color (with company_color as fallback for backward compatibility)
        if (response.data && (response.data.primary_color || response.data.company_color)) {
          // Remove # if present
          const color = (response.data.primary_color || response.data.company_color).replace('#', '');
          setPrimaryColor(color);
        }
        
        // Set secondary color if available
        if (response.data && response.data.secondary_color) {
          const color = response.data.secondary_color.replace('#', '');
          setSecondaryColor(color);
        }
        
        // Set accent color if available
        if (response.data && response.data.accent_color) {
          const color = response.data.accent_color.replace('#', '');
          setAccentColor(color);
        }
        
        setBrandColorLoaded(true);
      } catch (error) {
        console.error('Failed to load branding settings:', error);
        setBrandColorLoaded(true); // Continue even if settings fail to load
      }
    }
    
    fetchBrandingSettings();
  }, []);
  
  // Sort messages by date ascending
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Function to format basic markdown
  const formatMarkdown = (text: string) => {
    // Format bold text (**text**)
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format italic text (*text*)
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Format code blocks (```code```)
    formattedText = formattedText.replace(/```([\s\S]*?)```/g, '<pre style="overflow-x: auto; max-width: 100%; white-space: pre-wrap; word-break: break-word;"><code>$1</code></pre>');
    
    // Format inline code (`code`)
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code style="overflow-wrap: break-word; word-break: break-word;">$1</code>');
    
    // Format links ([text](url))
    formattedText = formattedText.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    
    // Replace newlines with <br> tags
    formattedText = formattedText.replace(/\n/g, '<br>');
    
    return formattedText;
  };

  // Group adjacent messages by the same user
  const groupedMessages: Array<TicketMessage[]> = [];
  let currentGroup: TicketMessage[] = [];
  let previousUserId: number | null = null;

  sortedMessages.forEach((message) => {
    if (previousUserId !== message.userId && currentGroup.length > 0) {
      groupedMessages.push([...currentGroup]);
      currentGroup = [message];
    } else {
      currentGroup.push(message);
    }
    previousUserId = message.userId;
  });

  if (currentGroup.length > 0) {
    groupedMessages.push(currentGroup);
  }
  
  // Function to scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    if (messagesEndRef.current) {
      const timeoutId = setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, []);

  // Auto-scroll when messages change
  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom();
    }
  }, [messages.length, scrollToBottom]); // Only depend on length, not the entire messages array

  return (
    <div className="space-y-6 w-full overflow-y-auto max-h-[600px] px-4 custom-scrollbar">
      {groupedMessages.map((group, groupIndex) => {
        const isCurrentUser = group[0].userId === currentUserId;
        const isAdmin = group[0].user?.role === "admin";
        
        return (
          <div 
            key={`group-${groupIndex}`}
            className="w-full mb-4"
          >
            {/* Message header with user info and timestamp */}
            <div className={cn(
              "flex items-center mb-1 w-full",
              isCurrentUser ? "justify-end" : "justify-start"
            )}>
              {!isCurrentUser && (
                <Avatar className="h-8 w-8 mr-2">
                  <AvatarImage 
                    src={getGravatarUrl(group[0].user?.email)} 
                    alt={group[0].user?.fullName || `User #${group[0].userId}`} 
                  />
                  <AvatarFallback style={{ 
                    backgroundColor: isAdmin ? brandColors.primary.full : '#6b7280'
                  }}>
                    {getUserInitials(group[0].user?.fullName)}
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div className="flex items-center">
                <span className="text-sm font-medium">
                  {group[0].user?.fullName || `User #${group[0].userId}`}
                  {isAdmin && (
                    <span 
                      className="ml-2 text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: brandColors.primary.full }}
                    >
                      Admin
                    </span>
                  )}
                </span>
                <span className="text-xs text-gray-500 mx-2">•</span>
                <span className="text-xs text-gray-500">
                  {format(new Date(group[0].createdAt), "MMM d, h:mm a")}
                </span>
              </div>
              
              {isCurrentUser && (
                <Avatar className="h-8 w-8 ml-2">
                  <AvatarImage 
                    src={getGravatarUrl(group[0].user?.email)} 
                    alt={group[0].user?.fullName || `User #${group[0].userId}`} 
                  />
                  <AvatarFallback style={{ 
                    backgroundColor: isAdmin ? brandColors.primary.full : '#6b7280'
                  }}>
                    {getUserInitials(group[0].user?.fullName)}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
            
            {/* Message bubbles */}
            <div className={cn(
              "flex flex-col w-full gap-1",
              isCurrentUser ? "items-end" : "items-start"
            )}>
              {group.map((message) => (
                <div 
                  key={message.id} 
                  className={cn(
                    "p-3 rounded-lg shadow-sm max-w-[80%] overflow-hidden",
                    isCurrentUser 
                      ? "rounded-tr-none text-white" 
                      : "rounded-tl-none"
                  )}
                  style={{ 
                    backgroundColor: isCurrentUser 
                      ? brandColors.primary.full
                      : isAdmin
                        ? brandColors.primary.light
                        : '#f3f4f6',
                    color: isCurrentUser ? 'white' : 'inherit',
                    borderLeft: !isCurrentUser && isAdmin ? `3px solid ${brandColors.primary.full}` : 'none',
                    wordWrap: 'break-word',
                    wordBreak: 'break-word'
                  }}
                >
                  <div 
                    className="whitespace-pre-wrap break-words overflow-hidden"
                    style={{ 
                      maxWidth: '100%',
                      overflowWrap: 'break-word',
                      wordBreak: 'break-word',
                      overflow: 'hidden',
                      hyphens: 'auto'
                    }}
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(message.message) }} 
                  />
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {/* Invisible element to scroll to */}
      <div ref={messagesEndRef} style={{ height: "1px", width: "100%" }} />
    </div>
  );
}