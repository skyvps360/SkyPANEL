import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Gift,
  Calendar,
  Coins,
  TrendingUp,
  Clock,
  Award,
  Flame,
  Target,
  CheckCircle,
  Loader2,
  Star,
} from "lucide-react";
import { format } from "date-fns";

// User login streak interface
interface UserLoginStreak {
  id: number;
  userId: number;
  currentStreak: number;
  longestStreak: number;
  lastLoginDate: string | null;
  totalLoginDays: number;
  createdAt: string;
  updatedAt: string;
}

// User award interface
interface UserAward {
  id: number;
  userId: number;
  awardSettingId: number;
  virtFusionTokens: number;
  streakDay: number;
  status: "pending" | "claimed" | "expired";
  claimedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  awardSetting: {
    id: number;
    name: string;
    description: string | null;
    loginDaysRequired: number;
    virtFusionTokens: number;
  };
}

// Award settings interface
interface AwardSetting {
  id: number;
  name: string;
  description: string | null;
  loginDaysRequired: number;
  virtFusionTokens: number;
  isActive: boolean;
}

// Awards dashboard data interface
interface AwardsDashboardData {
  loginStreak: UserLoginStreak | null;
  awards: UserAward[];
  availableAwards: AwardSetting[];
  totalTokensEarned: number;
  nextRewardProgress: {
    nextReward: AwardSetting | null;
    daysUntilNext: number;
    progressPercentage: number;
  };
}

/**
 * Client-side awards page for displaying user login streaks and rewards
 * Shows current streak, earned awards, and progress toward next rewards
 */
export default function AwardsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [claimingAward, setClaimingAward] = useState<number | null>(null);

  // Fetch user awards dashboard data
  const { data: awardsData, isLoading, refetch } = useQuery<AwardsDashboardData>({
    queryKey: ["/api/awards/user/awards"],
    retry: false,
  });

  /**
   * Handle claiming a pending award
   */
  const handleClaimAward = async (awardId: number) => {
    setClaimingAward(awardId);
    try {
      await apiRequest(`/api/awards/user/awards/${awardId}/claim`, {
        method: "POST",
      });
      
      toast({
        title: "Award Claimed!",
        description: "Your VirtFusion tokens have been added to your account.",
      });
      
      // Refresh the data
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to claim award",
        variant: "destructive",
      });
    } finally {
      setClaimingAward(null);
    }
  };

  /**
   * Get status badge for award
   */
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "claimed":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Claimed
          </Badge>
        );
      case "expired":
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            Expired
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  const loginStreak = awardsData?.loginStreak;
  const nextReward = awardsData?.nextRewardProgress;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Daily Login Awards</h1>
            <p className="text-muted-foreground">
              Track your login streak and claim VirtFusion token rewards
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Gift className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">
              {awardsData?.totalTokensEarned || 0} Tokens Earned
            </span>
          </div>
        </div>

        {/* Login Streak Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
              <Flame className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loginStreak?.currentStreak || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {loginStreak?.currentStreak === 1 ? "day" : "days"} in a row
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loginStreak?.longestStreak || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Personal best record
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Login Days</CardTitle>
              <Calendar className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loginStreak?.totalLoginDays || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Days logged in total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Login</CardTitle>
              <Clock className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {loginStreak?.lastLoginDate
                  ? format(new Date(loginStreak.lastLoginDate), "MMM d")
                  : "Never"}
              </div>
              <p className="text-xs text-muted-foreground">
                {loginStreak?.lastLoginDate
                  ? format(new Date(loginStreak.lastLoginDate), "yyyy")
                  : "No login recorded"}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Next Reward Progress */}
        {nextReward?.nextReward && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Next Reward Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold">{nextReward.nextReward.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {nextReward.nextReward.description}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-lg font-bold">
                    <Coins className="h-5 w-5 text-yellow-500" />
                    {nextReward.nextReward.virtFusionTokens}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {nextReward.daysUntilNext} days to go
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(nextReward.progressPercentage)}%</span>
                </div>
                <Progress value={nextReward.progressPercentage} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {loginStreak?.currentStreak || 0} of {nextReward.nextReward.loginDaysRequired} days completed
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Available Rewards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Available Rewards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {awardsData?.availableAwards?.map((award) => {
                const isAchievable = (loginStreak?.currentStreak || 0) >= award.loginDaysRequired;
                return (
                  <div
                    key={award.id}
                    className={`p-4 rounded-lg border ${
                      isAchievable
                        ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold">{award.name}</h3>
                      {isAchievable && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      {award.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{award.loginDaysRequired} days</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-500" />
                        <span className="font-semibold">{award.virtFusionTokens}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Awards History */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-5 w-5" />
              Awards History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {awardsData?.awards?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Award</TableHead>
                    <TableHead>Streak Day</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awardsData.awards.map((award) => (
                    <TableRow key={award.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{award.awardSetting.name}</div>
                          {award.awardSetting.description && (
                            <div className="text-sm text-muted-foreground">
                              {award.awardSetting.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Flame className="h-4 w-4 text-orange-500" />
                          {award.streakDay}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          {award.virtFusionTokens}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(award.status)}</TableCell>
                      <TableCell>
                        {award.claimedAt
                          ? format(new Date(award.claimedAt), "MMM d, yyyy")
                          : format(new Date(award.createdAt), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>
                        {award.status === "pending" && (
                          <Button
                            size="sm"
                            onClick={() => handleClaimAward(award.id)}
                            disabled={claimingAward === award.id}
                          >
                            {claimingAward === award.id ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Gift className="h-4 w-4 mr-2" />
                            )}
                            Claim
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Awards Yet</h3>
                <p className="text-muted-foreground">
                  Start logging in daily to earn your first rewards!
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}