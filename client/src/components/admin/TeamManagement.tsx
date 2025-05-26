import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getBrandColors } from "@/lib/brand-theme";
import {
  Users,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Loader2,
  UserPlus
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TeamMember {
  id: number;
  discordUserId: string;
  discordUsername: string;
  displayName?: string; // Optional custom display name
  discordAvatarUrl?: string;
  role: string;
  aboutMe?: string;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface DiscordUser {
  id: string;
  username: string;
  globalName?: string;
  displayName: string;
  avatar: string;
  bot: boolean;
}

// Team member form schema
const teamMemberSchema = z.object({
  discordUserId: z.string().min(1, "Discord user is required"),
  discordUsername: z.string().min(1, "Discord username is required"),
  displayName: z.string().optional(), // Optional custom display name
  discordAvatarUrl: z.string().optional(),
  role: z.string().min(1, "Role is required"),
  aboutMe: z.string().optional(),
  displayOrder: z.coerce.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

type TeamMemberFormData = z.infer<typeof teamMemberSchema>;

interface TeamManagementProps {
  brandColors: any;
}

export default function TeamManagement({ brandColors }: TeamManagementProps) {
  const { toast } = useToast();
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDiscordUser, setSelectedDiscordUser] = useState<DiscordUser | null>(null);

  // Fetch team members
  const { data: teamMembers = [], isLoading } = useQuery<TeamMember[]>({
    queryKey: ["/api/admin/team"],
  });

  // Search Discord users
  const { data: discordUsers = [], isLoading: isSearching } = useQuery<DiscordUser[]>({
    queryKey: ["/api/admin/discord/users", searchQuery],
    enabled: searchQuery.length >= 2,
    queryFn: () => apiRequest(`/api/admin/discord/users?q=${encodeURIComponent(searchQuery)}&limit=10`),
  });

  // Form for adding/editing team members
  const form = useForm<TeamMemberFormData>({
    resolver: zodResolver(teamMemberSchema),
    defaultValues: {
      discordUserId: "",
      discordUsername: "",
      displayName: "", // Optional custom display name
      discordAvatarUrl: "",
      role: "",
      aboutMe: "",
      displayOrder: 0,
      isActive: true,
    },
  });

  // Create team member mutation
  const createMemberMutation = useMutation({
    mutationFn: (data: TeamMemberFormData) => apiRequest("/api/admin/team", {
      method: "POST",
      body: data,
    }),
    onSuccess: () => {
      toast({
        title: "Team member added",
        description: "Successfully added new team member",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      setIsAddDialogOpen(false);
      form.reset();
      setSelectedDiscordUser(null);
      setSearchQuery("");
    },
    onError: (error: any) => {
      toast({
        title: "Error adding team member",
        description: error.message || "Failed to add team member",
        variant: "destructive",
      });
    },
  });

  // Update team member mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<TeamMemberFormData> }) =>
      apiRequest(`/api/admin/team/${id}`, {
        method: "PUT",
        body: data,
      }),
    onSuccess: () => {
      toast({
        title: "Team member updated",
        description: "Successfully updated team member",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
      setEditingMember(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error updating team member",
        description: error.message || "Failed to update team member",
        variant: "destructive",
      });
    },
  });

  // Delete team member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/api/admin/team/${id}`, {
      method: "DELETE",
    }),
    onSuccess: () => {
      toast({
        title: "Team member removed",
        description: "Successfully removed team member",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/team"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error removing team member",
        description: error.message || "Failed to remove team member",
        variant: "destructive",
      });
    },
  });

  const handleSelectDiscordUser = (user: DiscordUser) => {
    setSelectedDiscordUser(user);
    form.setValue("discordUserId", user.id);
    form.setValue("discordUsername", user.username);
    form.setValue("discordAvatarUrl", user.avatar);
    setSearchQuery("");
  };

  const handleSubmit = (data: TeamMemberFormData) => {
    if (editingMember) {
      updateMemberMutation.mutate({ id: editingMember.id, data });
    } else {
      createMemberMutation.mutate(data);
    }
  };

  const startEdit = (member: TeamMember) => {
    setEditingMember(member);
    form.reset({
      discordUserId: member.discordUserId,
      discordUsername: member.discordUsername,
      displayName: member.displayName || "", // Include display name
      discordAvatarUrl: member.discordAvatarUrl,
      role: member.role,
      aboutMe: member.aboutMe || "",
      displayOrder: member.displayOrder,
      isActive: member.isActive,
    });
  };

  const cancelEdit = () => {
    setEditingMember(null);
    form.reset();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>Loading team members...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Team Management</h3>
          <p className="text-sm text-muted-foreground">
            Manage team members displayed on the public team page
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button style={{ backgroundColor: brandColors.primary.full, color: 'white' }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add Team Member
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Team Member</DialogTitle>
            </DialogHeader>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Discord User Search */}
              <div className="space-y-2">
                <Label>Discord User</Label>
                {selectedDiscordUser ? (
                  <div className="flex items-center space-x-3 p-3 border rounded-md">
                    <img
                      src={selectedDiscordUser.avatar}
                      alt={selectedDiscordUser.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className="flex-1">
                      <p className="font-medium">{selectedDiscordUser.username}</p>
                      <p className="text-sm text-muted-foreground">{selectedDiscordUser.id}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDiscordUser(null);
                        form.setValue("discordUserId", "");
                        form.setValue("discordUsername", "");
                        form.setValue("discordAvatarUrl", "");
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search Discord users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    {searchQuery.length >= 2 && (
                      <div className="border rounded-md max-h-40 overflow-y-auto">
                        {isSearching ? (
                          <div className="p-3 text-center">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                          </div>
                        ) : discordUsers.length > 0 ? (
                          discordUsers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              className="w-full flex items-center space-x-3 p-3 hover:bg-muted transition-colors"
                              onClick={() => handleSelectDiscordUser(user)}
                            >
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className="w-8 h-8 rounded-full"
                              />
                              <div className="text-left">
                                <p className="font-medium">{user.username}</p>
                                <p className="text-sm text-muted-foreground">{user.id}</p>
                              </div>
                            </button>
                          ))
                        ) : (
                          <div className="p-3 text-center text-muted-foreground">
                            No users found
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name (Optional)</Label>
                <Input
                  id="displayName"
                  placeholder="Custom name for public display (leave empty to use Discord username)"
                  {...form.register("displayName")}
                />
                <p className="text-xs text-muted-foreground">
                  If provided, this name will be shown on the public team page instead of the Discord username
                </p>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input
                  id="role"
                  placeholder="e.g., CEO, Developer, Support Manager"
                  {...form.register("role")}
                />
                {form.formState.errors.role && (
                  <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
                )}
              </div>

              {/* About Me */}
              <div className="space-y-2">
                <Label htmlFor="aboutMe">About Me (Optional)</Label>
                <Textarea
                  id="aboutMe"
                  placeholder="Brief description about this team member..."
                  {...form.register("aboutMe")}
                />
              </div>

              {/* Display Order */}
              <div className="space-y-2">
                <Label htmlFor="displayOrder">Display Order</Label>
                <Input
                  id="displayOrder"
                  type="number"
                  min="0"
                  {...form.register("displayOrder")}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMemberMutation.isPending || !selectedDiscordUser}
                  style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
                >
                  {createMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Add Member
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Team Members List */}
      <div className="space-y-4">
        {teamMembers.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No team members yet</h3>
              <p className="text-muted-foreground mb-4">
                Add your first team member to get started
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Add Team Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          teamMembers
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((member) => (
              <Card key={member.id}>
                <CardContent className="p-6">
                  {editingMember?.id === member.id ? (
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                      {/* Display Name */}
                      <div className="space-y-2">
                        <Label htmlFor="displayName">Display Name (Optional)</Label>
                        <Input
                          id="displayName"
                          placeholder="Custom name for public display"
                          {...form.register("displayName")}
                        />
                        <p className="text-xs text-muted-foreground">
                          If provided, this name will be shown on the public team page instead of the Discord username
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="role">Role</Label>
                          <Input
                            id="role"
                            {...form.register("role")}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="displayOrder">Display Order</Label>
                          <Input
                            id="displayOrder"
                            type="number"
                            min="0"
                            {...form.register("displayOrder")}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="aboutMe">About Me</Label>
                        <Textarea
                          id="aboutMe"
                          {...form.register("aboutMe")}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={form.watch("isActive")}
                          onCheckedChange={(checked) => form.setValue("isActive", checked)}
                        />
                        <Label>Active</Label>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button type="button" variant="outline" onClick={cancelEdit}>
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          disabled={updateMemberMutation.isPending}
                          style={{ backgroundColor: brandColors.primary.full, color: 'white' }}
                        >
                          {updateMemberMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Save Changes
                        </Button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        {member.discordAvatarUrl ? (
                          <img
                            src={member.discordAvatarUrl}
                            alt={member.discordUsername}
                            className="w-12 h-12 rounded-full"
                          />
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: brandColors.primary.full }}
                          >
                            {member.discordUsername.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">
                              {member.displayName || member.discordUsername}
                              {member.displayName && (
                                <span className="text-sm text-muted-foreground ml-2">
                                  (@{member.discordUsername})
                                </span>
                              )}
                            </h4>
                            <Badge
                              variant={member.isActive ? "default" : "secondary"}
                              style={member.isActive ? { backgroundColor: brandColors.primary.full } : {}}
                            >
                              {member.role}
                            </Badge>
                            {!member.isActive && (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Discord ID: {member.discordUserId}
                          </p>
                          {member.displayName && (
                            <p className="text-sm text-muted-foreground mb-2">
                              Public Display: {member.displayName}
                            </p>
                          )}
                          {member.aboutMe && (
                            <p className="text-sm">{member.aboutMe}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-2">
                            Display Order: {member.displayOrder}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => startEdit(member)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMemberMutation.mutate(member.id)}
                          disabled={deleteMemberMutation.isPending}
                        >
                          {deleteMemberMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
        )}
      </div>
    </div>
  );
}
