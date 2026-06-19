from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from ....db.session import get_db
from ....schemas import schemas, DRESS_TYPES
from ....crud import crud
from ....models.models import Setting
from app.api import deps
from app.models import models

router = APIRouter()

BASE_TEMPLATES = {
    "Shirt": ["Shoulder", "Chest", "Armhole", "Sleeve Length", "Sleeve Hem Opening", "Full Length", "Collar"],
    "Frock": ["Shoulder", "Chest", "Armhole", "Sleeve Length", "Sleeve Hem Opening", "Waist Height", "Waist", "Full Length", "Collar", "Neck Type", "Pleats Type"],
    "Shorts": ["Waist", "Hip", "Thigh", "Front Open", "Back Open", "Full Length", "Hem Open"],
    "Trouser": ["Waist", "Hip", "Thigh", "Front Open", "Back Open", "Full Length", "Hem Open", "Knee Length"],
    "Overcoat": ["Shoulder", "Chest", "Armhole", "Waist Length", "Waist"],
    "Sari Jacket": ["Chest", "Waist", "Sleeve Length", "Sleeve Opening", "Jacket Length", "Front Neck Depth", "Back Neck Depth", "Shoulder Width"],
    "National Suit": ["Collar", "Shoulder Width", "Chest", "Waist", "Shirt Length", "Sleeve Length", "Trouser Waist", "Trouser Length", "Hem Opening"],
    "Kurta": ["Collar", "Shoulder Width", "Chest", "Waist", "Sleeve Length", "Kurta Length"],
}

# Enforce access only for Super Admin, Owner / Manager, CEO, Tailor
allowed_write_roles = ["Super Admin", "Owner / Manager", "CEO", "Tailor"]
write_access = deps.RoleChecker(allowed_write_roles)

@router.get("/templates", response_model=dict)
def get_measurement_templates(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    """Return the predefined measurement fields combined with custom ones."""
    setting = db.query(Setting).filter(Setting.key == "custom_templates").first()
    custom_templates = setting.value if setting else {}
    
    combined = {**BASE_TEMPLATES, **custom_templates}
    return {"dress_types": list(combined.keys()), "templates": combined}

@router.post("/templates", response_model=dict)
def create_custom_template(
    template: schemas.CustomTemplateCreate, 
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(write_access)
):
    """Save a new custom dress type and its measurement fields."""
    setting = db.query(Setting).filter(Setting.key == "custom_templates").first()
    if not setting:
        setting = Setting(key="custom_templates", value={})
        db.add(setting)
    
    # Update the JSON value
    current_templates = dict(setting.value)
    current_templates[template.dress_type] = template.fields
    setting.value = current_templates
    
    db.commit()
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        action="Create Measurement Template",
        details=f"Created custom measurement template for '{template.dress_type}'",
        ip_address=request.client.host if request.client else None
    )
    return {"message": "Template saved successfully"}

@router.post("/", response_model=schemas.Measurement)
def create_measurement(
    measurement: schemas.MeasurementCreate, 
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(write_access)
):
    # Verify customer exists
    customer = crud.get_customer_by_id(db, measurement.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    result = crud.create_measurement(db=db, measurement=measurement)
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        action="Record Measurement",
        details=f"Recorded '{result.dress_type}' measurements for customer ID {result.customer_id}",
        ip_address=request.client.host if request.client else None
    )
    return result

@router.put("/{measurement_id}", response_model=schemas.Measurement)
def update_measurement(
    measurement_id: int, 
    update_data: schemas.MeasurementUpdate, 
    request: Request,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(write_access)
):
    result = crud.update_measurement(db, measurement_id, update_data)
    if result is None:
        raise HTTPException(status_code=400, detail="Measurement not found or is immutable (linked to an order)")
    crud.create_activity_log(
        db=db,
        user_id=current_user.id,
        action="Update Measurement",
        details=f"Updated '{result.dress_type}' measurements for customer ID {result.customer_id}",
        ip_address=request.client.host if request.client else None
    )
    return result

@router.get("/customer/{customer_id}", response_model=List[schemas.Measurement])
def get_customer_measurements(
    customer_id: int,
    dress_type: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    if dress_type:
        return crud.get_measurements_by_customer_and_type(db, customer_id, dress_type)
    return crud.get_measurements_by_customer(db, customer_id)

@router.get("/customer/{customer_id}/latest", response_model=Optional[schemas.Measurement])
def get_latest_measurement(
    customer_id: int,
    dress_type: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    result = crud.get_latest_measurement(db, customer_id, dress_type)
    if not result:
        raise HTTPException(status_code=404, detail="No measurement found for this customer and dress type")
    return result

@router.get("/compare/{customer_id}", response_model=schemas.MeasurementComparison)
def compare_measurements(
    customer_id: int,
    dress_type: str = Query(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    latest, previous, differences = crud.compare_measurements(db, customer_id, dress_type)
    return schemas.MeasurementComparison(
        dress_type=dress_type,
        latest=latest,
        previous=previous,
        differences=differences,
    )

@router.get("/{measurement_id}", response_model=schemas.Measurement)
def get_measurement(
    measurement_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(deps.get_current_active_user)
):
    result = crud.get_measurement_by_id(db, measurement_id)
    if not result:
        raise HTTPException(status_code=404, detail="Measurement not found")
    return result
