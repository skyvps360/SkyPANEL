import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface OAuthAnalytics {
  loginStats: Array<{
    providerName: string;
    totalLogins: string;
    successfulLogins: string;
    failedLogins: string;
  }>;
  linkedAccounts: Array<{
    providerName: string;
    count: string;
  }>;
  recentActivity: Array<{
    id: number;
    userId?: number;
    providerName: string;
    providerUserId?: string;
    loginType: 'link' | 'login' | 'unlink';
    status: 'success' | 'failed' | 'pending';
    ipAddress?: string;
    userAgent?: string;
    errorMessage?: string;
    createdAt: string;
  }>;
}

interface OAuthAnalyticsProps {
  analytics: OAuthAnalytics;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export function OAuthAnalytics({ analytics }: OAuthAnalyticsProps) {
  const getProviderDisplayName = (providerName: string) => {
    const names: Record<string, string> = {
      discord: 'Discord',
      github: 'GitHub',
      google: 'Google',
      linkedin: 'LinkedIn',
    };
    return names[providerName] || providerName;
  };

  const getProviderColor = (providerName: string) => {
    const colors: Record<string, string> = {
      discord: '#5865F2',
      github: '#333',
      google: '#4285F4',
      linkedin: '#0077B5',
    };
    return colors[providerName] || '#666';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getLoginTypeColor = (type: string) => {
    switch (type) {
      case 'login':
        return 'bg-blue-100 text-blue-800';
      case 'link':
        return 'bg-green-100 text-green-800';
      case 'unlink':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const chartData = analytics.loginStats.map(stat => ({
    name: getProviderDisplayName(stat.providerName),
    successful: parseInt(stat.successfulLogins),
    failed: parseInt(stat.failedLogins),
    total: parseInt(stat.totalLogins),
  }));

  const pieData = analytics.linkedAccounts.map(account => ({
    name: getProviderDisplayName(account.providerName),
    value: parseInt(account.count),
    color: getProviderColor(account.providerName),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Logins</CardTitle>
            <BarChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.loginStats.reduce((sum, stat) => sum + parseInt(stat.totalLogins), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Across all providers
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Linked Accounts</CardTitle>
            <PieChart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.linkedAccounts.reduce((sum, account) => sum + parseInt(account.count), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Active connections
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(() => {
                const total = analytics.loginStats.reduce((sum, stat) => sum + parseInt(stat.totalLogins), 0);
                const successful = analytics.loginStats.reduce((sum, stat) => sum + parseInt(stat.successfulLogins), 0);
                return total > 0 ? Math.round((successful / total) * 100) : 0;
              })()}%
            </div>
            <p className="text-xs text-muted-foreground">
              Successful logins
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.loginStats.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Configured providers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Login Statistics Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Login Statistics by Provider</CardTitle>
            <CardDescription>Successful vs failed login attempts</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="successful" fill="#10B981" name="Successful" />
                <Bar dataKey="failed" fill="#EF4444" name="Failed" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Linked Accounts Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Linked Accounts Distribution</CardTitle>
            <CardDescription>Number of linked accounts by provider</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent OAuth Activity</CardTitle>
          <CardDescription>Latest OAuth login and linking attempts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.recentActivity.slice(0, 10).map((activity) => (
              <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white`}
                       style={{ backgroundColor: getProviderColor(activity.providerName) }}>
                    <span className="text-xs">{getProviderDisplayName(activity.providerName).charAt(0)}</span>
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">
                        {getProviderDisplayName(activity.providerName)}
                      </span>
                      <Badge className={getLoginTypeColor(activity.loginType)}>
                        {activity.loginType}
                      </Badge>
                      <Badge className={getStatusColor(activity.status)}>
                        {activity.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(activity.createdAt)}
                      {activity.ipAddress && ` • ${activity.ipAddress}`}
                    </div>
                  </div>
                </div>
                {activity.errorMessage && (
                  <div className="text-xs text-red-600 max-w-xs truncate">
                    {activity.errorMessage}
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Import the missing icons
import { CheckCircle, Settings } from 'lucide-react'; 