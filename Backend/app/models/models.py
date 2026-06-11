from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, JSON, Enum, Boolean, Index
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func
import enum
import datetime

Base = declarative_base()

class GenderCategory(str, enum.Enum):
    MEN = "Men"
    LADIES = "Ladies"
    KIDS = "Kids"

class OrderStatus(str, enum.Enum):
    CONFIRMED = "Order Confirmed"
    STITCHING_STARTED = "Stitching Started"
    FITTING_PENDING = "Fitting Pending"
    READY = "Ready for Collection"
    COLLECTED = "Collected"
    CANCELLED = "Cancelled"

class PaymentStatus(str, enum.Enum):
    NOT_PAID = "Not Paid"
    ADVANCE_PAID = "Advance Paid"
    PARTIALLY_PAID = "Partially Paid"
    FULLY_PAID = "Fully Paid"
    REFUNDED = "Refunded"

class PaymentMethod(str, enum.Enum):
    CASH = "Cash"
    CARD = "Card"
    BANK_TRANSFER = "Bank Transfer"
    ONLINE = "Online Payment"
    QR = "QR Payment"

class StaffType(str, enum.Enum):
    TAILOR = "Tailor"
    MEASUREMENT_STAFF = "Measurement Staff"
    CASHIER = "Cashier"
    MANAGER = "Manager"
    SUPER_ADMIN = "Super Admin"

class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    permissions = Column(JSON, default=list) # Array of permission strings
    
    users = relationship("User", back_populates="role")

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"))
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    role = relationship("Role", back_populates="users")
    staff_profile = relationship("Staff", back_populates="user", uselist=False)

    @property
    def role_name(self) -> str:
        return self.role.name if self.role else None

class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    staff_type = Column(Enum(StaffType), nullable=False)
    mobile_number = Column(String, nullable=True)
    salary = Column(Float, nullable=True)
    commission_rate = Column(Float, nullable=True)
    
    user = relationship("User", back_populates="staff_profile")
    orders_assigned = relationship("Order", back_populates="assigned_tailor")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    customer_code = Column(String, unique=True, index=True, nullable=False)
    contact_number = Column(String, index=True, nullable=False) # Not unique
    alternate_contact = Column(String, nullable=True)
    full_name = Column(String, nullable=False)
    email = Column(String, nullable=True)
    address = Column(String, nullable=True)
    gender_category = Column(Enum(GenderCategory), nullable=False)
    birthday = Column(DateTime, nullable=True)
    student_admission_no = Column(String, nullable=True)
    telegram_chat_id = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    measurements = relationship("Measurement", back_populates="customer")
    orders = relationship("Order", back_populates="customer")

class Measurement(Base):
    __tablename__ = "measurements"
    __table_args__ = (
        Index("ix_measurement_customer_dress", "customer_id", "dress_type"),
    )

    id = Column(Integer, primary_key=True, index=True)
    measurement_code = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False)
    dress_type = Column(String, index=True, nullable=False)  # Shirt, Frock, Shorts, Trouser, Overcoat
    measurement_data = Column(JSON, nullable=False)          # Dynamic measurement fields
    reference_image_url = Column(String, nullable=True)
    notes = Column(String, nullable=True)
    is_used_in_order = Column(Boolean, default=False)         # Becomes immutable once linked to order
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="measurements")
    orders = relationship("Order", back_populates="measurement")

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)
    order_number = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    measurement_id = Column(Integer, ForeignKey("measurements.id"), nullable=True)
    assigned_tailor_id = Column(Integer, ForeignKey("staff.id"), nullable=True)
    status = Column(Enum(OrderStatus), default=OrderStatus.CONFIRMED)
    delivery_date = Column(DateTime, nullable=True)
    category = Column(Enum(GenderCategory), nullable=False)
    dress_type = Column(String, nullable=False)
    quantity = Column(Integer, default=1)
    fabric_source = Column(String, nullable=True) # e.g., 'Customer Provided', 'Store'
    fabric_details = Column(String, nullable=True)
    special_remarks = Column(String, nullable=True)
    internal_notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    customer = relationship("Customer", back_populates="orders")
    measurement = relationship("Measurement", back_populates="orders")
    assigned_tailor = relationship("Staff", back_populates="orders_assigned")
    invoice = relationship("Invoice", uselist=False, back_populates="order")
    fittings = relationship("Fitting", back_populates="order")
    alterations = relationship("Alteration", back_populates="order")
    delivery = relationship("Delivery", uselist=False, back_populates="order")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True, nullable=False)
    order_id = Column(Integer, ForeignKey("orders.id"))
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0.0)
    balance_amount = Column(Float, default=0.0)
    tax = Column(Float, default=0.0)
    discount = Column(Float, default=0.0)
    payment_status = Column(Enum(PaymentStatus), default=PaymentStatus.NOT_PAID)
    cashier_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="invoice")
    payments = relationship("Payment", back_populates="invoice")

class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"))
    amount = Column(Float, nullable=False)
    method = Column(Enum(PaymentMethod), default=PaymentMethod.CASH)
    cashier_name = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    invoice = relationship("Invoice", back_populates="payments")

class Fitting(Base):
    __tablename__ = "fittings"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    notes = Column(String, nullable=True)
    feedback = Column(String, nullable=True)
    status = Column(String, default="Pending")
    scheduled_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="fittings")

class Alteration(Base):
    __tablename__ = "alterations"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    notes = Column(String, nullable=True)
    deadline = Column(DateTime, nullable=True)
    status = Column(String, default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="alterations")

class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    status = Column(String, default="Delivered")
    manager_override = Column(Boolean, default=False)
    notes = Column(String, nullable=True)
    delivered_at = Column(DateTime(timezone=True), server_default=func.now())

    order = relationship("Order", back_populates="delivery")

class Setting(Base):
    __tablename__ = "settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(JSON, nullable=False)

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    order_id = Column(Integer, ForeignKey("orders.id"), nullable=True)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    order = relationship("Order")

class NotificationOutbox(Base):
    __tablename__ = "notification_outbox"

    id = Column(Integer, primary_key=True, index=True)
    telegram_chat_id = Column(String, nullable=True)
    message_body = Column(String, nullable=False)
    status = Column(String, default="PENDING")  # 'PENDING', 'FAILED_NO_LINK', etc.
    log_note = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    sent_at = Column(DateTime(timezone=True), nullable=True)

