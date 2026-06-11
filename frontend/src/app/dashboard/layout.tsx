'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/lib/api';
import { 
  LayoutDashboard, Users, Ruler, ShoppingBag, Receipt, 
  Settings, LogOut, BarChart3, UserCheck, Bell, Check, CheckCheck, ShieldAlert,
  Sun, Moon, PlusCircle
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'New Order', href: '/dashboard/orders/unified', icon: PlusCircle },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
  { name: 'Reports', href: '/dashboard/reports', icon: BarChart3 },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
  { name: 'Users', href: '/dashboard/users', icon: UserCheck },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const roleRoutes: Record<string, string[]> = {
  'Super Admin': ['/dashboard', '/dashboard/customers', '/dashboard/orders', '/dashboard/orders/unified', '/dashboard/invoices', '/dashboard/reports', '/dashboard/notifications', '/dashboard/users', '/dashboard/settings'],
  'Owner / Manager': ['/dashboard', '/dashboard/customers', '/dashboard/orders', '/dashboard/orders/unified', '/dashboard/invoices', '/dashboard/reports', '/dashboard/notifications', '/dashboard/users', '/dashboard/settings'],
  'CEO': ['/dashboard', '/dashboard/customers', '/dashboard/orders', '/dashboard/orders/unified', '/dashboard/invoices', '/dashboard/reports', '/dashboard/notifications', '/dashboard/users', '/dashboard/settings'],
  'Cashier': ['/dashboard', '/dashboard/customers', '/dashboard/orders', '/dashboard/invoices', '/dashboard/notifications', '/dashboard/users', '/dashboard/settings'],
  'Tailor': ['/dashboard', '/dashboard/customers', '/dashboard/orders', '/dashboard/orders/unified', '/dashboard/invoices', '/dashboard/notifications', '/dashboard/settings'],
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, logout, user, fetchUser } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // Notification states
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/?limit=10');
      setNotifications(res.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  useEffect(() => {
    setMounted(true);
    
    // Read theme on mount
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');

    if (!isAuthenticated) {
      router.push('/login');
    } else {
      const init = async () => {
        await fetchUser();
        await fetchNotifications();
        setLoading(false);
      };
      init();
      // Poll notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, router]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setTheme('dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setTheme('light');
    }
  };

  if (!mounted || !isAuthenticated) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 animate-pulse"></div>
          <h1 className="text-xl font-bold tracking-wider text-slate-200">Loading TailorPro...</h1>
        </div>
      </div>
    );
  }

  const userRole = user?.role_name || '';
  const allowed = roleRoutes[userRole] || [];
  
  const filteredNavItems = navItems.filter(item => 
    allowed.some(route => item.href === route)
  );

  const isAllowedPath = allowed.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <aside className="w-64 bg-sidebar text-sidebar-foreground flex flex-col hidden md:flex border-r border-sidebar-border shadow-sm">
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight text-white">TailorPro</h1>
          <p className="text-xs text-sidebar-foreground/60 mt-1">Management System</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 relative group ${
                  isActive 
                    ? 'bg-blue-600/10 text-blue-400 font-semibold' 
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground'
                }`}
              >
                {isActive && <span className="absolute left-0 top-2.5 bottom-2.5 w-1 bg-blue-500 rounded-r-md" />}
                <item.icon className={`h-5 w-5 ${isActive ? 'text-blue-400' : 'text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 mt-auto border-t border-sidebar-border">
          <button
            onClick={() => {
              logout();
              router.push('/login');
            }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg w-full text-sidebar-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors text-sm font-medium"
          >
            <LogOut className="h-5 w-5 text-sidebar-foreground/60 group-hover:text-red-400" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6 relative z-10 shadow-xs">
          <h1 className="text-xl font-bold text-foreground md:hidden">TailorPro</h1>
          <div className="hidden md:block text-muted-foreground font-semibold text-sm">
            {pathname.includes('/users') && 'User Management'}
            {pathname.includes('/invoices') && 'Invoices & Payments'}
            {pathname.includes('/reports') && 'Analytics & Reports'}
            {pathname.includes('/customers') && 'Customers Directory'}
            {pathname.includes('/orders') && 'Orders Dashboard'}
            {pathname === '/dashboard' && 'Dashboard Overview'}
          </div>
          
          {/* Top Bar Actions */}
          <div className="flex items-center gap-4 ml-auto" ref={dropdownRef}>
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 border border-transparent hover:border-border"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>

            {/* Notifications Bell */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications();
                }}
                className="p-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 border border-transparent hover:border-border relative"
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-4 w-4 bg-red-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold ring-2 ring-white dark:ring-slate-900">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notifications Dropdown Popover */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-card rounded-xl shadow-xl border border-border py-2 text-foreground animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-border flex justify-between items-center bg-secondary/30">
                    <span className="font-semibold text-sm text-foreground">Notifications</span>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                      >
                        <CheckCheck className="h-3 w-3" /> Mark all read
                      </button>
                    )}
                  </div>
                  
                  <div className="max-h-64 overflow-y-auto divide-y divide-border">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-muted-foreground text-sm">
                        No notifications found
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div 
                          key={n.id} 
                          className={`px-4 py-3 hover:bg-secondary/30 transition-colors ${!n.is_read ? 'bg-primary/5' : ''}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-xs text-foreground">{n.title}</span>
                            {!n.is_read && (
                              <button 
                                onClick={() => handleMarkRead(n.id)}
                                className="text-[10px] text-muted-foreground hover:text-primary font-medium"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                          <span className="text-[9px] text-muted-foreground/60 block mt-1">
                            {new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} • {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Micro spacer */}
            <div className="h-6 w-px bg-border"></div>

            {/* User details */}
            <div className="text-right hidden sm:block">
              <span className="block text-xs font-semibold text-foreground">{user?.full_name || 'Loading...'}</span>
              <span className="block text-[10px] text-primary font-bold">{user?.role_name || 'Staff'}</span>
            </div>
          </div>
        </header>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          {isAllowedPath ? (
            children
          ) : (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 bg-card/50 backdrop-blur-md rounded-2xl border border-destructive/20 shadow-xl max-w-2xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-4 bg-destructive/10 text-destructive rounded-full mb-6 ring-8 ring-destructive/5">
                <ShieldAlert className="h-12 w-12" />
              </div>
              <h2 className="text-3xl font-extrabold text-foreground tracking-tight">Access Restricted</h2>
              <p className="text-muted-foreground mt-3 max-w-md leading-relaxed text-sm">
                Your account role <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{userRole || 'Guest'}</span> does not have permission to view <span className="font-mono text-xs bg-secondary text-foreground px-2 py-1 rounded-md">{pathname}</span>.
              </p>
              <div className="mt-8 flex gap-4 justify-center">
                <button
                  onClick={() => router.back()}
                  className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 text-foreground rounded-lg text-sm font-semibold transition-all duration-200 border border-border"
                >
                  Go Back
                </button>
                <Link
                  href={allowed[0] || '/dashboard'}
                  className="px-5 py-2.5 bg-primary hover:bg-primary/95 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md shadow-primary/20"
                >
                  Go to Home
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
