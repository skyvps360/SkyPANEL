import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";
import { 
  UserCog, 
  Download, 
  Edit, 
  ShieldAlert, 
  User as UserIcon, 
  Trash2, 
  Power, 
  PowerOff,
  Users,
  Shield,
  UserX,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Plus,
  UserPlus
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { highlightMatch } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getUserAvatar } from "@/lib/avatar-utils";

// Helper function to generate CSV from users data
const generateCSV = (users: User[]): string => {
  const headers = ["ID", "Full Name", "Username", "Email", "Role", "Credits", "Joined"];
  const rows = users.map(user => [
    user.id.toString(),
    user.fullName ?? "",
    user.username ?? "",
    user.email ?? "",
    user.role,
    user.credits?.toString() ?? "0",
    user.createdAt ? new Date(user.createdAt).toLocaleDateString() : ""
  ]);

  return [
    headers.join(","),
    ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(","))
  ].join("\n");
};

// Helper function to download CSV
const downloadCSV = (csv: string, filename: string): void => {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

interface UserOAuthAccount {
  id: number;
  userId: number;
  providerName: string;
  providerUserId: string;
  providerUserEmail?: string;
  providerUserName?: string;
  providerUsername?: string;
  providerEmail?: string;
  providerAvatarUrl?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  credits: number;
  createdAt: string;
  isActive?: boolean;
  virtFusionId?: number | null;
  oauthAccounts?: UserOAuthAccount[];
}

// Statistics Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">
            {description}
          </p>
        )}
        {trend && (
          <div className="flex items-center text-xs mt-1">
            <TrendingUp 
              className={`h-3 w-3 mr-1 ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`} 
            />
            <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
              {trend.isPositive ? '+' : ''}{trend.value}%
            </span>
            <span className="text-muted-foreground ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Loading skeleton for statistics
function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [userStatus, setUserStatus] = useState<boolean>(true); // true = enabled, false = suspended
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Fetch users
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  // Computed statistics and filters
  const statistics = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(user => user.isActive !== false).length;
    const suspendedUsers = users.filter(user => user.isActive === false).length;
    const adminUsers = users.filter(user => user.role === "admin").length;
    const clientUsers = users.filter(user => user.role === "client").length;
    
    // Recent users (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentUsers = users.filter(user => 
      new Date(user.createdAt) > thirtyDaysAgo
    ).length;

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      adminUsers,
      clientUsers,
      recentUsers,
      activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
    };
  }, [users]);

  // Filter users based on search and tab
  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(user => 
        user.fullName?.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query)
      );
    }

    // Apply tab filter
    switch (activeTab) {
      case "active":
        filtered = filtered.filter(user => user.role !== "admin" && user.isActive !== false);
        break;
      case "suspended":
        filtered = filtered.filter(user => user.role !== "admin" && user.isActive === false);
        break;
      case "admins":
        filtered = filtered.filter(user => user.role === "admin");
        break;
      case "clients":
        filtered = filtered.filter(user => user.role === "client");
        break;
      default:
        // "all" - no additional filtering
        break;
    }

    return filtered;
  }, [users, searchQuery, activeTab]);

  // Legacy filtered arrays for backward compatibility
  const admins = users.filter(user => user.role === "admin");
  const activeClients = users.filter(user => user.role !== "admin" && user.isActive !== false);
  const suspendedClients = users.filter(user => user.role !== "admin" && user.isActive === false);

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      return await apiRequest(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        body: { role }
      });
    },
    onSuccess: () => {
      toast({
        title: "Role updated",
        description: `User role has been updated to ${selectedRole}`,
      });
      setRoleDialogOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating role",
        description: error.message || "Failed to update user role",
        variant: "destructive",
      });
    }
  });

  // Update user status mutation (enable/suspend)
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: number; enabled: boolean }) => {
      return await apiRequest(`/api/admin/users/${userId}/status`, {
        method: "PATCH",
        body: { enabled }
      });
    },
    onSuccess: (data) => {
      toast({
        title: userStatus ? "User enabled" : "User suspended",
        description: data.message || `User has been ${userStatus ? "enabled" : "suspended"} successfully`,
      });
      setStatusDialogOpen(false);
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating user status",
        description: error.message || "Failed to update user status",
        variant: "destructive",
      });
    }
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return await apiRequest(`/api/admin/users/${userId}`, {
        method: "DELETE"
      });
    },
    onSuccess: (data) => {
      toast({
        title: "User deleted",
        description: data.message || "User has been deleted successfully",
      });
      setDeleteDialogOpen(false);
      refetch();
    },
    onError: (error: Error & { 
      status?: number; 
      details?: string; 
      serverCount?: number;
    }) => {
      console.error("User deletion error:", error);
      
      // Close the dialog regardless of error type so user can see the toast
      setDeleteDialogOpen(false);

      // Handle specific error cases with detailed user-friendly messages
      if (error.status === 409) {
        // User has active servers - check if we have server count information
        const serverCount = error.serverCount;
        const serverText = serverCount ? `${serverCount} active server${serverCount > 1 ? 's' : ''}` : 'active servers';

        toast({
          title: "Cannot Delete User",
          description: error.details || `This user has ${serverText} in VirtFusion. All servers must be deleted or transferred to another user before the account can be removed. Please manage the user's servers first, then try deleting the account again.`,
          variant: "destructive",
        });
      } else if (error.status === 500 && error.details?.includes("verify server status")) {
        // Cannot verify server status
        toast({
          title: "Server Status Check Failed",
          description: "Unable to verify if the user has active servers in VirtFusion. Deletion was prevented to avoid data synchronization issues. Please try again later.",
          variant: "destructive",
        });
      } else if (error.status === 500 && error.details?.includes("Failed to delete user from VirtFusion")) {
        // VirtFusion deletion failed
        toast({
          title: "VirtFusion Deletion Failed",
          description: "The user could not be deleted from VirtFusion. The user remains in both systems to maintain synchronization. Please check VirtFusion connectivity and try again.",
          variant: "destructive",
        });
      } else if (error.details?.includes("servers") || error.details?.includes("active server")) {
        // Generic server-related error
        toast({
          title: "Cannot Delete User",
          description: error.details || "This user has active servers that must be deleted or transferred before the user account can be removed.",
          variant: "destructive",
        });
      } else {
        // Generic error
        toast({
          title: "Error Deleting User",
          description: error.details || error.message || "Failed to delete user. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  // Handle role change
  const handleRoleChange = () => {
    if (!selectedUser || !selectedRole) return;

    updateRoleMutation.mutate({
      userId: selectedUser.id,
      role: selectedRole
    });
  };

  // Open role dialog
  const openRoleDialog = (user: User) => {
    setSelectedUser(user);
    setSelectedRole(user.role);
    setRoleDialogOpen(true);
  };

  // Open status dialog
  const openStatusDialog = (user: User) => {
    setSelectedUser(user);
    // If user is currently active (isActive is true or undefined), we're going to suspend them (set to false)
    // If user is currently inactive (isActive is false), we're going to enable them (set to true)
    // The userStatus value represents what we want to change TO, not the current state
    setUserStatus(user.isActive === false); // If user is inactive, we want to enable them (userStatus=true)
    setStatusDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (user: User) => {
    setSelectedUser(user);
    setDeleteDialogOpen(true);
  };

  // Handle status change
  const handleStatusChange = () => {
    if (!selectedUser) return;

    updateStatusMutation.mutate({
      userId: selectedUser.id,
      enabled: userStatus
    });
  };

  // Handle user deletion
  const handleDeleteUser = () => {
    if (!selectedUser) return;

    deleteUserMutation.mutate(selectedUser.id);
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (e) {
      return dateString;
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-purple-100 text-purple-800">Admin</Badge>;
      case "client":
        return <Badge className="bg-blue-100 text-blue-800">Client</Badge>;
      default:
        return <Badge>{role}</Badge>;
    }
  };

  // Enhanced table columns with better visuals
  const columns = [
    {
      accessorKey: "fullName" as keyof User,
      header: "User",
      cell: (user: User) => {
        const avatar = getUserAvatar(user, user.oauthAccounts, 40);
        
        return (
          <div className="flex items-center">
            <Avatar className="w-10 h-10 mr-3">
              {avatar.src ? (
                <AvatarImage 
                  src={avatar.src} 
                  alt={user.fullName || user.username} 
                  className="object-cover"
                />
              ) : null}
              <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                {avatar.fallback}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate flex items-center gap-2">
                {searchQuery ? highlightMatch(user.fullName || user.username, searchQuery) : (user.fullName || user.username)}
                {avatar.type === 'discord' && (
                  <div className="w-4 h-4 bg-[#5865F2] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 127.14 96.36" fill="currentColor">
                      <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="text-xs text-muted-foreground truncate">{user.username}</div>
              {user.virtFusionId && (
                <div className="text-xs text-blue-600 font-mono">VF #{user.virtFusionId}</div>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "email" as keyof User,
      header: "Contact",
      cell: (user: User) => (
        <div className="text-sm">
          <div className="truncate max-w-xs">
            {searchQuery ? highlightMatch(user.email, searchQuery) : user.email}
          </div>
          <div className="text-xs text-muted-foreground">
            Joined {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role" as keyof User,
      header: "Role",
      cell: (user: User) => getRoleBadge(user.role),
    },
    {
      accessorKey: "isActive" as keyof User,
      header: "Status",
      cell: (user: User) => (
        user.isActive === false ? (
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100">
            <PowerOff className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
            <Power className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      ),
    },
    {
      accessorKey: "credits" as keyof User,
      header: "Credits",
      cell: (user: User) => (
        <div className="text-right">
          <div className="font-mono text-sm font-medium">
            ${user.credits?.toFixed(2) || '0.00'}
          </div>
        </div>
      ),
    },
  ];

  // Actions for each user
  const renderActions = (user: User) => (
  <>
    {currentUser?.id === user.id ? (
      <DropdownMenuItem disabled className="opacity-75 cursor-not-allowed select-none text-muted-foreground">
        You cannot edit your own account
      </DropdownMenuItem>
    ) : (
      <>
        <DropdownMenuItem onClick={() => {
          openRoleDialog(user);
        }}>
          <UserCog className="mr-2 h-4 w-4" />
          Change Role
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            openStatusDialog(user);
          }}
          className={user.isActive === false ? "text-green-600" : "text-amber-600"}
        >
          {user.isActive === false ? (
            <>
              <Power className="mr-2 h-4 w-4" />
              Enable User
            </>
          ) : (
            <>
              <PowerOff className="mr-2 h-4 w-4" />
              Suspend User
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => {
            openDeleteDialog(user);
          }}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete User
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          navigate(`/admin/users/${user.id}`);
        }}>
          <Edit className="mr-2 h-4 w-4" />
          Edit User
        </DropdownMenuItem>
      </>
    )}
  </>
);

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage user accounts, permissions, and access controls
          </p>
        </div>
        <div className="mt-4 lg:mt-0 flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex items-center"
            onClick={() => {
              const csv = generateCSV(users);
              downloadCSV(csv, 'users.csv');
              toast({
                title: "Export Complete",
                description: `Exported ${users.length} users to CSV`,
              });
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button
            onClick={() => navigate('/admin/users/create')}
            className="flex items-center"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="Total Users"
            value={statistics.totalUsers}
            description={`${statistics.activePercentage}% active`}
            icon={Users}
            trend={{ value: 12, isPositive: true }}
          />
          <StatCard
            title="Active Users"
            value={statistics.activeUsers}
            description="Currently enabled"
            icon={Power}
            className="border-green-200"
          />
          <StatCard
            title="Administrators"
            value={statistics.adminUsers}
            description="System administrators"
            icon={Shield}
            className="border-purple-200"
          />
          <StatCard
            title="New This Month"
            value={statistics.recentUsers}
            description="Recent signups"
            icon={Calendar}
            trend={{ value: 8, isPositive: true }}
          />
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users by name, username, or email..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filter:</span>
        </div>
      </div>

      {/* Main Content with Tabs */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl">Users Directory</CardTitle>
            <Badge variant="outline" className="px-3 py-1">
              {filteredUsers.length} {filteredUsers.length === 1 ? 'user' : 'users'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                All ({statistics.totalUsers})
              </TabsTrigger>
              <TabsTrigger value="active" className="flex items-center gap-2">
                <Power className="h-4 w-4" />
                Active ({statistics.activeUsers})
              </TabsTrigger>
              <TabsTrigger value="suspended" className="flex items-center gap-2">
                <UserX className="h-4 w-4" />
                Suspended ({statistics.suspendedUsers})
              </TabsTrigger>
              <TabsTrigger value="admins" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Admins ({statistics.adminUsers})
              </TabsTrigger>
              <TabsTrigger value="clients" className="flex items-center gap-2">
                <UserIcon className="h-4 w-4" />
                Clients ({statistics.clientUsers})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-6">
              {isLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 p-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-muted-foreground mb-2">
                    No users found
                  </h3>
                  <p className="text-muted-foreground">
                    {searchQuery 
                      ? `No users match "${searchQuery}" in the ${activeTab} category.`
                      : `No users found in the ${activeTab} category.`
                    }
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => setSearchQuery("")}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <DataTable
                  data={filteredUsers}
                  columns={columns}
                  searchKey="fullName"
                  actions={renderActions}
                  enableSearch={false}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Change Role Dialog */}
      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>Change the role for {selectedUser.fullName} ({selectedUser.username}).</>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="role" className="text-sm font-medium">
                Role
              </label>
              <Select
                value={selectedRole}
                onValueChange={setSelectedRole}
              >
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="client">Client</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedRole === "admin"
                  ? "Administrators have full access to all features and settings."
                  : "Clients can manage their own servers and billing."}
              </p>
            </div>

            {selectedRole === "admin" && (
              <div className="flex items-start p-4 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <ShieldAlert className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Warning: Administrator privileges</p>
                  <p className="mt-1">
                    You are granting administrator privileges which provides full access to the system.
                    Only assign this role to trusted users.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setRoleDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleRoleChange();
              }}
              disabled={updateRoleMutation.isPending || selectedRole === selectedUser?.role}
            >
              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Change Status Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {userStatus ? "Enable User" : "Suspend User"}
            </DialogTitle>
            <DialogDescription>
              {selectedUser && (
                <>
                  {userStatus
                    ? `Enable ${selectedUser.fullName} (${selectedUser.username})? This will restore their access to the system.`
                    : `Suspend ${selectedUser.fullName} (${selectedUser.username})? This will prevent them from accessing the system.`}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {userStatus ? (
              <div className="flex items-start p-4 rounded-md bg-green-50 text-green-800 border border-green-200">
                <Power className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Enabling a user</p>
                  <p className="mt-1">
                    The user will regain access to the system and all their previous resources.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start p-4 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                <PowerOff className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium">Warning: Suspending a user</p>
                  <p className="mt-1">
                    The user will be unable to log in or access any resources while suspended.
                    Their account will remain in the system but will be inactive.
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setStatusDialogOpen(false);
            }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleStatusChange();
              }}
              disabled={updateStatusMutation.isPending}
              variant={userStatus ? "default" : "destructive"}
            >
              {updateStatusMutation.isPending ? "Updating..." : userStatus ? "Enable User" : "Suspend User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedUser && (
                <>
                  This will permanently delete {selectedUser.fullName}'s ({selectedUser.username}) account
                  and all associated data. This action cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="mt-4 mb-5 space-y-3">
            <div className="flex items-start p-4 rounded-md bg-red-50 text-red-800 border border-red-200">
              <Trash2 className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Warning: Data Deletion</p>
                <p className="mt-1">
                  This action will permanently delete the user from both the VirtFusion system and this portal.
                  User credits, data, and history will be irreversibly removed.
                </p>
              </div>
            </div>

            <div className="flex items-start p-4 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
              <ShieldAlert className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium">Server Check Required</p>
                <p className="mt-1">
                  The system will first verify that this user has no active servers in VirtFusion.
                  If servers are found, deletion will be prevented to maintain data synchronization.
                </p>
              </div>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                handleDeleteUser();
              }}
              className="bg-red-600 text-white hover:bg-red-700"
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
