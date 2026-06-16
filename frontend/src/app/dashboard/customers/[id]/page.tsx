'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  ArrowLeft, ShoppingBag, Ruler, Phone, Mail, MapPin, 
  Calendar, GraduationCap, Copy, Check, Info, FileText, 
  ExternalLink, User, CheckCircle2, AlertCircle, Sparkles, Clock
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuthStore();
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [measurements, setMeasurements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'orders' | 'measurements'>('overview');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [custRes, ordersRes, measRes] = await Promise.all([
          api.get(`/customers/${id}`),
          api.get('/orders/'),
          api.get(`/measurements/customer/${id}`)
        ]);
        setCustomer(custRes.data);
        // Filter orders for this customer
        setOrders(ordersRes.data.filter((o: any) => o.customer_id === parseInt(id)));
        setMeasurements(measRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Order Confirmed':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
      case 'Stitching Started':
        return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20';
      case 'Ready for Collection':
        return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
      case 'Collected':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20';
      case 'Cancelled':
        return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20';
      default:
        return 'bg-slate-500/10 text-slate-600 border border-slate-500/20';
    }
  };

  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'Men':
        return {
          gradient: 'from-blue-600 to-indigo-700',
          badge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20',
          avatarBorder: 'border-blue-400 ring-blue-500/20',
        };
      case 'Ladies':
        return {
          gradient: 'from-rose-500 to-pink-600',
          badge: 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20',
          avatarBorder: 'border-pink-400 ring-pink-500/20',
        };
      default:
        return {
          gradient: 'from-amber-400 to-orange-500',
          badge: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
          avatarBorder: 'border-amber-400 ring-amber-500/20',
        };
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-32 text-slate-400 space-y-4">
      <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-700 rounded-full animate-spin" />
      <span className="text-sm font-semibold tracking-wide animate-pulse">Loading Customer Profile...</span>
    </div>
  );

  if (!customer) return (
    <div className="text-center py-20 text-slate-500 space-y-4">
      <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
      <p className="text-lg font-bold">Customer profile not found.</p>
      <Link href="/dashboard/customers">
        <Button variant="outline">Back to Customers</Button>
      </Link>
    </div>
  );

  const theme = getCategoryTheme(customer.gender_category);

  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-0">
      
      {/* Top Breadcrumb and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/customers">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 rounded-xl hover:bg-slate-100 transition-all">
              <ArrowLeft className="w-4 h-4 text-slate-600" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <span>Directory</span>
              <span>/</span>
              <span className="text-slate-600">Customer Details</span>
            </div>
          </div>
        </div>

        {user?.role_name !== 'Cashier' && (
          <Link href={`/dashboard/orders/unified?customer_id=${id}`}>
            <Button className="bg-primary hover:bg-primary/95 text-primary-foreground shadow-sm rounded-xl font-semibold text-xs py-2 px-4 flex items-center gap-2 transition-transform hover:scale-[1.02]">
              <ShoppingBag className="w-4 h-4" />
              New Order for Customer
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Panel: Profile Detail Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="overflow-hidden shadow-sm border border-border/80 rounded-2xl bg-card">
            
            {/* Gradient Banner Header */}
            <div className={`bg-gradient-to-br ${theme.gradient} px-6 py-8 text-white text-center flex flex-col items-center justify-center relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-6 -mt-6"></div>
              
              {/* Dynamic Animated Avatar */}
              <div className={`w-24 h-24 rounded-full border-2 p-1.5 relative flex items-center justify-center shadow-lg bg-white/10 mb-4 transition-all duration-300 hover:scale-105 ${theme.avatarBorder} ring-4`}>
                {customer.gender_category === 'Men' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-blue-200 animate-in fade-in scale-in-95 duration-300">
                    <defs>
                      <linearGradient id="menGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#93c5fd" />
                        <stop offset="100%" stopColor="#2563eb" />
                      </linearGradient>
                    </defs>
                    <path d="M50 22 C38 22 32 30 32 40 C32 50 35 50 50 50 C65 50 68 50 68 40 C68 30 62 22 50 22 Z" fill="url(#menGrad)" opacity="0.3" />
                    <path d="M50 28 C45 28 42 33 42 39 C42 45 45 47 50 47 C55 47 58 45 58 39 C58 33 55 28 50 28 Z" fill="url(#menGrad)" />
                    <path d="M28 78 C28 64 38 56 50 56 C62 56 72 64 72 78" fill="none" stroke="url(#menGrad)" strokeWidth="6" strokeLinecap="round" />
                    <path d="M50 56 L50 66" fill="none" stroke="url(#menGrad)" strokeWidth="2.5" />
                  </svg>
                )}
                {customer.gender_category === 'Ladies' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-pink-200 animate-in fade-in scale-in-95 duration-300">
                    <defs>
                      <linearGradient id="ladiesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fbcfe8" />
                        <stop offset="100%" stopColor="#db2777" />
                      </linearGradient>
                    </defs>
                    <path d="M50 20 C38 20 32 28 32 38 C32 48 35 48 50 48 C65 48 68 48 68 38 C68 28 62 20 50 20 Z" fill="url(#ladiesGrad)" opacity="0.3" />
                    <path d="M50 26 C46 26 43 31 43 37 C43 43 46 45 50 45 C54 45 57 43 57 37 C57 31 54 26 50 26 Z" fill="url(#ladiesGrad)" />
                    <path d="M26 78 C26 64 36 56 50 56 C64 56 74 64 74 78" fill="none" stroke="url(#ladiesGrad)" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                )}
                {customer.gender_category === 'Kids' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-amber-200 animate-in fade-in scale-in-95 duration-300">
                    <defs>
                      <linearGradient id="kidsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#fef3c7" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="38" r="10" fill="url(#kidsGrad)" />
                    <path d="M30 78 C30 65 38 58 50 58 C62 58 70 65 70 78" fill="none" stroke="url(#kidsGrad)" strokeWidth="6" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {/* Customer Name & Code */}
              <h2 className="text-xl font-bold tracking-tight text-white">{customer.full_name}</h2>
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-white/80 font-mono text-xs">{customer.customer_code}</p>
                <button 
                  onClick={() => handleCopy(customer.customer_code, 'code')}
                  className="text-white/60 hover:text-white transition-colors p-0.5 rounded"
                  title="Copy Code"
                >
                  {copiedField === 'code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <span className={`inline-block mt-3 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-white/20 text-white border border-white/10`}>
                {customer.gender_category} Profile
              </span>
            </div>

            {/* Info details list */}
            <CardContent className="p-6 space-y-4">
              
              {/* Contact phone numbers */}
              <div className="group relative flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                    <Phone className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Primary Contact</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{customer.contact_number}</p>
                  </div>
                </div>
                <button 
                  onClick={() => handleCopy(customer.contact_number, 'phone')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700 bg-white border rounded-lg shadow-2xs"
                  title="Copy Contact Number"
                >
                  {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Alternate contact */}
              {customer.alternate_contact && (
                <div className="group relative flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Alternate Contact</p>
                      <p className="text-sm font-medium text-slate-700 truncate">{customer.alternate_contact}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopy(customer.alternate_contact, 'alt_phone')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700 bg-white border rounded-lg shadow-2xs"
                    title="Copy Alternate Contact"
                  >
                    {copiedField === 'alt_phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Email */}
              {customer.email && (
                <div className="group relative flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Email Address</p>
                      <p className="text-sm font-medium text-slate-700 truncate">{customer.email}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleCopy(customer.email, 'email')}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-slate-700 bg-white border rounded-lg shadow-2xs"
                    title="Copy Email"
                  >
                    {copiedField === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              )}

              {/* Home Address */}
              {customer.address && (
                <div className="flex items-start gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0 mt-0.5">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Billing/Delivery Address</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5 leading-relaxed">{customer.address}</p>
                  </div>
                </div>
              )}

              {/* Student Details Badge */}
              {customer.student_admission_no && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl bg-violet-500/5 border border-violet-500/10 text-violet-700">
                  <div className="p-2 bg-violet-500/10 rounded-lg shrink-0">
                    <GraduationCap className="w-4 h-4 text-violet-600" />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-violet-500">Linked Student Account</p>
                    <p className="text-xs font-bold mt-0.5">Admission No: <span className="font-mono">{customer.student_admission_no}</span></p>
                  </div>
                </div>
              )}

              {/* Birthday Details */}
              {customer.birthday && (
                <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="p-2 bg-slate-100 text-slate-500 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Date of Birth / Anniversary</p>
                    <p className="text-sm font-medium text-slate-700 mt-0.5">{new Date(customer.birthday).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                  </div>
                </div>
              )}

              {/* Notes */}
              {customer.notes && (
                <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-xs text-amber-800 space-y-1 mt-2">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10px] text-amber-700">
                    <Info className="w-3.5 h-3.5" />
                    <span>Special Instructions & Notes</span>
                  </div>
                  <p className="leading-relaxed text-amber-900 font-medium">{customer.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Panel: Tabs switching between overview, orders and measurements */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Custom animated dashboard tab menu */}
          <div className="bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60 flex gap-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              Order History ({orders.length})
            </button>
            <button
              onClick={() => setActiveTab('measurements')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
                activeTab === 'measurements'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Ruler className="w-3.5 h-3.5" />
              Measurements ({measurements.length})
            </button>
          </div>

          {/* TAB CONTENT: Overview & Stats */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-200">
              
              {/* Stat Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                <Card className="border border-indigo-500/10 shadow-xs relative overflow-hidden bg-card">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-indigo-500/5 rounded-full blur-xl -mr-4 -mt-4"></div>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Garments Ordered</p>
                      <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{orders.length}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">Life-time custom order count</p>
                    </div>
                    <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-600 shrink-0">
                      <ShoppingBag className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-emerald-500/10 shadow-xs relative overflow-hidden bg-card">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-full blur-xl -mr-4 -mt-4"></div>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Recorded Templates</p>
                      <h3 className="text-3xl font-extrabold text-slate-800 mt-1">{measurements.length}</h3>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">Unique measurement specs</p>
                    </div>
                    <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 shrink-0">
                      <Ruler className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border border-violet-500/10 shadow-xs relative overflow-hidden bg-card">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-violet-500/5 rounded-full blur-xl -mr-4 -mt-4"></div>
                  <CardContent className="p-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-violet-500 uppercase tracking-wider">Latest Activity</p>
                      <h3 className="text-lg font-bold text-slate-700 mt-2 truncate">
                        {orders.length > 0 ? orders[0].status : 'No orders yet'}
                      </h3>
                      <p className="text-[10px] text-slate-400 mt-1 font-medium">
                        {orders.length > 0 && orders[0].delivery_date 
                          ? `Delivery: ${new Date(orders[0].delivery_date).toLocaleDateString()}`
                          : 'Awaiting first order detail'}
                      </p>
                    </div>
                    <div className="p-3 bg-violet-500/10 rounded-xl text-violet-600 shrink-0">
                      <Clock className="w-6 h-6" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions Panel */}
              <Card className="border border-border/80 shadow-xs">
                <CardHeader className="pb-3 border-b border-border/60 bg-slate-50/50">
                  <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Profile Quick Utilities
                  </CardTitle>
                  <CardDescription className="text-xs">Shorcuts and diagnostics for this customer.</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                      <div className="p-2 bg-indigo-500/15 rounded-lg text-indigo-600 mt-0.5">
                        <ShoppingBag className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Generate New Bill</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Instantly open the order form pre-filled with this customer profile.</p>
                        {user?.role_name !== 'Cashier' && (
                          <Link href={`/dashboard/orders/unified?customer_id=${id}`} className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold mt-2 hover:underline">
                            Launch Unified Order Form →
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 flex items-start gap-3 hover:bg-slate-50 transition-colors">
                      <div className="p-2 bg-emerald-500/15 rounded-lg text-emerald-600 mt-0.5">
                        <Ruler className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Review Fit Records</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">Check previous measurements or link a dress size category parameters.</p>
                        <button 
                          onClick={() => setActiveTab('measurements')}
                          className="inline-flex items-center gap-1 text-[11px] text-emerald-600 hover:text-emerald-800 font-bold mt-2 hover:underline"
                        >
                          View Measurement Templates →
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs mt-2 text-slate-500">
                    <span className="font-semibold flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-slate-400" />
                      Registered in Directory since:
                    </span>
                    <span className="font-semibold font-mono text-slate-700 bg-white px-2.5 py-1 rounded border">
                      {customer.created_at ? new Date(customer.created_at).toLocaleDateString(undefined, { dateStyle: 'long' }) : '—'}
                    </span>
                  </div>
                </CardContent>
              </Card>

            </div>
          )}

          {/* TAB CONTENT: Order List */}
          {activeTab === 'orders' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {orders.length === 0 ? (
                <Card className="border border-dashed p-12 text-center text-slate-400 bg-slate-50/30 rounded-2xl">
                  <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-600">No orders found</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">This customer profile exists but does not have any recorded transactions in TailorPro yet.</p>
                </Card>
              ) : (
                <div className="space-y-4">
                  {orders.map((o) => (
                    <Card key={o.id} className="border border-border/80 hover:border-slate-300 shadow-2xs hover:shadow-xs transition-all overflow-hidden rounded-xl bg-card group">
                      <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        
                        {/* Order Metadata */}
                        <div className="space-y-1.5 flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-800 bg-slate-100 px-2.5 py-0.5 rounded-md font-mono border">
                              {o.order_number}
                            </span>
                            <span className="text-[11px] font-bold bg-indigo-500/10 text-indigo-700 border border-indigo-500/20 px-2 py-0.5 rounded">
                              {o.dress_type} ×{o.quantity}
                            </span>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${getStatusBadge(o.status)}`}>
                              {o.status}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 font-semibold pt-1">
                            {o.delivery_date && (
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                <span>Delivery Due: <span className="text-slate-600">{new Date(o.delivery_date).toLocaleDateString()}</span></span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span>Modified: {new Date(o.updated_at || o.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* View Button Link */}
                        <div className="shrink-0 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0 flex md:block justify-end">
                          <Link href={`/dashboard/orders/${o.id}`} className="w-full md:w-auto">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full md:w-auto text-xs font-semibold rounded-lg hover:bg-slate-50 flex items-center justify-center gap-1 border border-border"
                            >
                              Manage Order
                              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: Measurement Cards */}
          {activeTab === 'measurements' && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
              {measurements.length === 0 ? (
                <Card className="border border-dashed p-12 text-center text-slate-400 bg-slate-50/30 rounded-2xl">
                  <Ruler className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                  <p className="font-bold text-slate-600">No measurements recorded</p>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Please add measurement templates for this customer to begin customizing fits.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {measurements.map((m) => {
                    const measurementString = Object.entries(m.measurement_data || {})
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ');

                    return (
                      <Card key={m.id} className="border border-border/80 shadow-2xs hover:shadow-xs transition-all rounded-xl bg-card overflow-hidden">
                        
                        {/* Header bar of measurements */}
                        <div className="bg-slate-50/80 border-b border-border/60 px-5 py-4 flex flex-wrap justify-between items-center gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-lg shrink-0">
                              <Ruler className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold font-mono text-slate-400">{m.measurement_code}</span>
                              <span className="ml-3 inline-flex items-center rounded-md bg-indigo-500/15 px-2.5 py-0.5 text-xs font-bold text-indigo-800">
                                {m.dress_type}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-xs font-semibold">
                            <span className="text-slate-400">{new Date(m.created_at).toLocaleDateString()}</span>
                            {m.is_used_in_order ? (
                              <span className="bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border">
                                Locked
                              </span>
                            ) : (
                              <span className="bg-emerald-500/10 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                                Active / Edit
                              </span>
                            )}

                            {/* Copy measurements block trigger */}
                            <button 
                              onClick={() => handleCopy(measurementString, `meas_${m.id}`)}
                              className="p-1 border bg-white text-slate-500 hover:text-slate-800 rounded-md transition-colors"
                              title="Copy Measurement Specifications"
                            >
                              {copiedField === `meas_${m.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* Measurement specifications keys and values */}
                        <CardContent className="p-5">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {Object.entries(m.measurement_data || {}).map(([k, v]) => (
                              <div key={k} className="p-3 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100 flex flex-col justify-center min-w-0 transition-colors">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{k}</span>
                                <span className="text-sm font-extrabold text-slate-800 mt-1 truncate">{v as string}</span>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
