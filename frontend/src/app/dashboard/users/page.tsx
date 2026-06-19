'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Users, UserCheck, ShieldAlert, Plus, Edit2, Trash2, 
  Search, X, Key, Mail, Phone, User 
} from 'lucide-react';

import { defaultRolePermissions, defaultRoleEditPermissions } from '@/lib/permissions';

const AVAILABLE_PERMISSIONS = [
  { name: 'Dashboard Overview', path: '/dashboard' },
  { name: 'New Order Creation', path: '/dashboard/orders/unified' },
  { name: 'Customers Directory', path: '/dashboard/customers' },
  { name: 'Orders List', path: '/dashboard/orders' },
  { name: 'Invoices & Payments', path: '/dashboard/invoices' },
  { name: 'Financial & Workload Reports', path: '/dashboard/reports' },
  { name: 'System Notifications', path: '/dashboard/notifications' },
  { name: 'User & Staff Profiles', path: '/dashboard/users' },
  { name: 'ERP System Settings', path: '/dashboard/settings' },
];

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal control
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState<number>(5); // Default to Tailor (ID 5)
  const [staffType, setStaffType] = useState('Tailor');
  const [mobileNumber, setMobileNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Load data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get('/users'),
        api.get('/users/roles')
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to load users data. Check permissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update staffType when role changes automatically to match
  const handleRoleChange = (selectedRoleId: number) => {
    setRoleId(selectedRoleId);
    const roleObj = roles.find(r => r.id === selectedRoleId);
    if (roleObj) {
      // Map Role to StaffType enum
      if (roleObj.name === 'Super Admin') setStaffType('Super Admin');
      else if (roleObj.name === 'Owner / Manager') setStaffType('Manager');
      else if (roleObj.name === 'CEO') setStaffType('Manager');
      else if (roleObj.name === 'Finance') setStaffType('Finance');
      else if (roleObj.name === 'Cashier') setStaffType('Cashier');
      else setStaffType('Tailor');

      // Update permissions checklist to defaults for role (both path and edit permissions combined)
      const defaultPaths = defaultRolePermissions[roleObj.name] || [];
      const defaultEdits = defaultRoleEditPermissions[roleObj.name] || [];
      setSelectedPermissions([...defaultPaths, ...defaultEdits]);
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setSelectedUser(null);
    setFullName('');
    setEmail('');
    setPassword('');
    setRoleId(5);
    setStaffType('Tailor');
    setMobileNumber('');
    setIsActive(true);
    
    const defaultPaths = defaultRolePermissions['Tailor'] || [];
    const defaultEdits = defaultRoleEditPermissions['Tailor'] || [];
    setSelectedPermissions([...defaultPaths, ...defaultEdits]);
    
    setIsOpen(true);
  };

  const openEditModal = (usr: any) => {
    setIsEditMode(true);
    setSelectedUser(usr);
    setFullName(usr.full_name);
    setEmail(usr.email);
    setPassword(''); // Leave blank
    setRoleId(usr.role_id);
    setStaffType(usr.staff?.staff_type || 'Tailor');
    setMobileNumber(usr.staff?.mobile_number || '');
    setIsActive(usr.is_active);
    
    if (usr.permissions && usr.permissions.length > 0) {
      setSelectedPermissions(usr.permissions);
    } else {
      const defaultPaths = defaultRolePermissions[usr.role_name] || [];
      const defaultEdits = defaultRoleEditPermissions[usr.role_name] || [];
      setSelectedPermissions([...defaultPaths, ...defaultEdits]);
    }
    
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const payload: any = {
      email,
      full_name: fullName,
      role_id: Number(roleId),
      is_active: isActive,
      staff_type: staffType,
      mobile_number: mobileNumber,
      salary: 0.0,
      commission_rate: 0.0,
      permissions: selectedPermissions
    };

    if (password) {
      payload.password = password;
    }

    try {
      if (isEditMode && selectedUser) {
        await api.put(`/users/${selectedUser.id}`, payload);
      } else {
        if (!password) {
          setError('Password is required for new users.');
          return;
        }
        payload.password = password;
        await api.post('/users', payload);
      }
      setIsOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to save user.');
    }
  };

  const handleDeactivate = async (userId: number) => {
    if (!confirm('Are you sure you want to deactivate this user?')) return;
    try {
      await api.delete(`/users/${userId}`);
      fetchData();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to deactivate user.');
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role_name && u.role_name.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Compute analytics metrics
  const totalStaff = users.length;
  const activeStaff = users.filter(u => u.is_active).length;
  const tailorsCount = users.filter(u => u.role_name === 'Tailor').length;

  if (loading && users.length === 0) {
    return <div className="text-center py-10 text-slate-500">Loading User Profiles...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header and Add button */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Staff & Users</h1>
          <p className="text-slate-500 text-sm mt-1">Manage tailor, cashier, and management accounts.</p>
        </div>
        <Button onClick={openAddModal} className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 shadow-md font-bold gap-2">
          <Plus className="h-4 w-4" /> Add Staff User
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Accounts</CardTitle>
            <Users className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalStaff}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-green-50/20 dark:bg-green-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase">Active Accounts</CardTitle>
            <UserCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-800 dark:text-green-300">{activeStaff}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-card">
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Total Tailors</CardTitle>
            <Plus className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{tailorsCount}</div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Search and Table */}
      <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-card">
        <CardHeader className="pb-3 border-b dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-lg">Staff Directory</CardTitle>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by name, email or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-semibold border-b dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4">Full Name</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Mobile</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      No staff users found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900 dark:text-slate-100">{u.full_name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{u.email}</td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            u.role_name === 'Super Admin' ? 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40' :
                            u.role_name === 'Owner / Manager' ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40' :
                            u.role_name === 'CEO' ? 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/40' :
                            u.role_name === 'Finance' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900/40' :
                            u.role_name === 'Cashier' ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900/40' :
                            u.role_name === 'Tailor' ? 'bg-purple-50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900/40' :
                            'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}>
                            {u.role_name}
                          </span>
                          {u.permissions && u.permissions.length > 0 && (
                            <span className="text-[10px] text-indigo-550 dark:text-indigo-400 font-bold tracking-tight">
                              Custom: {u.permissions.length} pages
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{u.staff?.mobile_number || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          u.is_active 
                            ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900/40' 
                            : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-100 dark:border-red-900/40'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openEditModal(u)}
                            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                            title="Edit profile"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          {u.is_active && u.role_name !== 'Super Admin' && (
                            <button
                              onClick={() => handleDeactivate(u.id)}
                              className="p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                              title="Deactivate account"
                            >
                              <Trash2 className="h-4 w-4" />
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

      {/* Add/Edit Modal dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 text-white px-6 py-4 flex justify-between items-center border-b border-slate-800">
              <h3 className="font-bold text-lg">{isEditMode ? 'Edit Staff Profile' : 'Register New Staff User'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Full Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 animate-in fade-in" />
                    <Input 
                      type="text" 
                      value={fullName} 
                      onChange={(e) => setFullName(e.target.value)} 
                      placeholder="e.g. Kamal Perera" 
                      className="pl-9 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-850"
                      required 
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Email (Username)</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="e.g. kamal@tailorpro.com" 
                      className="pl-9 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-850"
                      required 
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Password</label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      placeholder={isEditMode ? '•••••••• (leave blank)' : 'Minimum 6 chars'} 
                      className="pl-9 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-850"
                      required={!isEditMode} 
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Staff Role</label>
                  <select 
                    value={roleId} 
                    onChange={(e) => handleRoleChange(Number(e.target.value))} 
                    className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-slate-700 text-slate-800 dark:text-slate-200 font-semibold"
                  >
                    {roles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-1">Mobile Contact</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="text" 
                      value={mobileNumber} 
                      onChange={(e) => setMobileNumber(e.target.value)} 
                      placeholder="e.g. 0717654321" 
                      className="pl-9 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border-slate-200 dark:border-slate-850"
                    />
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1 flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isActive} 
                      onChange={(e) => setIsActive(e.target.checked)} 
                      className="h-4.5 w-4.5 rounded border-slate-350 dark:border-slate-800 text-slate-900 dark:text-white dark:bg-slate-900 focus:ring-slate-900 dark:focus:ring-slate-700 cursor-pointer"
                    />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">Account is Active</span>
                  </label>
                </div>

                {/* Customizable Accessible Pages & Permissions */}
                <div className="col-span-2 border-t dark:border-slate-800 pt-4">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase block mb-3">Custom Accessible Pages / Permissions</span>
                  <div className="overflow-x-auto bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                    <table className="w-full text-left text-xs font-semibold text-slate-700 dark:text-slate-300">
                      <thead>
                        <tr className="border-b dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                          <th className="pb-2">Module / Page</th>
                          <th className="pb-2 text-center w-24">View</th>
                          <th className="pb-2 text-center w-24">Edit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 dark:divide-slate-850">
                        {AVAILABLE_PERMISSIONS.map((perm) => {
                          const hasView = selectedPermissions.includes(perm.path);
                          const hasEdit = selectedPermissions.includes(`edit:${perm.path}`);
                          
                          // Hide or disable edit toggle for read-only pages like Dashboard and Reports
                          const isEditApplicable = perm.path !== '/dashboard' && perm.path !== '/dashboard/reports';
 
                          return (
                            <tr key={perm.path} className="hover:bg-slate-200/30 dark:hover:bg-slate-850/40">
                              <td className="py-2.5 font-bold">{perm.name}</td>
                              <td className="py-2.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={hasView}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedPermissions(prev => [...prev, perm.path]);
                                    } else {
                                      // Remove view and also edit if view is unchecked
                                      setSelectedPermissions(prev => prev.filter(p => p !== perm.path && p !== `edit:${perm.path}`));
                                    }
                                  }}
                                  className="h-4.5 w-4.5 rounded border-slate-350 dark:border-slate-800 text-slate-900 dark:text-white dark:bg-slate-900 focus:ring-slate-900 dark:focus:ring-slate-700 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 text-center">
                                {isEditApplicable ? (
                                  <input
                                    type="checkbox"
                                    checked={hasEdit}
                                    disabled={!hasView} // Can only edit if view is allowed
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPermissions(prev => [...prev, `edit:${perm.path}`]);
                                      } else {
                                        setSelectedPermissions(prev => prev.filter(p => p !== `edit:${perm.path}`));
                                      }
                                    }}
                                    className="h-4.5 w-4.5 rounded border-slate-350 dark:border-slate-800 text-slate-900 dark:text-white dark:bg-slate-900 focus:ring-slate-900 dark:focus:ring-slate-700 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                  />
                                ) : (
                                  <span className="text-slate-400 dark:text-slate-500 font-normal">N/A</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
 
              <div className="pt-4 border-t dark:border-slate-800 flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsOpen(false)}
                  className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 font-semibold"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold"
                >
                  {isEditMode ? 'Save Changes' : 'Register User'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
