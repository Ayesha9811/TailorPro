"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { 
  Printer, Download, Share2, Receipt, Calendar, CreditCard, 
  MapPin, Phone, User, Check, RefreshCw, ShoppingBag, Landmark
} from "lucide-react";

interface Payment {
  id: number;
  amount: number;
  method: string;
  cashier_name?: string;
  created_at: string;
}

interface InvoicePrintProps {
  invoice: {
    id: number;
    invoice_number: string;
    order_id: number;
    total_amount: number;
    paid_amount: number;
    balance_amount: number;
    tax: number;
    discount: number;
    payment_status: string;
    created_at: string;
    cashier_name?: string;
    order?: {
      id: number;
      order_number: string;
      category: string;
      dress_type: string;
      quantity: number;
      delivery_date?: string;
      fabric_source?: string;
      fabric_details?: string;
      customer?: {
        id: number;
        customer_code: string;
        full_name: string;
        contact_number: string;
        address?: string;
      };
    };
  };
  payments?: Payment[];
}

export default function InvoicePrint({ invoice, payments = [] }: InvoicePrintProps) {
  const [printMode, setPrintMode] = useState<"customer" | "cashier" | "both">("both");
  const [copied, setCopied] = useState(false);

  const customer = invoice.order?.customer;
  const order = invoice.order;

  // Compute values
  const dateFormatted = new Date(invoice.created_at).toLocaleDateString(undefined, {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
  const deliveryFormatted = order?.delivery_date 
    ? new Date(order.delivery_date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : "Not Set";

  const quantity = order?.quantity || 1;
  const subtotal = invoice.total_amount + invoice.discount;
  const unitPrice = subtotal / quantity;
  
  // Advance payment is the first payment in the chronological payments list
  const advancePayment = payments.length > 0 ? payments[0].amount : 0.00;
  
  // Collect all unique payment methods used
  const paymentMethodsUsed = payments.length > 0 
    ? Array.from(new Set(payments.map(p => p.method))).join(", ")
    : "N/A";

  const handlePrint = (mode: "customer" | "cashier" | "both") => {
    setPrintMode(mode);
    // Give React time to update DOM before calling print
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleShare = () => {
    if (!order?.order_number) return;
    const baseUrl = window.location.origin;
    const trackingUrl = `${baseUrl}/track?order=${encodeURIComponent(order.order_number)}`;
    
    navigator.clipboard.writeText(trackingUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const generateOfflineHtml = () => {
    const cashierText = invoice.cashier_name || "System Cashier";
    const paymentRows = payments.map((p, idx) => `
      <tr class="item-row">
        <td>Payment #${idx + 1} (${new Date(p.created_at).toLocaleDateString()})</td>
        <td style="text-align: right;">${p.method}</td>
        <td style="text-align: right; font-weight: bold;">LKR ${p.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoice_number}</title>
        <style>
          body { font-family: 'Inter', system-ui, sans-serif; color: #1e293b; line-height: 1.5; padding: 40px; background-color: #f8fafc; }
          .receipt-container { max-width: 800px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05); }
          .header { display: flex; justify-content: space-between; border-b: 2px solid #f1f5f9; padding-bottom: 24px; margin-bottom: 24px; }
          .brand h1 { font-size: 28px; font-weight: 800; color: #0f172a; margin: 0; }
          .brand p { font-size: 13px; color: #64748b; margin: 4px 0 0 0; }
          .meta { text-align: right; }
          .meta h2 { font-size: 14px; font-weight: 700; color: #6366f1; text-transform: uppercase; margin: 0; tracking-spacing: 0.05em; }
          .meta p { font-size: 14px; margin: 4px 0; font-weight: 500; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 32px; }
          .section-title { font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; tracking-spacing: 0.05em; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px; margin-bottom: 12px; }
          .detail-p { font-size: 14px; margin: 4px 0; }
          .detail-p span { font-weight: bold; color: #0f172a; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 32px; }
          th { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 600; padding: 12px 8px; border-bottom: 2px solid #e2e8f0; text-align: left; }
          td { padding: 16px 8px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
          .totals { display: flex; flex-direction: column; align-items: flex-end; gap: 8px; border-top: 2px solid #e2e8f0; padding-top: 16px; margin-bottom: 32px; }
          .total-row { display: flex; justify-content: space-between; width: 300px; font-size: 14px; }
          .total-row.grand { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 1px solid #f1f5f9; padding-top: 8px; }
          .total-row.outstanding { color: #ef4444; font-weight: 700; }
          .total-row.collected { color: #22c55e; font-weight: 700; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
          .signature-box { text-align: center; width: 150px; }
          .signature-line { border-top: 1px solid #94a3b8; margin-top: 40px; padding-top: 4px; font-size: 12px; color: #64748b; }
          .badge { display: inline-block; padding: 4px 8px; font-size: 11px; font-weight: 700; border-radius: 9999px; text-transform: uppercase; }
          .badge-paid { background-color: #dcfce7; color: #15803d; }
          .badge-partial { background-color: #fef9c3; color: #a16207; }
          .badge-unpaid { background-color: #fee2e2; color: #b91c1c; }
        </style>
      </head>
      <body>
        <div class="receipt-container">
          <div class="header">
            <div class="brand">
              <h1>TailorPro ERP</h1>
              <p>123 Fashion Street, Colombo, Sri Lanka</p>
              <p>Tel: +94 11 234 5678 | billing@tailorpro.com</p>
            </div>
            <div class="meta">
              <h2>DIGITAL INVOICE</h2>
              <p style="font-size: 16px; font-weight: 700; color: #0f172a;">Invoice #: ${invoice.invoice_number}</p>
              <p>Order #: ${order?.order_number || 'N/A'}</p>
              <p>${dateFormatted}</p>
              <div style="margin-top: 8px;">
                <span class="badge ${
                  invoice.payment_status === 'Fully Paid' ? 'badge-paid' :
                  invoice.payment_status === 'Partially Paid' ? 'badge-partial' : 'badge-unpaid'
                }">${invoice.payment_status}</span>
              </div>
            </div>
          </div>

          <div class="grid">
            <div>
              <div class="section-title">Client Details</div>
              <p class="detail-p" style="font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 8px;">${customer?.full_name || 'Walk-in Client'}</p>
              <p class="detail-p">Phone: <span>${customer?.contact_number || 'N/A'}</span></p>
              <p class="detail-p">Address: <span>${customer?.address || 'Not Provided'}</span></p>
              <p class="detail-p">Client Code: <span>${customer?.customer_code || 'N/A'}</span></p>
            </div>
            <div>
              <div class="section-title">Order Specifications</div>
              <p class="detail-p">Garment Type: <span>${order?.dress_type || 'N/A'} (${order?.category || 'General'})</span></p>
              <p class="detail-p">Quantity: <span>${quantity} pcs</span></p>
              <p class="detail-p">Delivery Date: <span>${deliveryFormatted}</span></p>
              <p class="detail-p">Fabric Details: <span>${order?.fabric_source || 'Customer'} - ${order?.fabric_details || 'Standard'}</span></p>
            </div>
          </div>

          <div class="section-title">Line Items</div>
          <table>
            <thead>
              <tr>
                <th>Item & Description</th>
                <th style="text-align: right;">Quantity</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Total (Gross)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Custom Tailoring & Stitching Service - ${order?.dress_type || 'Garment'}</td>
                <td style="text-align: right;">${quantity}</td>
                <td style="text-align: right;">LKR ${unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                <td style="text-align: right;">LKR ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
            </tbody>
          </table>

          ${payments.length > 0 ? `
          <div class="section-title">Payment History Logs</div>
          <table style="margin-bottom: 24px;">
            <thead>
              <tr>
                <th>Transaction Reference</th>
                <th style="text-align: right;">Method</th>
                <th style="text-align: right;">Amount Processed</th>
              </tr>
            </thead>
            <tbody>
              ${paymentRows}
            </tbody>
          </table>
          ` : ''}

          <div class="totals">
            <div class="total-row">
              <span>Gross Subtotal:</span>
              <span>LKR ${subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="total-row" style="color: #64748b;">
              <span>Discounts Applied:</span>
              <span>- LKR ${invoice.discount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="total-row grand">
              <span>Net Total Amount:</span>
              <span>LKR ${invoice.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="total-row collected">
              <span>Total Paid (to date):</span>
              <span>LKR ${invoice.paid_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div class="total-row outstanding">
              <span>Balance Remaining:</span>
              <span>LKR ${invoice.balance_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>

          <div style="font-size: 13px; color: #64748b; background-color: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 40px;">
            <strong>Transaction Metadata:</strong><br/>
            Primary Payment Method: ${paymentMethodsUsed} <br/>
            Registered Cashier: ${cashierText} <br/>
            System Generated Receipt. Thank you for your business!
          </div>

          <div class="footer">
            <div class="signature-box">
              <div class="signature-line">Customer Signature</div>
            </div>
            <div class="signature-box">
              <div class="signature-line">Cashier Signature</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const handleDownload = () => {
    const htmlContent = generateOfflineHtml();
    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Invoice_${invoice.invoice_number}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Helper renderer for printable copies
  const InvoiceContent = ({ title }: { title: string }) => (
    <div className="p-8 border-2 border-slate-200 rounded-2xl bg-white shadow-sm flex flex-col justify-between h-full relative overflow-hidden">
      {/* Decorative colored bar for visual excellence */}
      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900" />
      
      <div>
        {/* Header Block */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-5 mb-5 mt-2">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">TailorPro ERP</h1>
            <p className="text-xs text-slate-500 font-medium">123 Fashion Street, Colombo, Sri Lanka</p>
            <p className="text-[10px] text-slate-400">Tel: +94 11 234 5678 | billing@tailorpro.com</p>
          </div>
          <div className="text-right">
            <h2 className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-900 text-white rounded inline-block mb-2">
              {title} COPY
            </h2>
            <p className="font-bold text-slate-800 text-sm">Invoice #: {invoice.invoice_number}</p>
            <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Order #: {order?.order_number || 'N/A'}</p>
            <p className="text-[10px] text-slate-400 mt-1">{dateFormatted}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
          <div>
            <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Bill To:</h3>
            <p className="font-bold text-slate-800 text-sm">{customer?.full_name || 'Walk-in Customer'}</p>
            {customer?.contact_number && (
              <p className="text-slate-500 font-medium flex items-center gap-1 mt-1">
                <Phone className="h-3 w-3 shrink-0" /> {customer.contact_number}
              </p>
            )}
            {customer?.address && (
              <p className="text-slate-400 flex items-start gap-1 mt-1 leading-relaxed max-w-[200px]">
                <MapPin className="h-3 w-3 shrink-0 mt-0.5" /> {customer.address}
              </p>
            )}
          </div>
          <div className="text-right flex flex-col items-end">
            <h3 className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-wider">Order Specifications:</h3>
            <p className="font-semibold text-slate-700">{order?.dress_type || 'Garment'} ({order?.category || 'Men'})</p>
            <p className="text-slate-500 mt-1">Quantity: <span className="font-bold">{quantity} pcs</span></p>
            <p className="text-slate-500 mt-0.5">Delivery Date: <span className="font-bold text-indigo-600">{deliveryFormatted}</span></p>
            {order?.fabric_details && (
              <p className="text-slate-400 text-[10px] mt-1 italic">Fabric: {order.fabric_details}</p>
            )}
          </div>
        </div>

        {/* Pricing Table */}
        <table className="w-full text-xs mb-6">
          <thead>
            <tr className="border-b border-slate-200 text-slate-400 font-bold text-left uppercase text-[9px] tracking-wider">
              <th className="py-2 font-semibold">Description</th>
              <th className="py-2 text-right font-semibold">Qty</th>
              <th className="py-2 text-right font-semibold">Unit Price</th>
              <th className="py-2 text-right font-semibold">Gross Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            <tr className="text-slate-700">
              <td className="py-3 font-medium">Stitching & Custom Tailoring - {order?.dress_type}</td>
              <td className="py-3 text-right font-semibold">{quantity}</td>
              <td className="py-3 text-right font-semibold">LKR {unitPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              <td className="py-3 text-right font-semibold">LKR {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Totals & Signatures */}
      <div className="border-t border-slate-100 pt-4 mt-auto">
        <div className="grid grid-cols-2 gap-4 items-end">
          {/* Metadata details on left */}
          <div className="space-y-1 text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <p><strong>Payment Status:</strong> <span className={`font-bold uppercase ${
              invoice.payment_status === 'Fully Paid' ? 'text-green-600' :
              invoice.payment_status === 'Partially Paid' ? 'text-yellow-600' : 'text-red-500'
            }`}>{invoice.payment_status}</span></p>
            <p><strong>Payment Method:</strong> {paymentMethodsUsed}</p>
            <p><strong>Cashier:</strong> {invoice.cashier_name || 'System Cashier'}</p>
          </div>

          {/* Money Totals on right */}
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-slate-500 font-medium">
              <span>Gross Subtotal:</span>
              <span>LKR {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-slate-400 font-medium">
              <span>Discounts:</span>
              <span>- LKR {invoice.discount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-slate-800 font-bold border-t border-slate-100 pt-1.5">
              <span>Net Total Amount:</span>
              <span>LKR {invoice.total_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-green-600 font-bold">
              <span>Paid Amount:</span>
              <span>LKR {invoice.paid_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
            <div className="flex justify-between text-red-600 font-extrabold text-sm border-t border-double border-red-200 pt-1.5">
              <span>Balance Due:</span>
              <span>LKR {invoice.balance_amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            </div>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-8 flex justify-between items-end border-t border-slate-50 pt-4">
          <div className="text-center w-36">
            <div className="border-t border-slate-300 pt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Customer Signature
            </div>
          </div>
          <div className="text-center w-36">
            <div className="border-t border-slate-300 pt-1 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
              Cashier Signature
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold italic text-right">
            TailorPro ERP System Receipt
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Action Bar (Buttons) */}
      <div className="flex flex-wrap gap-2.5 items-center bg-slate-50 p-4 rounded-xl border border-slate-200/80 no-print">
        {/* Separated Printing Actions */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <button
            onClick={() => handlePrint("customer")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Customer Copy
          </button>
          <div className="w-px bg-slate-200 my-1"></div>
          <button
            onClick={() => handlePrint("cashier")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Cashier Copy
          </button>
          <div className="w-px bg-slate-200 my-1"></div>
          <button
            onClick={() => handlePrint("both")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Printer className="h-3.5 w-3.5" /> Both Copies
          </button>
        </div>

        {/* File Actions */}
        <Button 
          onClick={handleDownload} 
          variant="outline" 
          className="gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
        >
          <Download className="h-3.5 w-3.5" /> Download HTML
        </Button>

        <Button 
          onClick={handleShare} 
          variant="outline" 
          className="gap-2 text-xs font-bold bg-white text-slate-700 hover:bg-slate-50 border-slate-200"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" /> Link Copied
            </>
          ) : (
            <>
              <Share2 className="h-3.5 w-3.5" /> Share Invoice
            </>
          )}
        </Button>
      </div>

      {/* Screen Preview Copy */}
      <div className="no-print bg-slate-100 p-6 rounded-2xl border border-slate-200/50 flex flex-col gap-6 shadow-inner max-h-[600px] overflow-y-auto">
        <div className="max-w-2xl mx-auto w-full space-y-6">
          <InvoiceContent title="CUSTOMER" />
          
          {/* Detailed Transaction History Section */}
          {payments.length > 0 && (
            <div className="bg-white rounded-xl border p-5 shadow-sm text-xs space-y-3">
              <h4 className="font-bold text-slate-900 border-b pb-2 flex items-center gap-2">
                <Receipt className="h-4 w-4 text-indigo-500" /> Transaction Payment History Logs
              </h4>
              <div className="divide-y divide-slate-100">
                {payments.map((p, idx) => (
                  <div key={p.id} className="py-2.5 flex justify-between items-center text-slate-600">
                    <div>
                      <p className="font-semibold text-slate-800">
                        Payment #{idx + 1}: LKR {p.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {new Date(p.created_at).toLocaleString()} • Method: {p.method}
                      </p>
                    </div>
                    {p.cashier_name && (
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium block">Recorded By</span>
                        <span className="font-semibold text-slate-700 text-[11px]">{p.cashier_name}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print-Only Layout (Optimized for A4) */}
      <div className="print-area hidden print:block bg-white w-[210mm] h-[297mm] mx-auto overflow-hidden">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .print-area { display: block !important; }
          }
        `}</style>
        
        <div className="flex flex-col gap-8 h-full justify-between py-6 px-4">
          {(printMode === "both" || printMode === "customer") && (
            <div className={`${printMode === 'both' ? 'h-[48%]' : 'h-full'}`}>
              <InvoiceContent title="CUSTOMER" />
            </div>
          )}
          
          {printMode === "both" && (
            <div className="border-t-2 border-dashed border-slate-300 relative my-2">
              <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-white px-3 text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">
                ✂️ Detach Here (Perforation Line)
              </span>
            </div>
          )}
          
          {(printMode === "both" || printMode === "cashier") && (
            <div className={`${printMode === 'both' ? 'h-[48%]' : 'h-full'}`}>
              <InvoiceContent title="CASHIER" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
