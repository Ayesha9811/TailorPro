'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building, User, Users, Lock, Save, Phone, MapPin, Mail, Globe,
  ShieldCheck, AlertCircle, Search, Calendar, UserCheck
} from 'lucide-react';

import { hasEditPermission } from '@/lib/permissions';

export default function SettingsPage() {
  const { user, fetchUser } = useAuthStore();
  
  // Can view user list if they have permission to users page
  const canViewUsersList = user?.permissions && user.permissions.length > 0
    ? user.permissions.includes('/dashboard/users')
    : ['Super Admin', 'Owner / Manager', 'CEO'].includes(user?.role_name || '');

  // Can edit settings if they have edit permission to settings module
  const canEditCompany = hasEditPermission(user, '/dashboard/settings');

  // Loading and alerts
  const [loadingCompany, setLoadingCompany] = useState(true);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Company Details Form
  const [companyDetails, setCompanyDetails] = useState({
    name: '',
    number: '',
    address: '',
    email: '',
    website: '',
    description: ''
  });
  const [savingCompany, setSavingCompany] = useState(false);

  // My Profile Form
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    email: '',
    mobileNumber: '',
    password: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Registered Users (Admin Only)
  const [registeredUsers, setRegisteredUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Company Settings
  const fetchCompanyDetails = async () => {
    try {
      setLoadingCompany(true);
      const res = await api.get('/settings/company');
      setCompanyDetails({
        name: res.data.name || '',
        number: res.data.number || '',
        address: res.data.address || '',
        email: res.data.email || '',
        website: res.data.website || '',
        description: res.data.description || ''
      });
    } catch (err) {
      console.error('Failed to load company details', err);
    } finally {
      setLoadingCompany(false);
    }
  };

  // Fetch Current User Details
  const fetchProfileDetails = async () => {
    try {
      setLoadingProfile(true);
      const res = await api.get('/users/me');
      setProfileForm({
        fullName: res.data.full_name || '',
        email: res.data.email || '',
        mobileNumber: res.data.staff?.mobile_number || '',
        password: ''
      });
    } catch (err) {
      console.error('Failed to load profile details', err);
    } finally {
      setLoadingProfile(false);
    }
  };

  // Fetch Registered Users List (Admin Only)
  const fetchUsers = async () => {
    if (!canViewUsersList) return;
    try {
      setLoadingUsers(true);
      const res = await api.get('/users');
      setRegisteredUsers(res.data || []);
    } catch (err) {
      console.error('Failed to load registered users', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
    fetchProfileDetails();
    if (canViewUsersList) {
      fetchUsers();
    }
  }, [user]);

  // Handle Save Company Details
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEditCompany) return;
    setSuccessMsg('');
    setErrorMsg('');
    setSavingCompany(true);
    try {
      await api.put('/settings/company', companyDetails);
      setSuccessMsg('Company settings updated successfully.');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to save company details.');
    } finally {
      setSavingCompany(false);
    }
  };

  // Handle Save Profile Details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    setSavingProfile(true);
    try {
      const payload: any = {
        full_name: profileForm.fullName,
        email: profileForm.email,
        mobile_number: profileForm.mobileNumber
      };
      if (profileForm.password.trim() !== '') {
        payload.password = profileForm.password;
      }
      await api.put('/users/me', payload);
      setSuccessMsg('Profile updated successfully.');
      setProfileForm(prev => ({ ...prev, password: '' }));
      await fetchUser(); // Update navbar info
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.detail || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Filter registered users by search
  const filteredUsers = registeredUsers.filter(u => {
    const query = searchQuery.toLowerCase();
    return (
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.role_name?.toLowerCase().includes(query) ||
      u.staff?.mobile_number?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">System Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure company profiles, personal profiles, and monitor staff creation.</p>
      </div>

      {/* Alert Messages */}
      {successMsg && (
        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
          <ShieldCheck className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-400 p-4 rounded-xl flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="company" className="w-full">
        <TabsList className="bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-6">
          <TabsTrigger value="company" className="gap-2 px-4 py-2">
            <Building className="h-4 w-4" />
            Company Details
          </TabsTrigger>
          <TabsTrigger value="profile" className="gap-2 px-4 py-2">
            <User className="h-4 w-4" />
            My Profile
          </TabsTrigger>
          {canViewUsersList && (
            <TabsTrigger value="users" className="gap-2 px-4 py-2">
              <Users className="h-4 w-4" />
              All Registered Profiles
            </TabsTrigger>
          )}
        </TabsList>

        {/* Tab 1: Company Details */}
        <TabsContent value="company">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">Company Profile</CardTitle>
                  <CardDescription>Verify or configure tailorshop details shown on invoice prints.</CardDescription>
                </div>
                {!canEditCompany && (
                  <Badge variant="secondary" className="bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 py-1 px-3 border">
                    Read-Only (Admin Access Required)
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingCompany ? (
                <div className="text-center py-12 text-slate-500">Loading company configurations...</div>
              ) : (
                <form onSubmit={handleSaveCompany} className="space-y-6 max-w-2xl">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="companyName" className="font-semibold text-slate-700 dark:text-slate-300">Company Name</Label>
                      <div className="relative">
                        <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="companyName"
                          type="text"
                          value={companyDetails.name}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, name: e.target.value })}
                          placeholder="e.g. TailorPro Colombo"
                          disabled={!canEditCompany}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyNumber" className="font-semibold text-slate-700 dark:text-slate-300">Contact Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="companyNumber"
                          type="text"
                          value={companyDetails.number}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, number: e.target.value })}
                          placeholder="e.g. +94 11 234 5678"
                          disabled={!canEditCompany}
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyEmail" className="font-semibold text-slate-700 dark:text-slate-300">Business Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="companyEmail"
                          type="email"
                          value={companyDetails.email}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, email: e.target.value })}
                          placeholder="e.g. contact@tailorpro.com"
                          disabled={!canEditCompany}
                          className="pl-9"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite" className="font-semibold text-slate-700 dark:text-slate-300">Website / Link</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="companyWebsite"
                          type="text"
                          value={companyDetails.website}
                          onChange={(e) => setCompanyDetails({ ...companyDetails, website: e.target.value })}
                          placeholder="e.g. www.tailorpro.com"
                          disabled={!canEditCompany}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyAddress" className="font-semibold text-slate-700 dark:text-slate-300">Physical Address</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <textarea
                        id="companyAddress"
                        rows={3}
                        value={companyDetails.address}
                        onChange={(e) => setCompanyDetails({ ...companyDetails, address: e.target.value })}
                        placeholder="e.g. 123 Galle Road, Colombo 03, Sri Lanka"
                        disabled={!canEditCompany}
                        className="w-full min-h-[80px] rounded-md border border-input bg-transparent px-3 py-2 pl-9 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companyDescription" className="font-semibold text-slate-700 dark:text-slate-300">Receipt Notes / Tagline</Label>
                    <textarea
                      id="companyDescription"
                      rows={2}
                      value={companyDetails.description}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, description: e.target.value })}
                      placeholder="e.g. Thank you for your business! Items left past 30 days will be discarded."
                      disabled={!canEditCompany}
                      className="w-full min-h-[60px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>

                  {canEditCompany && (
                    <div className="pt-4 border-t flex justify-end">
                      <Button
                        type="submit"
                        disabled={savingCompany}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold gap-2"
                      >
                        <Save className="h-4 w-4" />
                        {savingCompany ? 'Saving Configurations...' : 'Save Details'}
                      </Button>
                    </div>
                  )}
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: My Profile */}
        <TabsContent value="profile">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <div>
                  <CardTitle className="text-lg font-bold">Personal Profile Settings</CardTitle>
                  <CardDescription>Manage your display name, email, phone contact, and security credentials.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge variant="default" className="bg-blue-600/10 text-blue-600 hover:bg-blue-600/20 border-transparent capitalize">
                    Role: {user?.role_name || 'Staff'}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {loadingProfile ? (
                <div className="text-center py-12 text-slate-500">Loading user profile details...</div>
              ) : (
                <form onSubmit={handleSaveProfile} className="space-y-6 max-w-2xl">
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="font-semibold text-slate-700 dark:text-slate-300">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="fullName"
                          type="text"
                          value={profileForm.fullName}
                          onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                          placeholder="e.g. John Doe"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="mobileNumber" className="font-semibold text-slate-700 dark:text-slate-300">Personal Contact Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="mobileNumber"
                          type="text"
                          value={profileForm.mobileNumber}
                          onChange={(e) => setProfileForm({ ...profileForm, mobileNumber: e.target.value })}
                          placeholder="e.g. +94 77 123 4567"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profileEmail" className="font-semibold text-slate-700 dark:text-slate-300">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="profileEmail"
                          type="email"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                          placeholder="e.g. john@tailorpro.com"
                          className="pl-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="profilePassword" className="font-semibold text-slate-700 dark:text-slate-300">Update Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                          id="profilePassword"
                          type="password"
                          value={profileForm.password}
                          onChange={(e) => setProfileForm({ ...profileForm, password: e.target.value })}
                          placeholder="Leave blank to keep current"
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t flex justify-end">
                    <Button
                      type="submit"
                      disabled={savingProfile}
                      className="bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 text-white font-semibold gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {savingProfile ? 'Updating Credentials...' : 'Save Profile Changes'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Registered Profiles List (Admin Only) */}
        {canViewUsersList && (
          <TabsContent value="users">
            <Card className="shadow-sm border-slate-200 dark:border-slate-800">
              <CardHeader className="border-b pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <CardTitle className="text-lg font-bold">Registered User Profiles</CardTitle>
                  <CardDescription>Track all user and staff profiles registered on the system.</CardDescription>
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search profiles by name, email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingUsers ? (
                  <div className="text-center py-12 text-slate-500">Loading user directories...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                        <tr>
                          <th className="px-6 py-4">Full Name</th>
                          <th className="px-6 py-4">Role</th>
                          <th className="px-6 py-4">Email</th>
                          <th className="px-6 py-4">Mobile Number</th>
                          <th className="px-6 py-4">Joined Date</th>
                          <th className="px-6 py-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredUsers.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                              No profiles found.
                            </td>
                          </tr>
                        ) : (
                          filteredUsers.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-slate-900 dark:text-white flex items-center gap-2.5">
                                <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                                  {u.full_name?.charAt(0).toUpperCase()}
                                </div>
                                {u.full_name}
                              </td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-medium">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  u.role_name === 'Super Admin' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400' :
                                  u.role_name === 'Owner / Manager' || u.role_name === 'CEO' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                                  u.role_name === 'Cashier' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/20 dark:text-sky-400' :
                                  'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400'
                                }`}>
                                  {u.role_name}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{u.email}</td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300 font-mono text-xs">
                                {u.staff?.mobile_number || 'N/A'}
                              </td>
                              <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                                <span className="flex items-center gap-1.5 text-xs">
                                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                  {new Date(u.created_at).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                  u.is_active ? 'bg-green-50 text-green-700 dark:bg-green-950/20 dark:text-green-400' : 'bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                                }`}>
                                  {u.is_active ? 'Active' : 'Suspended'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
