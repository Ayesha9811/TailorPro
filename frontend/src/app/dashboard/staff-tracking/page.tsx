'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  History, Search, ShieldAlert, Terminal, Calendar, User, Filter, RefreshCw
} from 'lucide-react';

interface ActivityLogUser {
  id: number;
  full_name: string;
  email: string;
  role_name?: string;
}

interface ActivityLog {
  id: number;
  user_id: number;
  action: string;
  details: string;
  ip_address: string | null;
  created_at: string;
  user?: ActivityLogUser;
}

export default function StaffTrackingPage() {
  const { user } = useAuthStore();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState('ALL');
  const [selectedAction, setSelectedAction] = useState('ALL');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await api.get('/staff-tracking/logs?limit=250');
      setLogs(res.data || []);
    } catch (err: any) {
      console.error('Failed to load activity logs', err);
      setErrorMsg(err.response?.data?.detail || 'Failed to retrieve system activity logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs logic
  const filteredLogs = logs.filter(log => {
    // 1. Search Query
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      (log.action && log.action.toLowerCase().includes(query)) ||
      (log.details && log.details.toLowerCase().includes(query)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(query)) ||
      (log.user && (
        log.user.full_name.toLowerCase().includes(query) ||
        log.user.email.toLowerCase().includes(query)
      ));

    // 2. Role Filter
    const matchesRole = selectedRole === 'ALL' || 
      (log.user && log.user.role_name === selectedRole) ||
      (selectedRole === 'Unknown' && (!log.user || !log.user.role_name));

    // 3. Action Filter
    const matchesAction = selectedAction === 'ALL' || log.action === selectedAction;

    return matchesSearch && matchesRole && matchesAction;
  });

  // Unique action types in our logs for the select filter dropdown
  const actionTypes = Array.from(new Set(logs.map(log => log.action))).sort();

  // Role badge styling helper
  const getRoleBadge = (roleName?: string) => {
    if (!roleName) return <Badge variant="secondary">Unknown</Badge>;
    switch (roleName) {
      case 'Super Admin':
        return <Badge className="bg-indigo-500/10 text-indigo-500 hover:bg-indigo-500/20 border-transparent">Super Admin</Badge>;
      case 'Owner / Manager':
      case 'CEO':
        return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-transparent">{roleName}</Badge>;
      case 'Cashier':
        return <Badge className="bg-sky-500/10 text-sky-500 hover:bg-sky-500/20 border-transparent">Cashier</Badge>;
      case 'Finance':
        return <Badge className="bg-purple-500/10 text-purple-500 hover:bg-purple-500/20 border-transparent">Finance</Badge>;
      case 'Tailor':
        return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-transparent">Tailor</Badge>;
      default:
        return <Badge variant="secondary">{roleName}</Badge>;
    }
  };

  // Action badge styling helper
  const getActionBadge = (action: string) => {
    if (action.includes('Create') || action.includes('Register') || action.includes('Record')) {
      return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent font-medium">{action}</Badge>;
    }
    if (action.includes('Update') || action.includes('Modify')) {
      return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent font-medium">{action}</Badge>;
    }
    if (action.includes('Deactivate') || action.includes('Delete') || action.includes('Remove')) {
      return <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 border-transparent font-medium">{action}</Badge>;
    }
    return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent font-medium">{action}</Badge>;
  };

  // Verify access permissions (fallback)
  const isAuthorized = user && ['Super Admin', 'Owner / Manager', 'CEO'].includes(user.role_name || '');

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-card/50 backdrop-blur-md rounded-2xl border border-destructive/20 shadow-xl max-w-2xl mx-auto my-12">
        <div className="p-4 bg-destructive/10 text-destructive rounded-full mb-6 ring-8 ring-destructive/5">
          <ShieldAlert className="h-12 w-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Access Restricted</h2>
        <p className="text-muted-foreground mt-3 max-w-md leading-relaxed text-sm">
          You do not have the required permissions to view the Staff Activity Tracking database logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <History className="h-8 w-8 text-primary" />
            Staff Activity Logs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Audit trailing and tracking operations across the entire application for data changes.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-muted text-sm font-semibold transition-all duration-150 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {errorMsg && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <Card className="border-border shadow-xs">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4 items-end">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="search" className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Search Logs</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by staff name, action, detail description, IP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 border-input bg-background"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Role Filter</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger className="h-10 border-input bg-background">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Roles</SelectItem>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                  <SelectItem value="Owner / Manager">Owner / Manager</SelectItem>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="Cashier">Cashier</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Tailor">Tailor</SelectItem>
                  <SelectItem value="Unknown">Unknown Role</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Action Type</Label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger className="h-10 border-input bg-background">
                  <SelectValue placeholder="All Actions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>{action}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card className="border-border shadow-xs overflow-hidden">
        <CardHeader className="border-b pb-4 bg-muted/20">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base font-bold text-foreground">Auditing Trail</CardTitle>
              <CardDescription>
                Showing {filteredLogs.length} activity records
              </CardDescription>
            </div>
            {filteredLogs.length > 0 && (
              <Badge variant="outline" className="font-mono text-xs">
                {logs.length} Total Logs Cached
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <p className="text-muted-foreground text-sm font-medium animate-pulse">Loading auditing database records...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b border-border text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Staff Member</th>
                    <th className="px-6 py-4">System Role</th>
                    <th className="px-6 py-4">Action</th>
                    <th className="px-6 py-4">Operation Details</th>
                    <th className="px-6 py-4">Client IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-foreground">
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-16 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Filter className="h-8 w-8 text-muted-foreground/50" />
                          <span className="font-semibold text-sm">No activity logs match your criteria.</span>
                          <span className="text-xs text-muted-foreground/75">Try modifying filters or entering a different query.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => {
                      const initial = log.user?.full_name?.charAt(0).toUpperCase() || '?';
                      const formattedTime = new Date(log.created_at).toLocaleString([], {
                        year: 'numeric',
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      });

                      return (
                        <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-6 py-4 text-xs font-semibold whitespace-nowrap text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                              {formattedTime}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {log.user ? (
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                  {initial}
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-semibold text-foreground text-sm">{log.user.full_name}</span>
                                  <span className="text-xs text-muted-foreground font-light">{log.user.email}</span>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center font-bold text-xs">
                                  ?
                                </div>
                                <span className="text-muted-foreground text-sm font-semibold italic">System / Deleted User</span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getRoleBadge(log.user?.role_name)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-foreground break-words max-w-md line-clamp-2 hover:line-clamp-none transition-all duration-200">
                              {log.details || <span className="text-muted-foreground italic text-xs">No details available</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Terminal className="h-3 w-3 text-muted-foreground/60" />
                              {log.ip_address || 'Local/Direct'}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
