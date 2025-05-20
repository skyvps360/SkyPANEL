import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, 
  Info, 
  AlertTriangle, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  Eye,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  deleteNotification 
} from "@/lib/api";
import { cn } from "@/lib/utils";

type Notification = {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  read: boolean;
  link?: string;
  createdAt: string;
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['/api/notifications'],
    queryFn: () => getNotifications(),
    staleTime: 30 * 1000, // 30 seconds
  });
  
  const notifications: Notification[] = Array.isArray(notificationsData) ? notificationsData : [];
  
  // Filter notifications based on active tab
  const filteredNotifications = notifications.filter(notification => {
    if (activeTab === "all") return true;
    if (activeTab === "unread") return !notification.read;
    return notification.type === activeTab;
  });
  
  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
      toast({
        title: "Notification marked as read",
        description: "The notification has been marked as read."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not mark notification as read.",
        variant: "destructive"
      });
    }
  });
  
  // Mark all notifications as read
  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllNotificationsAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread/count'] });
      toast({
        title: "All notifications marked as read",
        description: "All notifications have been marked as read."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not mark all notifications as read.",
        variant: "destructive"
      });
    }
  });
  
  // Delete notification
  const deleteNotificationMutation = useMutation({
    mutationFn: (id: number) => deleteNotification(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: "Notification deleted",
        description: "The notification has been deleted."
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Could not delete notification.",
        variant: "destructive"
      });
    }
  });
  
  // Helper function to get appropriate icon based on notification type
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return <Info className="h-5 w-5 text-primary" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-alert" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-accent" />;
      default:
        return <Info className="h-5 w-5 text-primary" />;
    }
  };
  
  // Helper function to get appropriate background color based on notification type
  const getNotificationBg = (type: string) => {
    switch (type) {
      case 'info':
        return "bg-primary bg-opacity-10";
      case 'warning':
        return "bg-amber-500 bg-opacity-10";
      case 'error':
        return "bg-alert bg-opacity-10";
      case 'success':
        return "bg-accent bg-opacity-10";
      default:
        return "bg-primary bg-opacity-10";
    }
  };
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <Button
            variant="outline"
            onClick={() => markAllAsReadMutation.mutate()}
            disabled={markAllAsReadMutation.isPending || notifications.every(n => n.read) || notifications.length === 0}
          >
            {markAllAsReadMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Mark all as read
          </Button>
        </div>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Your Notifications</CardTitle>
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-5">
                <TabsTrigger value="all" className="px-3">
                  All
                  <Badge className="ml-2 bg-gray-200 text-gray-700">{notifications.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="unread" className="px-3">
                  Unread
                  <Badge className="ml-2 bg-alert text-white">{notifications.filter(n => !n.read).length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="info" className="px-3">Info</TabsTrigger>
                <TabsTrigger value="warning" className="px-3">Warning</TabsTrigger>
                <TabsTrigger value="error" className="px-3">Error</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredNotifications.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                <Bell className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                <p>No notifications found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredNotifications.map((notification) => (
                  <div key={notification.id} className={cn(
                    "p-4 rounded-lg transition-colors",
                    notification.read ? "bg-gray-50" : "bg-white border border-gray-200 shadow-sm",
                  )}>
                    <div className="flex items-start">
                      <div className={cn("flex-shrink-0 rounded-full p-2 mr-3", getNotificationBg(notification.type))}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <h4 className={cn(
                            "text-sm font-semibold",
                            !notification.read && "text-black"
                          )}>
                            {notification.title}
                          </h4>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </span>
                        </div>
                        <p className={cn(
                          "text-sm mt-1",
                          notification.read ? "text-gray-500" : "text-gray-700"
                        )}>
                          {notification.message}
                        </p>
                        <div className="flex gap-2 mt-2">
                          {!notification.read && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => markAsReadMutation.mutate(notification.id)}
                              disabled={markAsReadMutation.isPending}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Mark as read
                            </Button>
                          )}
                          {notification.link && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              asChild
                            >
                              <a href={notification.link} target="_blank" rel="noopener noreferrer">
                                View details
                              </a>
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="ml-auto text-alert hover:text-alert"
                            onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            disabled={deleteNotificationMutation.isPending}
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}