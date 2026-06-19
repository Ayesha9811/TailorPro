'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  BarChart3, TrendingUp, ShoppingBag, Users, Briefcase, Calendar, 
  ChevronRight, CheckCircle2, Download, Printer, RefreshCw, 
  AlertTriangle, Receipt, CreditCard, DollarSign, Ban, Clock, Award
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface ColumnDef {
  key: string;
  label: string;
  align?: 'left' | 'right' | 'center';
  format?: (val: any) => string;
}

interface ReportConfig {
  key: string;
  title: string;
  description: string;
  icon: any;
  columns: ColumnDef[];
}

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<string>('daily_sales');
  
  // Date states
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Data states
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // 12 Report Configurations
  const reportsList: ReportConfig[] = [
    {
      key: 'daily_sales',
      title: 'Daily Sales Report',
      description: 'Daily breakdown of gross sales, discounts applied, net revenues, and collections.',
      icon: TrendingUp,
      columns: [
        { key: 'date', label: 'Billing Date' },
        { key: 'orders_count', label: 'Orders placed', align: 'center' },
        { key: 'gross_sales', label: 'Gross Sales', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'discounts', label: 'Discounts', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'net_sales', label: 'Net Revenue', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'paid_amount', label: 'Paid Collected', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'balance_due', label: 'Receivables Due', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
      ]
    },
    {
      key: 'monthly_sales',
      title: 'Monthly Sales Report',
      description: 'Monthly summary of order counts, discounts, and total net income.',
      icon: BarChart3,
      columns: [
        { key: 'month', label: 'Billing Month' },
        { key: 'orders_count', label: 'Orders placed', align: 'center' },
        { key: 'gross_sales', label: 'Gross Sales', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'discounts', label: 'Discounts', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'net_sales', label: 'Net Revenue', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'paid_amount', label: 'Paid Collected', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'balance_due', label: 'Receivables Due', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
      ]
    },
    {
      key: 'advance_collected',
      title: 'Advance Collected Report',
      description: 'Log of payments collected, including advance customer deposits.',
      icon: DollarSign,
      columns: [
        { key: 'created_at', label: 'Transaction Time', format: (v) => new Date(v).toLocaleString() },
        { key: 'invoice_number', label: 'Invoice #' },
        { key: 'order_number', label: 'Order #' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'amount', label: 'Amount Collected', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'method', label: 'Payment Method', align: 'center' },
        { key: 'cashier_name', label: 'Cashier' },
      ]
    },
    {
      key: 'balance_receivable',
      title: 'Balance Receivable Report',
      description: 'Outstanding order balances awaiting customer collection.',
      icon: Receipt,
      columns: [
        { key: 'invoice_number', label: 'Invoice #' },
        { key: 'order_number', label: 'Order #' },
        { key: 'customer_name', label: 'Customer' },
        { key: 'contact_number', label: 'Mobile Phone' },
        { key: 'net_amount', label: 'Net Bill', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'paid_amount', label: 'Paid', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'balance_receivable', label: 'Receivable Due', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'payment_status', label: 'Status', align: 'center' },
        { key: 'delivery_date', label: 'Expected Delivery', format: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' },
      ]
    },
    {
      key: 'pending_orders',
      title: 'Pending Orders Report',
      description: 'Stitching and fitting jobs currently active in production.',
      icon: Clock,
      columns: [
        { key: 'order_number', label: 'Order #' },
        { key: 'created_at', label: 'Ordered On', format: (v) => new Date(v).toLocaleDateString() },
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'dress_type', label: 'Garment' },
        { key: 'quantity', label: 'Qty', align: 'center' },
        { key: 'status', label: 'Job Status', align: 'center' },
        { key: 'delivery_date', label: 'Due Date', format: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' },
        { key: 'fabric_source', label: 'Fabric Source' },
      ]
    },
    {
      key: 'delivered_orders',
      title: 'Delivered Orders Report',
      description: 'Orders successfully completed and collected by clients.',
      icon: CheckCircle2,
      columns: [
        { key: 'order_number', label: 'Order #' },
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'dress_type', label: 'Garment' },
        { key: 'quantity', label: 'Qty', align: 'center' },
        { key: 'delivered_at', label: 'Delivered On', format: (v) => new Date(v).toLocaleDateString() },
        { key: 'total_amount', label: 'Amount Paid', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'fabric_source', label: 'Fabric' },
      ]
    },
    {
      key: 'cancelled_orders',
      title: 'Cancelled Orders Report',
      description: 'Summary of cancelled custom tailoring commissions.',
      icon: Ban,
      columns: [
        { key: 'order_number', label: 'Order #' },
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'dress_type', label: 'Garment' },
        { key: 'quantity', label: 'Qty', align: 'center' },
        { key: 'cancelled_at', label: 'Cancelled On', format: (v) => new Date(v).toLocaleDateString() },
        { key: 'remarks', label: 'Notes / Reasons' },
      ]
    },
    {
      key: 'delayed_orders',
      title: 'Delayed Orders Report',
      description: 'Production alerts: Active stitching tasks past their due dates.',
      icon: AlertTriangle,
      columns: [
        { key: 'order_number', label: 'Order #' },
        { key: 'created_at', label: 'Created On', format: (v) => new Date(v).toLocaleDateString() },
        { key: 'customer_name', label: 'Customer Name' },
        { key: 'dress_type', label: 'Garment' },
        { key: 'quantity', label: 'Qty', align: 'center' },
        { key: 'delivery_date', label: 'Deadline', format: (v) => v ? new Date(v).toLocaleDateString() : 'N/A' },
        { key: 'days_delayed', label: 'Days Overdue', align: 'center', format: (v) => `${v} days` },
        { key: 'status', label: 'Status', align: 'center' },
      ]
    },
    {
      key: 'tailor_performance',
      title: 'Tailor Performance Report',
      description: 'Job counts, completions, and delay ratios per tailor.',
      icon: Award,
      columns: [
        { key: 'tailor_id', label: 'Tailor ID', align: 'center' },
        { key: 'tailor_name', label: 'Tailor Name' },
        { key: 'total_assigned', label: 'Total Jobs', align: 'center' },
        { key: 'active_orders', label: 'Active Jobs', align: 'center' },
        { key: 'completed_orders', label: 'Completed Jobs', align: 'center' },
        { key: 'delayed_orders', label: 'Overdue Jobs', align: 'center' },
        { key: 'completion_rate', label: 'Completion Rate', align: 'right', format: (v) => `${v}%` },
      ]
    },
    {
      key: 'dress_type_sales',
      title: 'Dress Type Sales Report',
      description: 'Best-selling garment types, order distribution, and total revenues.',
      icon: ShoppingBag,
      columns: [
        { key: 'dress_type', label: 'Garment Type' },
        { key: 'total_quantity', label: 'Total Stitched (pcs)', align: 'center' },
        { key: 'orders_count', label: 'Total Orders', align: 'center' },
        { key: 'net_revenue', label: 'Net Sales Revenue', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
      ]
    },
    {
      key: 'customer_repeat',
      title: 'Customer Repeat Order Report',
      description: 'Insights on repeat customer profiles, total spend, and averages.',
      icon: Users,
      columns: [
        { key: 'customer_code', label: 'Customer ID' },
        { key: 'customer_name', label: 'Client Name' },
        { key: 'contact_number', label: 'Mobile' },
        { key: 'gender_category', label: 'Category', align: 'center' },
        { key: 'total_orders', label: 'Orders Placed', align: 'center' },
        { key: 'total_spent', label: 'Total Spent', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
        { key: 'avg_order_value', label: 'Avg order Value', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
      ]
    },
    {
      key: 'payment_methods',
      title: 'Payment Method Summary',
      description: 'Revenue totals grouped by Cash, Card, Bank Transfer, QR, and Online channels.',
      icon: CreditCard,
      columns: [
        { key: 'payment_method', label: 'Channel Name' },
        { key: 'transactions_count', label: 'Txn Count', align: 'center' },
        { key: 'total_collected', label: 'Total Amount Collected', align: 'right', format: (v) => `LKR ${v.toLocaleString(undefined, {minimumFractionDigits: 2})}` },
      ]
    }
  ];

  // Set default dates (past 30 days)
  useEffect(() => {
    const today = new Date();
    const pastMonth = new Date();
    pastMonth.setDate(today.getDate() - 30);
    
    setStartDate(pastMonth.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  const handlePreset = (preset: 'today' | 'week' | 'month' | 'year') => {
    const today = new Date();
    const target = new Date();

    if (preset === 'today') {
      // today
    } else if (preset === 'week') {
      target.setDate(today.getDate() - 7);
    } else if (preset === 'month') {
      target.setDate(today.getDate() - 30);
    } else if (preset === 'year') {
      target.setMonth(0);
      target.setDate(1); // Jan 1st
    }

    setStartDate(target.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  };

  const generateReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/analytics/reports/run`, {
        params: {
          type: activeReport,
          start_date: startDate || undefined,
          end_date: endDate || undefined
        }
      });
      setReportData(res.data);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || 'Failed to fetch report data.');
    } finally {
      setLoading(false);
    }
  };

  // Run report whenever switcher changes, or dates change initially
  useEffect(() => {
    if (startDate && endDate) {
      generateReport();
    }
  }, [activeReport, startDate, endDate]);

  const activeConfig = reportsList.find(r => r.key === activeReport)!;

  // Compute stats metrics dynamically based on active report data
  const getSummaryMetrics = () => {
    if (!reportData || reportData.length === 0) return null;
    
    if (activeReport === 'daily_sales' || activeReport === 'monthly_sales') {
      const totalRev = reportData.reduce((acc, r) => acc + r.net_sales, 0);
      const totalOrders = reportData.reduce((acc, r) => acc + r.orders_count, 0);
      const avgSales = totalRev / reportData.length;
      return [
        { label: 'Total Revenue', value: `LKR ${totalRev.toLocaleString(undefined, {maximumFractionDigits:0})}` },
        { label: 'Total Orders', value: totalOrders },
        { label: 'Avg Period Sales', value: `LKR ${avgSales.toLocaleString(undefined, {maximumFractionDigits:0})}` }
      ];
    }
    
    if (activeReport === 'advance_collected') {
      const totalCol = reportData.reduce((acc, r) => acc + r.amount, 0);
      return [
        { label: 'Payments Count', value: reportData.length },
        { label: 'Total Collected', value: `LKR ${totalCol.toLocaleString(undefined, {maximumFractionDigits:0})}` }
      ];
    }

    if (activeReport === 'balance_receivable') {
      const totalRec = reportData.reduce((acc, r) => acc + r.balance_receivable, 0);
      return [
        { label: 'Receivables Invoices', value: reportData.length },
        { label: 'Total Outstanding', value: `LKR ${totalRec.toLocaleString(undefined, {maximumFractionDigits:0})}` }
      ];
    }

    if (activeReport === 'pending_orders' || activeReport === 'delayed_orders') {
      const totalQty = reportData.reduce((acc, r) => acc + r.quantity, 0);
      return [
        { label: 'Orders Count', value: reportData.length },
        { label: 'Total Garments', value: `${totalQty} pcs` }
      ];
    }

    if (activeReport === 'delivered_orders') {
      const totalVal = reportData.reduce((acc, r) => acc + r.total_amount, 0);
      const totalQty = reportData.reduce((acc, r) => acc + r.quantity, 0);
      return [
        { label: 'Collected Count', value: reportData.length },
        { label: 'Garments Delivered', value: `${totalQty} pcs` },
        { label: 'Revenue Realized', value: `LKR ${totalVal.toLocaleString(undefined, {maximumFractionDigits:0})}` }
      ];
    }

    if (activeReport === 'tailor_performance') {
      const totalAss = reportData.reduce((acc, r) => acc + r.total_assigned, 0);
      const totalAct = reportData.reduce((acc, r) => acc + r.active_orders, 0);
      const totalDel = reportData.reduce((acc, r) => acc + r.delayed_orders, 0);
      return [
        { label: 'Tailors Count', value: reportData.length },
        { label: 'Total Assigned Jobs', value: totalAss },
        { label: 'Current Workload (Active)', value: totalAct },
        { label: 'Overdue Jobs', value: totalDel }
      ];
    }

    if (activeReport === 'dress_type_sales') {
      const totalRev = reportData.reduce((acc, r) => acc + r.net_revenue, 0);
      const totalQty = reportData.reduce((acc, r) => acc + r.total_quantity, 0);
      return [
        { label: 'Garment Types', value: reportData.length },
        { label: 'Total Items Stitched', value: `${totalQty} pcs` },
        { label: 'Total Sales', value: `LKR ${totalRev.toLocaleString(undefined, {maximumFractionDigits:0})}` }
      ];
    }

    if (activeReport === 'customer_repeat') {
      const totalspent = reportData.reduce((acc, r) => acc + r.total_spent, 0);
      const avgSpent = totalspent / reportData.length;
      return [
        { label: 'Repeat Client Profiles', value: reportData.length },
        { label: 'Repeat Gross Spend', value: `LKR ${totalspent.toLocaleString(undefined, {maximumFractionDigits:0})}` },
        { label: 'Avg Client Value', value: `LKR ${avgSpent.toLocaleString(undefined, {maximumFractionDigits:0})}` }
      ];
    }

    if (activeReport === 'payment_methods') {
      const totalCol = reportData.reduce((acc, r) => acc + r.total_collected, 0);
      const totalTxn = reportData.reduce((acc, r) => acc + r.transactions_count, 0);
      return [
        { label: 'Channels', value: reportData.length },
        { label: 'Transaction Count', value: totalTxn },
        { label: 'Collected Revenue', value: `LKR ${totalCol.toLocaleString(undefined, {maximumFractionDigits:0})}` }
      ];
    }

    return null;
  };

  const handleExportCSV = () => {
    if (!reportData || reportData.length === 0) return;
    
    const headers = activeConfig.columns;
    const csvContent = [
      headers.map(h => `"${h.label}"`).join(','),
      ...reportData.map(row => 
        headers.map(h => {
          let val = row[h.key];
          // format output if helper exists
          if (h.format) {
            val = h.format(val);
          }
          if (typeof val === 'string') {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        }).join(',')
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeReport}_report_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrintReport = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    if (!reportData || reportData.length === 0) return;

    // Create a new jsPDF instance (Landscape, A4)
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageTitle = activeConfig.title;
    const dateRange = `Date Range: ${startDate || 'N/A'} to ${endDate || 'N/A'}`;
    const generatedOn = `Generated on: ${new Date().toLocaleString()}`;

    // Add Premium Brand Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('TailorPro Management System', 14, 15);

    // Business Subtitle / ERP Info
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text('ERP Custom Reports Summary • High-fidelity Audit Export', 14, 20);

    // Divider Line
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(0.5);
    doc.line(14, 24, 283, 24); // A4 Landscape width is ~297mm

    // Active Report Details
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(79, 70, 229); // indigo-600
    doc.text(pageTitle, 14, 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(activeConfig.description, 14, 37);

    // Report Metadata
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(dateRange, 200, 32);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(generatedOn, 200, 37);

    let currentY = 43;

    // Draw KPI Summary Metrics
    if (metrics && metrics.length > 0) {
      // Draw background box for KPI Metrics
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(14, currentY, 269, 18, 2, 2, 'F');

      let metricX = 20;
      metrics.forEach((m) => {
        // Label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(String(m.label).toUpperCase(), metricX, currentY + 5);

        // Value
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42); // slate-900
        doc.text(String(m.value), metricX, currentY + 13);

        metricX += 70; // Spacing between KPIs
      });

      currentY += 24;
    } else {
      currentY += 5;
    }

    // Build Table Headers and Rows
    const tableHeaders = activeConfig.columns.map(col => col.label);
    const tableRows = reportData.map(row => 
      activeConfig.columns.map(col => {
        const val = row[col.key];
        if (col.format) {
          return col.format(val);
        }
        return val !== null && val !== undefined ? String(val) : '—';
      })
    );

    // Setup column styles based on alignment settings
    const columnStyles: { [key: number]: any } = {};
    activeConfig.columns.forEach((col, idx) => {
      columnStyles[idx] = {
        halign: col.align === 'right' ? 'right' : col.align === 'center' ? 'center' : 'left'
      };
    });

    // Generate AutoTable
    autoTable(doc, {
      startY: currentY,
      head: [tableHeaders],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 23, 42], // slate-900
        textColor: [255, 255, 255],
        fontSize: 8,
        fontStyle: 'bold',
        halign: 'left' // Will be overridden by columnStyles if set
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85] // slate-700
      },
      columnStyles: columnStyles,
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer on every page
        const pageCount = (doc as any).internal.getNumberOfPages();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184); // slate-400
        
        // Center text at the bottom
        const footerText = `Page ${data.pageNumber} of ${pageCount}`;
        doc.text(footerText, 140, 200, { align: 'center' });
      }
    });

    // Save the PDF
    doc.save(`${activeReport}_report_${startDate}_to_${endDate}.pdf`);
  };

  const metrics = getSummaryMetrics();

  return (
    <div className="space-y-6">
      {/* Dynamic styles to handle hiding layout columns during print */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 0; background: white; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .print-report-container { display: block !important; width: 100% !important; padding: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; font-size: 11px !important; margin-top: 16px !important; }
          th, td { border: 1px solid #cbd5e1 !important; padding: 8px !important; text-align: left !important; }
          th { background-color: #f8fafc !important; color: #0f172a !important; font-weight: bold !important; }
          .print-header { display: block !important; margin-bottom: 24px !important; }
        }
        .print-header { display: none; }
      `}</style>

      {/* Printable page header */}
      <div className="print-header">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200">TailorPro Management ERP - Custom Reports Summary</h2>
        <h3 className="text-base font-semibold text-slate-600 dark:text-slate-350 mt-1">{activeConfig.title}</h3>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Filter Range: {startDate} to {endDate} • Generated on {new Date().toLocaleString()}</p>
      </div>

      {/* Main Header (Dashboard View Only) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print border-b dark:border-slate-800 pb-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Financial & Production Reports</h1>
          <p className="text-slate-500 text-sm mt-1">Generate auditing data, tailor workload reviews, and monthly revenue summaries.</p>
        </div>
      </div>

      {/* Controls: Date Range Pickers & Preset buttons */}
      <Card className="no-print shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-card">
        <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <Label className="text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase">Start Date</Label>
            <Input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)} 
              className="border-slate-200 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase">End Date</Label>
            <Input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)} 
              className="border-slate-200 dark:border-slate-850 dark:bg-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="space-y-2 col-span-1 md:col-span-2">
            <Label className="text-slate-600 dark:text-slate-300 font-semibold text-xs uppercase block mb-1">Predefined Filters</Label>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handlePreset('today')} className="text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800">Today</Button>
              <Button size="sm" variant="outline" onClick={() => handlePreset('week')} className="text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800">7 Days</Button>
              <Button size="sm" variant="outline" onClick={() => handlePreset('month')} className="text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800">30 Days</Button>
              <Button size="sm" variant="outline" onClick={() => handlePreset('year')} className="text-xs font-semibold bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800">This Year</Button>
              <Button size="sm" onClick={generateReport} disabled={loading} className="text-xs font-semibold bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 ml-auto gap-2">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} /> Run Report
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Reports Console layout (Sidebar Switcher + View) */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Sidebar Selector (Dashboard View Only) */}
        <div className="lg:col-span-1 space-y-2 no-print bg-slate-50 dark:bg-slate-900/35 border dark:border-slate-800 p-3 rounded-2xl">
          <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-3 mb-2">Available Reports</span>
          {reportsList.map((rep) => {
            const Icon = rep.icon;
            const isSelected = activeReport === rep.key;
            return (
              <button
                key={rep.key}
                onClick={() => {
                  setReportData([]);
                  setActiveReport(rep.key);
                }}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                  isSelected 
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md font-bold scale-[1.02]' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-slate-200 font-semibold'
                }`}
              >
                <Icon className={`h-4.5 w-4.5 shrink-0 ${isSelected ? 'text-indigo-400' : 'text-slate-400 dark:text-slate-500'}`} />
                <span className="text-xs truncate">{rep.title}</span>
              </button>
            );
          })}
        </div>

        {/* Dynamic Display Board */}
        <div className="lg:col-span-3 space-y-6 print-report-container">
               {/* Active Report Title & Description */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <activeConfig.icon className="h-5 w-5 text-indigo-500 shrink-0" />
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{activeConfig.title}</h2>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">{activeConfig.description}</p>
            </div>

            {/* Print & Export Actions (Dashboard view only) */}
            <div className="flex gap-2 shrink-0 no-print">
              <Button 
                onClick={handlePrintReport} 
                variant="outline" 
                size="sm" 
                className="gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </Button>
              <Button 
                onClick={handleExportCSV} 
                disabled={reportData.length === 0} 
                variant="outline" 
                size="sm" 
                className="gap-1.5 text-xs font-bold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-750 border-slate-200 dark:border-slate-700 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Export CSV
              </Button>
              <Button 
                onClick={handleDownloadPDF} 
                disabled={reportData.length === 0 || loading} 
                variant="outline" 
                size="sm" 
                className="gap-1.5 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 border-indigo-200 dark:border-indigo-900/50 shadow-sm"
              >
                <Download className="h-3.5 w-3.5" /> Download PDF
              </Button>
            </div>
          </div>

          {/* Dynamic KPI metric highlights */}
          {metrics && (
            <div className="grid gap-4 grid-cols-2 md:grid-cols-3">
              {metrics.map((m, idx) => (
                <Card key={idx} className="shadow-sm border-slate-100 dark:border-slate-850 bg-white dark:bg-slate-900">
                  <CardContent className="py-4">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">{m.label}</span>
                    <span className="text-xl font-black text-slate-800 dark:text-slate-100 mt-1 block">{m.value}</span>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Report Data Table */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden bg-card">
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-20 text-slate-400 font-medium">
                  <div className="w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-3" />
                  Generating and aggregating data...
                </div>
              ) : reportData.length === 0 ? (
                <div className="text-center py-20 text-slate-400 dark:text-slate-500 text-sm font-semibold italic">
                  No records found for the selected date range.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        {activeConfig.columns.map((col) => (
                          <th 
                            key={col.key} 
                            className={`px-4 py-3.5 ${
                              col.align === 'right' ? 'text-right' :
                              col.align === 'center' ? 'text-center' : 'text-left'
                            }`}
                          >
                            {col.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-950/20">
                      {reportData.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors text-slate-700 dark:text-slate-300">
                          {activeConfig.columns.map((col) => {
                            const val = row[col.key];
                            const formattedVal = col.format ? col.format(val) : (val !== null && val !== undefined ? String(val) : '—');
                            
                            return (
                              <td 
                                key={col.key} 
                                className={`px-4 py-4 font-medium ${
                                  col.align === 'right' ? 'text-right font-mono' :
                                  col.align === 'center' ? 'text-center' : 'text-left'
                                }`}
                              >
                                {col.key === 'order_number' || col.key === 'invoice_number' ? (
                                  <span className="font-bold text-slate-900 dark:text-white">{formattedVal}</span>
                                ) : col.key === 'status' || col.key === 'payment_status' ? (
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold text-[10px] ${
                                    formattedVal.includes('Paid') || formattedVal.includes('Collected') || formattedVal.includes('Ready')
                                      ? 'bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-900/40'
                                      : formattedVal.includes('Partial') || formattedVal.includes('Stitching') || formattedVal.includes('Fitting')
                                        ? 'bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/40'
                                        : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40'
                                  }`}>
                                    {formattedVal}
                                  </span>
                                ) : (
                                  formattedVal
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
