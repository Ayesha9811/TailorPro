from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....db.session import get_db
from ....schemas import schemas
from ....crud import crud
from app.api import deps
from app.models import models

router = APIRouter()

# Enforce write access only for Super Admin, Owner / Manager, CEO, Cashier, Finance
allowed_write_roles = ["Super Admin", "Owner / Manager", "CEO", "Cashier", "Finance"]
write_access = deps.RoleChecker(allowed_write_roles)

# Enforce read access for Super Admin, Owner / Manager, CEO, Cashier, Tailor, Finance
allowed_read_roles = ["Super Admin", "Owner / Manager", "CEO", "Cashier", "Tailor", "Finance"]
read_access = deps.RoleChecker(allowed_read_roles)

@router.post("/", response_model=schemas.Payment)
def create_payment(
    payment: schemas.PaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(write_access)
):
    """Process a payment and auto-update the invoice balance."""
    result = crud.create_payment(db=db, payment=payment, cashier_name=current_user.full_name)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    
    # Trigger in-app notification
    try:
        invoice = result.invoice
        order_num = invoice.order.order_number if (invoice and invoice.order) else "Unknown"
        msg = f"Received LKR {result.amount:,.2f} for Order {order_num} via {result.method.value}. Invoice balance is LKR {invoice.balance_amount:,.2f}."
        crud.create_notification(
            db=db,
            title="Payment Received",
            message=msg,
            order_id=invoice.order_id if (invoice and invoice.order) else None
        )
    except Exception as e:
        print("Payment Notification error:", e)
        
    return result

@router.get("/invoice/{invoice_id}", response_model=List[schemas.Payment])
def get_invoice_payments(
    invoice_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(read_access)
):
    """Get all payments for a specific invoice."""
    return crud.get_payments_by_invoice(db, invoice_id=invoice_id)
