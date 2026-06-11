'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Bell, Check, CheckCheck, Search, Send, MessageSquare,
  RefreshCw, AlertCircle, ExternalLink, Calendar, ShoppingBag, XCircle, CheckCircle, Clock
} from 'lucide-react';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [outbox, setOutbox] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingOutbox, setLoadingOutbox] = useState(true);
  const [activeTab, setActiveTab] = useState<'customer' | 'system'>('customer');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [outboxFilter, setOutboxFilter] = useState<'all' | 'sent' | 'pending' | 'failed'>('all');
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const list = [];
    const now = new Date();
    // 8 months ago to current month
    for (let i = -8; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value, label });
    }
    setMonths(list);
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.get('/notifications/?limit=100');
      setNotifications(res.data);
    } catch (err: any) {
      console.error('Failed to fetch notifications', err);
      setErrorMsg(err?.message || 'Failed to fetch system notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutbox = async () => {
    setLoadingOutbox(true);
    setErrorMsg('');
    try {
      const res = await api.get('/notifications/outbox');
      setOutbox(res.data);
    } catch (err: any) {
      console.error('Failed to fetch outbox notifications', err);
      setErrorMsg(err?.message || 'Failed to fetch customer messages');
    } finally {
      setLoadingOutbox(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchOutbox();
  }, []);

  const handleMarkRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all as read', err);
    }
  };

  // Filter system notifications
  const filteredNotifications = notifications.filter(n => {
    const matchesSearch = 
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.message.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesMonth = selectedMonth === 'all' || (n.created_at && n.created_at.startsWith(selectedMonth));
    
    if (statusFilter === 'unread') {
      return matchesSearch && matchesMonth && !n.is_read;
    }
    if (statusFilter === 'read') {
      return matchesSearch && matchesMonth && n.is_read;
    }
    return matchesSearch && matchesMonth;
  });

  // Filter customer outbox messages
  const filteredOutbox = outbox.filter(o => {
    const matchesSearch = 
      o.message_body.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.telegram_chat_id && o.telegram_chat_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.log_note && o.log_note.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesMonth = selectedMonth === 'all' || (o.created_at && o.created_at.startsWith(selectedMonth));

    if (outboxFilter === 'sent') {
      return matchesSearch && matchesMonth && o.status === 'SENT';
    }
    if (outboxFilter === 'pending') {
      return matchesSearch && matchesMonth && o.status === 'PENDING';
    }
    if (outboxFilter === 'failed') {
      return matchesSearch && matchesMonth && (o.status === 'FAILED_NO_LINK' || o.status.startsWith('FAILED'));
    }
    return matchesSearch && matchesMonth;
  });

  const getOutboxStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle className="h-3 w-3" />
            Sent
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full animate-pulse">
            <Clock className="h-3 w-3" />
            Pending Dispatch
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20 px-2.5 py-1 rounded-full">
            <XCircle className="h-3 w-3" />
            Failed ({status === 'FAILED_NO_LINK' ? 'Not Linked' : 'Error'})
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Title & Summary Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8 text-primary animate-pulse" />
            Notifications Module
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor outbound messages to customers and track system order status transitions.
          </p>
        </div>
        
        {/* Tab Controls */}
        <div className="flex bg-secondary p-1.5 rounded-xl border border-border">
          <button
            onClick={() => {
              setActiveTab('customer');
              setSearchQuery('');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'customer' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Customer Messages
          </button>
          <button
            onClick={() => {
              setActiveTab('system');
              setSearchQuery('');
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'system' 
                ? 'bg-card text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            System Notifications
          </button>
        </div>
      </div>

      {/* Actions & Filters row */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-card p-4 rounded-xl border shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={
              activeTab === 'customer' 
                ? "Search message body, telegram chat id..." 
                : "Search notification titles, order codes, messages..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-xl text-sm outline-none focus:border-primary text-foreground placeholder:text-muted-foreground transition-colors"
          />
        </div>

        {/* Filters and Action buttons */}
        <div className="flex gap-2 items-center flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-40 h-9 text-xs bg-background text-slate-800 border-slate-200 rounded-xl">
              <SelectValue placeholder="All Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Months</SelectItem>
              {months.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {activeTab === 'customer' ? (
            <div className="flex bg-secondary p-1 rounded-lg border border-border text-xs">
              {(['all', 'sent', 'pending', 'failed'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setOutboxFilter(filter)}
                  className={`px-3 py-1.5 capitalize rounded-md font-semibold transition-colors ${
                    outboxFilter === filter 
                      ? 'bg-card text-primary shadow-sm border border-border' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex bg-secondary p-1 rounded-lg border border-border text-xs">
              {(['all', 'unread', 'read'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setStatusFilter(filter)}
                  className={`px-3 py-1.5 capitalize rounded-md font-semibold transition-colors ${
                    statusFilter === filter 
                      ? 'bg-card text-primary shadow-sm border border-border' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}

          {/* Action utilities */}
          <Button 
            variant="outline"
            size="sm"
            onClick={activeTab === 'customer' ? fetchOutbox : fetchNotifications}
            className="flex items-center gap-1.5 py-2 rounded-xl text-xs hover:bg-secondary border border-border"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </Button>

          {activeTab === 'system' && (
            <Button
              variant="default"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={notifications.filter(n => !n.is_read).length === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs flex items-center gap-1"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Customer Messages Tab Content */}
      {activeTab === 'customer' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-secondary/20 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-foreground">Customer Telegram logs</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    {outbox.filter(o => o.status === 'SENT').length} Sent
                  </span>
                  <span className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    {outbox.filter(o => o.status === 'PENDING').length} Pending
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingOutbox ? (
                <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground bg-card">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span>Fetching customer outbox logs...</span>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-destructive bg-card">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="font-semibold">{errorMsg}</p>
                  <Button variant="outline" size="sm" onClick={fetchOutbox}>Try Again</Button>
                </div>
              ) : filteredOutbox.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground bg-card">
                  <Send className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
                  <p className="font-medium text-sm">No customer messages found.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Check that customers are registering and order messages are triggering.</p>
                </div>
              ) : (
                <div className="divide-y divide-border bg-card">
                  {filteredOutbox.map((o) => (
                    <div 
                      key={o.id} 
                      className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 transition-colors hover:bg-secondary/15"
                    >
                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {getOutboxStatusBadge(o.status)}
                          {o.telegram_chat_id ? (
                            <span className="text-xs font-semibold text-muted-foreground bg-secondary px-2.5 py-0.5 rounded-md border border-border">
                              Chat ID: {o.telegram_chat_id}
                            </span>
                          ) : (
                            <span className="text-xs font-semibold text-destructive/80 bg-destructive/5 px-2.5 py-0.5 rounded-md border border-destructive/10">
                              Telegram Not Linked
                            </span>
                          )}
                          <span className="text-[11px] text-muted-foreground/70 ml-auto whitespace-nowrap">
                            Created: {new Date(o.created_at).toLocaleString()}
                          </span>
                        </div>

                        {/* Message Body */}
                        <div className="text-xs font-mono bg-secondary/30 text-foreground p-3 rounded-lg border border-border mt-2 leading-relaxed whitespace-pre-wrap">
                          {o.message_body}
                        </div>

                        {/* Error details / log notes */}
                        {o.log_note && (
                          <div className={`text-xs flex items-center gap-1 font-medium border p-2 rounded-md mt-2 ${
                            o.status === 'SENT'
                              ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 border-emerald-500/10'
                              : 'text-destructive bg-destructive/5 border-destructive/10'
                          }`}>
                            {o.status === 'SENT' ? (
                              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                            ) : (
                              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span>Log note: {o.log_note}</span>
                          </div>
                        )}
                      </div>

                      {/* Display Sent at timestamp details if available */}
                      {o.sent_at && (
                        <div className="text-right shrink-0 flex flex-col text-xs text-muted-foreground">
                          <span className="font-semibold text-foreground/80">Delivered</span>
                          <span>{new Date(o.sent_at).toLocaleString()}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Notifications Tab Content */}
      {activeTab === 'system' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <Card className="shadow-sm border-border overflow-hidden">
            <CardHeader className="bg-secondary/20 border-b border-border">
              <div className="flex justify-between items-center">
                <CardTitle className="text-sm font-bold text-foreground">In-App Events</CardTitle>
                <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">
                  {notifications.filter(n => !n.is_read).length} Unread
                </span>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground bg-card">
                  <RefreshCw className="h-5 w-5 animate-spin text-primary" />
                  <span>Fetching system notifications...</span>
                </div>
              ) : errorMsg ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2 text-destructive bg-card">
                  <AlertCircle className="h-8 w-8 text-destructive" />
                  <p className="font-semibold">{errorMsg}</p>
                  <Button variant="outline" size="sm" onClick={fetchNotifications}>Try Again</Button>
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground bg-card">
                  <Bell className="h-10 w-10 text-muted-foreground/45 mx-auto mb-3" />
                  <p className="font-medium text-sm">No notification records found.</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">Try expanding your search query or filters.</p>
                </div>
              ) : (
                <div className="divide-y divide-border bg-card">
                  {filteredNotifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-5 flex items-start gap-4 transition-all ${
                        !n.is_read ? 'bg-primary/5' : 'hover:bg-secondary/10'
                      }`}
                    >
                      {/* Read status dot indicator */}
                      <div className="mt-1">
                        {!n.is_read ? (
                          <div className="h-2.5 w-2.5 bg-primary rounded-full ring-4 ring-primary/20 animate-pulse"></div>
                        ) : (
                          <div className="h-2.5 w-2.5 bg-muted-foreground/40 rounded-full"></div>
                        )}
                      </div>

                      {/* Content block */}
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start gap-4">
                          <h4 className="font-bold text-foreground text-sm">{n.title}</h4>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground/80 leading-relaxed font-medium bg-secondary/35 p-3 rounded-lg border border-border mt-2 font-mono text-xs">
                          {n.message}
                        </p>
                        
                        {/* Association Badges */}
                        <div className="flex flex-wrap items-center gap-3 mt-3 pt-1.5">
                          {n.order_id && (
                            <Link href={`/dashboard/orders/${n.order_id}`} className="inline-flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-2.5 py-1 rounded-md transition-colors font-semibold border border-primary/20">
                              <ShoppingBag className="h-3 w-3" />
                              View Order Details
                              <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          )}
                          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary px-2 py-0.5 rounded-md font-semibold border border-border">
                            Channel: System Log / Console
                          </span>
                        </div>
                      </div>

                      {/* Inline mark read trigger */}
                      {!n.is_read && (
                        <button
                          onClick={() => handleMarkRead(n.id)}
                          className="p-1.5 border border-border hover:border-primary rounded-lg hover:text-primary bg-card transition-all shadow-xs hover:scale-105"
                          title="Mark as read"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
