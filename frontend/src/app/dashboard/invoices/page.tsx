'use client';

import { useEffect, useState, Suspense } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchParams } from 'next/navigation';
import { 
  Receipt, Landmark, Landmark as CardIcon, CreditCard, QrCode, DollarSign,
  Search, ShieldCheck, ShieldAlert, CircleDollarSign, Plus, Printer, Eye, X, Wallet
} from 'lucide-react';
import InvoicePrint from '@/components/invoice-print';
import { useAuthStore } from '@/store/authStore';
import { hasEditPermission } from '@/lib/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function InvoicesPageContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const paramMonth = searchParams.get('month');
  const paramTab = searchParams.get('tab') || searchParams.get('status');

  const getInitialTab = () => {
    if (!paramTab) return 'All';
    const normalized = paramTab.charAt(0).toUpperCase() + paramTab.slice(1).toLowerCase();
    if (['All', 'Paid', 'Partial', 'Unpaid', 'Refunded'].includes(normalized)) {
      return normalized;
    }
    if (normalized === 'Partially_paid' || normalized === 'Partially paid' || normalized === 'Partial') {
      return 'Partial';
    }
    if (normalized === 'Fully_paid' || normalized === 'Fully paid' || normalized === 'Paid') {
      return 'Paid';
    }
    if (normalized === 'Not paid' || normalized === 'Not_paid' || normalized === 'Unpaid') {
      return 'Unpaid';
    }
    return 'All';
  };

  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [selectedMonth, setSelectedMonth] = useState(paramMonth || 'all');
  const [months, setMonths] = useState<{ value: string; label: string }[]>([]);

  useEffect(() => {
    if (paramMonth) {
      setSelectedMonth(paramMonth);
    }
    if (paramTab) {
      const normalized = getInitialTab();
      setActiveTab(normalized);
    }
  }, [paramMonth, paramTab]);

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

  // Modals
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Record payment form fields
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('Cash'); // Cash, Card, Bank Transfer, Online Payment, QR Payment
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      // Invoices API returns orders as relation or we fetch invoices and map
      const res = await api.get('/invoices');
      setInvoices(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to fetch invoices.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const openInvoiceDetails = async (invoice: any) => {
    try {
      // Fetch fresh details with order information if needed
      const res = await api.get(`/invoices/${invoice.id}`);
      const invDetails = res.data;
      if (invDetails.order_id) {
        const orderRes = await api.get(`/orders/${invDetails.order_id}`);
        invDetails.order = orderRes.data;
      }
      
      // Fetch payments history
      try {
        const payRes = await api.get(`/payments/invoice/${invoice.id}`);
        invDetails.payments = payRes.data;
      } catch (payErr) {
        console.error("Failed to load payments history", payErr);
        invDetails.payments = [];
      }

      setSelectedInvoice(invDetails);
      setShowInvoiceModal(true);
    } catch (err) {
      console.error("Failed to load full invoice details", err);
      // Fallback
      const fallbackDetails = { ...invoice, payments: [] };
      setSelectedInvoice(fallbackDetails);
      setShowInvoiceModal(true);
    }
  };

  const openPaymentForm = (invoice: any) => {
    setSelectedInvoice(invoice);
    setPayAmount(invoice.balance_amount.toString());
    setPayMethod('Cash');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setError('');
    setPaymentSubmitting(true);

    const amountNum = parseFloat(payAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('Please enter a valid payment amount.');
      setPaymentSubmitting(false);
      return;
    }

    if (amountNum > selectedInvoice.balance_amount) {
      setError('Payment amount cannot exceed the invoice balance.');
      setPaymentSubmitting(false);
      return;
    }

    // Map payMethod display name to backend PaymentMethod enum:
    // CASH = "Cash"
    // CARD = "Card"
    // BANK_TRANSFER = "Bank Transfer"
    // ONLINE = "Online Payment"
    // QR = "QR Payment"
    let enumMethod = 'Cash';
    if (payMethod === 'Card') enumMethod = 'Card';
    else if (payMethod === 'Bank Transfer') enumMethod = 'Bank Transfer';
    else if (payMethod === 'Online Payment') enumMethod = 'Online Payment';
    else if (payMethod === 'QR Payment') enumMethod = 'QR Payment';

    try {
      await api.post('/payments/', {
        invoice_id: selectedInvoice.id,
        amount: amountNum,
        method: enumMethod
      });
      
      setShowPaymentModal(false);
      setShowInvoiceModal(false);
      fetchInvoices();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to process payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  };

  // Filter invoices by month (if selected)
  const monthFilteredInvoices = invoices.filter(inv => {
    return selectedMonth === 'all' || (inv.created_at && inv.created_at.startsWith(selectedMonth));
  });

  const filteredInvoices = monthFilteredInvoices.filter(inv => {
    // 1. Search Query filter
    const matchesSearch = 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (inv.order?.order_number && inv.order.order_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (inv.order?.customer?.full_name && inv.order.customer.full_name.toLowerCase().includes(searchQuery.toLowerCase()));

    // 2. Tab Status filter
    if (activeTab === 'All') return matchesSearch;
    if (activeTab === 'Paid') return matchesSearch && inv.payment_status === 'Fully Paid';
    if (activeTab === 'Partial') return matchesSearch && inv.payment_status === 'Partially Paid';
    if (activeTab === 'Unpaid') return matchesSearch && inv.payment_status === 'Not Paid';
    if (activeTab === 'Refunded') return matchesSearch && inv.payment_status === 'Refunded';
    return matchesSearch;
  });

  // Calculate dashboard financial statistics
  const totalInvoiced = monthFilteredInvoices.reduce((acc, inv) => acc + inv.total_amount, 0);
  const totalCollected = monthFilteredInvoices.reduce((acc, inv) => acc + inv.paid_amount, 0);
  const totalOutstanding = monthFilteredInvoices.reduce((acc, inv) => acc + inv.balance_amount, 0);
  const unpaidCount = monthFilteredInvoices.filter(inv => inv.payment_status === 'Not Paid' || inv.payment_status === 'Partially Paid').length;



  if (loading && invoices.length === 0) {
    return <div className="text-center py-10 text-slate-500">Loading Billing Data...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Invoices & Financials</h1>
        <p className="text-slate-500 text-sm mt-1">Manage client billing, process payments and generate paper receipts.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-slate-200 hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-primary transition-colors">Total Billed</CardTitle>
            <Receipt className="h-4 w-4 text-slate-400 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-extrabold text-slate-800 group-hover:text-primary transition-colors">LKR {totalInvoiced.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            <p className="text-[9px] text-slate-400 mt-1">Gross sales {selectedMonth === 'all' ? 'lifetime' : 'for selected month'}</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-green-500/5 hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-green-700 dark:text-green-400 uppercase group-hover:text-green-500 transition-colors">Paid / Collected</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-green-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-extrabold text-green-800 group-hover:text-green-500 transition-colors">LKR {totalCollected.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            <p className="text-[9px] text-green-600 dark:text-green-400 font-semibold mt-1">Realized income in hand</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-orange-500/5 hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-orange-700 dark:text-orange-400 uppercase group-hover:text-orange-500 transition-colors">Outstanding Balance</CardTitle>
            <Wallet className="h-4 w-4 text-orange-500 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-200" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-extrabold text-orange-800 group-hover:text-orange-500 transition-colors">LKR {totalOutstanding.toLocaleString(undefined, {maximumFractionDigits: 0})}</div>
            <p className="text-[9px] text-orange-600 dark:text-orange-400 font-semibold mt-1">Receivables pending</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 bg-indigo-500/5 hover:scale-[1.03] transition-all duration-200 hover:shadow-md cursor-default group">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-[10px] font-bold text-indigo-700 dark:text-indigo-400 uppercase group-hover:text-indigo-500 transition-colors">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-indigo-500 group-hover:scale-110 group-hover:-rotate-6 transition-transform duration-200" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-extrabold text-indigo-800 group-hover:text-indigo-500 transition-colors">{unpaidCount}</div>
            <p className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">Require billing follow-up</p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Main Table section */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          {/* Filtering tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
            {['All', 'Paid', 'Partial', 'Unpaid', 'Refunded'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Search & Month dropdown */}
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
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

            <div className="relative w-full sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search invoice or order #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                <tr>
                  <th className="px-6 py-4">Invoice ID</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Order Ref</th>
                  <th className="px-6 py-4 text-right">Total Amount</th>
                  <th className="px-6 py-4 text-right">Paid</th>
                  <th className="px-6 py-4 text-right">Balance</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-8 text-center text-slate-400">
                      No invoices found.
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{inv.invoice_number}</td>
                      <td className="px-6 py-4 text-slate-700">
                        {inv.order?.customer?.full_name || 'Walk-in Customer'}
                      </td>
                      <td className="px-6 py-4 font-medium text-indigo-600">
                        {inv.order?.order_number || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-slate-900">
                        LKR {inv.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-green-700">
                        LKR {inv.paid_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4 text-right font-medium text-red-600">
                        LKR {inv.balance_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          inv.payment_status === 'Fully Paid' ? 'bg-green-50 text-green-700 border border-green-200' :
                          inv.payment_status === 'Partially Paid' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          inv.payment_status === 'Not Paid' ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          {inv.payment_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openInvoiceDetails(inv)}
                            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                            title="View/Print Copy"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {inv.balance_amount > 0 && hasEditPermission(user, '/dashboard/invoices') && (
                            <button
                              onClick={() => openPaymentForm(inv)}
                              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-colors"
                            >
                              Collect
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Invoice Details / Print Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl overflow-hidden border animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center no-print">
              <h3 className="font-bold text-lg">Billing Details & Print Copy</h3>
              <div className="flex items-center gap-3">
                {selectedInvoice.balance_amount > 0 && hasEditPermission(user, '/dashboard/invoices') && (
                  <Button 
                    onClick={() => {
                      setShowInvoiceModal(false);
                      openPaymentForm(selectedInvoice);
                    }}
                    className="bg-green-600 text-white hover:bg-green-700 h-8 text-xs px-3 font-semibold"
                  >
                    Record Payment
                  </Button>
                )}
                <button onClick={() => setShowInvoiceModal(false)} className="text-slate-400 hover:text-white transition-colors">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[80vh]">
              {/* Embed print module */}
              <InvoicePrint invoice={selectedInvoice} payments={selectedInvoice.payments || []} />
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Form Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden border animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="font-bold text-lg">Collect Outstanding Balance</h3>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Invoice Number</span>
                <span className="font-bold text-slate-800 text-base">{selectedInvoice.invoice_number}</span>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Amount</span>
                  <span className="font-semibold text-slate-700">LKR {selectedInvoice.total_amount.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-red-400 uppercase block">Balance Due</span>
                  <span className="font-bold text-red-600">LKR {selectedInvoice.balance_amount.toLocaleString()}</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Payment Amount (LKR)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="number" 
                    step="0.01"
                    max={selectedInvoice.balance_amount}
                    value={payAmount} 
                    onChange={(e) => setPayAmount(e.target.value)} 
                    placeholder="e.g. 5000" 
                    className="pl-9 font-bold text-slate-800 text-base"
                    required 
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Payment Method</label>
                <select 
                  value={payMethod} 
                  onChange={(e) => setPayMethod(e.target.value)} 
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 font-semibold"
                >
                  <option value="Cash">💵 Cash</option>
                  <option value="Card">💳 Card Payment</option>
                  <option value="QR Payment">📱 QR Scan</option>
                  <option value="Bank Transfer">🏛️ Bank Transfer</option>
                  <option value="Online Payment">🌐 Online Payment</option>
                </select>
              </div>

              <div className="pt-4 border-t flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowPaymentModal(false)}
                  className="bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={paymentSubmitting}
                  className="bg-slate-900 text-white hover:bg-slate-800 font-semibold gap-2"
                >
                  {paymentSubmitting ? 'Recording...' : 'Record Payment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InvoicesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mr-3" />
        Loading billing dashboard...
      </div>
    }>
      <InvoicesPageContent />
    </Suspense>
  );
}
