from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....db.session import get_db
from ....schemas import schemas
from ....crud import crud
from app.api import deps
from app.models import models

router = APIRouter()

@router.post("/", response_model=schemas.Customer)
def create_customer(
    customer: schemas.CustomerCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    # Customers can share contact numbers, so we no longer block based on contact_number.
    return crud.create_customer(db=db, customer=customer)

@router.get("/", response_model=List[schemas.Customer])
def read_customers(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    customers = crud.get_customers(db, skip=skip, limit=limit)
    return customers

@router.get("/search", response_model=List[schemas.Customer])
def search_customers(
    q: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    if not q or len(q) < 2:
        return []
    return crud.search_customers(db, query=q)

@router.get("/contact/{contact_number}", response_model=List[schemas.Customer])
def get_customers_by_contact(
    contact_number: str, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    return crud.get_customers_by_contact_number(db, contact_number=contact_number)

@router.get("/{customer_id}", response_model=schemas.Customer)
def read_customer(
    customer_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    db_customer = crud.get_customer_by_id(db, customer_id=customer_id)
    if db_customer is None:
        raise HTTPException(status_code=404, detail="Customer not found")
    return db_customer
