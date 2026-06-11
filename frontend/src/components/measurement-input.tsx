"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Scissors } from "lucide-react";

const DRESS_TYPES = {
  "Saree Jacket": ["Neck", "Chest", "Waist", "Length", "Sleeve Length", "Sleeve Mouth", "Shoulder", "Arm Hole"],
  "National Dress": ["Neck", "Chest", "Waist", "Length", "Shoulder", "Sleeve Length"],
  "Kurta": ["Neck", "Chest", "Waist", "Hip", "Length", "Shoulder", "Sleeve Length"],
  "Shirt": ["Neck", "Chest", "Waist", "Length", "Shoulder", "Sleeve Length", "Cuff"],
  "Trousers": ["Waist", "Hip", "Length", "Inseam", "Thigh", "Knee", "Bottom"]
};

export default function MeasurementInput({ customerId }: { customerId: number | string }) {
  const [dressType, setDressType] = useState<string>("");
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [previous, setPrevious] = useState<any[]>([]);
  const [selectedPrevious, setSelectedPrevious] = useState<any | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  const fetchPrevious = async (type: string) => {
    if (!customerId || !type) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/measurements/customer/${customerId}?dress_type=${encodeURIComponent(type)}`);
      if (res.ok) {
        const data = await res.json();
        setPrevious(data || []);
        if (data && data.length > 0) {
          setSelectedPrevious(data[0]); // Select latest by default
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // Reset measurements when dress type changes
    if (dressType) {
      const initial: Record<string, string> = {};
      DRESS_TYPES[dressType as keyof typeof DRESS_TYPES].forEach(field => { initial[field] = ""; });
      setMeasurements(initial);
      setShowComparison(false);
      fetchPrevious(dressType);
    }
  }, [dressType]);

  const handleInputChange = (field: string, value: string) => {
    setMeasurements(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!customerId || !dressType) return;
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/measurements/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          dress_type: dressType,
          measurement_data: measurements
        }),
      });
      if (response.ok) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        // refresh previous list
        fetchPrevious(dressType);
      }
    } catch (err) {
      console.error("Error saving measurements", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLatestIntoForm = async () => {
    if (!customerId || !dressType) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/measurements/customer/${customerId}/latest?dress_type=${encodeURIComponent(dressType)}`);
      if (res.ok) {
        const data = await res.json();
        if (data && data.measurement_data) {
          // populate form
          const mapped: Record<string, string> = {};
          Object.keys(data.measurement_data).forEach(k => mapped[k] = String(data.measurement_data[k] ?? ""));
          setMeasurements(mapped);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <Card className="shadow-lg border-primary/10">
      <CardHeader className="bg-primary/5">
        <CardTitle className="text-xl flex items-center gap-2">
          <Scissors className="h-5 w-5 text-primary" />
          Measurements
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="space-y-2">
          <Label htmlFor="dress-type">Select Dress Type</Label>
          <Select onValueChange={setDressType} value={dressType}>
            <SelectTrigger id="dress-type">
              <SelectValue placeholder="Select a dress type..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(DRESS_TYPES).map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {dressType && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {DRESS_TYPES[dressType as keyof typeof DRESS_TYPES].map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={field}>{field} (inches)</Label>
                <Input
                  id={field}
                  type="number"
                  step="0.1"
                  placeholder="0.0"
                  value={measurements[field] || ""}
                  onChange={(e) => handleInputChange(field, e.target.value)}
                  className="focus-visible:ring-primary"
                />
              </div>
            ))}
          </div>
        )}

        {dressType && (
          <div className="pt-4 flex items-center gap-4">
            <Button onClick={handleSubmit} disabled={loading} className="w-full md:w-auto">
              {loading ? "Saving..." : "Save Measurements"}
            </Button>
            <Button onClick={loadLatestIntoForm} variant="outline">Load Latest</Button>
            {success && (
              <span className="text-sm text-green-600 font-medium animate-pulse">
                ✓ Saved successfully!
              </span>
            )}
          </div>
        )}

        {dressType && previous.length > 0 && (
          <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-amber-900">📋 Previous Measurements Available</h4>
              <Button size="sm" variant="outline" onClick={() => setShowComparison(!showComparison)}>
                {showComparison ? 'Hide' : 'Show'} Comparison
              </Button>
            </div>
            
            {!showComparison ? (
              <div className="grid gap-2">
                {previous.map((p: any, idx) => (
                  <div key={p.id} className="flex items-center justify-between bg-white p-2.5 rounded border border-amber-100 cursor-pointer hover:bg-amber-100/50" onClick={() => {
                    const mapped: Record<string, string> = {};
                    Object.keys(p.measurement_data || {}).forEach(k => mapped[k] = String(p.measurement_data[k] ?? ""));
                    setMeasurements(mapped);
                    setSelectedPrevious(p);
                  }}>
                    <div>
                      <p className="text-sm font-semibold text-amber-900">{p.measurement_code}</p>
                      <p className="text-xs text-amber-700">{new Date(p.created_at).toLocaleDateString()} at {new Date(p.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                    <Button size="sm" variant="ghost" className="text-amber-700 hover:bg-amber-200">
                      {idx === 0 ? 'Latest' : 'Use'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : selectedPrevious ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-bold text-amber-900 mb-2">OLD: {selectedPrevious.measurement_code}</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(selectedPrevious.measurement_data || {}).map(([k, v]: any) => (
                      <div key={k} className="flex justify-between p-1.5 bg-white rounded border border-amber-100">
                        <span className="font-medium text-amber-800">{k}</span>
                        <span className="text-amber-700">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-green-900 mb-2">NEW: (Enter below)</p>
                  <div className="space-y-1 text-xs">
                    {Object.entries(measurements).map(([k, v]: any) => (
                      <div key={k} className="flex justify-between p-1.5 bg-white rounded border border-green-100">
                        <span className="font-medium text-green-800">{k}</span>
                        <span className={`${v ? 'text-green-700 font-semibold' : 'text-gray-400'}`}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {previous.length > 0 && (
          <div className="mt-4">
            <h4 className="text-sm font-medium">All Previous Measurements</h4>
            <div className="grid gap-2 mt-2">
              {previous.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded bg-gray-50">
                  <div>
                    <p className="text-sm font-medium">{p.measurement_code}</p>
                    <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => {
                      const mapped: Record<string, string> = {};
                      Object.keys(p.measurement_data || {}).forEach(k => mapped[k] = String(p.measurement_data[k] ?? ""));
                      setMeasurements(mapped);
                    }}>Use</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      alert(JSON.stringify(p.measurement_data, null, 2));
                    }}>View</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
