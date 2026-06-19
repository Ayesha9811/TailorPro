'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';

export default function CustomerForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [contactNumber, setContactNumber] = useState('');
  const [existingCustomers, setExistingCustomers] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [formData, setFormData] = useState({
    full_name: '',
    alternate_contact: '',
    email: '',
    address: '',
    gender_category: 'Men',
    birthday: '',
    notes: ''
  });

  // Debounced search for existing customers by contact number or name
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (contactNumber.length >= 7) {
        try {
          const res = await api.get(`/customers/contact/${contactNumber}`);
          setExistingCustomers(res.data);
          if (res.data.length > 0) {
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error(err);
        }
      } else {
        setExistingCustomers([]);
        setShowSuggestions(false);
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [contactNumber]);

  // Debounced search for existing customers by full name
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (formData.full_name.length >= 2) {
        try {
          const res = await api.get(`/customers/search?q=${encodeURIComponent(formData.full_name)}`);
          // If we also have contact results, merge them
          if (contactNumber.length >= 7) {
            const contactRes = await api.get(`/customers/contact/${contactNumber}`);
            const merged = Array.from(new Map([...res.data, ...contactRes.data].map(c => [c.id, c])).values());
            setExistingCustomers(merged);
          } else {
            setExistingCustomers(res.data);
          }
          if (res.data.length > 0) {
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error(err);
        }
      }
    }, 500);

    return () => clearTimeout(searchTimer);
  }, [formData.full_name, contactNumber]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleGenderChange = (value: string) => {
    setFormData(prev => ({ ...prev, gender_category: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/customers/', {
        ...formData,
        contact_number: contactNumber,
        birthday: formData.birthday ? new Date(formData.birthday).toISOString() : null,
      });
      router.push('/dashboard/customers');
    } catch (err) {
      console.error(err);
      alert('Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  const navigateToCustomer = (id: number) => {
    // In future: router.push(`/dashboard/customers/${id}`);
    alert(`Navigating to existing customer ID: ${id}`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-3xl">
      {/* Contact Number & Auto-Suggest */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="contactNumber" className="text-sm font-medium">Primary Contact Number *</Label>
          <div className="relative mt-1">
            <Input
              id="contactNumber"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="e.g. 0771234567"
              required
              className="text-lg py-6"
            />
          </div>
        </div>

        {showSuggestions && existingCustomers.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg p-4 animate-in fade-in slide-in-from-bottom-2">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Existing customers found with this number:
            </h4>
            <div className="space-y-2">
              {existingCustomers.map((cust) => (
                <div key={cust.id} className="flex items-center justify-between bg-white dark:bg-slate-900 p-3 rounded-md shadow-sm border border-blue-50 dark:border-slate-800">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{cust.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{cust.customer_code} • {cust.gender_category}</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => navigateToCustomer(cust.id)}>
                    View Profile
                  </Button>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-3 font-medium">
              You can still create a completely new independent customer profile using this same number below.
            </p>
          </div>
        )}
      </div>

      {/* Profile Details Card */}
      <Card className="border border-border bg-card shadow-sm overflow-hidden rounded-2xl">
        <CardContent className="p-6 md:p-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Live Profile preview column (left in md, spans full in sm) */}
            <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-secondary/10 dark:bg-secondary/20 rounded-2xl border border-border/50 text-center space-y-4 relative overflow-hidden group">
              {/* Animated background highlights based on gender selection */}
              <div className={`absolute inset-0 opacity-5 pointer-events-none transition-all duration-300 ${
                formData.gender_category === 'Men' ? 'bg-primary' :
                formData.gender_category === 'Ladies' ? 'bg-pink-500' :
                'bg-amber-500'
              }`} />
              
              {/* Avatar Frame */}
              <div className={`w-28 h-28 rounded-full border-2 p-1 relative flex items-center justify-center shadow-md bg-secondary/30 transition-all duration-300 hover:scale-105 ${
                formData.gender_category === 'Men' ? 'border-primary ring-4 ring-primary/10' :
                formData.gender_category === 'Ladies' ? 'border-pink-500 ring-4 ring-pink-500/10' :
                'border-amber-500 ring-4 ring-amber-500/10'
              }`}>
                {formData.gender_category === 'Men' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-primary animate-in fade-in scale-in-95 duration-200">
                    <defs>
                      <linearGradient id="menGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="var(--color-primary)" />
                        <stop offset="100%" stopColor="#1d4ed8" />
                      </linearGradient>
                    </defs>
                    <path d="M50 22 C38 22 32 30 32 40 C32 50 35 50 50 50 C65 50 68 50 68 40 C68 30 62 22 50 22 Z" fill="url(#menGrad)" opacity="0.1" />
                    <path d="M50 28 C45 28 42 33 42 39 C42 45 45 47 50 47 C55 47 58 45 58 39 C58 33 55 28 50 28 Z" fill="url(#menGrad)" />
                    <path d="M28 78 C28 64 38 56 50 56 C62 56 72 64 72 78" fill="none" stroke="url(#menGrad)" strokeWidth="6" strokeLinecap="round" />
                    <path d="M50 56 L50 66" fill="none" stroke="url(#menGrad)" strokeWidth="2.5" />
                    <path d="M45 68 L50 72 L55 68" fill="none" stroke="url(#menGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )}
                {formData.gender_category === 'Ladies' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-pink-500 animate-in fade-in scale-in-95 duration-200">
                    <defs>
                      <linearGradient id="ladiesGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#ec4899" />
                        <stop offset="100%" stopColor="#db2777" />
                      </linearGradient>
                    </defs>
                    <path d="M50 20 C38 20 32 28 32 38 C32 48 35 48 50 48 C65 48 68 48 68 38 C68 28 62 20 50 20 Z" fill="url(#ladiesGrad)" opacity="0.1" />
                    <path d="M50 26 C46 26 43 31 43 37 C43 43 46 45 50 45 C54 45 57 43 57 37 C57 31 54 26 50 26 Z" fill="url(#ladiesGrad)" />
                    <path d="M26 78 C26 64 36 56 50 56 C64 56 74 64 74 78" fill="none" stroke="url(#ladiesGrad)" strokeWidth="6" strokeLinecap="round" />
                    <circle cx="50" cy="15" r="7" fill="url(#ladiesGrad)" className="animate-bounce" style={{ animationDuration: '3s' }} />
                  </svg>
                )}
                {formData.gender_category === 'Kids' && (
                  <svg viewBox="0 0 100 100" className="w-full h-full text-amber-500 animate-in fade-in scale-in-95 duration-200">
                    <defs>
                      <linearGradient id="kidsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                    <path d="M50 24 C40 24 35 32 35 41 C35 50 38 50 50 50 C62 50 65 50 65 41 C65 32 60 24 50 24 Z" fill="url(#kidsGrad)" opacity="0.1" />
                    <circle cx="50" cy="38" r="9" fill="url(#kidsGrad)" />
                    <path d="M50 28 L50 24" fill="none" stroke="url(#kidsGrad)" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="50" cy="22" r="2.5" fill="url(#kidsGrad)" />
                    <path d="M30 78 C30 65 38 58 50 58 C62 58 70 65 70 78" fill="none" stroke="url(#kidsGrad)" strokeWidth="6" strokeLinecap="round" />
                    <path d="M46 43 Q50 46 54 43" fill="none" stroke="url(#kidsGrad)" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )}
              </div>

              {/* Details Preview */}
              <div className="space-y-1">
                <h3 className="font-extrabold text-base tracking-tight text-foreground transition-all duration-200 break-all">
                  {formData.full_name || 'New Customer'}
                </h3>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full border tracking-wide transition-all ${
                    formData.gender_category === 'Men' ? 'bg-primary/10 text-primary border-primary/20' :
                    formData.gender_category === 'Ladies' ? 'bg-pink-500/10 text-pink-500 border-pink-500/20' :
                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                  }`}>
                    {formData.gender_category === 'Men' ? 'Gentleman' :
                     formData.gender_category === 'Ladies' ? 'Lady' : 'Kid'}
                  </span>
                  {contactNumber && (
                    <span className="text-[9px] font-semibold text-muted-foreground bg-secondary px-2 py-0.5 rounded-full border border-border">
                      {contactNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Inputs grid Column */}
            <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="full_name" className="text-xs font-bold text-foreground">Full Name *</Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  required
                  className="bg-background border-border text-foreground rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-foreground">Gender Category *</Label>
                <Select value={formData.gender_category} onValueChange={handleGenderChange}>
                  <SelectTrigger className="bg-background border-border dark:border-slate-800 text-foreground rounded-lg">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800">
                    <SelectItem value="Men">Men</SelectItem>
                    <SelectItem value="Ladies">Ladies</SelectItem>
                    <SelectItem value="Kids">Kids</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="alternate_contact" className="text-xs font-bold text-foreground">Alternate Contact Number</Label>
                <Input
                  id="alternate_contact"
                  name="alternate_contact"
                  value={formData.alternate_contact}
                  onChange={handleChange}
                  className="bg-background border-border text-foreground rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-bold text-foreground">Email Address</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="bg-background border-border text-foreground rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-xs font-bold text-foreground">Birthday</Label>
                <Input
                  id="birthday"
                  name="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={handleChange}
                  className="bg-background border-border text-foreground rounded-lg"
                />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address" className="text-xs font-bold text-foreground">Address</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  className="bg-background border-border text-foreground rounded-lg"
                />
              </div>
              
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="notes" className="text-xs font-bold text-foreground">Internal Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full min-h-[80px] rounded-lg border border-border bg-background px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading || !contactNumber || !formData.full_name}>
          {loading ? 'Registering...' : 'Register New Customer'}
        </Button>
      </div>
    </form>
  );
}
