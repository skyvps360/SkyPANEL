import { Table, TableHead, TableHeader, TableRow, TableCell, TableBody } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { AlertCircle, Check, Clock, ExternalLink } from "lucide-react";
import { useLocation } from "wouter";
import { getBrandColors } from "@/lib/brand-theme";
import { useMemo, useState, useEffect } from "react";

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface Ticket {
  id: number;
  userId: number;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

interface TicketListProps {
  tickets: Ticket[];
  searchQuery?: string;
  onSelectTicket?: (ticket: Ticket) => void;
  brandColors?: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
  };
}

export function TicketList({ 
  tickets, 
  searchQuery = "", 
  onSelectTicket,
  brandColors: providedBrandColors
}: TicketListProps) {
  const [, navigate] = useLocation();
  const [isMobile, setIsMobile] = useState(false);
  
  // Check if we're on mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is typical md breakpoint
    };
    
    // Initial check
    checkIfMobile();
    
    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);
  
  // Use provided brand colors or defaults
  const defaultBrandColors = {
    primaryColor: "2563eb", // Default blue
    secondaryColor: "10b981", // Default green
    accentColor: "f59e0b" // Default amber
  };
  
  const brandColors = useMemo(() => getBrandColors(providedBrandColors || defaultBrandColors), [providedBrandColors]);
  
  // Function to highlight text that matches the search query
  const highlightText = (text: string) => {
    if (!searchQuery.trim()) return text;
    
    const regex = new RegExp(`(${searchQuery.trim()})`, 'gi');
    const parts = text.split(regex);
    
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <span key={i} className="bg-yellow-200 text-black font-medium px-1 rounded">
              {part}
            </span>
          ) : (
            part
          )
        )}
      </>
    );
  };
  
  // Function to determine the status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" style={{ color: brandColors.accent.dark }} />;
      case "in_progress":
      case "in-progress":
        return <Clock className="h-4 w-4" style={{ color: brandColors.primary.dark }} />;
      case "closed":
        return <Check className="h-4 w-4" style={{ color: brandColors.secondary.dark }} />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  // Function to determine the status badge style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge 
            variant="outline" 
            style={{
              backgroundColor: brandColors.accent.light,
              color: brandColors.accent.dark,
              borderColor: brandColors.accent.border
            }}
          >
            Open
          </Badge>
        );
      case "in_progress":
      case "in-progress":
        return (
          <Badge 
            variant="outline" 
            style={{
              backgroundColor: brandColors.primary.light,
              color: brandColors.primary.dark,
              borderColor: brandColors.primary.border
            }}
          >
            In Progress
          </Badge>
        );
      case "closed":
        return (
          <Badge 
            variant="outline" 
            style={{
              backgroundColor: brandColors.secondary.light,
              color: brandColors.secondary.dark,
              borderColor: brandColors.secondary.border
            }}
          >
            Closed
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Function to determine the priority badge style
  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return (
          <Badge 
            style={{
              backgroundColor: brandColors.accent.light,
              color: brandColors.accent.dark,
            }}
          >
            High
          </Badge>
        );
      case "medium":
        return (
          <Badge 
            style={{
              backgroundColor: brandColors.primary.light,
              color: brandColors.primary.dark,
            }}
          >
            Medium
          </Badge>
        );
      case "low":
        return (
          <Badge 
            style={{
              backgroundColor: brandColors.secondary.light,
              color: brandColors.secondary.dark,
            }}
          >
            Low
          </Badge>
        );
      default:
        return <Badge>{priority}</Badge>;
    }
  };

  // Handle click on a ticket row
  const handleTicketClick = (ticket: Ticket) => {
    if (onSelectTicket) {
      // Use the callback if provided (for backwards compatibility)
      onSelectTicket(ticket);
    } else {
      // Otherwise, navigate to the ticket detail page
      navigate(`/admin/tickets/${ticket.id}`);
    }
  };

  // Render desktop table view
  const renderTableView = () => (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">ID</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>User</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow
              key={ticket.id}
              className="cursor-pointer hover:bg-muted"
              onClick={() => handleTicketClick(ticket)}
            >
              <TableCell className="font-medium">#{ticket.id}</TableCell>
              <TableCell className="max-w-xs truncate">{highlightText(ticket.subject)}</TableCell>
              <TableCell>{highlightText(ticket.user?.fullName || `User #${ticket.userId}`)}</TableCell>
              <TableCell>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(ticket.status)}
                  <span>{getStatusBadge(ticket.status)}</span>
                </div>
              </TableCell>
              <TableCell>{getPriorityBadge(ticket.priority || "medium")}</TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(ticket.createdAt), "MMM d, yyyy")}
              </TableCell>
              <TableCell>
                <div 
                  className="flex items-center justify-center" 
                  onClick={(e) => {
                    e.stopPropagation(); // Prevent triggering the row click
                    navigate(`/admin/tickets/${ticket.id}`);
                  }}
                >
                  <ExternalLink 
                    className="h-4 w-4 text-gray-400 hover:text-primary transition-colors" 
                    style={{ color: brandColors.primary.medium }}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
  
  // Render mobile card view
  const renderCardView = () => (
    <div className="space-y-4">
      {tickets.map((ticket) => (
        <Card
          key={ticket.id}
          className="cursor-pointer hover:bg-muted transition-colors"
          onClick={() => handleTicketClick(ticket)}
        >
          <CardContent className="p-4">
            <div className="space-y-3">
              {/* Top row with ID, Status and Priority */}
              <div className="flex justify-between items-center">
                <div className="font-medium text-sm">#{ticket.id}</div>
                <div className="flex space-x-2">
                  {getPriorityBadge(ticket.priority || "medium")}
                  {getStatusBadge(ticket.status)}
                </div>
              </div>
              
              {/* Subject row */}
              <div className="text-sm font-semibold">
                {highlightText(ticket.subject)}
              </div>
              
              {/* User row */}
              <div className="text-sm text-muted-foreground">
                {highlightText(ticket.user?.fullName || `User #${ticket.userId}`)}
              </div>
              
              {/* Date and view button row */}
              <div className="flex justify-between items-center pt-2 border-t mt-2">
                <div className="text-xs text-muted-foreground">
                  {format(new Date(ticket.createdAt), "MMM d, yyyy")}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/tickets/${ticket.id}`);
                  }}
                  style={{ 
                    borderColor: brandColors.primary.border,
                    color: brandColors.primary.hex
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <>
      {/* Desktop view */}
      <div className="hidden md:block">
        {renderTableView()}
      </div>
      
      {/* Mobile view */}
      <div className="md:hidden">
        {renderCardView()}
      </div>
    </>
  );
}