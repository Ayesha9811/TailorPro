from sqlalchemy.orm import Session
from ..models import models
from ..schemas import schemas
import datetime

# Customer CRUD
def get_customer_by_id(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def get_customers_by_contact_number(db: Session, contact_number: str):
    return db.query(models.Customer).filter(models.Customer.contact_number == contact_number).all()

def search_customers(db: Session, query: str):
    return db.query(models.Customer).filter(
        (models.Customer.full_name.ilike(f"%{query}%")) |
        (models.Customer.contact_number.ilike(f"%{query}%")) |
        (models.Customer.customer_code.ilike(f"%{query}%"))
    ).all()

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Customer).offset(skip).limit(limit).all()

def create_customer(db: Session, customer: schemas.CustomerCreate):
    year = datetime.datetime.now().year
    last_customer = db.query(models.Customer).filter(models.Customer.customer_code.like(f"CUST-{year}-%")).order_by(models.Customer.customer_code.desc()).first()
    
    if last_customer:
        last_num = int(last_customer.customer_code.split("-")[-1])
        new_num = str(last_num + 1).zfill(4)
    else:
        new_num = "0001"
    
    customer_code = f"CUST-{year}-{new_num}"

    db_customer = models.Customer(customer_code=customer_code, **customer.model_dump())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

# Staff CRUD
def get_staff(db: Session, staff_id: int):
    return db.query(models.Staff).filter(models.Staff.id == staff_id).first()

def get_staff_members(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Staff).offset(skip).limit(limit).all()

def create_staff(db: Session, staff: schemas.StaffCreate):
    db_staff = models.Staff(**staff.model_dump())
    db.add(db_staff)
    db.commit()
    db.refresh(db_staff)
    return db_staff

# Measurement CRUD
def get_measurement_by_id(db: Session, measurement_id: int):
    return db.query(models.Measurement).filter(models.Measurement.id == measurement_id).first()

def get_measurements_by_customer(db: Session, customer_id: int):
    return db.query(models.Measurement).filter(
        models.Measurement.customer_id == customer_id
    ).order_by(models.Measurement.created_at.desc()).all()

def get_measurements_by_customer_and_type(db: Session, customer_id: int, dress_type: str):
    return db.query(models.Measurement).filter(
        models.Measurement.customer_id == customer_id,
        models.Measurement.dress_type == dress_type
    ).order_by(models.Measurement.created_at.desc()).all()

def get_latest_measurement(db: Session, customer_id: int, dress_type: str):
    return db.query(models.Measurement).filter(
        models.Measurement.customer_id == customer_id,
        models.Measurement.dress_type == dress_type
    ).order_by(models.Measurement.created_at.desc()).first()

def create_measurement(db: Session, measurement: schemas.MeasurementCreate):
    year = datetime.datetime.now().year
    last_meas = db.query(models.Measurement).filter(
        models.Measurement.measurement_code.like(f"MEAS-{year}-%")
    ).order_by(models.Measurement.measurement_code.desc()).first()

    if last_meas:
        last_num = int(last_meas.measurement_code.split("-")[-1])
        new_num = str(last_num + 1).zfill(4)
    else:
        new_num = "0001"

    measurement_code = f"MEAS-{year}-{new_num}"

    db_measurement = models.Measurement(
        measurement_code=measurement_code,
        **measurement.model_dump()
    )
    db.add(db_measurement)
    db.commit()
    db.refresh(db_measurement)
    return db_measurement

def update_measurement(db: Session, measurement_id: int, update_data: schemas.MeasurementUpdate):
    db_meas = get_measurement_by_id(db, measurement_id)
    if not db_meas:
        return None
    if db_meas.is_used_in_order:
        return None  # Immutable once linked to order

    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_meas, key, value)

    db.commit()
    db.refresh(db_meas)
    return db_meas

def compare_measurements(db: Session, customer_id: int, dress_type: str):
    records = db.query(models.Measurement).filter(
        models.Measurement.customer_id == customer_id,
        models.Measurement.dress_type == dress_type
    ).order_by(models.Measurement.created_at.desc()).limit(2).all()

    latest = records[0] if len(records) >= 1 else None
    previous = records[1] if len(records) >= 2 else None

    differences = None
    if latest and previous:
        differences = {}
        all_keys = set(list(latest.measurement_data.keys()) + list(previous.measurement_data.keys()))
        for key in all_keys:
            old_val = previous.measurement_data.get(key)
            new_val = latest.measurement_data.get(key)
            if old_val != new_val:
                try:
                    diff = round(float(new_val) - float(old_val), 2)
                    differences[key] = {"old": old_val, "new": new_val, "diff": diff}
                except (TypeError, ValueError):
                    differences[key] = {"old": old_val, "new": new_val, "diff": None}

    return latest, previous, differences

# Order CRUD
def create_order(db: Session, order: schemas.OrderCreate, cashier_name: str = None):
    year = datetime.datetime.now().year
    last_order = db.query(models.Order).filter(models.Order.order_number.like(f"ORD-{year}-%")).order_by(models.Order.order_number.desc()).first()
    
    if last_order:
        last_num = int(last_order.order_number.split("-")[-1])
        new_num = str(last_num + 1).zfill(4)
    else:
        new_num = "0001"
    
    order_number = f"ORD-{year}-{new_num}"
    
    # Extract Order fields only
    order_data = order.model_dump(exclude={"total_amount", "discount"})
    db_order = models.Order(order_number=order_number, **order_data)
    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    # If linked to a measurement, lock it
    if order.measurement_id:
        meas = db.query(models.Measurement).filter(models.Measurement.id == order.measurement_id).first()
        if meas:
            meas.is_used_in_order = True
            db.commit()

    # Automatically generate an Invoice
    last_inv = db.query(models.Invoice).filter(models.Invoice.invoice_number.like(f"INV-{year}-%")).order_by(models.Invoice.invoice_number.desc()).first()
    if last_inv:
        last_inv_num = int(last_inv.invoice_number.split("-")[-1])
        new_inv_num = str(last_inv_num + 1).zfill(4)
    else:
        new_inv_num = "0001"
    
    invoice_number = f"INV-{year}-{new_inv_num}"
    db_invoice = models.Invoice(
        invoice_number=invoice_number,
        order_id=db_order.id,
        total_amount=order.total_amount,
        balance_amount=order.total_amount,
        discount=order.discount,
        cashier_name=cashier_name
    )
    db.add(db_invoice)
    db.commit()
    db.refresh(db_order) # Refresh to load relationships
    
    try:
        from app.services import notifications
        notifications.send_order_confirmation_notification(db, db_order)
    except Exception as e:
        print(f"Notification error: {e}", flush=True)
    
    return db_order

def get_order(db: Session, order_id: int):
    return db.query(models.Order).filter(models.Order.id == order_id).first()

def get_orders(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Order).order_by(models.Order.created_at.desc()).offset(skip).limit(limit).all()

def update_order_status(db: Session, order_id: int, status: models.OrderStatus):
    db_order = get_order(db, order_id)
    if db_order:
        db_order.status = status
        db.commit()
        db.refresh(db_order)
    return db_order

def update_order(db: Session, order_id: int, update_data: schemas.OrderUpdate):
    db_order = get_order(db, order_id)
    if not db_order:
        return None
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, value in update_dict.items():
        setattr(db_order, key, value)
    db.commit()
    db.refresh(db_order)
    return db_order

def create_unified_order(db: Session, payload: schemas.UnifiedOrderCreate, cashier_name: str = None):
    try:
        year = datetime.datetime.now().year
        
        # 1. Resolve Customer
        if payload.customer_id:
            db_customer = db.query(models.Customer).filter(models.Customer.id == payload.customer_id).first()
            if not db_customer:
                raise ValueError("Provided customer_id does not exist")
        elif payload.customer:
            # Auto-generate code
            last_cust = db.query(models.Customer).filter(models.Customer.customer_code.like(f"CUST-{year}-%")).order_by(models.Customer.customer_code.desc()).first()
            new_num = str(int(last_cust.customer_code.split("-")[-1]) + 1).zfill(4) if last_cust else "0001"
            customer_code = f"CUST-{year}-{new_num}"
            
            db_customer = models.Customer(customer_code=customer_code, **payload.customer.model_dump())
            db.add(db_customer)
            db.flush() # flush to get ID without committing
        else:
            raise ValueError("Either customer_id or customer data must be provided")

        # 2. Resolve Measurement
        meas_id = payload.measurement_id
        if not meas_id and payload.measurement_data:
            # Generate measurement code
            last_meas = db.query(models.Measurement).filter(models.Measurement.measurement_code.like(f"MEAS-{year}-%")).order_by(models.Measurement.measurement_code.desc()).first()
            new_meas_num = str(int(last_meas.measurement_code.split("-")[-1]) + 1).zfill(4) if last_meas else "0001"
            
            db_measurement = models.Measurement(
                measurement_code=f"MEAS-{year}-{new_meas_num}",
                customer_id=db_customer.id,
                dress_type=payload.order.dress_type,
                measurement_data=payload.measurement_data,
                notes=payload.measurement_notes,
                is_used_in_order=True
            )
            db.add(db_measurement)
            db.flush()
            meas_id = db_measurement.id
        elif meas_id:
            # Lock existing measurement
            db_meas = db.query(models.Measurement).filter(models.Measurement.id == meas_id).first()
            if db_meas:
                db_meas.is_used_in_order = True
                db.flush()

        # 3. Create Order
        last_order = db.query(models.Order).filter(models.Order.order_number.like(f"ORD-{year}-%")).order_by(models.Order.order_number.desc()).first()
        new_ord_num = str(int(last_order.order_number.split("-")[-1]) + 1).zfill(4) if last_order else "0001"
        
        order_data = payload.order.model_dump(exclude={"total_amount", "discount", "customer_id", "measurement_id"})
        db_order = models.Order(
            order_number=f"ORD-{year}-{new_ord_num}",
            customer_id=db_customer.id,
            measurement_id=meas_id,
            **order_data
        )
        db.add(db_order)
        db.flush()

        # 4. Create Invoice
        last_inv = db.query(models.Invoice).filter(models.Invoice.invoice_number.like(f"INV-{year}-%")).order_by(models.Invoice.invoice_number.desc()).first()
        new_inv_num = str(int(last_inv.invoice_number.split("-")[-1]) + 1).zfill(4) if last_inv else "0001"
        
        db_invoice = models.Invoice(
            invoice_number=f"INV-{year}-{new_inv_num}",
            order_id=db_order.id,
            total_amount=payload.order.total_amount,
            balance_amount=payload.order.total_amount,
            discount=payload.order.discount,
            cashier_name=cashier_name
        )
        db.add(db_invoice)
        db.flush()

        # 5. Process Advance Payment (if any)
        if payload.advance_payment > 0:
            if payload.advance_payment > db_invoice.total_amount:
                raise ValueError("Advance payment cannot exceed total amount")
            
            db_payment = models.Payment(
                invoice_id=db_invoice.id,
                amount=payload.advance_payment,
                method=payload.payment_method,
                cashier_name=cashier_name
            )
            db.add(db_payment)
            
            db_invoice.paid_amount += payload.advance_payment
            db_invoice.balance_amount -= payload.advance_payment
            
            if db_invoice.balance_amount <= 0:
                db_invoice.payment_status = models.PaymentStatus.FULLY_PAID
            else:
                db_invoice.payment_status = models.PaymentStatus.PARTIALLY_PAID
            
            db.flush()

        # If everything succeeded, commit the transaction
        db.commit()
        db.refresh(db_order)
        
        try:
            from app.services import notifications
            notifications.send_order_confirmation_notification(db, db_order)
        except Exception as e:
            print(f"Notification error: {e}", flush=True)
            
        return db_order

    except Exception as e:
        db.rollback() # Rollback EVERYTHING if any step fails
        raise e

# Payment CRUD
def create_payment(db: Session, payment: schemas.PaymentCreate, cashier_name: str = None):
    db_invoice = db.query(models.Invoice).filter(models.Invoice.id == payment.invoice_id).first()
    if not db_invoice:
        return None
    
    cashier = cashier_name or payment.cashier_name
    db_payment = models.Payment(
        invoice_id=payment.invoice_id,
        amount=payment.amount,
        method=payment.method,
        cashier_name=cashier
    )
    db.add(db_payment)
    
    # Update invoice balances
    db_invoice.paid_amount += payment.amount
    db_invoice.balance_amount = db_invoice.total_amount - db_invoice.paid_amount
    
    # Capture/update latest cashier on invoice
    if cashier:
        db_invoice.cashier_name = cashier
        
    # Update payment status
    if db_invoice.balance_amount <= 0:
        db_invoice.payment_status = models.PaymentStatus.FULLY_PAID
    elif db_invoice.paid_amount > 0:
        db_invoice.payment_status = models.PaymentStatus.PARTIALLY_PAID
    
    db.commit()
    db.refresh(db_payment)
    return db_payment

def get_payments_by_invoice(db: Session, invoice_id: int):
    return db.query(models.Payment).filter(models.Payment.invoice_id == invoice_id).all()

# Invoice CRUD
def get_invoice(db: Session, invoice_id: int):
    return db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()

def get_invoices(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Invoice).order_by(models.Invoice.created_at.desc()).offset(skip).limit(limit).all()

# User & Staff Management CRUD
def get_user_by_id(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def get_users_with_staff(db: Session, skip: int = 0, limit: int = 100):
    users = db.query(models.User).offset(skip).limit(limit).all()
    results = []
    for u in users:
        role_name = u.role.name if u.role else "Unknown"
        staff_data = None
        if u.staff_profile:
            staff_data = {
                "id": u.staff_profile.id,
                "staff_type": u.staff_profile.staff_type,
                "mobile_number": u.staff_profile.mobile_number,
                "salary": u.staff_profile.salary,
                "commission_rate": u.staff_profile.commission_rate,
                "is_active": u.is_active
            }
        results.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_active": u.is_active,
            "role_id": u.role_id,
            "role_name": role_name,
            "permissions": u.permissions or [],
            "created_at": u.created_at,
            "updated_at": u.updated_at,
            "staff": staff_data
        })
    return results

def get_roles(db: Session):
    return db.query(models.Role).all()

def create_user_with_staff(db: Session, payload: schemas.UserCreatePayload):
    from ..core.security import get_password_hash
    hashed_pwd = get_password_hash(payload.password)
    
    db_user = models.User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=hashed_pwd,
        role_id=payload.role_id,
        is_active=payload.is_active,
        permissions=payload.permissions or []
    )
    db.add(db_user)
    db.flush()
    
    if payload.staff_type:
        db_staff = models.Staff(
            user_id=db_user.id,
            staff_type=payload.staff_type,
            mobile_number=payload.mobile_number,
            salary=payload.salary,
            commission_rate=payload.commission_rate
        )
        db.add(db_staff)
        db.flush()

    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_with_staff(db: Session, user_id: int, payload: schemas.UserUpdate):
    from ..core.security import get_password_hash
    db_user = get_user_by_id(db, user_id)
    if not db_user:
        return None
    
    if payload.email is not None:
        db_user.email = payload.email
    if payload.full_name is not None:
        db_user.full_name = payload.full_name
    if payload.password is not None and payload.password != "":
        db_user.hashed_password = get_password_hash(payload.password)
    if payload.role_id is not None:
        db_user.role_id = payload.role_id
    if payload.is_active is not None:
        db_user.is_active = payload.is_active
    if payload.permissions is not None:
        db_user.permissions = payload.permissions

    if payload.staff_type is not None:
        db_staff = db_user.staff_profile
        if not db_staff:
            db_staff = models.Staff(user_id=db_user.id, staff_type=payload.staff_type)
            db.add(db_staff)
        else:
            db_staff.staff_type = payload.staff_type
        
        if payload.mobile_number is not None:
            db_staff.mobile_number = payload.mobile_number
        if payload.salary is not None:
            db_staff.salary = payload.salary
        if payload.commission_rate is not None:
            db_staff.commission_rate = payload.commission_rate
            
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user_by_id(db: Session, user_id: int):
    db_user = get_user_by_id(db, user_id)
    if db_user:
        db_user.is_active = False
        db.commit()
        return True
    return False

# Notifications CRUD
def get_notifications_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Notification).filter(
        (models.Notification.user_id == user_id) | (models.Notification.user_id == None)
    ).order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()

def mark_notification_as_read(db: Session, notification_id: int, user_id: int):
    notif = db.query(models.Notification).filter(
        models.Notification.id == notification_id,
        (models.Notification.user_id == user_id) | (models.Notification.user_id == None)
    ).first()
    if notif:
        notif.is_read = True
        db.commit()
        db.refresh(notif)
    return notif

def mark_all_notifications_as_read(db: Session, user_id: int):
    notifs = db.query(models.Notification).filter(
        (models.Notification.user_id == user_id) | (models.Notification.user_id == None),
        models.Notification.is_read == False
    ).all()
    for notif in notifs:
        notif.is_read = True
    db.commit()
    return len(notifs)

def create_notification(db: Session, title: str, message: str, user_id: int = None, order_id: int = None):
    db_notif = models.Notification(
        title=title,
        message=message,
        user_id=user_id,
        order_id=order_id
    )
    db.add(db_notif)
    db.commit()
    db.refresh(db_notif)
    return db_notif


def get_notification_outbox(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.NotificationOutbox).order_by(
        models.NotificationOutbox.created_at.desc()
    ).offset(skip).limit(limit).all()


