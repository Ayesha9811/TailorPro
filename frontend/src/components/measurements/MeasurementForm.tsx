'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { DRESS_TYPES, MEASUREMENT_TEMPLATES, DressType } from '@/lib/constants/measurements';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function MeasurementForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedCustomerId = searchParams.get('customer_id');

  const [loading, setLoading] = useState(false);
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [dressType, setDressType] = useState<DressType | ''>('');
  const [measurementData, setMeasurementData] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');

  // Search customers
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

  // When dress type changes, reset the form fields
  useEffect(() => {
    if (dressType) {
      const fields = MEASUREMENT_TEMPLATES[dressType];
      const empty: Record<string, string> = {};
      fields.forEach(f => empty[f] = '');
      setMeasurementData(empty);
    }
  }, [dressType]);

  const selectCustomer = (cust: any) => {
    setSelectedCustomer(cust);
    setCustomerId(String(cust.id));
    setCustomerResults([]);
    setCustomerSearch('');
  };

  const handleFieldChange = (field: string, value: string) => {
    setMeasurementData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !dressType) return;
    setLoading(true);
    try {
      // Convert string values to numbers where possible
      const processedData: Record<string, any> = {};
      for (const [key, val] of Object.entries(measurementData)) {
        const num = parseFloat(val);
        processedData[key] = isNaN(num) ? val : num;
      }

      await api.post('/measurements/', {
        customer_id: parseInt(customerId),
        dress_type: dressType,
        measurement_data: processedData,
        notes: notes || null,
      });
      router.push('/dashboard/measurements');
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || 'Failed to save measurement');
    } finally {
      setLoading(false);
    }
  };

  const dynamicFields = dressType ? MEASUREMENT_TEMPLATES[dressType] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl">
      {/* Step 1: Select Customer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 1 — Select Customer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {selectedCustomer ? (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
              <div>
                <p className="font-semibold text-green-900">{selectedCustomer.full_name}</p>
                <p className="text-sm text-green-700">{selectedCustomer.customer_code} • {selectedCustomer.contact_number}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => { setSelectedCustomer(null); setCustomerId(''); }}>
                Change
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Search Customer by Name, Code, or Contact</Label>
              <Input
                placeholder="Type to search..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
              {customerResults.length > 0 && (
                <div className="border rounded-md divide-y max-h-48 overflow-y-auto">
                  {customerResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
                      onClick={() => selectCustomer(c)}
                    >
                      <p className="font-medium text-sm">{c.full_name}</p>
                      <p className="text-xs text-slate-500">{c.customer_code} • {c.contact_number}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Select Dress Type */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Step 2 — Select Dress Type</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={dressType} onValueChange={(val) => setDressType(val as DressType)}>
            <SelectTrigger className="w-full max-w-xs">
              <SelectValue placeholder="Choose dress type..." />
            </SelectTrigger>
            <SelectContent>
              {DRESS_TYPES.map((dt) => (
                <SelectItem key={dt} value={dt}>{dt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Step 3: Dynamic Measurement Fields */}
      {dressType && dynamicFields.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Step 3 — Enter {dressType} Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {dynamicFields.map((field) => (
                <div key={field} className="space-y-1">
                  <Label htmlFor={`meas-${field}`} className="text-sm font-medium">{field}</Label>
                  <Input
                    id={`meas-${field}`}
                    value={measurementData[field] || ''}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    placeholder={`Enter ${field.toLowerCase()}`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-2">
              <Label htmlFor="notes">Notes / Alteration Instructions</Label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                placeholder="Optional fitting notes, alteration instructions..."
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" disabled={loading || !customerId || !dressType}>
          {loading ? 'Saving...' : 'Save Measurement'}
        </Button>
      </div>
    </form>
  );
}
