from fastapi import APIRouter, Depends, HTTPException, Request
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
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    """Create a unified order including customer, measurement, and advance payment."""
    try:
        result = crud.create_unified_order(db=db, payload=payload, cashier_name=current_user.full_name)
        crud.create_activity_log(
            db=db,
            user_id=current_user.id,
            action="Create Order",
            details=f"Created unified order {result.order_number} for customer ID {result.customer_id}. Garment: {result.dress_type}",
            ip_address=request.client.host if request.client else None
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while creating the order.")

@router.post("/unified-bulk", response_model=List[schemas.OrderResponse])
def create_unified_bulk_order(
    payload: schemas.UnifiedBulkOrderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    """Create a bulk order including customer, multiple measurements, and combined advance payment."""
    try:
        results = crud.create_unified_bulk_order(db=db, payload=payload, cashier_name=current_user.full_name)
        order_nums = ", ".join([r.order_number for r in results])
        crud.create_activity_log(
            db=db,
            user_id=current_user.id,
            action="Create Bulk Order",
            details=f"Created {len(results)} bulk orders: {order_nums}",
            ip_address=request.client.host if request.client else None
        )
        return results
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="An error occurred while creating the bulk order.")

@router.post("/", response_model=schemas.OrderResponse)
def create_order(
    order: schemas.OrderCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    """Create an order and automatically generate an associated invoice."""
    result = crud.create_order(db=db, order=order, cashier_name=current_user.full_name)
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        action="Create Order",
        details=f"Created order {result.order_number} for customer ID {result.customer_id}. Garment: {result.dress_type}",
        ip_address=request.client.host if request.client else None
    )
    return result

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
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO", "Tailor"]))
):
    """Update the fulfillment status of an order."""
    result = crud.update_order_status(db, order_id=order_id, status=status)
    if not result:
        raise HTTPException(status_code=404, detail="Order not found")
    
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        action="Update Order Status",
        details=f"Updated status of order {result.order_number} to '{status.value}'",
        ip_address=request.client.host if request.client else None
    )

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
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Update editable fields of an order (fabric, delivery date, remarks, etc.)."""
    is_admin = current_user.role and current_user.role.name in ["Super Admin", "Owner / Manager", "CEO"]
    
    # Check custom permissions or role defaults
    has_edit_permission = False
    if is_admin:
        has_edit_permission = True
    elif current_user.permissions:
        has_edit_permission = "edit:/dashboard/orders" in current_user.permissions
    else:
        # Fallback to role defaults
        role_name = current_user.role.name if current_user.role else ""
        has_edit_permission = role_name in ["Tailor", "Cashier"]

    if not has_edit_permission:
        raise HTTPException(
            status_code=403,
            detail="Operation not permitted"
        )
        
    # Fetch existing order to check current delivery_date
    db_order = crud.get_order(db, order_id=order_id)
    if not db_order:
        raise HTTPException(status_code=404, detail="Order not found")
        
    update_dict = update_data.model_dump(exclude_unset=True)
    if "delivery_date" in update_dict:
        new_date = update_dict["delivery_date"]
        # If order.delivery_date is already set, and new_date is different or cleared
        if db_order.delivery_date is not None:
            # Normalize dates for clean comparison
            db_date_val = db_order.delivery_date.isoformat() if hasattr(db_order.delivery_date, "isoformat") else db_order.delivery_date
            new_date_val = new_date.isoformat() if new_date and hasattr(new_date, "isoformat") else new_date
            
            if new_date is None or db_date_val != new_date_val:
                if not is_admin:
                    raise HTTPException(
                        status_code=403,
                        detail="Only Super Admin and Managers can change the delivery date once set."
                    )

    result = crud.update_order(db, order_id=order_id, update_data=update_data)
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        action="Update Order Details",
        details=f"Modified order specifications for order {result.order_number}",
        ip_address=request.client.host if request.client else None
    )
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

