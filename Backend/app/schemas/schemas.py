from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime
from ..models.models import GenderCategory, OrderStatus, PaymentStatus, PaymentMethod, StaffType

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    sub: Optional[str] = None

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: Optional[bool] = True
    permissions: Optional[List[str]] = []

class UserCreate(UserBase):
    password: str
    role_id: int

class User(UserBase):
    id: int
    role_id: int
    role_name: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Role Schemas
class RoleBase(BaseModel):
    name: str
    permissions: List[str]

class RoleCreate(RoleBase):
    pass

class Role(RoleBase):
    id: int

    class Config:
        from_attributes = True

# Customer Schemas
class CustomerBase(BaseModel):
    contact_number: str
    alternate_contact: Optional[str] = None
    full_name: str
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    gender_category: GenderCategory
    birthday: Optional[datetime] = None
    student_admission_no: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = True

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    customer_code: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Staff Schemas
class StaffBase(BaseModel):
    full_name: str
    staff_type: StaffType
    mobile_number: str
    salary: Optional[float] = None
    commission_rate: Optional[float] = None
    is_active: Optional[bool] = True

class StaffCreate(StaffBase):
    pass

class Staff(StaffBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Measurement Schemas
DRESS_TYPES = ["Shirt", "Frock", "Shorts", "Trouser", "Overcoat", "Sari Jacket", "National Suit", "Kurta"]

class MeasurementBase(BaseModel):
    customer_id: int
    dress_type: str
    measurement_data: Dict[str, Any]   # Dynamic JSONB fields
    reference_image_url: Optional[str] = None
    notes: Optional[str] = None

class MeasurementCreate(MeasurementBase):
    pass

class MeasurementUpdate(BaseModel):
    measurement_data: Optional[Dict[str, Any]] = None
    reference_image_url: Optional[str] = None
    notes: Optional[str] = None

class Measurement(MeasurementBase):
    id: int
    measurement_code: str
    is_used_in_order: bool
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CustomTemplateCreate(BaseModel):
    dress_type: str
    fields: List[str]

class MeasurementComparison(BaseModel):
    dress_type: str
    latest: Optional[Measurement] = None
    previous: Optional[Measurement] = None
    differences: Optional[Dict[str, Any]] = None

# Order Schemas
class OrderBase(BaseModel):
    customer_id: int
    measurement_id: Optional[int] = None
    assigned_tailor_id: Optional[int] = None
    delivery_date: Optional[datetime] = None
    category: GenderCategory
    dress_type: str
    quantity: int = 1
    fabric_source: Optional[str] = None
    fabric_details: Optional[str] = None
    special_remarks: Optional[str] = None
    internal_notes: Optional[str] = None

class OrderCreate(OrderBase):
    total_amount: float # Passed during creation to generate the first invoice
    discount: float = 0.0

class OrderUpdate(BaseModel):
    delivery_date: Optional[datetime] = None
    fabric_source: Optional[str] = None
    fabric_details: Optional[str] = None
    special_remarks: Optional[str] = None
    internal_notes: Optional[str] = None
    assigned_tailor_id: Optional[int] = None
    quantity: Optional[int] = None

class Order(OrderBase):
    id: int
    order_number: str
    status: OrderStatus
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Payment Schemas
class PaymentBase(BaseModel):
    invoice_id: int
    amount: float
    method: PaymentMethod
    cashier_name: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# Invoice Schemas
class InvoiceBase(BaseModel):
    order_id: int
    total_amount: float
    tax: float = 0.0
    discount: float = 0.0

class InvoiceCreate(InvoiceBase):
    pass

class Invoice(InvoiceBase):
    id: int
    invoice_number: str
    paid_amount: float
    balance_amount: float
    payment_status: PaymentStatus
    cashier_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

# Composite Schemas (for rich frontend UI)
class OrderResponse(Order):
    invoice: Optional[Invoice] = None
    customer: Optional[Customer] = None
    measurement: Optional[Measurement] = None

class InvoiceResponse(Invoice):
    order: Optional[OrderResponse] = None

# Unified Workflow Schemas
class UnifiedOrderDetails(BaseModel):
    category: GenderCategory
    dress_type: str
    quantity: int = 1
    fabric_source: Optional[str] = None
    fabric_details: Optional[str] = None
    special_remarks: Optional[str] = None
    internal_notes: Optional[str] = None
    delivery_date: Optional[datetime] = None
    total_amount: float
    discount: float = 0.0
    assigned_tailor_id: Optional[int] = None

class UnifiedOrderCreate(BaseModel):
    # Customer Selection
    customer_id: Optional[int] = None
    customer: Optional[CustomerCreate] = None
    
    # Measurement Selection
    measurement_id: Optional[int] = None
    measurement_data: Optional[Dict[str, Any]] = None
    measurement_notes: Optional[str] = None
    
    # Order Details
    order: UnifiedOrderDetails
    
    # Financials
    advance_payment: float = 0.0
    payment_method: PaymentMethod = PaymentMethod.CASH

# User management extensions
class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    role_id: Optional[int] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None
    # Staff fields
    staff_type: Optional[StaffType] = None
    mobile_number: Optional[str] = None
    salary: Optional[float] = None
    commission_rate: Optional[float] = None

class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    mobile_number: Optional[str] = None

class UserCreatePayload(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role_id: int
    is_active: Optional[bool] = True
    permissions: Optional[List[str]] = []
    # Staff fields
    staff_type: Optional[StaffType] = None
    mobile_number: Optional[str] = None
    salary: Optional[float] = None
    commission_rate: Optional[float] = None

class UserStaffResponse(BaseModel):
    id: Optional[int] = None
    staff_type: Optional[StaffType] = None
    mobile_number: Optional[str] = None
    salary: Optional[float] = None
    commission_rate: Optional[float] = None
    is_active: Optional[bool] = True

class UserWithStaff(User):
    role_name: Optional[str] = None
    staff: Optional[UserStaffResponse] = None

    class Config:
        from_attributes = True

# Notification Schemas
class NotificationBase(BaseModel):
    title: str
    message: str
    user_id: Optional[int] = None
    order_id: Optional[int] = None

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# NotificationOutbox Schemas
class NotificationOutboxBase(BaseModel):
    telegram_chat_id: Optional[str] = None
    message_body: str
    status: str
    log_note: Optional[str] = None

class NotificationOutbox(NotificationOutboxBase):
    id: int
    created_at: datetime
    sent_at: Optional[datetime] = None

    class Config:
        from_attributes = True


