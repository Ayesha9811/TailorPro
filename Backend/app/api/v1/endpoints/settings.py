from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ....db.session import get_db
from app.api import deps
from app.models.models import Setting, User
from typing import Dict, Any

router = APIRouter()

admin_or_manager_only = deps.RoleChecker(["Super Admin", "Owner / Manager", "CEO"])

@router.get("/company")
def get_company_settings(db: Session = Depends(get_db), current_user: User = Depends(deps.get_current_active_user)):
    """Retrieve company details setting."""
    setting = db.query(Setting).filter(Setting.key == "company_details").first()
    if not setting:
        return {
            "name": "",
            "number": "",
            "address": "",
            "email": "",
            "website": "",
            "description": ""
        }
    return setting.value

@router.put("/company")
def update_company_settings(
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(admin_or_manager_only)
):
    """Update company details setting (Admin only)."""
    setting = db.query(Setting).filter(Setting.key == "company_details").first()
    if not setting:
        setting = Setting(key="company_details", value=payload)
        db.add(setting)
    else:
        setting.value = payload
    db.commit()
    return setting.value
