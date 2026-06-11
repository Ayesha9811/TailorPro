from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....db.session import get_db
from ....schemas import schemas
from ....crud import crud
from ....models.models import OrderStatus
from app.api import deps
from app.models import models

router = APIRouter()

@router.post("/unified", response_model=schemas.OrderResponse)
def create_unified_order(
    payload: schemas.UnifiedOrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    """Create a unified order including customer, measurement, and advance payment."""
    try:
        return crud.create_unified_order(db=db, payload=payload, cashier_name=current_user.full_name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while creating the order.")

@router.post("/", response_model=schemas.OrderResponse)
def create_order(
    order: schemas.OrderCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    """Create an order and automatically generate an associated invoice."""
    return crud.create_order(db=db, order=order, cashier_name=current_user.full_name)

@router.get("/", response_model=List[schemas.OrderResponse])
def get_orders(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Retrieve all orders."""
    return crud.get_orders(db, skip=skip, limit=limit)

@router.get("/{order_id}", response_model=schemas.OrderResponse)
def get_order(
    order_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Get specific order details."""
    result = crud.get_order(db, order_id=order_id)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    return result

@router.put("/{order_id}/status", response_model=schemas.OrderResponse)
def update_order_status(
    order_id: int, 
    status: OrderStatus, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    """Update the fulfillment status of an order."""
    result = crud.update_order_status(db, order_id=order_id, status=status)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Trigger in-app notification
    try:
        from app.services import notifications
        if status == OrderStatus.READY:
            notifications.send_order_ready_notification(db=db, order=result)
        elif status == OrderStatus.CONFIRMED:
            notifications.send_order_confirmation_notification(db=db, order=result)
        else:
            cust_name = result.customer.full_name if result.customer else "Customer"
            msg = f"Order {result.order_number} for {cust_name} has been updated to: {status.value}."
            crud.create_notification(
                db=db,
                title="Order Status Updated",
                message=msg,
                order_id=result.id
            )
    except Exception as e:
        print("Notification error:", e)
        
    return result

@router.put("/{order_id}", response_model=schemas.OrderResponse)
def update_order_details(
    order_id: int, 
    update_data: schemas.OrderUpdate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO"]))
):
    """Update editable fields of an order (fabric, delivery date, remarks, etc.)."""
    result = crud.update_order(db, order_id=order_id, update_data=update_data)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    return result

@router.get("/track/{query}", response_model=List[schemas.OrderResponse])
def track_order_public(query: str, db: Session = Depends(get_db)):
    """Public endpoint for customer order tracking (no login required)."""
    from app.models import models
    # Check by order number
    order = db.query(models.Order).filter(models.Order.order_number == query.strip()).first()
    if order:
        return [order]
        
    # Check by phone
    custs = db.query(models.Customer).filter(
        (models.Customer.contact_number == query.strip()) |
        (models.Customer.alternate_contact == query.strip())
    ).all()
    if custs:
        cust_ids = [c.id for c in custs]
        orders = db.query(models.Order).filter(models.Order.customer_id.in_(cust_ids)).order_by(models.Order.created_at.desc()).all()
        return orders
        
    return []

