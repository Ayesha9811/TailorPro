"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, UserPlus } from "lucide-react";
import { api } from "@/lib/api";

interface Customer {
  id: number;
  contact_number: string;
  full_name: string;
  email?: string;
  address?: string;
  customer_code?: string;
}

export default function CustomerSearch({ onSelect }: { onSelect: (customer: Customer | null) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/customers/contact/${encodeURIComponent(query)}`);
      setResults(res.data || []);
      if ((res.data || []).length === 0) {
        // No related customers found — signal to parent to create new
        onSelect(null);
      }
    } catch (err) {
      setError("Error fetching customers");
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Contact Number..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <Button onClick={handleSearch} disabled={loading}>
          {loading ? "Searching..." : "Search"}
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-destructive/10 text-destructive rounded-md text-sm">
          {error}
        </div>
      )}

      {results.length > 0 ? (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Related Customers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              {results.map((c) => (
                <div key={c.id} className="flex items-center justify-between bg-white p-3 rounded-md shadow-sm border">
                  <div>
                    <p className="font-medium">{c.full_name}</p>
                    <p className="text-xs text-gray-500">{c.customer_code} • {c.contact_number}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={() => onSelect(c)} size="sm" variant="outline">Select</Button>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-neutral-700 mt-3">
              If none match, you can create a new separate customer profile with the same number.
            </p>
            <div className="mt-3 flex justify-end">
              <Button onClick={() => onSelect(null)}>Create New Customer</Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
