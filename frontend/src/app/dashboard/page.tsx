'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Users, ShoppingBag, Receipt, Clock, Calendar, 
  AlertTriangle, CheckCircle, Percent, Ruler,
  Coins, Wallet
} from "lucide-react";
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [animationProgress, setAnimationProgress] = useState(0);

  // Easing function for smooth chart entry
  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
  const easedProgress = easeOutCubic(animationProgress);

  // Generate list of selectable months dynamically (past 6 months to next 3 months)
  useEffect(() => {
    const list = [];
    const now = new Date();
    // Start from 8 months ago to 2 months ahead
    for (let i = -8; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; // "YYYY-MM"
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value, label });
    }
    setMonths(list);
    
    // Default to current month
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    setSelectedMonth(currentMonthStr);
  }, []);

  const fetchDashboard = async (monthVal: string) => {
    setLoading(true);
    setAnimationProgress(0); // Reset animation progress on new load
    setErrorMsg('');
    try {
      const res = await api.get(`/analytics/dashboard?month=${monthVal}`);
      setData(res.data);
    } catch (error: any) {
      console.error("Failed to fetch dashboard stats", error);
      setErrorMsg(error?.message || 'Network Error or Server Connection Failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedMonth) {
      fetchDashboard(selectedMonth);
    }
  }, [selectedMonth]);

  // Handle requestAnimationFrame animation loop
  useEffect(() => {
    if (!loading && data) {
      let start: number | null = null;
      const duration = 800; // 800ms animation duration
      let animationFrameId: number;

      const step = (timestamp: number) => {
        if (!start) start = timestamp;
        const progress = timestamp - start;
        const val = Math.min(progress / duration, 1);
        setAnimationProgress(val);
        if (progress < duration) {
          animationFrameId = window.requestAnimationFrame(step);
        }
      };
      animationFrameId = window.requestAnimationFrame(step);
      return () => {
        if (animationFrameId) {
          window.cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [loading, data]);

  if (loading && !data) {
    return <div className="text-center py-10 text-muted-foreground">Loading Dashboard Statistics...</div>;
  }

  if (!data) {
    return (
      <div className="text-center py-10 text-destructive">
        <h3 className="font-bold text-lg">Failed to load statistics.</h3>
        <p className="text-sm text-muted-foreground mt-2">{errorMsg}</p>
        <p className="text-xs text-muted-foreground/60 mt-4">
          Please perform a hard refresh (Ctrl+F5 or Cmd+Shift+R) or restart your frontend dev server.
        </p>
      </div>
    );
  }

  const { kpis, garment_distribution, category_distribution, recent_orders } = data;

  // Helpers to calculate percentages for charts
  const totalGarments = Object.values(garment_distribution).reduce((a: any, b: any) => a + b, 0) as number;
  const totalCategoryItems = Object.values(category_distribution).reduce((a: any, b: any) => a + b, 0) as number;

  const gentCount = category_distribution['Men'] || 0;
  const ladiesCount = category_distribution['Ladies'] || 0;
  const kidsCount = category_distribution['Kids'] || 0;

  const ladiesPercent = totalCategoryItems > 0 ? (ladiesCount / totalCategoryItems) * 100 : 0;
  const gentPercent = totalCategoryItems > 0 ? (gentCount / totalCategoryItems) * 100 : 0;
  const kidsPercent = totalCategoryItems > 0 ? (kidsCount / totalCategoryItems) * 100 : 0;

  const activeLadiesPercent = ladiesPercent * easedProgress;
  const activeGentPercent = gentPercent * easedProgress;
  const activeKidsPercent = kidsPercent * easedProgress;

  return (
    <div className="space-y-6">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Overview</h1>
          <p className="text-muted-foreground text-sm mt-1">Live store metrics and workspace status.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Month selector dropdown */}
          <div className="flex items-center gap-2 bg-secondary border border-border rounded-xl px-3 py-2 text-sm font-semibold text-foreground/80">
            <Calendar className="h-4 w-4 text-primary" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent font-bold text-foreground border-none outline-none cursor-pointer text-xs"
            >
              {months.map((m) => (
                <option key={m.value} value={m.value} className="bg-card text-foreground">{m.label}</option>
              ))}
            </select>
          </div>

          <Link href="/dashboard/orders/unified" className="w-full sm:w-auto">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md font-semibold px-6 py-2 rounded-xl text-xs w-full">
              + New Walk-in Order
            </Button>
          </Link>
        </div>
      </div>
      
      {/* 8 KPI Cards Grid */}
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-8">
        
        {/* KPI 1: Total Sales */}
        <Card className="shadow-sm border-border bg-card hover:scale-[1.01] transition-all duration-200 hover:shadow-sm cursor-default">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Total Sales</CardTitle>
            <Coins className="h-4 w-4 text-blue-500 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-black text-foreground truncate">
              LKR {kpis.total_sales.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[9px] text-muted-foreground mt-1">Stitching total</p>
          </CardContent>
        </Card>

        {/* KPI 2: Advance Collected */}
        <Card className="shadow-sm border-border bg-card hover:scale-[1.01] transition-all duration-200 hover:shadow-sm cursor-default">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Advance Recd</CardTitle>
            <Wallet className="h-4 w-4 text-green-500 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-black text-foreground truncate">
              LKR {kpis.advance_collected.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </div>
            <p className="text-[9px] text-green-600 dark:text-green-400 font-semibold mt-1">Cash in hand</p>
          </CardContent>
        </Card>

        {/* KPI 3: Total Orders */}
        <Card className="shadow-sm border-border bg-card hover:scale-[1.01] transition-all duration-200 hover:shadow-sm cursor-default">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase">Total Orders</CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-black text-foreground">{kpis.total_orders}</div>
            <p className="text-[9px] text-muted-foreground mt-1">Stitch requests</p>
          </CardContent>
        </Card>

        {/* KPI 4: Pending Orders */}
        <Link href={`/dashboard/orders?month=${selectedMonth}&status=pending`} className="block group">
          <Card className="h-full shadow-sm border-border bg-card hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-pointer hover:border-amber-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-amber-500 transition-colors">Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-black text-foreground group-hover:scale-105 transition-transform duration-200 inline-block">{kpis.pending_orders}</div>
              <p className="text-[9px] text-muted-foreground mt-1">Jobs active</p>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 5: Delayed Orders */}
        <Link href={`/dashboard/orders?status=delayed`} className="block group">
          <Card className={`h-full shadow-sm border-border bg-card hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-pointer group ${kpis.delayed_orders > 0 ? 'bg-red-500/10 border-red-500/30 hover:border-red-500/50' : 'hover:border-red-500/50'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className={`text-[10px] font-bold uppercase transition-colors ${kpis.delayed_orders > 0 ? 'text-red-500 dark:text-red-400' : 'text-muted-foreground group-hover:text-red-400'}`}>Delayed</CardTitle>
              <AlertTriangle className={`h-4 w-4 group-hover:scale-110 transition-transform duration-200 ${kpis.delayed_orders > 0 ? 'text-red-500 animate-bounce' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-black ${kpis.delayed_orders > 0 ? 'text-red-500 dark:text-red-400' : 'text-foreground'}`}>{kpis.delayed_orders}</div>
              <p className="text-[9px] text-muted-foreground mt-1">Past delivery date</p>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 6: Due Today */}
        <Link href={`/dashboard/orders?status=duetoday`} className="block group">
          <Card className="h-full shadow-sm border-border bg-card hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-pointer hover:border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Due Today</CardTitle>
              <Clock className="h-4 w-4 text-primary/70 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-black text-foreground group-hover:scale-105 transition-transform duration-200 inline-block">{kpis.due_today}</div>
              <p className="text-[9px] text-muted-foreground mt-1">Collect target</p>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 7: Ready for Pickup */}
        <Link href={`/dashboard/orders?status=Ready for Collection`} className="block group">
          <Card className={`h-full shadow-sm border-border bg-card hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-pointer group ${kpis.ready_for_collection > 0 ? 'bg-green-500/10 border-green-500/30 hover:border-green-500/50' : 'hover:border-green-500/50'}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className={`text-[10px] font-bold uppercase transition-colors ${kpis.ready_for_collection > 0 ? 'text-green-500 dark:text-green-400' : 'text-muted-foreground group-hover:text-green-400'}`}>Ready for Pickup</CardTitle>
              <CheckCircle className={`h-4 w-4 group-hover:scale-110 transition-transform duration-200 ${kpis.ready_for_collection > 0 ? 'text-green-500' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-lg font-black ${kpis.ready_for_collection > 0 ? 'text-green-500 dark:text-green-400' : 'text-foreground'}`}>{kpis.ready_for_collection}</div>
              <p className="text-[9px] text-muted-foreground mt-1">Stitching complete</p>
            </CardContent>
          </Card>
        </Link>

        {/* KPI 8: Collected Orders */}
        <Link href={`/dashboard/orders?month=${selectedMonth}&status=Collected`} className="block group">
          <Card className="h-full shadow-sm border-border bg-card hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-pointer hover:border-blue-500/50">
            <CardHeader className="flex flex-row items-center justify-between pb-1">
              <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase group-hover:text-primary transition-colors">Collected</CardTitle>
              <CheckCircle className="h-4 w-4 text-primary group-hover:scale-110 transition-transform duration-200" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-black text-foreground group-hover:scale-105 transition-transform duration-200 inline-block">{kpis.collected_orders || 0}</div>
              <p className="text-[9px] text-muted-foreground mt-1">Stitches delivered</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Visual Analytics / Distributions */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Garment Type Distribution */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">Garment Stitching Mix</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {totalGarments === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs font-semibold">
                No orders placed in this month.
              </div>
            ) : (
              Object.entries(garment_distribution).map(([type, count]: any) => {
                const percentage = totalGarments > 0 ? (count / totalGarments) * 100 : 0;
                const activeWidth = percentage * easedProgress;
                return (
                  <div key={type} className="space-y-1 group/row cursor-default p-1.5 rounded-lg hover:bg-secondary/40 transition-all duration-150">
                    <div className="flex justify-between items-center text-xs font-bold text-foreground/80 group-hover/row:text-primary transition-colors">
                      <span>{type}</span>
                      <span>{count} orders ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/30">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 group-hover/row:scale-x-[1.01] group-hover/row:brightness-110 ${
                          type === 'Shirt' ? 'bg-primary' :
                          type === 'Frock' ? 'bg-pink-500' :
                          type === 'Trouser' ? 'bg-emerald-500' :
                          type === 'Shorts' ? 'bg-amber-500' :
                          'bg-violet-500'
                        }`}
                        style={{ width: `${activeWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Category distribution (Ladies, Gent, Kids) */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">Customer Category Share</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-center h-full min-h-[220px]">
            {totalCategoryItems === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-xs font-semibold">
                No orders placed in this month.
              </div>
            ) : (
              <div className="space-y-6">
                {/* Donut Pie Chart */}
                <div className="flex justify-center py-2">
                  <div 
                    className="relative w-36 h-36 rounded-full flex items-center justify-center shadow-xs border border-border hover:scale-105 hover:shadow-md transition-all duration-300 cursor-pointer group/chart"
                    style={{
                      background: `conic-gradient(
                        #ec4899 0% ${activeLadiesPercent}%,
                        var(--color-primary) ${activeLadiesPercent}% ${activeLadiesPercent + activeGentPercent}%,
                        #f59e0b ${activeLadiesPercent + activeGentPercent}% ${easedProgress * 100}%,
                        transparent ${easedProgress * 100}% 100%
                      )`
                    }}
                  >
                    {/* Inner circle for donut styling */}
                    <div className="w-24 h-24 rounded-full bg-card flex flex-col items-center justify-center shadow-xs group-hover/chart:scale-[0.96] transition-all duration-350">
                      <span className="text-2xl font-black text-foreground group-hover/chart:scale-110 transition-transform duration-300">{totalCategoryItems}</span>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider group-hover/chart:text-primary transition-colors duration-300">Total</span>
                    </div>
                  </div>
                </div>

                {/* Legend and stats */}
                <div className="grid grid-cols-3 gap-4 border-t border-border pt-4">
                  <div className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary/40 cursor-default transition-all duration-200 group/legend hover:scale-105">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-pink-700 dark:text-pink-400 group-hover/legend:scale-105 transition-transform">
                      <span className="h-3 w-3 rounded-full bg-pink-500 inline-block animate-pulse" />
                      <span>Ladies</span>
                    </div>
                    <span className="text-lg font-black text-foreground mt-1">
                      {ladiesCount} <span className="text-[10px] font-normal text-muted-foreground">({Math.round(ladiesPercent)}%)</span>
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary/40 cursor-default transition-all duration-200 group/legend hover:scale-105">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-primary dark:text-primary-foreground group-hover/legend:scale-105 transition-transform">
                      <span className="h-3 w-3 rounded-full bg-primary inline-block animate-pulse" />
                      <span>Men/Gent</span>
                    </div>
                    <span className="text-lg font-black text-foreground mt-1">
                      {gentCount} <span className="text-[10px] font-normal text-muted-foreground">({Math.round(gentPercent)}%)</span>
                    </span>
                  </div>

                  <div className="flex flex-col items-center p-2 rounded-lg hover:bg-secondary/40 cursor-default transition-all duration-200 group/legend hover:scale-105">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 dark:text-amber-400 group-hover/legend:scale-105 transition-transform">
                      <span className="h-3 w-3 rounded-full bg-amber-500 inline-block animate-pulse" />
                      <span>Kids</span>
                    </div>
                    <span className="text-lg font-black text-foreground mt-1">
                      {kidsCount} <span className="text-[10px] font-normal text-muted-foreground">({Math.round(kidsPercent)}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Status Breakdown Chart */}
        <Card className="shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-base font-bold text-foreground">Order Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {(!data.status_distribution || Object.keys(data.status_distribution).length === 0) ? (
              <div className="text-center py-10 text-muted-foreground text-xs font-semibold">
                No orders placed in this month.
              </div>
            ) : (
              Object.entries(data.status_distribution).map(([status, count]: any) => {
                const totalStatusItems = Object.values(data.status_distribution).reduce((a: any, b: any) => a + b, 0) as number;
                const percentage = totalStatusItems > 0 ? (count / totalStatusItems) * 100 : 0;
                const activeWidth = percentage * easedProgress;
                return (
                  <div key={status} className="space-y-1 group/row cursor-default p-1.5 rounded-lg hover:bg-secondary/40 transition-all duration-150">
                    <div className="flex justify-between items-center text-xs font-bold text-foreground/80 group-hover/row:text-primary transition-colors">
                      <span>{status}</span>
                      <span>{count} orders ({Math.round(percentage)}%)</span>
                    </div>
                    <div className="h-3 w-full bg-secondary rounded-full overflow-hidden border border-border/30">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 group-hover/row:scale-x-[1.01] group-hover/row:brightness-110 ${
                          status === 'Order Confirmed' ? 'bg-primary' :
                          status === 'Stitching Started' ? 'bg-blue-500' :
                          status === 'Ready for Collection' ? 'bg-emerald-500' :
                          status === 'Collected' ? 'bg-green-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${activeWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        {/* Recent Orders Table */}
        <Card className="col-span-4 shadow-sm border-border bg-card">
          <CardHeader>
            <CardTitle className="text-lg text-foreground">Recent Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {recent_orders.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">No recent orders found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-secondary/40 text-muted-foreground font-medium">
                    <tr>
                      <th className="px-4 py-3 rounded-tl-md">Order ID</th>
                      <th className="px-4 py-3">Customer</th>
                      <th className="px-4 py-3">Garment</th>
                      <th className="px-4 py-3 rounded-tr-md">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {recent_orders.map((o: any) => (
                      <tr key={o.id} className="hover:bg-primary/5 transition-all duration-150 cursor-pointer group/row">
                        <td className="px-4 py-3 font-semibold text-foreground">
                          <Link href={`/dashboard/orders/${o.id}`} className="hover:underline text-primary group-hover/row:font-bold transition-all">
                            {o.order_number}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-foreground/80 group-hover/row:text-foreground font-medium transition-colors">{o.customer_name}</td>
                        <td className="px-4 py-3 text-foreground/80 font-medium">{o.dress_type}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-foreground/80 border border-border group-hover/row:border-primary/20 group-hover/row:bg-primary/10 group-hover/row:text-primary transition-all">
                            {o.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="col-span-3 shadow-sm border-border bg-card">
          <CardHeader className="bg-primary/5 border-b border-border">
            <CardTitle className="text-lg text-foreground">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Link href="/dashboard/orders/unified" className="block w-full">
              <Button className="w-full justify-start text-left bg-card text-foreground border-border hover:bg-secondary" variant="outline">
                <span className="mr-2">📝</span> Walk-in Customer Entry
              </Button>
            </Link>
            <Link href="/dashboard/measurements" className="block w-full">
              <Button className="w-full justify-start text-left bg-card text-foreground border-border hover:bg-secondary" variant="outline">
                <span className="mr-2">📏</span> Browse Measurement History
              </Button>
            </Link>
            <Link href="/dashboard/customers" className="block w-full">
              <Button className="w-full justify-start text-left bg-card text-foreground border-border hover:bg-secondary" variant="outline">
                <span className="mr-2">👥</span> Search Customer Profiles
              </Button>
            </Link>
            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                System online and processing data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
