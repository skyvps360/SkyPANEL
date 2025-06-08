import axios from 'axios';

// Create an Axios instance with defaults
const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// API utility functions

// Server Management
export const getServers = () => api.get('/servers');
export const getServer = (id: number) => api.get(`/servers/${id}`);
export const createServer = (data: any) => api.post('/servers', data);
export const deleteServer = (id: number) => api.delete(`/servers/${id}`);

// Server Power Actions
export const startServer = (id: number) => api.post(`/servers/${id}/power/start`);
export const stopServer = (id: number) => api.post(`/servers/${id}/power/stop`);
export const restartServer = (id: number) => api.post(`/servers/${id}/power/restart`);

// IP Management
export const getIpAddresses = () => api.get('/ip-addresses');
export const allocateIp = (serverId: number, ipAddressId: number) => 
  api.post(`/servers/${serverId}/ip`, { ipAddressId });
export const releaseIp = (serverId: number, ipAddress: string) => 
  api.delete(`/servers/${serverId}/ip/${ipAddress}`);

// Billing
export const getTransactions = () => api.get('/transactions');
export const getVirtFusionBalance = () => api.get('/billing/balance');
export const addVirtFusionTokens = (amount: number, paymentId: string, verificationData: any) =>
  api.post('/billing/add-credits', { amount, paymentId, verificationData });

// DNS Management
export const getDnsDomains = () => api.get('/dns/domains');
export const addDnsDomain = (domain: string, ip: string) =>
  api.post('/dns/domains', { name: domain, ip });
export const deleteDnsDomain = (domainId: number) =>
  api.delete(`/dns/domains/${domainId}`);
export const getDnsRecords = (domainId: number) =>
  api.get(`/dns/domains/${domainId}/records`);
export const addDnsRecord = (domainId: number, record: {
  name: string;
  type: string;
  content: string;
  ttl?: number;
  priority?: number;
}) => api.post(`/dns/domains/${domainId}/records`, record);
export const updateDnsRecord = (domainId: number, recordId: number, record: {
  name: string;
  type: string;
  content: string;
  ttl: number;
  priority: number;
}) => api.put(`/dns/domains/${domainId}/records/${recordId}`, record);
export const deleteDnsRecord = (domainId: number, recordId: number) =>
  api.delete(`/dns/domains/${domainId}/records/${recordId}`);

// DNS Plan Limits
export const getDnsPlanLimits = () => api.get('/dns-plans/limits');

// Support Tickets
export const getTickets = () => api.get('/tickets');
export const getTicket = (id: number) => api.get(`/tickets/${id}`);
export const createTicket = (data: any) => api.post('/tickets', data);
export const addTicketMessage = (ticketId: number, message: string) => 
  api.post(`/tickets/${ticketId}/messages`, { message });
export const closeTicket = (id: number) => api.post(`/tickets/${id}/close`);

// Admin Operations
export const getUsers = () => api.get('/admin/users');
export const updateUserRole = (userId: number, role: string) =>
  api.patch(`/admin/users/${userId}/role`, { role });
export const getAllServers = () => api.get('/admin/servers');
export const getAllTickets = () => api.get('/admin/tickets');
export const syncHypervisors = () => api.post('/admin/hypervisors/sync');

// Cache Management (Admin Only)
export const getCacheStatus = () => api.get('/admin/cache/status');
export const clearAllCaches = () => api.post('/admin/cache/clear');
export const clearSpecificCache = (cacheType: 'betterstack' | 'gemini' | 'modules') =>
  api.post(`/admin/cache/clear/${cacheType}`);

// Get Hypervisors
export const getHypervisors = () => api.get('/hypervisors');

// Get OS Templates
export const getOsTemplates = () => api.get('/os-templates');

// Notifications
export const getNotifications = () => api.get('/notifications');
export const getUnreadNotificationCount = async (): Promise<{ count: number }> => {
  const response = await api.get('/notifications/unread/count');
  // Ensure we properly handle the response format
  return typeof response === 'object' && response !== null && 'count' in response 
    ? response as { count: number } 
    : { count: 0 };
};
export const markNotificationAsRead = (id: number) => api.post(`/notifications/mark-read/${id}`);
export const markAllNotificationsAsRead = () => api.post('/notifications/mark-all-read');
export const deleteNotification = (id: number) => api.delete(`/notifications/${id}`);

// Error handling interceptor
api.interceptors.response.use(
  (response) => {
    // Extract the data from the response
    return response.data;
  },
  (error) => {
    const customError = {
      message: error.response?.data?.error || error.message || 'An unknown error occurred',
      status: error.response?.status,
      data: error.response?.data,
    };
    return Promise.reject(customError);
  }
);

export default api;
