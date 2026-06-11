from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.schemas import schemas
from app.crud import crud
from app.models import models

router = APIRouter()

admin_or_manager_only = deps.RoleChecker(["Super Admin", "Manager"])

@router.get("/", response_model=List[schemas.Notification])
def read_notifications(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Retrieve notifications relevant to the current user (personal or system-wide)."""
    return crud.get_notifications_by_user(db, user_id=current_user.id, skip=skip, limit=limit)

@router.put("/read-all", response_model=int)
def read_all_notifications(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Mark all notifications as read for current user."""
    return crud.mark_all_notifications_as_read(db, user_id=current_user.id)

@router.put("/{notification_id}/read", response_model=schemas.Notification)
def read_notification(
    notification_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Mark a specific notification as read."""
    notif = crud.mark_notification_as_read(db, notification_id=notification_id, user_id=current_user.id)
    if not notif:
        raise HTTPException(
            status_code=404,
            detail="Notification not found or access denied"
        )
    return notif

@router.post("/", response_model=schemas.Notification)
def send_broadcast_notification(
    payload: schemas.NotificationCreate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(admin_or_manager_only)
):
    """Send a broadcast/system notification (Manager/Super Admin only)."""
    return crud.create_notification(
        db,
        title=payload.title,
        message=payload.message,
        user_id=payload.user_id,
        order_id=payload.order_id
    )


@router.get("/outbox", response_model=List[schemas.NotificationOutbox])
def read_notification_outbox(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Retrieve customer notification outbox messages."""
    return crud.get_notification_outbox(db, skip=skip, limit=limit)

