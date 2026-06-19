from fastapi import APIRouter
from .endpoints import auth, customers, staff, measurements, orders, invoices, payments, analytics, users, notifications, settings, staff_tracking

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(customers.router, prefix="/customers", tags=["customers"])
api_router.include_router(measurements.router, prefix="/measurements", tags=["measurements"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["invoices"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(staff_tracking.router, prefix="/staff-tracking", tags=["staff-tracking"])

