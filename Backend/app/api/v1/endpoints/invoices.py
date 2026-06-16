from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....db.session import get_db
from ....schemas import schemas
from ....crud import crud
from app.api import deps
from app.models import models

router = APIRouter()

# Enforce access for Super Admin, Owner / Manager, CEO, Cashier, Tailor, Finance
allowed_roles = ["Super Admin", "Owner / Manager", "CEO", "Cashier", "Tailor", "Finance"]
invoice_access = deps.RoleChecker(allowed_roles)

@router.get("/", response_model=List[schemas.InvoiceResponse])
def get_invoices(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(invoice_access)
):
    """Retrieve all invoices."""
    return crud.get_invoices(db, skip=skip, limit=limit)

@router.get("/{invoice_id}", response_model=schemas.InvoiceResponse)
def get_invoice(
    invoice_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(invoice_access)
):
    """Get specific invoice details."""
    result = crud.get_invoice(db, invoice_id=invoice_id)
    if not result:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return result
