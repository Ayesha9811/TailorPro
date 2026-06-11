from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from ....db.session import get_db
from ....models import models
from app.api import deps
from typing import Dict, Any, Optional, List
import datetime
import calendar

router = APIRouter()

@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard_stats(
    month: Optional[str] = None, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Fetch KPIs and live statistics for the dashboard filtered by month."""
    
    # 1. Parse or default the target month (format YYYY-MM)
    if not month:
        month = datetime.date.today().strftime("%Y-%m")
        
    try:
        year_str, month_str = month.split("-")
        year_val, month_val = int(year_str), int(month_str)
        start_date = datetime.datetime(year_val, month_val, 1, 0, 0, 0)
        last_day = calendar.monthrange(year_val, month_val)[1]
        end_date = datetime.datetime(year_val, month_val, last_day, 23, 59, 59)
    except Exception:
        # Fallback to current month if parsing fails
        today = datetime.date.today()
        month = today.strftime("%Y-%m")
        start_date = datetime.datetime(today.year, today.month, 1, 0, 0, 0)
        last_day = calendar.monthrange(today.year, today.month)[1]
        end_date = datetime.datetime(today.year, today.month, last_day, 23, 59, 59)

    # 2. Compute 7 KPI Metrics
    
    # Total sales: total invoice amounts for orders created in selected month
    total_sales = db.query(func.sum(models.Invoice.total_amount)).join(models.Order).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date
    ).scalar() or 0.0
    
    # Advance collected: payments received in the selected month
    advance_collected = db.query(func.sum(models.Payment.amount)).filter(
        models.Payment.created_at >= start_date,
        models.Payment.created_at <= end_date
    ).scalar() or 0.0
    
    # Total orders created in selected month
    total_orders = db.query(models.Order).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date
    ).count()
    
    # Pending orders: created in selected month and not READY, COLLECTED, CANCELLED
    pending_orders = db.query(models.Order).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date,
        ~models.Order.status.in_([
            models.OrderStatus.READY,
            models.OrderStatus.COLLECTED,
            models.OrderStatus.CANCELLED
        ])
    ).count()
    
    # Delayed orders: delivery date is in the past and not COLLECTED or CANCELLED
    today_start = datetime.datetime.combine(datetime.date.today(), datetime.time.min)
    delayed_orders = db.query(models.Order).filter(
        models.Order.delivery_date < today_start,
        ~models.Order.status.in_([
            models.OrderStatus.COLLECTED,
            models.OrderStatus.CANCELLED
        ])
    ).count()
    
    # Orders due today
    today_end = datetime.datetime.combine(datetime.date.today(), datetime.time.max)
    due_today = db.query(models.Order).filter(
        models.Order.delivery_date >= today_start,
        models.Order.delivery_date <= today_end
    ).count()
    
    # Ready for collection
    ready_for_collection = db.query(models.Order).filter(
        models.Order.status == models.OrderStatus.READY
    ).count()

    # Collected orders
    collected_orders = db.query(models.Order).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date,
        models.Order.status == models.OrderStatus.COLLECTED
    ).count()

    # 3. Compute Garment type distribution (for selected month)
    garments = db.query(
        models.Order.dress_type,
        func.count(models.Order.id)
    ).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date
    ).group_by(models.Order.dress_type).all()
    garment_dist = {g[0]: g[1] for g in garments}

    # 4. Compute Category distribution (for selected month - Men/Gent, Ladies, Kids)
    categories = db.query(
        models.Order.category,
        func.count(models.Order.id)
    ).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date
    ).group_by(models.Order.category).all()
    category_dist = {c[0].value if c[0] else "Unknown": c[1] for c in categories}

    # 5. Compute Status distribution (for selected month)
    statuses = db.query(
        models.Order.status,
        func.count(models.Order.id)
    ).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date
    ).group_by(models.Order.status).all()
    status_dist = {s[0].value if s[0] else "Unknown": s[1] for s in statuses}

    # 6. Recent Orders (Last 5) in selected month range
    recent_orders_query = db.query(models.Order).filter(
        models.Order.created_at >= start_date,
        models.Order.created_at <= end_date
    ).order_by(models.Order.created_at.desc()).limit(5).all()
    
    if not recent_orders_query:
        # Fallback to absolute recent orders if none in range
        recent_orders_query = db.query(models.Order).order_by(models.Order.created_at.desc()).limit(5).all()
    
    recent_orders = []
    for o in recent_orders_query:
        cust = db.query(models.Customer).filter(models.Customer.id == o.customer_id).first()
        recent_orders.append({
            "id": o.id,
            "order_number": o.order_number,
            "customer_name": cust.full_name if cust else "Unknown",
            "dress_type": o.dress_type,
            "status": o.status.value,
            "date": o.created_at.isoformat()
        })

    return {
        "kpis": {
            "total_sales": total_sales,
            "advance_collected": advance_collected,
            "total_orders": total_orders,
            "pending_orders": pending_orders,
            "delayed_orders": delayed_orders,
            "due_today": due_today,
            "ready_for_collection": ready_for_collection,
            "collected_orders": collected_orders
        },
        "garment_distribution": garment_dist,
        "category_distribution": category_dist,
        "status_distribution": status_dist,
        "recent_orders": recent_orders
    }

@router.get("/reports", response_model=Dict[str, Any])
def get_reports_stats(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO"]))
):
    """Fetch rich analytics data for visual reporting."""
    
    # 1. Garment distribution
    garments = db.query(
        models.Order.dress_type, 
        func.count(models.Order.id)
    ).group_by(models.Order.dress_type).all()
    garment_dist = {g[0]: g[1] for g in garments}
    
    # 2. Payment methods distribution
    methods = db.query(
        models.Payment.method, 
        func.count(models.Payment.id),
        func.sum(models.Payment.amount)
    ).group_by(models.Payment.method).all()
    
    payment_methods_dist = []
    for m in methods:
        payment_methods_dist.append({
            "method": m[0].value if m[0] else "Unknown",
            "count": m[1],
            "amount": m[2] or 0.0
        })

    # 3. Order statuses breakdown
    statuses = db.query(
        models.Order.status,
        func.count(models.Order.id)
    ).group_by(models.Order.status).all()
    status_dist = {s[0].value if s[0] else "Unknown": s[1] for s in statuses}

    # 4. Tailor Workload
    tailors = db.query(models.Staff).filter(models.Staff.staff_type == models.StaffType.TAILOR).all()
    workload = []
    for t in tailors:
        t_user = t.user
        t_name = t_user.full_name if t_user else f"Tailor #{t.id}"
        active_cnt = db.query(models.Order).filter(
            models.Order.assigned_tailor_id == t.id,
            models.Order.status.in_([
                models.OrderStatus.CONFIRMED,
                models.OrderStatus.STITCHING_STARTED,
                models.OrderStatus.FITTING_PENDING
            ])
        ).count()
        workload.append({
            "tailor_id": t.id,
            "name": t_name,
            "active_orders": active_cnt
        })

    # 5. Daily Revenue (Last 7 days)
    import datetime
    today = datetime.date.today()
    daily_revenue = []
    for i in range(6, -1, -1):
        day = today - datetime.timedelta(days=i)
        day_start = datetime.datetime.combine(day, datetime.time.min)
        day_end = datetime.datetime.combine(day, datetime.time.max)
        
        rev = db.query(func.sum(models.Payment.amount)).filter(
            models.Payment.created_at >= day_start,
            models.Payment.created_at <= day_end
        ).scalar() or 0.0
        
        daily_revenue.append({
            "date": day.strftime("%b %d"),
            "revenue": rev
        })

    return {
        "garment_distribution": garment_dist,
        "payment_methods": payment_methods_dist,
        "status_distribution": status_dist,
        "tailor_workload": workload,
        "daily_revenue": daily_revenue
    }

@router.get("/reports/run", response_model=List[Dict[str, Any]])
def run_report(
    type: str,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO"]))
):
    """Compile dynamic analytics data for a selected report type, filtered by date range."""
    from typing import List
    
    # Parse date arguments
    start_dt = None
    end_dt = None
    if start_date:
        try:
            start_dt = datetime.datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            pass
    if end_date:
        try:
            # End of day boundary
            end_dt = datetime.datetime.strptime(end_date, "%Y-%m-%d") + datetime.timedelta(days=1) - datetime.timedelta(seconds=1)
        except ValueError:
            pass

    # 1. Daily Sales Report
    if type == "daily_sales":
        is_sqlite = db.bind.dialect.name == "sqlite"
        date_expr = func.strftime("%Y-%m-%d", models.Invoice.created_at) if is_sqlite else func.to_char(models.Invoice.created_at, "YYYY-MM-DD")
        query = db.query(
            date_expr.label("date"),
            func.count(models.Invoice.id).label("orders_count"),
            func.sum(models.Invoice.total_amount).label("net_sales"),
            func.sum(models.Invoice.discount).label("discounts"),
            func.sum(models.Invoice.paid_amount).label("paid_amount"),
            func.sum(models.Invoice.balance_amount).label("balance_due")
        )
        if start_dt:
            query = query.filter(models.Invoice.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Invoice.created_at <= end_dt)
            
        results = query.group_by(date_expr).order_by(date_expr).all()
        return [
            {
                "date": r.date,
                "orders_count": r.orders_count,
                "gross_sales": (r.net_sales or 0.0) + (r.discounts or 0.0),
                "discounts": r.discounts or 0.0,
                "net_sales": r.net_sales or 0.0,
                "paid_amount": r.paid_amount or 0.0,
                "balance_due": r.balance_due or 0.0
            }
            for r in results
        ]

    # 2. Monthly Sales Report
    elif type == "monthly_sales":
        is_sqlite = db.bind.dialect.name == "sqlite"
        month_expr = func.strftime("%Y-%m", models.Invoice.created_at) if is_sqlite else func.to_char(models.Invoice.created_at, "YYYY-MM")
        query = db.query(
            month_expr.label("month"),
            func.count(models.Invoice.id).label("orders_count"),
            func.sum(models.Invoice.total_amount).label("net_sales"),
            func.sum(models.Invoice.discount).label("discounts"),
            func.sum(models.Invoice.paid_amount).label("paid_amount"),
            func.sum(models.Invoice.balance_amount).label("balance_due")
        )
        if start_dt:
            query = query.filter(models.Invoice.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Invoice.created_at <= end_dt)
            
        results = query.group_by(month_expr).order_by(month_expr).all()
        return [
            {
                "month": r.month,
                "orders_count": r.orders_count,
                "gross_sales": (r.net_sales or 0.0) + (r.discounts or 0.0),
                "discounts": r.discounts or 0.0,
                "net_sales": r.net_sales or 0.0,
                "paid_amount": r.paid_amount or 0.0,
                "balance_due": r.balance_due or 0.0
            }
            for r in results
        ]

    # 3. Advance Collected Report
    elif type == "advance_collected":
        # Returns all payment records collected
        query = db.query(models.Payment).select_from(models.Payment).join(models.Invoice, models.Payment.invoice).join(models.Order, models.Invoice.order).join(models.Customer, models.Order.customer)
        if start_dt:
            query = query.filter(models.Payment.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Payment.created_at <= end_dt)
            
        payments = query.order_by(models.Payment.created_at.desc()).all()
        return [
            {
                "payment_id": p.id,
                "invoice_number": p.invoice.invoice_number,
                "order_number": p.invoice.order.order_number,
                "customer_name": p.invoice.order.customer.full_name,
                "amount": p.amount,
                "method": p.method.value,
                "cashier_name": p.cashier_name or "System Cashier",
                "created_at": p.created_at.isoformat()
            }
            for p in payments
        ]

    # 4. Balance Receivable Report
    elif type == "balance_receivable":
        # Returns invoices with outstanding balances
        query = db.query(models.Invoice).select_from(models.Invoice).join(models.Order, models.Invoice.order).join(models.Customer, models.Order.customer).filter(models.Invoice.balance_amount > 0)
        if start_dt:
            query = query.filter(models.Invoice.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Invoice.created_at <= end_dt)
            
        invoices = query.order_by(models.Invoice.balance_amount.desc()).all()
        return [
            {
                "invoice_number": inv.invoice_number,
                "order_number": inv.order.order_number,
                "customer_name": inv.order.customer.full_name,
                "contact_number": inv.order.customer.contact_number,
                "net_amount": inv.total_amount,
                "paid_amount": inv.paid_amount,
                "balance_receivable": inv.balance_amount,
                "payment_status": inv.payment_status.value,
                "delivery_date": inv.order.delivery_date.isoformat() if inv.order.delivery_date else None,
                "created_at": inv.created_at.isoformat()
            }
            for inv in invoices
        ]

    # 5. Pending Orders Report
    elif type == "pending_orders":
        # Orders that are active (not collected, not cancelled)
        query = db.query(models.Order).select_from(models.Order).join(models.Customer, models.Order.customer).filter(
            ~models.Order.status.in_([models.OrderStatus.COLLECTED, models.OrderStatus.CANCELLED])
        )
        if start_dt:
            query = query.filter(models.Order.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Order.created_at <= end_dt)
            
        orders = query.order_by(models.Order.delivery_date.asc()).all()
        return [
            {
                "order_number": o.order_number,
                "customer_name": o.customer.full_name,
                "dress_type": o.dress_type,
                "quantity": o.quantity,
                "status": o.status.value,
                "delivery_date": o.delivery_date.isoformat() if o.delivery_date else None,
                "created_at": o.created_at.isoformat(),
                "fabric_source": o.fabric_source
            }
            for o in orders
        ]

    # 6. Delivered Orders Report
    elif type == "delivered_orders":
        # Delivered orders (Collected status)
        query = db.query(models.Order).select_from(models.Order).join(models.Customer, models.Order.customer).filter(
            models.Order.status == models.OrderStatus.COLLECTED
        )
        if start_dt:
            query = query.filter(models.Order.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Order.created_at <= end_dt)
            
        orders = query.order_by(models.Order.updated_at.desc()).all()
        return [
            {
                "order_number": o.order_number,
                "customer_name": o.customer.full_name,
                "dress_type": o.dress_type,
                "quantity": o.quantity,
                "delivered_at": o.updated_at.isoformat() if o.updated_at else o.created_at.isoformat(),
                "total_amount": o.invoice.total_amount if o.invoice else 0.0,
                "fabric_source": o.fabric_source
            }
            for o in orders
        ]

    # 7. Cancelled Orders Report
    elif type == "cancelled_orders":
        query = db.query(models.Order).select_from(models.Order).join(models.Customer, models.Order.customer).filter(
            models.Order.status == models.OrderStatus.CANCELLED
        )
        if start_dt:
            query = query.filter(models.Order.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Order.created_at <= end_dt)
            
        orders = query.order_by(models.Order.updated_at.desc()).all()
        return [
            {
                "order_number": o.order_number,
                "customer_name": o.customer.full_name,
                "dress_type": o.dress_type,
                "quantity": o.quantity,
                "cancelled_at": o.updated_at.isoformat() if o.updated_at else o.created_at.isoformat(),
                "remarks": o.special_remarks or "None"
            }
            for o in orders
        ]

    # 8. Delayed Orders Report
    elif type == "delayed_orders":
        # Expected delivery is in past, and order is not collected, not cancelled
        today_now = datetime.datetime.now()
        query = db.query(models.Order).select_from(models.Order).join(models.Customer, models.Order.customer).filter(
            ~models.Order.status.in_([models.OrderStatus.COLLECTED, models.OrderStatus.CANCELLED]),
            models.Order.delivery_date < today_now
        )
        if start_dt:
            query = query.filter(models.Order.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Order.created_at <= end_dt)
            
        orders = query.order_by(models.Order.delivery_date.asc()).all()
        return [
            {
                "order_number": o.order_number,
                "customer_name": o.customer.full_name,
                "dress_type": o.dress_type,
                "quantity": o.quantity,
                "status": o.status.value,
                "delivery_date": o.delivery_date.isoformat() if o.delivery_date else None,
                "days_delayed": (today_now - o.delivery_date).days if o.delivery_date else 0,
                "created_at": o.created_at.isoformat()
            }
            for o in orders
        ]

    # 9. Tailor Performance Report
    elif type == "tailor_performance":
        tailors = db.query(models.Staff).filter(models.Staff.staff_type == models.StaffType.TAILOR).all()
        performance = []
        for t in tailors:
            t_user = t.user
            t_name = t_user.full_name if t_user else f"Tailor #{t.id}"
            
            orders_q = db.query(models.Order).filter(models.Order.assigned_tailor_id == t.id)
            if start_dt:
                orders_q = orders_q.filter(models.Order.created_at >= start_dt)
            if end_dt:
                orders_q = orders_q.filter(models.Order.created_at <= end_dt)
            
            total_orders = orders_q.count()
            active_orders = orders_q.filter(
                models.Order.status.in_([
                    models.OrderStatus.CONFIRMED, 
                    models.OrderStatus.STITCHING_STARTED, 
                    models.OrderStatus.FITTING_PENDING
                ])
            ).count()
            completed_orders = orders_q.filter(
                models.Order.status.in_([
                    models.OrderStatus.READY,
                    models.OrderStatus.COLLECTED
                ])
            ).count()
            
            today_now = datetime.datetime.now()
            delayed_orders = orders_q.filter(
                models.Order.delivery_date < today_now,
                ~models.Order.status.in_([models.OrderStatus.COLLECTED, models.OrderStatus.CANCELLED])
            ).count()
            
            performance.append({
                "tailor_id": t.id,
                "tailor_name": t_name,
                "total_assigned": total_orders,
                "completed_orders": completed_orders,
                "active_orders": active_orders,
                "delayed_orders": delayed_orders,
                "completion_rate": round((completed_orders / total_orders * 100), 2) if total_orders > 0 else 0.0
            })
        return performance

    # 10. Dress Type Sales Report
    elif type == "dress_type_sales":
        query = db.query(
            models.Order.dress_type,
            func.sum(models.Order.quantity).label("total_qty"),
            func.count(models.Order.id).label("orders_count"),
            func.sum(models.Invoice.total_amount).label("net_revenue")
        ).select_from(models.Order).join(models.Invoice, models.Order.invoice)
        
        if start_dt:
            query = query.filter(models.Order.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Order.created_at <= end_dt)
            
        results = query.group_by(models.Order.dress_type).all()
        return [
            {
                "dress_type": r.dress_type,
                "total_quantity": r.total_qty or 0,
                "orders_count": r.orders_count or 0,
                "net_revenue": r.net_revenue or 0.0
            }
            for r in results
        ]

    # 11. Customer Repeat Order Report
    elif type == "customer_repeat":
        query = db.query(
            models.Customer.customer_code,
            models.Customer.full_name,
            models.Customer.contact_number,
            models.Customer.gender_category,
            func.count(models.Order.id).label("total_orders"),
            func.sum(models.Invoice.total_amount).label("total_spent")
        ).select_from(models.Customer).join(models.Order, models.Customer.orders).join(models.Invoice, models.Order.invoice)
        
        if start_dt:
            query = query.filter(models.Order.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Order.created_at <= end_dt)
            
        results = query.group_by(
            models.Customer.id,
            models.Customer.customer_code,
            models.Customer.full_name,
            models.Customer.contact_number,
            models.Customer.gender_category
        ).having(func.count(models.Order.id) > 1).order_by(func.count(models.Order.id).desc()).all()
        return [
            {
                "customer_code": r.customer_code,
                "customer_name": r.full_name,
                "contact_number": r.contact_number,
                "gender_category": r.gender_category.value if r.gender_category else "Men",
                "total_orders": r.total_orders,
                "total_spent": r.total_spent or 0.0,
                "avg_order_value": round((r.total_spent or 0.0) / r.total_orders, 2) if r.total_orders > 0 else 0.0
            }
            for r in results
        ]

    # 12. Payment Method Summary
    elif type == "payment_methods":
        query = db.query(
            models.Payment.method,
            func.count(models.Payment.id).label("count"),
            func.sum(models.Payment.amount).label("total_collected")
        )
        if start_dt:
            query = query.filter(models.Payment.created_at >= start_dt)
        if end_dt:
            query = query.filter(models.Payment.created_at <= end_dt)
            
        results = query.group_by(models.Payment.method).all()
        return [
            {
                "payment_method": r.method.value if r.method else "Unknown",
                "transactions_count": r.count or 0,
                "total_collected": r.total_collected or 0.0
            }
            for r in results
        ]

    return []

