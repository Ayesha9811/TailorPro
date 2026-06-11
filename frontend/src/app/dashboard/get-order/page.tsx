'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Search, Package, User, Ruler, Coins, Clock, ChevronRight, Pencil } from 'lucide-react';

export default function GetOrderPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [measurement, setMeasurement] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setSelectedOrder(null);
    setSearched(true);
    try {
      // Fetch all orders and filter client-side by order number or customer
      const [ordersRes, customersRes] = await Promise.all([
        api.get('/orders/'),
        api.get('/customers/')
      ]);

      const custMap: Record<number, any> = {};
      customersRes.data.forEach((c: any) => { custMap[c.id] = c; });

      const q = searchQuery.toLowerCase().trim();
      const filtered = ordersRes.data.filter((o: any) => {
        const cust = custMap[o.customer_id];
        return (
          o.order_number.toLowerCase().includes(q) ||
          (cust?.full_name || '').toLowerCase().includes(q) ||
          (cust?.contact_number || '').includes(q) ||
          (cust?.customer_code || '').toLowerCase().includes(q) ||
          o.dress_type.toLowerCase().includes(q)
        );
      });

      // Attach customer data to results
      const enriched = filtered.map((o: any) => ({
        ...o,
        _customer: custMap[o.customer_id] || null
      }));

      setSearchResults(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOrder = async (order: any) => {
    setSelectedOrder(order);
    setCustomer(order._customer);

    // Fetch measurement
    if (order.measurement_id) {
      try {
        const measRes = await api.get(`/measurements/${order.measurement_id}`);
        setMeasurement(measRes.data);
      } catch { setMeasurement(null); }
    } else {
      setMeasurement(null);
    }

    // Fetch invoice & payments
    try {
      const invRes = await api.get('/invoices/');
      const inv = invRes.data.find((i: any) => i.order_id === order.id);
      setInvoice(inv || null);
      if (inv) {
        const payRes = await api.get(`/payments/invoice/${inv.id}`);
        setPayments(payRes.data);
      } else {
        setPayments([]);
      }
    } catch {
      setInvoice(null);
      setPayments([]);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Order Confirmed': return 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-300 border-blue-100 dark:border-blue-900/50';
      case 'Stitching Started': return 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-600 dark:text-yellow-300 border-yellow-100 dark:border-yellow-900/50';
      case 'Fitting Pending': return 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-300 border-orange-100 dark:border-orange-900/50';
      case 'Ready for Collection': return 'bg-green-50 dark:bg-green-950/40 text-green-600 dark:text-green-300 border-green-100 dark:border-green-900/50';
      case 'Collected': return 'bg-secondary text-foreground/80 border-border';
      case 'Cancelled': return 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 border-red-100 dark:border-red-900/50';
      default: return 'bg-secondary text-foreground/80 border-border';
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Get Order</h1>
        <p className="text-muted-foreground text-sm mt-1">Search and view any order by number, customer name, or phone number.</p>
      </div>

      {/* Search Bar */}
      <Card className="shadow-sm border-border bg-card">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Enter order number (ORD-2026-0001), customer name, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="pl-9 h-11 text-sm border-border text-foreground bg-card"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading} className="h-11 px-6 bg-primary hover:bg-primary/95 text-white gap-2 font-semibold">
              <Search className="w-4 h-4" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Search Results */}
        <div className="lg:col-span-2 space-y-3">
          {searched && (
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
            </p>
          )}
          {searchResults.map((order) => (
            <button
              key={order.id}
              type="button"
              onClick={() => handleSelectOrder(order)}
              className={`w-full text-left p-4 rounded-lg border transition-all ${
                selectedOrder?.id === order.id
                  ? 'border-primary bg-primary/10 shadow-md ring-1 ring-primary/20'
                  : 'border-border bg-card hover:border-border/80 hover:bg-secondary/40 hover:shadow-sm'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-mono font-bold text-sm text-foreground">{order.order_number}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{order._customer?.full_name || 'Unknown Customer'}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{order.dress_type} × {order.quantity}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/45" />
                </div>
              </div>
            </button>
          ))}
          {searched && searchResults.length === 0 && !loading && (
            <div className="text-center py-10 text-muted-foreground">
              <Package className="w-10 h-10 mx-auto mb-3 text-muted-foreground/50" />
              No orders found matching "{searchQuery}"
            </div>
          )}
        </div>

        {/* Right: Order Detail View */}
        <div className="lg:col-span-3">
          {!selectedOrder ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Package className="w-16 h-16 mb-4 text-muted-foreground/30" />
              <p className="font-medium">Select an order to view details</p>
              <p className="text-xs mt-1">Search results will appear on the left</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Order Header */}
              <Card className="overflow-hidden border-border bg-card">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 dark:from-slate-950 dark:to-slate-900 px-6 py-5 text-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedOrder.order_number}</h2>
                      <p className="text-slate-300 text-sm mt-1">{selectedOrder.category} • {selectedOrder.dress_type} × {selectedOrder.quantity}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold border ${getStatusColor(selectedOrder.status)}`}>
                      {selectedOrder.status}
                    </span>
                  </div>
                </div>
                <CardContent className="p-5 bg-card">
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground">
                      <Clock className="w-3.5 h-3.5 inline mr-1" />
                      Created: {new Date(selectedOrder.created_at).toLocaleString()}
                    </div>
                    <Link href={`/dashboard/orders/${selectedOrder.id}`}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs text-primary border-primary/25 hover:bg-primary/5">
                        <Pencil className="w-3.5 h-3.5" /> Manage Order
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>

              {/* Customer */}
              {customer && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                      <User className="w-4 h-4" /> Customer
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 bg-card">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-foreground">{customer.full_name}</p>
                        <p className="text-sm text-muted-foreground">{customer.customer_code} • {customer.contact_number}</p>
                        {customer.student_admission_no && (
                          <p className="text-xs text-muted-foreground/80 mt-1">🎓 {customer.student_admission_no}</p>
                        )}
                      </div>
                      <Link href={`/dashboard/customers/${customer.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs text-primary">Profile →</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Order Details */}
              <Card className="border-border bg-card">
                <CardHeader className="pb-3 border-b border-border">
                  <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                    <Package className="w-4 h-4" /> Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 bg-card">
                  <div className="grid grid-cols-2 gap-y-3 text-sm">
                    <div><span className="text-muted-foreground text-xs uppercase font-medium">Fabric Source</span><p className="font-semibold text-foreground mt-0.5">{selectedOrder.fabric_source || '—'}</p></div>
                    <div><span className="text-muted-foreground text-xs uppercase font-medium">Delivery Date</span><p className="font-semibold text-foreground mt-0.5">{selectedOrder.delivery_date ? new Date(selectedOrder.delivery_date).toLocaleDateString() : '—'}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground text-xs uppercase font-medium">Fabric Details</span><p className="font-semibold text-foreground mt-0.5">{selectedOrder.fabric_details || '—'}</p></div>
                    <div className="col-span-2"><span className="text-muted-foreground text-xs uppercase font-medium">Remarks</span><p className="font-semibold text-foreground mt-0.5">{selectedOrder.special_remarks || '—'}</p></div>
                  </div>
                </CardContent>
              </Card>

              {/* Measurement */}
              {measurement && (
                <Card className="border-border bg-card">
                  <CardHeader className="pb-3 border-b border-border">
                    <CardTitle className="text-sm flex items-center gap-2 text-muted-foreground">
                      <Ruler className="w-4 h-4" /> Measurement — {measurement.dress_type}
                      <span className="ml-auto font-mono text-xs text-muted-foreground">{measurement.measurement_code}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 bg-card">
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(measurement.measurement_data || {}).map(([k, v]) => (
                        <span key={k} className="bg-secondary text-foreground px-3 py-1.5 rounded-full text-xs border border-border">
                          <span className="font-semibold">{k}:</span> {v as string}
                        </span>
                      ))}
                    </div>
                    {measurement.notes && (
                      <p className="text-xs text-muted-foreground/80 mt-3 italic">📝 {measurement.notes}</p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Financial Summary */}
              {invoice && (
                <Card className="border-border bg-card shadow-sm">
                  <CardHeader className="pb-3 border-b border-border bg-primary/5">
                    <CardTitle className="text-sm flex items-center gap-2 text-foreground font-semibold">
                      <Coins className="w-4 h-4 text-primary" /> Financial Summary
                      <span className="ml-auto font-mono text-xs text-muted-foreground">{invoice.invoice_number}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3 bg-card">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Amount</span>
                      <span className="font-bold text-foreground">LKR {invoice.total_amount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Paid</span>
                      <span className="font-medium text-green-600 dark:text-green-400">LKR {invoice.paid_amount.toFixed(2)}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-semibold text-foreground">Balance</span>
                      <span className={`font-bold text-lg ${invoice.balance_amount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
                        LKR {invoice.balance_amount.toFixed(2)}
                      </span>
                    </div>
                    <div className="pt-1">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold w-full text-center border ${
                        invoice.payment_status === 'Fully Paid' ? 'bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200 dark:border-green-900/50' :
                        invoice.payment_status === 'Partially Paid' ? 'bg-yellow-50 dark:bg-yellow-950/40 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50' :
                        'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-900/50'
                      }`}>
                        {invoice.payment_status}
                      </span>
                    </div>

                    {/* Payment history */}
                    {payments.length > 0 && (
                      <div className="border-t border-border pt-3 mt-3 space-y-2">
                        <p className="text-xs text-muted-foreground font-semibold uppercase">Payment Log</p>
                        {payments.map(p => (
                          <div key={p.id} className="flex justify-between items-center text-xs bg-secondary/40 p-2.5 rounded-md border border-border">
                            <div>
                              <span className="font-semibold text-foreground">LKR {p.amount.toFixed(2)}</span>
                              <span className="text-muted-foreground ml-2">{p.method}</span>
                            </div>
                            <span className="text-muted-foreground/80">{new Date(p.created_at).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
