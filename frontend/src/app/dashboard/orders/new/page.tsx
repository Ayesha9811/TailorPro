'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { DRESS_TYPES, DressType } from '@/lib/constants/measurements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function NewOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Selections
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  const [dressType, setDressType] = useState<DressType | ''>('');
  const [latestMeasurement, setLatestMeasurement] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    category: 'Men',
    quantity: 1,
    fabric_source: 'Store',
    fabric_details: '',
    special_remarks: '',
    delivery_date: '',
    total_amount: ''
  });

  // Customer search effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (customerSearch.length >= 2) {
        try {
          const res = await api.get(`/customers/search?q=${customerSearch}`);
          setCustomerResults(res.data);
        } catch (err) { console.error(err); }
      } else {
        setCustomerResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  // Fetch latest measurement when dress type and customer are selected
  useEffect(() => {
    if (selectedCustomer && dressType) {
      api.get(`/measurements/customer/${selectedCustomer.id}/latest?dress_type=${dressType}`)
        .then(res => setLatestMeasurement(res.data))
        .catch(() => setLatestMeasurement(null));
    } else {
      setLatestMeasurement(null);
    }
  }, [selectedCustomer, dressType]);

  const selectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerResults([]);
    setCustomerSearch('');
    // Auto-fill category based on customer profile if available
    if (cust.gender_category) {
      setFormData(prev => ({ ...prev, category: cust.gender_category }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !dressType || !formData.total_amount) return;
    
    setLoading(true);
    try {
      const payload = {
        customer_id: selectedCustomer.id,
        measurement_id: latestMeasurement ? latestMeasurement.id : null,
        category: formData.category,
        dress_type: dressType,
        quantity: Number(formData.quantity),
        fabric_source: formData.fabric_source,
        fabric_details: formData.fabric_details,
        special_remarks: formData.special_remarks,
        delivery_date: formData.delivery_date ? new Date(formData.delivery_date).toISOString() : null,
        total_amount: parseFloat(formData.total_amount),
      };

      const res = await api.post('/orders/', payload);
      router.push(`/dashboard/orders/${res.data.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Create Order</h1>
        <p className="text-slate-500 mt-2">Initialize a new tailoring order and automatically generate the invoice.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 1: Customer & Garment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selection */}
            {selectedCustomer ? (
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                <div>
                  <p className="font-semibold text-green-900">{selectedCustomer.full_name}</p>
                  <p className="text-sm text-green-700">{selectedCustomer.customer_code} • {selectedCustomer.contact_number}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>Change Customer</Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Search Customer</Label>
                <Input placeholder="Type name, phone, or code..." value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                {customerResults.length > 0 && (
                  <div className="border rounded-md divide-y max-h-40 overflow-y-auto bg-white shadow-sm">
                    {customerResults.map((c) => (
                      <button key={c.id} type="button" className="w-full text-left px-4 py-3 hover:bg-slate-50" onClick={() => selectCustomer(c)}>
                        <p className="font-medium text-sm">{c.full_name}</p>
                        <p className="text-xs text-slate-500">{c.customer_code} • {c.contact_number}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={formData.category} onValueChange={(v) => setFormData({...formData, category: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Men">Men</SelectItem>
                    <SelectItem value="Ladies">Ladies</SelectItem>
                    <SelectItem value="Kids">Kids</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Dress Type</Label>
                <Select value={dressType} onValueChange={(val) => setDressType(val as DressType)}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {DRESS_TYPES.map((dt) => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Measurement Status Alert */}
            {dressType && selectedCustomer && (
              <div className={`p-4 rounded-md border ${latestMeasurement ? 'bg-indigo-50 border-indigo-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className={`font-semibold ${latestMeasurement ? 'text-indigo-900' : 'text-amber-900'}`}>
                      {latestMeasurement ? 'Measurement Found' : 'No Measurement Found'}
                    </h4>
                    <p className={`text-sm ${latestMeasurement ? 'text-indigo-700' : 'text-amber-700'} mt-1`}>
                      {latestMeasurement 
                        ? `Latest ${dressType} measurement (${latestMeasurement.measurement_code}) will be linked and locked.` 
                        : `Please create a ${dressType} measurement for this customer before finalizing the order, or proceed without one.`}
                    </p>
                  </div>
                  {!latestMeasurement && (
                    <Button type="button" variant="outline" size="sm" onClick={() => router.push(`/dashboard/measurements/new?customer_id=${selectedCustomer.id}`)}>
                      Take Measurement
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 2: Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" min="1" value={formData.quantity} onChange={(e) => setFormData({...formData, quantity: parseInt(e.target.value) || 1})} />
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery Date</Label>
                <Input type="date" value={formData.delivery_date} onChange={(e) => setFormData({...formData, delivery_date: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Fabric Source</Label>
                <Select value={formData.fabric_source} onValueChange={(v) => setFormData({...formData, fabric_source: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Store">Store Provided</SelectItem>
                    <SelectItem value="Customer Provided">Customer Provided</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total Amount (LKR)</Label>
                <Input type="number" min="0" step="0.01" required value={formData.total_amount} onChange={(e) => setFormData({...formData, total_amount: e.target.value})} placeholder="e.g. 5000.00" />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fabric Details / Color</Label>
              <Input value={formData.fabric_details} onChange={(e) => setFormData({...formData, fabric_details: e.target.value})} placeholder="e.g. Navy Blue Wool Blend" />
            </div>

            <div className="space-y-2">
              <Label>Special Remarks & Instructions</Label>
              <textarea
                value={formData.special_remarks}
                onChange={(e) => setFormData({...formData, special_remarks: e.target.value})}
                rows={3}
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm"
                placeholder="Style preferences, pocket details..."
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={loading || !selectedCustomer || !dressType || !formData.total_amount}>
            {loading ? 'Processing...' : 'Confirm Order & Generate Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}
