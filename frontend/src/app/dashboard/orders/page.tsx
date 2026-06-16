'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Plus } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const paramStatus = searchParams.get('status');
  const paramMonth = searchParams.get('month');
  const { user } = useAuthStore();

  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(paramStatus || 'all');
  const [selectedMonth, setSelectedMonth] = useState(paramMonth || 'all');
  const [garmentFilter, setGarmentFilter] = useState('all');
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    const list = [];
    const now = new Date();
    for (let i = -8; i <= 2; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      list.push({ value, label });
    }
    setMonths(list);
  }, []);

  useEffect(() => {
    if (paramStatus) {
      setStatusFilter(paramStatus);
    }
    if (paramMonth) {
      setSelectedMonth(paramMonth);
    }
  }, [paramStatus, paramMonth]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const [ordersRes, customersRes] = await Promise.all([
          api.get('/orders/'),
          api.get('/customers/')
        ]);
        setOrders(ordersRes.data);
        // Index customers by ID
        const custMap: Record<number, any> = {};
        customersRes.data.forEach((c: any) => { custMap[c.id] = c; });
        setCustomers(custMap);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Order Confirmed': return 'bg-blue-100 text-blue-800';
      case 'Stitching Started': return 'bg-yellow-100 text-yellow-800';
      case 'Fitting Pending': return 'bg-orange-100 text-orange-800';
      case 'Ready for Collection': return 'bg-green-100 text-green-800';
      case 'Collected': return 'bg-slate-100 text-slate-600';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const uniqueGarmentTypes = Array.from(new Set(orders.map((o: any) => o.dress_type))).filter(Boolean);

  const filteredOrders = orders.filter(o => {
    const cust = customers[o.customer_id];
    const matchesSearch = !search ||
      o.order_number.toLowerCase().includes(search.toLowerCase()) ||
      (cust?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
      o.dress_type.toLowerCase().includes(search.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter !== 'all') {
      if (statusFilter === 'pending') {
        matchesStatus = o.status !== 'Ready for Collection' && o.status !== 'Collected' && o.status !== 'Cancelled';
      } else if (statusFilter === 'delayed') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        matchesStatus = o.delivery_date && new Date(o.delivery_date) < todayStart && 
          (o.status === 'Order Confirmed' || o.status === 'Stitching Started');
      } else if (statusFilter === 'duetoday') {
        const todayStr = new Date().toDateString();
        matchesStatus = o.delivery_date && new Date(o.delivery_date).toDateString() === todayStr &&
          (o.status === 'Order Confirmed' || o.status === 'Stitching Started');
      } else {
        matchesStatus = o.status === statusFilter;
      }
    }

    const matchesMonth = selectedMonth === 'all' || (o.created_at && o.created_at.startsWith(selectedMonth));
    const matchesGarment = garmentFilter === 'all' || o.dress_type === garmentFilter;
    return matchesSearch && matchesStatus && matchesMonth && matchesGarment;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Orders</h1>
          <p className="text-slate-500 text-sm mt-1">{filteredOrders.length} of {orders.length} orders shown</p>
        </div>
        {user?.role_name !== 'Cashier' && (
          <Link href="/dashboard/orders/unified">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-md gap-2">
              <Plus className="w-4 h-4" /> New Walk-in Order
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <div className="flex flex-col md:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search by order no., customer name, or garment..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-full"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 h-9 text-sm bg-white text-slate-800 border-slate-200">
                  <SelectValue placeholder="All Months" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Months</SelectItem>
                  {months.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={garmentFilter} onValueChange={setGarmentFilter}>
                <SelectTrigger className="w-40 h-9 text-sm bg-white text-slate-800 border-slate-200">
                  <SelectValue placeholder="All Garments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Garments</SelectItem>
                  {uniqueGarmentTypes.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 h-9 text-sm bg-white text-slate-800 border-slate-200">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="duetoday">Due Today</SelectItem>
                  <SelectItem value="Order Confirmed">Order Confirmed</SelectItem>
                  <SelectItem value="Stitching Started">Stitching Started</SelectItem>
                  <SelectItem value="Ready for Collection">Ready for Collection</SelectItem>
                  <SelectItem value="Collected">Collected</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-xs text-slate-500 uppercase tracking-wide border-b">
                <tr>
                  <th className="px-5 py-3">Order No.</th>
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Garment</th>
                  <th className="px-5 py-3">Delivery Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mx-auto mb-2" />
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400 text-sm">
                      {search || statusFilter !== 'all' ? 'No orders match your filters.' : 'No orders yet. Create your first order!'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const cust = customers[order.customer_id];
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5 font-mono font-semibold text-slate-800 text-xs">{order.order_number}</td>
                        <td className="px-5 py-3.5">
                          {cust ? (
                            <Link href={`/dashboard/customers/${cust.id}`} className="hover:underline text-indigo-600 font-medium">
                              {cust.full_name}
                            </Link>
                          ) : (
                            <span className="text-slate-400">Unknown</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          <span className="font-medium">{order.dress_type}</span>
                          <span className="text-slate-400 text-xs ml-1">×{order.quantity}</span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-500 text-xs">
                          {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(order.status)}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          <Link href={`/dashboard/orders/${order.id}`}>
                            <Button variant="ghost" size="sm" className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 text-xs">
                              Manage →
                            </Button>
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mr-3" />
        Loading orders...
      </div>
    }>
      <OrdersPageContent />
    </Suspense>
  );
}
