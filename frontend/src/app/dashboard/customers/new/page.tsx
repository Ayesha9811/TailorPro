import CustomerForm from '@/components/customers/CustomerForm';

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Register Customer</h1>
        <p className="text-slate-500 mt-2">Create a new independent customer profile.</p>
      </div>
      
      <CustomerForm />
    </div>
  );
}
