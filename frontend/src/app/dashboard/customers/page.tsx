'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Eye } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { hasEditPermission } from '@/lib/permissions';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function CustomersPage() {
  const { user } = useAuthStore();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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

  const fetchCustomers = async (searchQuery = '') => {
    setLoading(true);
    try {
      const url = searchQuery ? `/customers/search?q=${searchQuery}` : '/customers/';
      const res = await api.get(url);
      setCustomers(res.data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCustomers(search);
    }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Men': return 'bg-blue-100 text-blue-800';
      case 'Ladies': return 'bg-pink-100 text-pink-800';
      case 'Kids': return 'bg-purple-100 text-purple-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };
  const filteredCustomers = customers.filter(cust => {
    const matchesMonth = selectedMonth === 'all' || (cust.created_at && cust.created_at.startsWith(selectedMonth));
    return matchesMonth;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Customer Directory</h1>
          <p className="text-slate-500 text-sm mt-1">{filteredCustomers.length} of {customers.length} profiles shown</p>
        </div>
        {hasEditPermission(user, '/dashboard/customers') && (
          <Link href="/dashboard/orders/unified">
            <Button className="bg-slate-900 text-white hover:bg-slate-800 shadow-md gap-2">
              <UserPlus className="w-4 h-4" /> New Walk-in Order
            </Button>
          </Link>
        )}
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input 
                placeholder="Search by name, contact number, or customer code..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-10 w-full"
              />
            </div>
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-52 h-10 text-sm bg-white text-slate-800 border-slate-200">
                <SelectValue placeholder="All Months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {months.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-semibold text-xs uppercase tracking-wide border-b">
                <tr>
                  <th className="px-5 py-3">Customer Code</th>
                  <th className="px-5 py-3">Full Name</th>
                  <th className="px-5 py-3">Contact Number</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Admission No.</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
                        Loading customers...
                      </div>
                    </td>
                  </tr>
                ) : filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-10 text-slate-400">
                      No customers found. {search || selectedMonth !== 'all' ? 'Try a different filter.' : ''}
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((cust) => (
                    <tr key={cust.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-medium text-slate-700 text-xs">{cust.customer_code}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-900">{cust.full_name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{cust.contact_number}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getCategoryColor(cust.gender_category)}`}>
                          {cust.gender_category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500 text-xs">{cust.student_admission_no || '—'}</td>
                      <td className="px-5 py-3.5 text-right">
                        <Link href={`/dashboard/customers/${cust.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50">
                            <Eye className="w-3.5 h-3.5" /> View Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
