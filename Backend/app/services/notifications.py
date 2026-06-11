from sqlalchemy.orm import Session
from app.models import models
from app.crud import crud

def send_order_confirmation_notification(db: Session, order: models.Order):
    customer = order.customer
    invoice = order.invoice
    
    customer_name = customer.full_name if customer else "Customer"
    contact_number = customer.contact_number if customer else "Unknown"
    
    advance_payment = invoice.paid_amount if invoice else 0.0
    balance_amount = invoice.balance_amount if invoice else 0.0
    
    # Message Template for Order Confirmation
    message = (
        f"Hi {customer_name}, your order #{order.order_number} is confirmed!\n"
        f"Advance Payment: LKR {advance_payment:,.2f}\n"
        f"Balance Due: LKR {balance_amount:,.2f}\n"
        f"Thank you for choosing The Uniform Hub!"
    )
    
    # Save in-app notification
    crud.create_notification(
        db=db,
        title="Order Confirmed",
        message=message,
        order_id=order.id
    )
    
    # Mock SMS dispatch integration log
    print(f"\n--- [MOCK NOTIFICATION SENDER] ---")
    print(f"Type: SMS / WhatsApp Dispatch")
    print(f"Recipient: {customer_name} ({contact_number})")
    print(f"Message: {message}")
    print(f"-----------------------------------\n", flush=True)

    # Telegram outbox check and insertion
    telegram_chat_id = customer.telegram_chat_id if customer else None
    if telegram_chat_id:
        outbox_entry = models.NotificationOutbox(
            telegram_chat_id=telegram_chat_id,
            message_body=message,
            status="PENDING"
        )
        db.add(outbox_entry)
        db.commit()
        print(f"[OUTBOX] Created PENDING Telegram outbox entry for order={order.order_number}", flush=True)
    else:
        outbox_entry = models.NotificationOutbox(
            telegram_chat_id=None,
            message_body=message,
            status="FAILED_NO_LINK",
            log_note="Notification Skipped: Customer not linked"
        )
        db.add(outbox_entry)
        db.commit()
        print(f"[OUTBOX] Created FAILED_NO_LINK outbox entry for order={order.order_number}", flush=True)

def send_order_ready_notification(db: Session, order: models.Order):
    customer = order.customer
    invoice = order.invoice
    
    customer_name = customer.full_name if customer else "Customer"
    contact_number = customer.contact_number if customer else "Unknown"
    
    balance_amount = invoice.balance_amount if invoice else 0.0
    
    # Message Template for Ready for Collection
    message = (
        f"Hello {customer_name}! Great news—your order #{order.order_number} is ready for collection.\n"
        f"Please visit us to settle the balance of LKR {balance_amount:,.2f} and collect your items"
    )
    
    # Save in-app notification
    crud.create_notification(
        db=db,
        title="Order Ready for Collection",
        message=message,
        order_id=order.id
    )
    
    # Mock SMS dispatch integration log
    print(f"\n--- [MOCK NOTIFICATION SENDER] ---")
    print(f"Type: SMS / WhatsApp Dispatch")
    print(f"Recipient: {customer_name} ({contact_number})")
    print(f"Message: {message}")
    print(f"-----------------------------------\n", flush=True)

    # Telegram outbox check and insertion
    telegram_chat_id = customer.telegram_chat_id if customer else None
    if telegram_chat_id:
        outbox_entry = models.NotificationOutbox(
            telegram_chat_id=telegram_chat_id,
            message_body=message,
            status="PENDING"
        )
        db.add(outbox_entry)
        db.commit()
        print(f"[OUTBOX] Created PENDING Telegram outbox entry for order={order.order_number}", flush=True)
    else:
        outbox_entry = models.NotificationOutbox(
            telegram_chat_id=None,
            message_body=message,
            status="FAILED_NO_LINK",
            log_note="Notification Skipped: Customer not linked"
        )
        db.add(outbox_entry)
        db.commit()
        print(f"[OUTBOX] Created FAILED_NO_LINK outbox entry for order={order.order_number}", flush=True)
