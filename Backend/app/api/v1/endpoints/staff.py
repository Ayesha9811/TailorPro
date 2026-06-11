from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ....db.session import get_db
from ....schemas import schemas
from ....crud import crud
from app.api import deps
from app.models import models

router = APIRouter()

@router.post("/", response_model=schemas.Staff)
def create_staff(
    staff: schemas.StaffCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO"]))
):
    return crud.create_staff(db=db, staff=staff)

@router.get("/", response_model=List[schemas.Staff])
def read_staff_members(
    skip: int = 0, 
    limit: int = 100, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    staff = crud.get_staff_members(db, skip=skip, limit=limit)
    return staff

@router.get("/{staff_id}", response_model=schemas.Staff)
def read_staff(
    staff_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    db_staff = crud.get_staff(db, staff_id=staff_id)
    if db_staff is None:
        raise HTTPException(status_code=404, detail="Staff not found")
    return db_staff
