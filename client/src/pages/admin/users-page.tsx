import { useState } from "react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { UserCog, Download, Edit, ShieldAlert, User as UserIcon, Trash2, Power, PowerOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { highlightMatch } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

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

  // Fetch users
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

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

  // Table columns
  const columns = [
    {
      accessorKey: "fullName" as keyof User,
      header: "User",
      cell: (user: User) => (
        <div className="flex items-center">
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center mr-3">
            <UserIcon className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="font-medium">
              {searchQuery ? highlightMatch(user.fullName, searchQuery) : user.fullName}
            </div>
            <div className="text-xs text-muted-foreground">{user.username}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "email" as keyof User,
      header: "Email",
      cell: (user: User) => (
        <span className="text-sm">
          {searchQuery ? highlightMatch(user.email, searchQuery) : user.email}
        </span>
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
          <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">
            <PowerOff className="h-3 w-3 mr-1" />
            Suspended
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
            <Power className="h-3 w-3 mr-1" />
            Active
          </Badge>
        )
      ),
    },
    {
      accessorKey: "createdAt" as keyof User,
      header: "Joined",
      cell: (user: User) => (
        <span className="text-sm text-gray-500">
          {formatDate(user.createdAt)}
        </span>
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

  // Filter users by role and status
  const admins = users.filter(user => user.role === "admin");
  const activeClients = users.filter(user => user.role !== "admin" && user.isActive !== false);
  const suspendedClients = users.filter(user => user.role !== "admin" && user.isActive === false);

  return (
    <AdminLayout>
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">User Management</h1>
          <p className="text-gray-500 mt-1">Manage your users and their permissions</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
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
            Export
          </Button>
        </div>
      </div>

      {/* Global Search Bar */}
      <div className="mb-6 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users or admins..."
            className="pl-10"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Active Users Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Users</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2">Loading users...</p>
            </div>
          ) : (
            <DataTable
              data={activeClients}
              columns={columns}
              searchKey="fullName"
              actions={renderActions}
              enableSearch={false}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
        </CardContent>
      </Card>

      {/* Admins Table */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-lg">Admins</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2">Loading users...</p>
            </div>
          ) : (
            <DataTable
              data={admins}
              columns={columns}
              searchKey="fullName"
              actions={renderActions}
              enableSearch={false}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
        </CardContent>
      </Card>

      {/* Suspended Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Suspended Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <p className="ml-2">Loading users...</p>
            </div>
          ) : (
            <DataTable
              data={suspendedClients}
              columns={columns}
              searchKey="fullName"
              actions={renderActions}
              enableSearch={false}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
            />
          )}
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
