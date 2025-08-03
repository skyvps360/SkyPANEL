import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Save, 
  User, 
  UserPlus,
  Eye,
  EyeOff
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// User creation schema
const userCreateSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  fullName: z.string().min(1, "Full name is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  role: z.string().min(1, "Role is required"),
});

type UserCreateFormData = z.infer<typeof userCreateSchema>;

export default function UserCreatePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<UserCreateFormData>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      fullName: "",
      firstName: "",
      lastName: "",
      phone: "",
      company: "",
      address: "",
      role: "client",
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserCreateFormData) => {
      return await apiRequest("/api/admin/users", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: (data) => {
      toast({
        title: "User Created",
        description: `User ${data.user.username} has been created successfully.`,
      });
      
      // Invalidate users list to refresh the table
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      
      // Navigate back to users list
      navigate("/admin/users");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UserCreateFormData) => {
    createUserMutation.mutate(data);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/users")}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Users</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Create New User</h1>
              <p className="text-muted-foreground">
                Add a new user to the system
              </p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserPlus className="h-5 w-5" />
              <span>User Information</span>
            </CardTitle>
            <CardDescription>
              Fill in the details for the new user. All fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      {...form.register("username")}
                      placeholder="Enter username"
                    />
                    {form.formState.errors.username && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.username.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      {...form.register("email")}
                      placeholder="Enter email address"
                    />
                    {form.formState.errors.email && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.email.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      {...form.register("fullName")}
                      placeholder="Enter full name"
                    />
                    {form.formState.errors.fullName && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.fullName.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="role">Role *</Label>
                    <Select
                      value={form.watch("role")}
                      onValueChange={(value) => form.setValue("role", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="client">Client</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.formState.errors.role && (
                      <p className="text-sm text-red-600">
                        {form.formState.errors.role.message}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      {...form.register("password")}
                      placeholder="Enter password (min 8 characters)"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {form.formState.errors.password && (
                    <p className="text-sm text-red-600">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Additional Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...form.register("firstName")}
                      placeholder="Enter first name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...form.register("lastName")}
                      placeholder="Enter last name"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    {...form.register("phone")}
                    placeholder="Enter phone number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company</Label>
                  <Input
                    id="company"
                    {...form.register("company")}
                    placeholder="Enter company name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    {...form.register("address")}
                    placeholder="Enter address"
                  />
                </div>
              </div>

              {/* Success Alert */}
              {createUserMutation.isSuccess && (
                <Alert>
                  <User className="h-4 w-4" />
                  <AlertDescription>
                    User created successfully! You will be redirected to the users list.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error Alert */}
              {createUserMutation.isError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {createUserMutation.error?.message || "Failed to create user"}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => navigate("/admin/users")}
            >
              Cancel
            </Button>
            <Button
              onClick={form.handleSubmit(onSubmit)}
              disabled={createUserMutation.isPending}
              className="flex items-center space-x-2"
            >
              <Save className="h-4 w-4" />
              <span>
                {createUserMutation.isPending ? "Creating..." : "Create User"}
              </span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AdminLayout>
  );
} 