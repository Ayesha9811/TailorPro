'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, Plus, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { hasEditPermission } from '@/lib/permissions';

function UnifiedOrderForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get('customer_id');
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("customer");

  if (user && !hasEditPermission(user, '/dashboard/orders/unified')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[65vh] text-center p-8 bg-white/50 backdrop-blur-md rounded-2xl border border-red-100 shadow-xl max-w-2xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="p-4 bg-red-50 text-red-500 rounded-full mb-6 ring-8 ring-red-50/50 animate-pulse">
          <X className="h-12 w-12" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">Access Denied</h2>
        <p className="text-slate-500 mt-3 max-w-md leading-relaxed text-sm">
          You do not have permission to enter or create orders in the system.
        </p>
        <div className="mt-8">
          <Button onClick={() => router.push('/dashboard/orders')} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
            Return to Orders Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // --- Tab 1: Customer State ---
  const [customerMode, setCustomerMode] = useState<"search" | "new">("search");
  
  // Search existing
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  
  // New Customer Form
  const [newCustomer, setNewCustomer] = useState({
    full_name: '', contact_number: '', email: '', gender_category: 'Men', address: '', student_admission_no: ''
  });
  
  // Potential duplicate matches state
  const [duplicateMatches, setDuplicateMatches] = useState<any[]>([]);

  // --- Tab 2: Measurement State ---
  const [dressType, setDressType] = useState<string>('');
  const [measurementMode, setMeasurementMode] = useState<"history" | "new">("new");
  
  // Dynamic Templates
  const [availableDressTypes, setAvailableDressTypes] = useState<string[]>([]);
  const [measurementTemplates, setMeasurementTemplates] = useState<Record<string, string[]>>({});

  // Custom Template Builder
  const [customTypeName, setCustomTypeName] = useState('');
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newFieldInput, setNewFieldInput] = useState('');
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);

  // History
  const [pastMeasurements, setPastMeasurements] = useState<any[]>([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<number | null>(null);
  
  // New Measurement
  const [measurementData, setMeasurementData] = useState<Record<string, string>>({});
  const [measurementNotes, setMeasurementNotes] = useState('');

  // Ad-hoc extra measurement fields (one-time, not saved to template)
  const [adHocFields, setAdHocFields] = useState<string[]>([]);
  const [adHocInput, setAdHocInput] = useState('');

  // --- Tab 3: Order State ---
  const [orderData, setOrderData] = useState({
    category: 'Men',
    quantity: 1,
    fabric_source: 'Store',
    fabric_details: '',
    special_remarks: '',
    delivery_date: '',
    total_amount: '',
    discount: '0'
  });
  
  const [paymentData, setPaymentData] = useState({
    advance_payment: '',
    payment_method: 'Cash'
  });

  // Fetch Customer Search
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

  // Check for duplicate customer matches when filling the new customer form
  useEffect(() => {
    const name = newCustomer.full_name.trim();
    const phone = newCustomer.contact_number.trim();

    if (customerMode !== 'new') {
      setDuplicateMatches([]);
      return;
    }

    if (name.length < 3 && phone.length < 3) {
      setDuplicateMatches([]);
      return;
    }

    const searchQuery = name.length >= 3 ? name : phone;

    const timer = setTimeout(async () => {
      try {
        const res = await api.get(`/customers/search?q=${encodeURIComponent(searchQuery)}`);
        const filtered = res.data.filter((c: any) => {
          const nameMatch = name.length >= 3 && c.full_name.toLowerCase().includes(name.toLowerCase());
          const phoneMatch = phone.length >= 3 && c.contact_number.includes(phone);
          return nameMatch || phoneMatch;
        });
        setDuplicateMatches(filtered);
      } catch (err) {
        console.error('Failed to check duplicate customers:', err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [newCustomer.full_name, newCustomer.contact_number, customerMode]);

  // Fetch templates on mount
  const fetchTemplates = async () => {
    try {
      const res = await api.get('/measurements/templates');
      setAvailableDressTypes(res.data.dress_types);
      setMeasurementTemplates(res.data.templates);
    } catch (err) { console.error("Failed to load templates", err); }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Pre-select customer if customer_id parameter is present in URL
  useEffect(() => {
    if (customerIdParam) {
      const fetchCustomer = async () => {
        try {
          const res = await api.get(`/customers/${customerIdParam}`);
          setSelectedCustomer(res.data);
          setCustomerMode("search");
        } catch (err) {
          console.error("Failed to fetch preselected customer:", err);
        }
      };
      fetchCustomer();
    }
  }, [customerIdParam]);

  // Fetch past measurements if an existing customer is selected and dress type changes
  useEffect(() => {
    if (selectedCustomer && dressType && dressType !== "Custom...") {
      api.get(`/measurements/customer/${selectedCustomer.id}?dress_type=${dressType}`)
        .then(res => {
          setPastMeasurements(res.data);
          if (res.data.length > 0) {
            setMeasurementMode("history");
            setSelectedMeasurementId(res.data[0].id); // default to latest
          } else {
            setMeasurementMode("new");
            setSelectedMeasurementId(null);
          }
        })
        .catch(err => console.error(err));
    }
  }, [selectedCustomer, dressType]);

  // Pre-fill or reset measurement fields when dress type or mode changes
  useEffect(() => {
    if (dressType && dressType !== "Custom..." && measurementMode === "new") {
      const template = measurementTemplates[dressType] || [];
      const initData: Record<string, string> = {};
      
      // Get past measurement data if available to pre-fill
      const latestPast = pastMeasurements.length > 0 ? pastMeasurements[0] : null;
      const pastData = latestPast?.measurement_data || {};
      const pastNotes = latestPast?.notes || '';

      template.forEach(field => { 
        initData[field] = pastData[field] !== undefined ? String(pastData[field]) : ''; 
      });

      // Also pre-fill any ad-hoc/extra fields that were in the past measurement
      const extraFields = Object.keys(pastData).filter(field => !template.includes(field));
      if (extraFields.length > 0) {
        setAdHocFields(extraFields);
        extraFields.forEach(field => {
          initData[field] = String(pastData[field]);
        });
      } else {
        setAdHocFields([]);
      }

      setMeasurementData(initData);
      setMeasurementNotes(pastNotes);
    }
  }, [dressType, measurementMode, measurementTemplates, pastMeasurements]);

  // Synchronize Order Category with Customer Gender automatically
  useEffect(() => {
    if (customerMode === "search" && selectedCustomer) {
      setOrderData(prev => ({ ...prev, category: selectedCustomer.gender_category || 'Men' }));
    } else if (customerMode === "new" && newCustomer.gender_category) {
      setOrderData(prev => ({ ...prev, category: newCustomer.gender_category }));
    }
  }, [customerMode, selectedCustomer, newCustomer.gender_category]);

  // Custom Template Logic
  const handleAddCustomField = () => {
    if (newFieldInput.trim() && !customFields.includes(newFieldInput.trim())) {
      setCustomFields([...customFields, newFieldInput.trim()]);
      setNewFieldInput('');
    }
  };

  // Ad-hoc field handlers
  const handleAddAdHocField = () => {
    const name = adHocInput.trim();
    if (name && !adHocFields.includes(name)) {
      setAdHocFields([...adHocFields, name]);
      setAdHocInput('');
    }
  };

  const handleRemoveAdHocField = (fieldName: string) => {
    setAdHocFields(adHocFields.filter(f => f !== fieldName));
    const newData = { ...measurementData };
    delete newData[fieldName];
    setMeasurementData(newData);
  };

  const handleSaveCustomTemplate = async () => {
    if (!customTypeName.trim() || customFields.length === 0) return;
    setIsSavingTemplate(true);
    try {
      await api.post('/measurements/templates', {
        dress_type: customTypeName.trim(),
        fields: customFields
      });
      await fetchTemplates();
      setDressType(customTypeName.trim());
      setCustomTypeName('');
      setCustomFields([]);
      setMeasurementMode("new");
    } catch (err) {
      console.error(err);
      alert("Failed to save custom template");
    } finally {
      setIsSavingTemplate(false);
    }
  };

  const handleCustomerSelect = (c: any) => {
    setSelectedCustomer(c);
    setCustomerSearch('');
    setCustomerResults([]);
    setOrderData(prev => ({ ...prev, category: c.gender_category || 'Men' }));
  };

  const isCustomerValid = () => {
    if (customerMode === "search") return !!selectedCustomer;
    return !!newCustomer.full_name && !!newCustomer.contact_number;
  };

  const isMeasurementValid = () => {
    if (!dressType) return false;
    if (measurementMode === "history") return !!selectedMeasurementId;
    return Object.values(measurementData).some(v => v !== ''); // basic check
  };

  const isOrderValid = () => {
    return !!orderData.total_amount && Number(orderData.quantity) > 0;
  };

  const handleSubmit = async () => {
    if (!isCustomerValid() || !isMeasurementValid() || !isOrderValid()) return;
    
    setLoading(true);
    try {
      const payload: any = {
        order: {
          category: orderData.category,
          dress_type: dressType,
          quantity: Number(orderData.quantity),
          fabric_source: orderData.fabric_source,
          fabric_details: orderData.fabric_details,
          special_remarks: orderData.special_remarks,
          delivery_date: orderData.delivery_date ? new Date(orderData.delivery_date).toISOString() : null,
          total_amount: parseFloat(orderData.total_amount),
          discount: orderData.discount ? parseFloat(orderData.discount) : 0.0
        },
        advance_payment: paymentData.advance_payment ? parseFloat(paymentData.advance_payment) : 0,
        payment_method: paymentData.payment_method
      };

      // Attach Customer
      if (customerMode === "search") {
        payload.customer_id = selectedCustomer.id;
      } else {
        payload.customer = { ...newCustomer };
        if (!payload.customer.email) delete payload.customer.email;
        if (!payload.customer.student_admission_no) delete payload.customer.student_admission_no;
      }

      // Attach Measurement
      if (measurementMode === "history") {
        payload.measurement_id = selectedMeasurementId;
      } else {
        payload.measurement_data = measurementData;
        payload.measurement_notes = measurementNotes;
      }

      const res = await api.post('/orders/unified', payload);
      router.push(`/dashboard/orders/${res.data.id}`);
    } catch (err: any) {
      console.error(err);
      alert(err?.response?.data?.detail || "Failed to create unified order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Unified Order Entry</h1>
        <p className="text-slate-500 mt-1">Create customer profile, measurements, and order details in a single seamless transaction.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6 bg-slate-100 p-1">
          <TabsTrigger value="customer" className="font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">1. Customer</TabsTrigger>
          <TabsTrigger value="measurement" disabled={!isCustomerValid()} className="font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">2. Garment & Measurement</TabsTrigger>
          <TabsTrigger value="order" disabled={!isMeasurementValid()} className="font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm">3. Order & Payment</TabsTrigger>
        </TabsList>

        {/* --- STEP 1: CUSTOMER --- */}
        <TabsContent value="customer">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b">
              <CardTitle>Customer Details</CardTitle>
              <div className="flex gap-2">
                <Button variant={customerMode === "search" ? "default" : "outline"} size="sm" onClick={() => setCustomerMode("search")}>Existing Customer</Button>
                <Button variant={customerMode === "new" ? "default" : "outline"} size="sm" onClick={() => setCustomerMode("new")}>New Customer</Button>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {customerMode === "search" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search Database</Label>
                    <Input 
                      placeholder="Type name, phone, or code..." 
                      value={customerSearch} 
                      onChange={(e) => setCustomerSearch(e.target.value)} 
                    />
                    {customerResults.length > 0 && (
                      <div className="border rounded-md divide-y max-h-40 overflow-y-auto shadow-sm">
                        {customerResults.map((c) => (
                          <button key={c.id} type="button" className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors" onClick={() => handleCustomerSelect(c)}>
                            <p className="font-medium text-sm">{c.full_name}</p>
                            <p className="text-xs text-slate-500">{c.customer_code} • {c.contact_number}</p>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedCustomer && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-md flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-green-900">{selectedCustomer.full_name}</p>
                        <p className="text-sm text-green-700">{selectedCustomer.contact_number} • {selectedCustomer.gender_category}</p>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>Clear</Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input value={newCustomer.full_name} onChange={e => setNewCustomer({...newCustomer, full_name: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Number *</Label>
                    <Input value={newCustomer.contact_number} onChange={e => setNewCustomer({...newCustomer, contact_number: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Gender Category</Label>
                    <Select value={newCustomer.gender_category} onValueChange={v => setNewCustomer({...newCustomer, gender_category: v})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Men">Men</SelectItem>
                        <SelectItem value="Ladies">Ladies</SelectItem>
                        <SelectItem value="Kids">Kids</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Email (Optional)</Label>
                    <Input value={newCustomer.email} onChange={e => setNewCustomer({...newCustomer, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <Label>Student Admission No. (Optional)</Label>
                    <Input placeholder="e.g. 2026/001" value={newCustomer.student_admission_no} onChange={e => setNewCustomer({...newCustomer, student_admission_no: e.target.value})} />
                  </div>

                  {duplicateMatches.length > 0 && (
                    <div className="col-span-1 md:col-span-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 space-y-3 mt-2">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-400 font-bold text-xs uppercase tracking-wider">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                        <span>Matching Existing Customers Found</span>
                      </div>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-normal">
                        A customer with a similar name or contact number already exists. Click one of the profiles below if you want to use them instead of creating a duplicate:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                        {duplicateMatches.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCustomerMode("search");
                              setDuplicateMatches([]);
                            }}
                            className="w-full text-left p-3 rounded-lg border border-amber-200 dark:border-amber-900/40 bg-white dark:bg-slate-900 hover:bg-amber-50/50 dark:hover:bg-amber-950/10 hover:border-amber-300 transition-all text-xs flex justify-between items-center group shadow-2xs"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="font-bold text-slate-800 dark:text-slate-200 truncate">{c.full_name}</p>
                              <p className="text-slate-500 dark:text-slate-400 font-semibold font-mono mt-0.5">{c.customer_code} • {c.contact_number}</p>
                            </div>
                            <span className="shrink-0 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:underline">
                              Use Profile &rarr;
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <Button disabled={!isCustomerValid()} onClick={() => setActiveTab("measurement")}>Continue to Measurements &rarr;</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- STEP 2: MEASUREMENTS --- */}
        <TabsContent value="measurement">
          <Card>
            <CardHeader className="bg-slate-50 border-b pb-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <CardTitle>Garment & Measurement</CardTitle>
                <div className="flex items-center gap-3">
                  <Label className="shrink-0 text-slate-600">Garment Type:</Label>
                  <Select value={dressType} onValueChange={(val) => setDressType(val)}>
                    <SelectTrigger className="w-[200px] bg-white border-slate-300">
                      <SelectValue placeholder="Select Garment..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDressTypes.map((dt) => <SelectItem key={dt} value={dt}>{dt}</SelectItem>)}
                      <SelectItem value="Custom..." className="text-indigo-600 font-semibold border-t mt-1">➕ Create Custom...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {!dressType ? (
                <div className="text-center py-8 text-slate-500">Please select a Garment Type above to continue.</div>
              ) : dressType === "Custom..." ? (
                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 space-y-6">
                  <div>
                    <h3 className="font-semibold text-indigo-900 text-lg">Custom Template Builder</h3>
                    <p className="text-indigo-700 text-sm">Design a new garment template. It will be saved globally for future use.</p>
                  </div>
                  
                  <div className="space-y-2 max-w-md">
                    <Label className="text-indigo-900">Custom Garment Name *</Label>
                    <Input placeholder="e.g. School Blazer" value={customTypeName} onChange={e => setCustomTypeName(e.target.value)} />
                  </div>

                  <div className="space-y-4">
                    <Label className="text-indigo-900">Measurement Fields *</Label>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {customFields.map((field, idx) => (
                        <div key={idx} className="bg-white border border-indigo-200 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center gap-2 shadow-sm">
                          {field}
                          <button type="button" onClick={() => setCustomFields(customFields.filter((_, i) => i !== idx))} className="hover:text-red-500">
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      {customFields.length === 0 && <span className="text-sm text-indigo-400 italic">No fields added yet.</span>}
                    </div>
                    
                    <div className="flex gap-2 max-w-md">
                      <Input 
                        placeholder="e.g. Sleeve Length" 
                        value={newFieldInput} 
                        onChange={e => setNewFieldInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddCustomField())}
                      />
                      <Button type="button" onClick={handleAddCustomField} variant="secondary" className="shrink-0 gap-1 bg-white hover:bg-slate-100 text-indigo-700">
                        <Plus className="w-4 h-4" /> Add Field
                      </Button>
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <Button 
                      onClick={handleSaveCustomTemplate} 
                      disabled={isSavingTemplate || !customTypeName.trim() || customFields.length === 0}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {isSavingTemplate ? "Saving..." : "Save Template & Use"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Mode Toggle (History vs New) */}
                  {selectedCustomer && pastMeasurements.length > 0 && (
                    <div className="flex gap-2 border-b pb-4">
                      <Button variant={measurementMode === "history" ? "default" : "outline"} size="sm" onClick={() => setMeasurementMode("history")}>
                        Use Past Measurement
                      </Button>
                      <Button variant={measurementMode === "new" ? "default" : "outline"} size="sm" onClick={() => setMeasurementMode("new")}>
                        Take New Measurement
                      </Button>
                    </div>
                  )}

                  {measurementMode === "history" && selectedCustomer ? (
                    <div className="space-y-4">
                      <Label>Select Previous Measurement</Label>
                      <Select value={selectedMeasurementId?.toString()} onValueChange={(v) => setSelectedMeasurementId(Number(v))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {pastMeasurements.map(m => (
                            <SelectItem key={m.id} value={m.id.toString()}>
                              {m.measurement_code} - {new Date(m.created_at).toLocaleDateString()} {m.is_used_in_order ? '(Locked)' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="p-4 bg-indigo-50 text-indigo-800 rounded-md border border-indigo-100 text-sm">
                        This measurement profile will be linked to the new order and locked from future edits.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {pastMeasurements.length > 0 && (
                        <div className="p-3 bg-amber-500/10 text-amber-800 dark:text-amber-400 rounded-lg border border-amber-500/20 text-xs font-semibold flex items-center justify-between gap-4 animate-in fade-in duration-200">
                          <span>
                            ℹ️ Pre-filled with values from the latest past measurement (dated {new Date(pastMeasurements[0].created_at).toLocaleDateString()}). Adjust only the fields that need updating.
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            type="button"
                            className="h-7 text-xs hover:bg-amber-500/20 text-amber-900 dark:text-amber-200 font-bold border border-amber-500/30"
                            onClick={() => {
                              const template = measurementTemplates[dressType] || [];
                              const initData: Record<string, string> = {};
                              template.forEach(field => { initData[field] = ''; });
                              setMeasurementData(initData);
                              setAdHocFields([]);
                              setMeasurementNotes('');
                            }}
                          >
                            Reset to Empty
                          </Button>
                        </div>
                      )}
                      {/* Standard template fields */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(measurementTemplates[dressType] || []).map((field) => (
                          <div key={field} className="space-y-1">
                            <Label className="text-xs uppercase text-slate-500">{field}</Label>
                            <Input 
                              value={measurementData[field] || ''} 
                              onChange={(e) => setMeasurementData({...measurementData, [field]: e.target.value})} 
                              placeholder='e.g. 15.5"'
                              className="h-9"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Ad-hoc extra fields */}
                      {adHocFields.length > 0 && (
                        <div className="border-t pt-4">
                          <Label className="text-xs uppercase text-green-700 mb-3 block">Extra Measurements</Label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {adHocFields.map((field) => (
                              <div key={field} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <Label className="text-xs uppercase text-green-600">{field}</Label>
                                  <button type="button" onClick={() => handleRemoveAdHocField(field)} className="text-red-400 hover:text-red-600">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                                <Input 
                                  value={measurementData[field] || ''} 
                                  onChange={(e) => setMeasurementData({...measurementData, [field]: e.target.value})} 
                                  placeholder='e.g. 15.5"'
                                  className="h-9 border-green-200 focus:border-green-400"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Add extra field UI */}
                      <div className="border-t pt-4">
                        <div className="flex gap-2 max-w-sm">
                          <Input 
                            placeholder="Add extra field, e.g. Collar Height" 
                            value={adHocInput} 
                            onChange={e => setAdHocInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddAdHocField())}
                            className="h-9 text-sm"
                          />
                          <Button type="button" onClick={handleAddAdHocField} variant="outline" size="sm" className="shrink-0 gap-1 text-green-700 border-green-300 hover:bg-green-50">
                            <Plus className="w-3.5 h-3.5" /> Add
                          </Button>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">Optional: add one-time extra measurements for this order only.</p>
                      </div>

                      <div className="space-y-2">
                        <Label>Measurement Notes (Optional)</Label>
                        <Input value={measurementNotes} onChange={e => setMeasurementNotes(e.target.value)} placeholder="Loose fit, tight collar..." />
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-6">
                    <Button variant="ghost" onClick={() => setActiveTab("customer")}>&larr; Back</Button>
                    <Button disabled={!isMeasurementValid()} onClick={() => setActiveTab("order")}>Continue to Payment &rarr;</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* --- STEP 3: ORDER & PAYMENT --- */}
        <TabsContent value="order">
          <Card>
            <CardHeader className="bg-slate-50 border-b">
              <CardTitle>Finalize Order & Financials</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Order Details Column */}
                <div className="md:col-span-2 space-y-4">
                  <h3 className="font-semibold text-slate-800 pb-2 border-b">Garment Specifications</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={orderData.category} onValueChange={v => setOrderData({...orderData, category: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Men">Men</SelectItem>
                          <SelectItem value="Ladies">Ladies</SelectItem>
                          <SelectItem value="Kids">Kids</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input type="number" min="1" value={orderData.quantity} onChange={(e) => setOrderData({...orderData, quantity: parseInt(e.target.value) || 1})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Fabric Source</Label>
                      <Select value={orderData.fabric_source} onValueChange={(v) => setOrderData({...orderData, fabric_source: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Store">Store Provided</SelectItem>
                          <SelectItem value="Customer Provided">Customer Provided</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Expected Delivery Date</Label>
                      <Input type="date" value={orderData.delivery_date} onChange={(e) => setOrderData({...orderData, delivery_date: e.target.value})} />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Fabric Color / Details</Label>
                      <Input value={orderData.fabric_details} onChange={(e) => setOrderData({...orderData, fabric_details: e.target.value})} placeholder="e.g. Navy Blue Wool Blend" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>Tailoring Instructions (Remarks)</Label>
                      <Input value={orderData.special_remarks} onChange={(e) => setOrderData({...orderData, special_remarks: e.target.value})} placeholder="Style preferences, pocket details..." />
                    </div>
                  </div>
                </div>

                {/* Financials Column */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <h3 className="font-semibold text-slate-800 pb-2 border-b border-slate-300">Financials</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700">Total Amount (LKR) *</Label>
                      <Input 
                        type="number" min="0" step="0.01" required 
                        value={orderData.total_amount} 
                        onChange={(e) => setOrderData({...orderData, total_amount: e.target.value})} 
                        placeholder="e.g. 5000.00"
                        className="text-lg font-semibold h-12"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-slate-700">Discount (LKR)</Label>
                      <Input 
                        type="number" min="0" step="0.01"
                        value={orderData.discount} 
                        onChange={(e) => setOrderData({...orderData, discount: e.target.value})} 
                        placeholder="e.g. 500.00"
                      />
                    </div>
                    
                    <div className="space-y-2 pt-4 border-t border-slate-200">
                      <Label className="text-slate-600">Advance Payment (Optional)</Label>
                      <Input 
                        type="number" min="0" step="0.01"
                        max={orderData.total_amount || 0}
                        value={paymentData.advance_payment} 
                        onChange={(e) => setPaymentData({...paymentData, advance_payment: e.target.value})} 
                        placeholder="e.g. 1000.00" 
                      />
                    </div>

                    {Number(paymentData.advance_payment) > 0 && (
                      <div className="space-y-2">
                        <Label className="text-slate-600">Payment Method</Label>
                        <Select value={paymentData.payment_method} onValueChange={(v) => setPaymentData({...paymentData, payment_method: v})}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Cash">Cash</SelectItem>
                            <SelectItem value="Card">Card</SelectItem>
                            <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                            <SelectItem value="Online Payment">Online Payment</SelectItem>
                            <SelectItem value="QR Payment">QR Payment</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              <div className="flex justify-between items-center pt-6 border-t mt-8">
                <Button variant="ghost" onClick={() => setActiveTab("measurement")}>&larr; Back to Garment</Button>
                <Button 
                  size="lg"
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-md font-semibold px-8" 
                  disabled={loading || !isOrderValid()} 
                  onClick={handleSubmit}
                >
                  {loading ? 'Processing Transaction...' : 'Complete Transaction & Generate Invoice'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}

export default function UnifiedOrderPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-6 h-6 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin mr-3" />
        Loading...
      </div>
    }>
      <UnifiedOrderForm />
    </Suspense>
  );
}
