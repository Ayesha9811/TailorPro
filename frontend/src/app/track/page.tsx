'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  ShoppingBag, Ruler, CheckCircle, Clock, Truck, Search, 
  ShieldAlert, ArrowLeft, Receipt, DollarSign, Calendar, User, CreditCard
} from 'lucide-react';
import Link from 'next/link';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/v1';

const statusSteps = [
  "Order Confirmed",
  "Stitching Started",
  "Ready for Collection",
  "Collected"
];

export default function TrackPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[] | null>(null);
  const [error, setError] = useState('');

  const performTracking = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setError('');
    setOrders(null);

    try {
      const res = await axios.get(`${API_URL}/orders/track/${encodeURIComponent(searchQuery.trim())}`);
      if (res.data.length === 0) {
        setError('No orders found matching this ID or phone number.');
      } else {
        setOrders(res.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'An error occurred while tracking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    performTracking(query);
  };

  // Auto-run tracking if URL contains query parameters & initialize theme
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Initialize theme from localStorage or default
      const isDark = localStorage.getItem('theme') === 'dark' || 
                     (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      const params = new URLSearchParams(window.location.search);
      const urlQuery = params.get('order') || params.get('q') || params.get('query');
      if (urlQuery) {
        setQuery(urlQuery);
        performTracking(urlQuery);
      }
    }
  }, []);

  const getStepStatus = (currentStatus: string, stepName: string) => {
    if (currentStatus === "Cancelled") return "cancelled";
    
    const currentIndex = statusSteps.indexOf(currentStatus);
    const stepIndex = statusSteps.indexOf(stepName);

    if (stepIndex < 0) return "pending";
    if (currentIndex >= stepIndex) return "completed";
    return "pending";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 text-slate-800 dark:text-slate-100 flex flex-col p-4 md:p-8 transition-colors duration-150">
      {/* Top logo/branding */}
      <div className="max-w-4xl w-full mx-auto flex items-center justify-between mb-8">
        <Link href="/" className="flex items-center gap-2 text-slate-800 dark:text-slate-200 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm font-semibold">Home</span>
        </Link>
        <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">TailorPro ERP</span>
      </div>

      <div className="max-w-4xl w-full mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200/60 dark:border-slate-800 p-6 md:p-10 flex-1 flex flex-col justify-center transition-colors duration-150">
        <div className="text-center max-w-md mx-auto mb-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white bg-clip-text text-transparent bg-gradient-to-r from-slate-950 to-slate-700 dark:from-white dark:to-slate-300">
            Track Your Order
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm leading-relaxed">
            Enter your Order ID (e.g., ORD-2026-0001) or registered contact number to check live stitching and fitting status.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleTrack} className="flex flex-col sm:flex-row gap-3 max-w-xl mx-auto w-full mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Order ID or Phone Number..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-400 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 transition-all font-medium shadow-sm"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-100 transition-all disabled:bg-slate-400 dark:disabled:bg-slate-700 flex items-center justify-center gap-2 shadow-md hover:shadow-lg active:scale-98"
          >
            {loading ? 'Tracking...' : 'Track Status'}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="max-w-xl mx-auto w-full bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-450 p-4 rounded-xl flex items-start gap-3 mb-6">
            <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Tracking Results */}
        {orders && (
          <div className="space-y-12">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-250 border-b dark:border-slate-800 pb-2">Tracking Result ({orders.length} orders found)</h2>
            {orders.map((order) => {
              const inv = order.invoice;
              const subtotal = inv ? inv.total_amount + inv.discount : 0;
              const unitPrice = inv && order.quantity ? subtotal / order.quantity : 0;

              return (
                <div key={order.id} className="bg-slate-50/50 dark:bg-slate-950/10 rounded-2xl p-6 md:p-8 border border-slate-100 dark:border-slate-800/80 space-y-8 animate-in fade-in-50 duration-300">
                  {/* Summary Block */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6 border-slate-200/50 dark:border-slate-800">
                    <div>
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Order Reference</span>
                      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{order.order_number}</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Created on {new Date(order.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Estimated Delivery</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-350 block mt-0.5">
                        {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBD'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/40 px-3 py-1 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mt-2">
                        {order.status}
                      </span>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block tracking-wider">Garment Type</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">{order.dress_type}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block tracking-wider">Quantity</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">{order.quantity} pcs</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block tracking-wider">Fabric Source</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">{order.fabric_source || 'Customer Provided'}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/50 dark:border-slate-800 shadow-sm">
                      <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold block tracking-wider">Special Remarks</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200 mt-0.5 block truncate" title={order.special_remarks}>{order.special_remarks || 'None'}</span>
                    </div>
                  </div>

                  {/* Fulfillment Timeline */}
                  <div className="pt-4 pb-6">
                    <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-6 tracking-wider">Stitching Progress Timeline</h4>
                    <div className="relative">
                      {order.status === "Cancelled" ? (
                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl p-4 text-center text-red-700 dark:text-red-400 font-semibold text-sm">
                          This order has been cancelled.
                        </div>
                      ) : (
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center relative w-full pt-4 md:pt-0">
                          {/* Desktop horizontal progress line */}
                          <div className="hidden md:block absolute left-4 right-4 top-[20px] h-1 bg-slate-200 dark:bg-slate-800 -z-10">
                            <div 
                              className="h-full bg-green-500 transition-all duration-500" 
                              style={{ 
                                width: `${(statusSteps.indexOf(order.status) / (statusSteps.length - 1)) * 100}%` 
                              }}
                            />
                          </div>

                          {/* Mobile vertical line */}
                          <div className="md:hidden absolute left-5 top-4 bottom-4 w-0.5 bg-slate-200 dark:bg-slate-800 -z-10" />

                          {statusSteps.map((step, idx) => {
                            const stepStatus = getStepStatus(order.status, step);
                            const isCompleted = stepStatus === "completed";
                            
                            return (
                              <div key={step} className="flex md:flex-col items-center gap-4 md:gap-2 relative z-10 w-full mb-6 md:mb-0">
                                <div 
                                  className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${
                                    isCompleted 
                                      ? 'bg-green-500 border-green-600 text-white shadow-md' 
                                      : order.status === step
                                        ? 'bg-indigo-600 border-indigo-700 text-white shadow-md animate-pulse'
                                        : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-400 dark:text-slate-500'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <CheckCircle className="h-4.5 w-4.5" />
                                  ) : (
                                    <span className="text-xs font-bold">{idx + 1}</span>
                                  )}
                                </div>
                                <div className="text-left md:text-center">
                                  <span 
                                    className={`text-[11px] font-bold block ${
                                      order.status === step 
                                        ? 'text-indigo-700 dark:text-indigo-400' 
                                        : isCompleted 
                                          ? 'text-green-700 dark:text-green-400' 
                                          : 'text-slate-400 dark:text-slate-500'
                                    }`}
                                  >
                                    {step}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Public Invoice Copy section */}
                  {inv && (
                    <div className="border-t border-slate-200/60 dark:border-slate-800 pt-8">
                      <h4 className="text-xs font-bold uppercase text-slate-400 dark:text-slate-500 mb-6 tracking-wider flex items-center gap-1.5">
                        <Receipt className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> Digital Customer Invoice & billing Copy
                      </h4>
                      
                      {/* Paper receipt design */}
                      <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-md p-6 max-w-2xl mx-auto relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-slate-950 dark:to-indigo-900" />
                        
                        {/* Receipt Header */}
                        <div className="flex justify-between items-start border-b dark:border-slate-800 pb-5 mb-5 mt-2">
                          <div>
                            <h5 className="font-extrabold text-slate-900 dark:text-white text-lg">TailorPro ERP</h5>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold mt-0.5">Invoice: {inv.invoice_number}</p>
                            <p className="text-[9px] text-slate-400 dark:text-slate-500">Date: {new Date(inv.created_at).toLocaleString()}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              inv.payment_status === 'Fully Paid' ? 'bg-green-100 dark:bg-green-950/40 text-green-800 dark:text-green-300' :
                              inv.payment_status === 'Partially Paid' ? 'bg-yellow-100 dark:bg-yellow-950/40 text-yellow-800 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-950/40 text-red-800 dark:text-red-300'
                            }`}>
                              {inv.payment_status}
                            </span>
                          </div>
                        </div>

                        {/* Customer details & Items */}
                        <div className="grid grid-cols-2 gap-6 text-xs mb-6">
                          <div>
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Customer Billing Details</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{order.customer?.full_name || 'Walk-in Client'}</p>
                            {order.customer?.contact_number && <p className="text-slate-500 dark:text-slate-400 mt-0.5">{order.customer.contact_number}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Garment Specs</span>
                            <p className="font-bold text-slate-800 dark:text-slate-200 mt-1">{order.dress_type}</p>
                            <p className="text-slate-500 dark:text-slate-400 mt-0.5">Quantity: {order.quantity} pcs • Unit Price: LKR {unitPrice.toLocaleString()}</p>
                          </div>
                        </div>

                        {/* Pricing details */}
                        <div className="space-y-2 text-xs border-t border-slate-150 dark:border-slate-800 pt-4">
                          <div className="flex justify-between text-slate-500 dark:text-slate-400">
                            <span>Gross Subtotal:</span>
                            <span>LKR {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between text-slate-450 dark:text-slate-500">
                            <span>Discount:</span>
                            <span>- LKR {inv.discount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between font-bold text-slate-800 dark:text-slate-200 border-t dark:border-slate-800 pt-2 text-sm">
                            <span>Net Total Amount:</span>
                            <span>LKR {inv.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between text-green-600 dark:text-green-400 font-bold">
                            <span>Total Paid (to date):</span>
                            <span>LKR {inv.paid_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                          <div className="flex justify-between text-red-650 dark:text-red-400 font-extrabold text-base border-t border-double dark:border-slate-800 pt-2">
                            <span>Balance Remaining:</span>
                            <span>LKR {inv.balance_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                        </div>

                        {/* Bottom Metadata */}
                        <div className="mt-6 border-t border-slate-150 dark:border-slate-800 pt-4 text-[10px] text-slate-400 dark:text-slate-500 flex flex-col sm:flex-row justify-between gap-2">
                          <div>
                            <span className="block font-medium">Primary Cashier: {inv.cashier_name || 'System Cashier'}</span>
                          </div>
                          <div className="text-left sm:text-right">
                            <span className="block font-semibold text-slate-500 dark:text-slate-400">Verified ERP Digital Copy</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer copyright */}
      <div className="text-center text-xs text-slate-400 dark:text-slate-550 mt-10">
        © {new Date().getFullYear()} TailorPro ERP. All rights reserved. Sri Lanka.
      </div>
    </div>
  );
}
