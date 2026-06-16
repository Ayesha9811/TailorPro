'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  ArrowLeft, Save, Pencil, Check, X, Printer, Scissors, Ruler, 
  Sparkles, ShoppingBag, Coins, Wallet, Clock, Activity, FileText, User,
  Phone, Mail, Calendar, CreditCard, ShieldAlert, CheckCircle2, ChevronRight, Hash
} from 'lucide-react';
import InvoicePrint from '@/components/invoice-print';
import { useAuthStore } from '@/store/authStore';
import { hasEditPermission } from '@/lib/permissions';

const statuses = [
  { name: 'Order Confirmed', icon: ShoppingBag, description: 'Order registered' },
  { name: 'Stitching Started', icon: Scissors, description: 'Tailor assigned' },
  { name: 'Ready for Collection', icon: Sparkles, description: 'Quality check ok' },
  { name: 'Collected', icon: Check, description: 'Picked up' }
];

export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const orderId = unwrappedParams.id;
  const { user } = useAuthStore();
  const [order, setOrder] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [measurement, setMeasurement] = useState<any>(null);
  const [invoice, setInvoice] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);

  // Edit mode
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    delivery_date: '',
    fabric_source: '',
    fabric_details: '',
    special_remarks: '',
    internal_notes: '',
    quantity: 1
  });
  const [saving, setSaving] = useState(false);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const fetchData = async () => {
    try {
      const orderRes = await api.get(`/orders/${orderId}`);
      const ord = orderRes.data;
      setOrder(ord);

      // Fetch customer
      if (ord.customer_id) {
        try {
          const custRes = await api.get(`/customers/${ord.customer_id}`);
          setCustomer(custRes.data);
        } catch {}
      }

      // Fetch measurement
      if (ord.measurement_id) {
        try {
          const measRes = await api.get(`/measurements/${ord.measurement_id}`);
          setMeasurement(measRes.data);
        } catch {}
      }
      
      // Fetch Invoice
      const invRes = await api.get('/invoices/');
      const currentInvoice = invRes.data.find((i: any) => i.order_id === ord.id);
      setInvoice(currentInvoice);

      if (currentInvoice) {
        const payRes = await api.get(`/payments/invoice/${currentInvoice.id}`);
        setPayments(payRes.data);
      }

      // Populate edit data
      setEditData({
        delivery_date: ord.delivery_date ? ord.delivery_date.split('T')[0] : '',
        fabric_source: ord.fabric_source || '',
        fabric_details: ord.fabric_details || '',
        special_remarks: ord.special_remarks || '',
        internal_notes: ord.internal_notes || '',
        quantity: ord.quantity || 1
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [orderId]);

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.put(`/orders/${order.id}/status?status=${encodeURIComponent(newStatus)}`);
      setOrder({ ...order, status: newStatus });
    } catch {
      alert("Failed to update status");
    }
  };

  const handleSaveDetails = async () => {
    setSaving(true);
    try {
      const payload: any = { ...editData };
      if (payload.delivery_date) {
        payload.delivery_date = new Date(payload.delivery_date).toISOString();
      } else {
        delete payload.delivery_date;
      }
      payload.quantity = parseInt(payload.quantity) || 1;

      await api.put(`/orders/${order.id}`, payload);
      setIsEditing(false);
      fetchData();
    } catch (err) {
      alert("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || !paymentAmount) return;
    setSubmittingPayment(true);
    try {
      await api.post('/payments/', {
        invoice_id: invoice.id,
        amount: parseFloat(paymentAmount),
        method: paymentMethod
      });
      setPaymentAmount('');
      fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.detail || "Payment failed");
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-slate-400">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin mb-4" />
      <span className="text-sm font-bold tracking-wider text-slate-500">Loading Premium Console...</span>
    </div>
  );
  if (!order) return <div className="text-center py-20 text-slate-500 font-bold">Order workspace details not found.</div>;

  const currentStepIdx = Math.max(0, statuses.findIndex(s => s.name === order.status));
  const percentPaid = invoice ? (invoice.paid_amount / invoice.total_amount) * 100 : 0;

  // Status configuration helper for active glows and styles
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'Order Confirmed': return { text: 'text-sky-400', border: 'border-sky-500/20', bg: 'bg-sky-500/10', glow: 'shadow-sky-500/20 bg-sky-500' };
      case 'Stitching Started': return { text: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/10', glow: 'shadow-amber-500/20 bg-amber-500' };
      case 'Fitting Pending': return { text: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/10', glow: 'shadow-orange-500/20 bg-orange-500' };
      case 'Ready for Collection': return { text: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/10', glow: 'shadow-emerald-500/20 bg-emerald-500 animate-pulse' };
      case 'Collected': return { text: 'text-slate-400', border: 'border-slate-500/20', bg: 'bg-slate-500/10', glow: 'shadow-slate-500/20 bg-slate-500' };
      case 'Cancelled': return { text: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/10', glow: 'shadow-red-500/20 bg-red-500' };
      default: return { text: 'text-indigo-400', border: 'border-indigo-500/20', bg: 'bg-indigo-500/10', glow: 'shadow-indigo-500/20 bg-indigo-500' };
    }
  };

  const statusConfig = getStatusConfig(order.status);

  // Delivery proximity helper
  const getDeliveryProximity = (dateStr: string, status: string) => {
    if (!dateStr) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const delDate = new Date(dateStr);
    delDate.setHours(0, 0, 0, 0);
    
    const isPendingStatus = status === 'Order Confirmed' || status === 'Stitching Started';
    
    // Calculate difference in days
    const diffTime = delDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      if (isPendingStatus) {
        return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-500 bg-red-500/5 border-red-500/20' };
      }
      return null;
    }
    if (diffDays === 0) {
      if (isPendingStatus) {
        return { text: 'Due today', color: 'text-orange-500 bg-orange-500/5 border-orange-500/20 animate-pulse' };
      }
      return null;
    }
    if (diffDays === 1) {
      return { text: 'Due tomorrow', color: 'text-amber-500 bg-amber-500/5 border-amber-500/20' };
    }
    return { text: `${diffDays} days left`, color: 'text-emerald-500 bg-emerald-500/5 border-emerald-500/20' };
  };

  const deliveryProximity = getDeliveryProximity(order.delivery_date, order.status);

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16 px-4 sm:px-6 lg:px-8">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard/orders">
          <Button variant="ghost" size="sm" className="gap-2 text-slate-500 hover:text-slate-900 group font-bold">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" /> Back to Orders
          </Button>
        </Link>
      </div>

      {/* Modern Glassmorphic Header Banner */}
      <div className="bg-gradient-to-br from-slate-950 via-[#0b0f1a] to-[#120f2b] text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        {/* Glow vector decorations */}
        <div className="absolute right-0 top-0 h-48 w-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-32 w-32 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-3 relative z-10">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono font-bold tracking-wider uppercase border border-slate-700/60 shadow-inner">
              <Hash className="w-3 h-3 text-indigo-400" /> ID: {order.id}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-950/40 text-indigo-300 px-3 py-1 rounded-full font-mono font-bold tracking-wider uppercase border border-indigo-800/30 shadow-inner">
              Code: {order.order_number}
            </span>
          </div>

          <div className="space-y-1">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
              {order.dress_type}
            </h1>
            <p className="text-slate-400 text-sm font-semibold flex items-center gap-2">
              Category: <span className="text-slate-200 font-bold">{order.category}</span>
              <span className="text-slate-600">•</span>
              Qty: <span className="text-slate-200 font-bold">{order.quantity} pcs</span>
            </p>
          </div>

          <p className="text-xs text-slate-500 font-medium flex items-center gap-2 bg-slate-900/50 p-2 rounded-lg border border-slate-800/40 w-fit">
            <Clock className="w-3.5 h-3.5 text-indigo-400" /> Created: <span className="text-slate-300 font-semibold">{new Date(order.created_at).toLocaleString()}</span>
          </p>
        </div>

        {/* Status Controller Area */}
        <div className="flex flex-col sm:flex-row md:flex-col lg:flex-row items-stretch sm:items-center gap-4 bg-white/[0.03] backdrop-blur-md p-5 rounded-2xl border border-white/5 w-full md:w-auto relative z-10 shadow-lg">
          <div className="flex items-center gap-2">
            <span className={`h-2.5 w-2.5 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.4)] ${statusConfig.glow}`} />
            <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Workspace Status:</Label>
          </div>
          <Select value={order.status} onValueChange={handleStatusChange} disabled={!hasEditPermission(user, '/dashboard/orders')}>
            <SelectTrigger className="w-full sm:w-56 bg-slate-900 border-slate-700/80 text-white font-bold shadow-inner focus:ring-indigo-500 focus:ring-2" disabled={!hasEditPermission(user, '/dashboard/orders')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-900 text-white border-slate-800">
              <SelectItem value="Order Confirmed">Order Confirmed</SelectItem>
              <SelectItem value="Stitching Started">Stitching Started</SelectItem>
              <SelectItem value="Ready for Collection">Ready for Collection</SelectItem>
              <SelectItem value="Collected">Collected</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Production Progress Lifecycle */}
      {order.status !== 'Cancelled' ? (
        <Card className="shadow-lg border-slate-200 overflow-hidden bg-white/70 backdrop-blur-sm">
          <CardHeader className="bg-slate-50/50 pb-3 border-b border-slate-100 flex items-center justify-between">
            <CardTitle className="text-[10px] uppercase text-slate-500 font-black tracking-widest flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-indigo-600" /> Production Lifecycle Progress
            </CardTitle>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
              Stage {currentStepIdx + 1} of {statuses.length}
            </span>
          </CardHeader>
          <CardContent className="py-10 px-4 sm:px-8">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 md:gap-4 relative">
              {/* Connector Progress Bar (Desktop only) */}
              <div className="hidden md:block absolute top-[22px] left-[5%] right-[5%] h-1 bg-slate-100 rounded-full z-0 overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]" 
                  style={{ width: `${(currentStepIdx / (statuses.length - 1)) * 90}%` }}
                />
              </div>

              {statuses.map((step, idx) => {
                const StepIcon = step.icon;
                const isCompleted = currentStepIdx >= idx;
                const isActive = currentStepIdx === idx;
                
                return (
                  <div key={step.name} className="flex flex-row md:flex-col items-center gap-4 md:gap-2.5 flex-1 relative z-10 w-full group">
                    {/* Circle Icon Indicator */}
                    <div className={`w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all duration-300 shrink-0 ${
                      isCompleted 
                        ? 'bg-gradient-to-br from-indigo-500 to-indigo-700 border-indigo-600 text-white shadow-lg scale-105' 
                        : 'bg-white border-slate-200 text-slate-400 group-hover:border-slate-400'
                    } ${isActive ? 'ring-4 ring-indigo-500/25 animate-pulse' : ''}`}>
                      <StepIcon className="w-5 h-5" />
                    </div>

                    {/* Metadata Detail Row */}
                    <div className="text-left md:text-center space-y-0.5">
                      <p className={`text-[11px] font-black uppercase tracking-wide transition-colors ${
                        isCompleted ? 'text-indigo-600' : 'text-slate-400 font-bold'
                      }`}>
                        {step.name}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium md:block">
                        {step.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-red-500/10 border border-red-500/20 text-red-700 p-5 rounded-2xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300 shadow-md">
          <ShieldAlert className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-sm text-red-800">Tailoring Order Cancelled</h3>
            <p className="text-xs text-red-700/80 leading-relaxed font-semibold">
              This order has been permanently closed. Operations, stitching status progress, and billing alterations are suspended.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid Content Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Double Columns (Blueprint & Details) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Customer Profile Card */}
          {customer && (
            <Card className={`hover:shadow-lg transition-all duration-300 border overflow-hidden group rounded-2xl ${
              customer.gender_category === 'Men' ? 'bg-gradient-to-br from-blue-50/20 via-white to-blue-50/10 border-blue-100' :
              customer.gender_category === 'Ladies' ? 'bg-gradient-to-br from-pink-50/20 via-white to-pink-50/10 border-pink-100' :
              'bg-gradient-to-br from-amber-50/20 via-white to-amber-50/10 border-amber-100'
            }`}>
              <CardHeader className="pb-3 border-b border-slate-100/60 bg-white/40 flex flex-row items-center justify-between">
                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-500" /> Customer Workspace
                </CardTitle>
                <Link href={`/dashboard/customers/${customer.id}`}>
                  <Button variant="outline" size="sm" className="h-7 text-xs font-bold text-indigo-600 border-indigo-200 hover:bg-indigo-50 shadow-xs">
                    View Profile <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col sm:flex-row items-center sm:items-start gap-6">
                {/* Visual Custom Avatar */}
                <div className={`w-16 h-16 rounded-2xl border-2 p-1.5 flex items-center justify-center shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105 ${
                  customer.gender_category === 'Men' ? 'border-blue-300 bg-blue-50/50 text-blue-600' :
                  customer.gender_category === 'Ladies' ? 'border-pink-300 bg-pink-50/50 text-pink-600' :
                  'border-amber-300 bg-amber-50/50 text-amber-600'
                }`}>
                  <span className="text-xl font-black font-mono">
                    {customer.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                  </span>
                </div>
                
                <div className="space-y-3 text-center sm:text-left flex-1">
                  <div>
                    <h4 className="font-black text-slate-900 text-xl tracking-tight">{customer.full_name}</h4>
                    <div className="flex flex-wrap justify-center sm:justify-start items-center gap-2 mt-1">
                      <span className="text-[10px] font-bold font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {customer.customer_code}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        customer.gender_category === 'Men' ? 'bg-blue-100/60 text-blue-700 border-blue-200' :
                        customer.gender_category === 'Ladies' ? 'bg-pink-100/60 text-pink-700 border-pink-200' :
                        'bg-amber-100/60 text-amber-700 border-amber-200'
                      }`}>
                        {customer.gender_category}
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600 pt-3 border-t border-slate-100/60">
                    <a href={`tel:${customer.contact_number}`} className="flex items-center justify-center sm:justify-start gap-1.5 hover:text-indigo-600 transition-colors font-semibold group/contact">
                      <Phone className="w-3.5 h-3.5 text-slate-400 group-hover/contact:text-indigo-500" /> Phone: <span className="font-bold text-slate-800 underline">{customer.contact_number}</span>
                    </a>
                    {customer.email && (
                      <a href={`mailto:${customer.email}`} className="flex items-center justify-center sm:justify-start gap-1.5 hover:text-indigo-600 transition-colors font-semibold group/contact">
                        <Mail className="w-3.5 h-3.5 text-slate-400 group-hover/contact:text-indigo-500" /> Email: <span className="font-bold text-slate-800 underline truncate">{customer.email}</span>
                      </a>
                    )}
                    {customer.student_admission_no && (
                      <div className="col-span-1 sm:col-span-2 flex items-center justify-center sm:justify-start gap-1.5 text-slate-500">
                        🎓 Student ID: <span className="font-bold text-slate-800">{customer.student_admission_no}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Garment Specifications Panel */}
          <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 rounded-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 bg-slate-50/30">
              <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" /> Garment Specifications
              </CardTitle>
              {!isEditing ? (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-1.5 text-xs h-8 font-bold text-slate-700 border-slate-200 hover:bg-slate-50 shadow-xs" 
                  onClick={() => setIsEditing(true)}
                  disabled={!hasEditPermission(user, '/dashboard/orders')}
                >
                  <Pencil className="w-3.5 h-3.5" /> Edit Specs
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-1 text-xs h-8 font-bold" onClick={() => setIsEditing(false)}>
                    <X className="w-3.5 h-3.5" /> Cancel
                  </Button>
                  <Button size="sm" className="gap-1 text-xs h-8 bg-green-600 hover:bg-green-700 text-white font-bold" onClick={handleSaveDetails} disabled={saving}>
                    <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : 'Save'}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-6">
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Quantity</Label>
                    <Input type="number" min="1" value={editData.quantity} onChange={e => setEditData({...editData, quantity: parseInt(e.target.value) || 1})} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Delivery Date</Label>
                    <Input 
                      type="date" 
                      value={editData.delivery_date} 
                      onChange={e => setEditData({...editData, delivery_date: e.target.value})} 
                      disabled={!!order.delivery_date && !['Super Admin', 'Owner / Manager', 'CEO'].includes(user?.role_name || '')}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Fabric Source</Label>
                    <Select value={editData.fabric_source} onValueChange={v => setEditData({...editData, fabric_source: v})}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Store">Store Provided</SelectItem>
                        <SelectItem value="Customer Provided">Customer Provided</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Fabric Color / Details</Label>
                    <Input value={editData.fabric_details} onChange={e => setEditData({...editData, fabric_details: e.target.value})} />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Tailoring Instructions (Remarks)</Label>
                    <Input value={editData.special_remarks} onChange={e => setEditData({...editData, special_remarks: e.target.value})} />
                  </div>
                  <div className="col-span-1 sm:col-span-2 space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Internal Notes (Staff only)</Label>
                    <Input value={editData.internal_notes} onChange={e => setEditData({...editData, internal_notes: e.target.value})} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider">Quantity to Stitch</span>
                    <p className="font-extrabold text-slate-800 text-lg mt-1">{order.quantity} pieces</p>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
                    <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider">Delivery Proximity</span>
                    <div className="flex items-center justify-between gap-3 mt-1.5">
                      <p className="font-bold text-slate-800 text-base">
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : '—'}
                      </p>
                      {deliveryProximity && (
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-md border ${deliveryProximity.color}`}>
                          {deliveryProximity.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-1">
                    <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider">Fabric Source</span>
                    <p className="font-bold text-slate-700 mt-1 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${order.fabric_source === 'Store' ? 'bg-indigo-500' : 'bg-amber-500'}`} />
                      {order.fabric_source || '—'}
                    </p>
                  </div>

                  <div className="p-1">
                    <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider">Fabric Description</span>
                    <p className="font-bold text-slate-700 mt-1">{order.fabric_details || '—'}</p>
                  </div>

                  <div className="col-span-1 sm:col-span-2 border-t border-slate-100 pt-4">
                    <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider">Special Tailoring Remarks</span>
                    <p className="text-slate-700 font-semibold mt-1.5 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-slate-100/60 whitespace-pre-wrap">
                      {order.special_remarks || 'No special remarks provided.'}
                    </p>
                  </div>

                  <div className="col-span-1 sm:col-span-2 border-t border-slate-100 pt-4">
                    <span className="text-slate-400 text-[10px] font-black uppercase block tracking-wider">Internal Staff Notes</span>
                    <p className="text-slate-600 font-semibold mt-1.5 leading-relaxed bg-indigo-50/20 p-3.5 rounded-xl border border-indigo-100/30">
                      {order.internal_notes || 'No internal notes recorded.'}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
 
          {/* Linked Measurement Blueprint Details */}
          {measurement && (
            <Card className="shadow-lg border-indigo-950/20 rounded-2xl bg-[#090e1a] text-indigo-100 overflow-hidden relative">
              {/* Technical Blueprint Watermark */}
              <div className="absolute right-0 bottom-0 pointer-events-none opacity-5 translate-x-4 translate-y-4">
                <Ruler className="w-72 h-72 text-indigo-400" />
              </div>

              <CardHeader className="pb-3 border-b border-indigo-950/70 bg-indigo-950/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 relative z-10">
                <CardTitle className="text-[10px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-emerald-400" /> Measurement Technical Blueprint
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono text-indigo-300 bg-indigo-950 px-2.5 py-0.5 rounded border border-indigo-800/50 text-[10px] font-bold">
                    Ref: {measurement.measurement_code}
                  </span>
                  <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400">
                    {measurement.dress_type}
                  </span>
                  {measurement.is_used_in_order && (
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                      🔒 Profile Locked
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-6 relative z-10">
                {/* Tech Blueprint Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {Object.entries(measurement.measurement_data || {}).map(([k, v]) => (
                    <div key={k} className="bg-indigo-950/45 p-3.5 rounded-xl border border-indigo-900/60 hover:border-indigo-500/30 transition-colors flex flex-col justify-between">
                      <span className="text-indigo-400/70 text-[9px] font-black uppercase tracking-wider truncate mb-1">{k}</span>
                      <span className="font-extrabold text-white text-base font-mono">{v as string}</span>
                    </div>
                  ))}
                </div>
                {measurement.notes && (
                  <div className="text-xs text-indigo-300 mt-5 italic bg-indigo-950/30 p-3.5 rounded-xl border border-indigo-900/40">
                    📝 Note: {measurement.notes}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Sidebar Columns (Financial & Payments Ledger) */}
        <div className="space-y-8">
          
          {/* Financial Invoice Card */}
          {invoice && (
            <Card className="border-indigo-100 hover:shadow-lg transition-all duration-300 overflow-hidden shadow-md rounded-2xl bg-white">
              <div className="bg-gradient-to-br from-indigo-50/50 to-indigo-100/30 px-6 py-5 border-b border-indigo-100/80 flex justify-between items-start">
                <div className="space-y-0.5">
                  <CardTitle className="text-indigo-950 font-black text-lg">Billing & Invoice</CardTitle>
                  <CardDescription className="text-indigo-600 font-bold font-mono text-xs">{invoice.invoice_number}</CardDescription>
                </div>
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black tracking-wide border uppercase
                  ${invoice.payment_status === 'Fully Paid' ? 'bg-green-50 text-green-700 border-green-200' : 
                    invoice.payment_status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                    'bg-red-50 text-red-700 border-red-200'}`}>
                  {invoice.payment_status}
                </span>
              </div>
              <CardContent className="p-6 space-y-5">
                
                {/* Visual Payment Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500 font-bold">Collected Coverage</span>
                    <span className="font-black text-indigo-700">{Math.round(percentPaid)}%</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 shadow-xs ${
                        percentPaid >= 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'
                      }`} 
                      style={{ width: `${percentPaid}%` }} 
                    />
                  </div>
                </div>

                <div className="space-y-2.5 text-sm pt-2">
                  <div className="flex justify-between py-1 text-slate-600 font-semibold">
                    <span>Total Billed</span>
                    <span className="font-extrabold text-slate-900">LKR {invoice.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-100/60 pt-2.5 text-slate-600 font-semibold">
                    <span>Paid Amount</span>
                    <span className="font-bold text-green-600">LKR {invoice.paid_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                  </div>
                  <div className="border-t border-indigo-100 pt-3.5 flex justify-between items-center">
                    <span className="font-black text-slate-800 text-sm">Remaining Due</span>
                    <span className={`font-black text-xl ${invoice.balance_amount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      LKR {invoice.balance_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                    </span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => setShowInvoiceModal(true)} 
                  variant="outline" 
                  className="w-full mt-2 gap-2 border-indigo-200 text-indigo-800 hover:bg-indigo-50 font-bold text-xs shadow-xs h-9"
                >
                  <Printer className="w-4 h-4" /> View & Print Receipt
                </Button>
              </CardContent>
            </Card>
          )}
 
          {/* Payment Collect Terminal */}
          {invoice && invoice.balance_amount > 0 && hasEditPermission(user, '/dashboard/invoices') && (
            <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 rounded-2xl bg-white">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/30">
                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Coins className="w-4 h-4 text-indigo-500" /> Collect Payment Terminal
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Payment Amount (LKR)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      max={invoice.balance_amount} 
                      required 
                      value={paymentAmount} 
                      onChange={(e) => setPaymentAmount(e.target.value)} 
                      placeholder={`Max: ${invoice.balance_amount.toLocaleString()}`}
                      className="font-bold text-slate-850 text-base border-slate-200 focus:border-indigo-500 focus:ring-2 shadow-xs"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold text-slate-500 uppercase">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="font-semibold bg-white text-slate-800 border-slate-200 shadow-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">💵 Cash</SelectItem>
                        <SelectItem value="Card">💳 Card</SelectItem>
                        <SelectItem value="Bank Transfer">🏛️ Bank Transfer</SelectItem>
                        <SelectItem value="Online Payment">🌐 Online Payment</SelectItem>
                        <SelectItem value="QR Payment">📱 QR Payment</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-slate-950 text-white hover:bg-slate-900 font-bold shadow-md hover:shadow-lg transition-all" 
                    disabled={submittingPayment || !paymentAmount}
                  >
                    {submittingPayment ? 'Processing Cash...' : 'Confirm & Collect Cash'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}
 
          {/* Historical Payments Ledger list */}
          {payments.length > 0 && (
            <Card className="hover:shadow-lg transition-all duration-300 border-slate-200 rounded-2xl bg-white">
              <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/30">
                <CardTitle className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-indigo-500" /> Receipt Ledger
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                  {payments.map(pay => (
                    <div key={pay.id} className="flex justify-between items-center text-xs p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100/30 transition-colors shadow-xs">
                      <div>
                        <p className="font-black text-slate-900 text-sm">LKR {pay.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-1">
                          {new Date(pay.created_at).toLocaleDateString()} • <span className="text-indigo-600 font-bold">{pay.method}</span>
                          {pay.cashier_name && ` • Staff: ${pay.cashier_name}`}
                        </p>
                      </div>
                      <span className="text-green-700 bg-green-500/10 border border-green-500/20 px-2 py-0.5 rounded-md text-[9px] font-black flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Recorded
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
 
      {/* Invoice Detail popup Modal */}
      {showInvoiceModal && invoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white px-6 py-4.5 flex justify-between items-center no-print border-b border-slate-800">
              <h3 className="font-extrabold text-base tracking-tight">Billing Details & Print Copy</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1.5 rounded-lg">
                <X className="h-4 w-4" />
              </button>
            </div>
 
            <div className="p-6 overflow-y-auto max-h-[80vh]">
              {/* Print Component */}
              <InvoicePrint invoice={{ ...invoice, order }} payments={payments} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
