from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List
from ....db.session import get_db
from ....schemas import schemas
from ....crud import crud
from app.api import deps
from app.models import models

router = APIRouter()

# Enforce access only for Super Admin, Owner / Manager, CEO
admin_or_manager_only = deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO"])

@router.get("/logs", response_model=List[schemas.ActivityLogResponse])
def get_activity_logs(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(admin_or_manager_only)
):
    """Retrieve system activity logs (Super Admin and Manager only)."""
    return crud.get_activity_logs(db, skip=skip, limit=limit)
