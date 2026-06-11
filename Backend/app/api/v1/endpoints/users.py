from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.api import deps
from app.schemas import schemas
from app.crud import crud
from app.models import models

router = APIRouter()

# Setup role-based access checkers
admin_or_manager_only = deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO"])
admin_only = deps.RoleChecker(["Super Admin"])

@router.get("/me", response_model=schemas.UserWithStaff)
def read_user_me(
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Get current logged-in user profile details."""
    role_name = current_user.role.name if current_user.role else "Unknown"
    staff_data = None
    if current_user.staff_profile:
        staff_data = {
            "id": current_user.staff_profile.id,
            "staff_type": current_user.staff_profile.staff_type,
            "mobile_number": current_user.staff_profile.mobile_number,
            "salary": current_user.staff_profile.salary,
            "commission_rate": current_user.staff_profile.commission_rate,
            "is_active": current_user.is_active
        }
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role_id": current_user.role_id,
        "role_name": role_name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "staff": staff_data
    }

@router.put("/me", response_model=schemas.UserWithStaff)
def update_user_me(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Update current user's own profile."""
    from app.core.security import get_password_hash
    
    if payload.email is not None:
        # Check if email is already taken by another user
        existing_user = crud.get_user_by_email(db, email=payload.email)
        if existing_user and existing_user.id != current_user.id:
            raise HTTPException(status_code=400, detail="A user with this email already exists")
        current_user.email = payload.email
        
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
        
    if payload.password is not None and payload.password != "":
        current_user.hashed_password = get_password_hash(payload.password)
        
    if payload.mobile_number is not None:
        if current_user.staff_profile:
            current_user.staff_profile.mobile_number = payload.mobile_number
        else:
            db_staff = models.Staff(
                user_id=current_user.id,
                staff_type=models.StaffType.TAILOR,
                mobile_number=payload.mobile_number
            )
            db.add(db_staff)
            
    db.commit()
    db.refresh(current_user)
    
    role_name = current_user.role.name if current_user.role else "Unknown"
    staff_data = None
    if current_user.staff_profile:
        staff_data = {
            "id": current_user.staff_profile.id,
            "staff_type": current_user.staff_profile.staff_type,
            "mobile_number": current_user.staff_profile.mobile_number,
            "salary": current_user.staff_profile.salary,
            "commission_rate": current_user.staff_profile.commission_rate,
            "is_active": current_user.is_active
        }
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role_id": current_user.role_id,
        "role_name": role_name,
        "is_active": current_user.is_active,
        "created_at": current_user.created_at,
        "staff": staff_data
    }

@router.get("/", response_model=List[schemas.UserWithStaff])
def read_users(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(admin_or_manager_only)
):
    """Retrieve all users with staff profiles (Super Admin or Manager only)."""
    return crud.get_users_with_staff(db, skip=skip, limit=limit)

@router.get("/roles", response_model=List[schemas.Role])
def read_roles(
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Get all roles (Any active authenticated user)."""
    return crud.get_roles(db)

@router.post("/", response_model=schemas.User)
def create_user(
    payload: schemas.UserCreatePayload,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(admin_or_manager_only)
):
    """Create a new user and staff profile (Super Admin or Manager only)."""
    existing_user = crud.get_user_by_email(db, email=payload.email)
    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists"
        )
    return crud.create_user_with_staff(db=db, payload=payload)

@router.put("/{user_id}", response_model=schemas.User)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(admin_or_manager_only)
):
    """Update user and staff details (Super Admin or Manager only)."""
    updated_user = crud.update_user_with_staff(db=db, user_id=user_id, payload=payload)
    if not updated_user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    return updated_user

@router.delete("/{user_id}", response_model=bool)
def deactivate_user(
    user_id: int,
    db: Session = Depends(deps.get_db),
    current_user: models.User = Depends(admin_or_manager_only)
):
    """Deactivate a user account (Super Admin or Manager only)."""
    success = crud.delete_user_by_id(db=db, user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )
    return True
