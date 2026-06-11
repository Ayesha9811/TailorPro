"use client";

import { useEffect, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingBag, Eye, Printer, ChevronRight } from "lucide-react";

interface Order {
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  delivery_date: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  "Order Confirmed": "bg-indigo-100 text-indigo-700 border-indigo-200",
  "Stitching Started": "bg-blue-100 text-blue-700 border-blue-200",
  "Fitting Pending": "bg-amber-100 text-amber-700 border-amber-200",
  "Ready for Collection": "bg-emerald-100 text-emerald-700 border-emerald-200",
  "Collected": "bg-green-100 text-green-700 border-green-200",
  "Cancelled": "bg-red-100 text-red-700 border-red-200",
};

export default function OrderTable() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("http://localhost:8000/api/v1/orders/")
      .then(res => res.json())
      .then(data => {
        setOrders(data);
        setLoading(false);
      })
      .catch(err => console.error("Error fetching orders", err));
  }, []);

  if (loading) return <div className="h-64 flex items-center justify-center">Loading orders...</div>;

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-xl flex items-center gap-2">
          <ShoppingBag className="h-5 w-5 text-primary" />
          Recent Orders
        </CardTitle>
        <Button variant="outline" size="sm" className="gap-1">
          View All <ChevronRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order #</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Delivery</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No orders found.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order.order_number}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.customer_id}</TableCell>
                  <TableCell>LKR {order.total_amount.toLocaleString()}</TableCell>
                  <TableCell className={order.balance_amount > 0 ? "text-red-600" : "text-green-600"}>
                    LKR {order.balance_amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge className={`${STATUS_COLORS[order.status]} variant-outline`}>
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(order.delivery_date).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" title="View Details">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" title="Print Invoice">
                      <Printer className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
