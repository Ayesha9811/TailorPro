import threading
import time
import urllib.request
import urllib.parse
import json
import re
import os
from dotenv import load_dotenv
load_dotenv()
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.db.session import SessionLocal
from app.models import models

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")

# In-memory dictionary to track registration state per chat
# chat_id -> state
user_states = {}

def send_telegram_api_request(method: str, payload: dict):
    """Utility to make HTTP POST requests to the Telegram Bot API using python standard library."""
    if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "MOCK_BOT_TOKEN":
        print(f"\n--- [MOCK TELEGRAM BOT SENDER] ---", flush=True)
        print(f"Method: {method}", flush=True)
        print(f"Payload: {payload}", flush=True)
        print(f"-----------------------------------\n", flush=True)
        return {"ok": True, "result": {}}

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/{method}"
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        with urllib.request.urlopen(req, timeout=10) as response:
            return json.loads(response.read().decode('utf-8'))
    except Exception as e:
        print(f"[TELEGRAM API ERROR] Failed to perform {method}: {e}", flush=True)
        return {"ok": False, "description": str(e)}

def clean_phone_for_matching(phone: str) -> str:
    """Extract only trailing 9 digits from raw text for robust Sri Lankan / standard number matching."""
    digits = re.sub(r'\D', '', phone)
    if len(digits) >= 9:
        return digits[-9:]
    return digits

def handle_telegram_message(chat_id: int, text: str):
    """Processes incoming Telegram text messages."""
    db = SessionLocal()
    try:
        text = text.strip()
        if text.startswith("/start"):
            user_states[chat_id] = "AWAITING_PHONE"
            send_telegram_api_request("sendMessage", {
                "chat_id": chat_id,
                "text": "Welcome to The Uniform Hub! Please enter your registered mobile number to link your account."
            })
        elif user_states.get(chat_id) == "AWAITING_PHONE":
            # Sanitize the mobile number
            clean_phone = clean_phone_for_matching(text)
            if not clean_phone or len(clean_phone) < 9:
                send_telegram_api_request("sendMessage", {
                    "chat_id": chat_id,
                    "text": "Please enter a valid mobile number (e.g. 0771234567)."
                })
                return
            
            # Query the customers table
            # Check matches ending in the last 9 digits of contact_number or alternate_contact
            customer = db.query(models.Customer).filter(
                (models.Customer.contact_number.like(f"%{clean_phone}")) |
                (models.Customer.alternate_contact.like(f"%{clean_phone}"))
            ).first()
            
            if customer:
                # Update the telegram_chat_id securely
                customer.telegram_chat_id = str(chat_id)
                db.commit()
                # Clear chat registration state
                user_states.pop(chat_id, None)
                send_telegram_api_request("sendMessage", {
                    "chat_id": chat_id,
                    "text": "Success! You will now receive order updates here."
                })
                print(f"[TELEGRAM BOT] Successfully linked chat_id={chat_id} to customer={customer.full_name}", flush=True)

                # Check for "Order Confirmed" orders and backfill confirmation messages
                for order in customer.orders:
                    if order.status == models.OrderStatus.CONFIRMED:
                        invoice = order.invoice
                        advance_payment = invoice.paid_amount if invoice else 0.0
                        balance_amount = invoice.balance_amount if invoice else 0.0
                        
                        confirm_message = (
                            f"Hi {customer.full_name}, your order #{order.order_number} is confirmed!\n"
                            f"Advance Payment: LKR {advance_payment:,.2f}\n"
                            f"Balance Due: LKR {balance_amount:,.2f}\n"
                            f"Thank you for choosing The Uniform Hub!"
                        )
                        
                        outbox_entry = models.NotificationOutbox(
                            telegram_chat_id=str(chat_id),
                            message_body=confirm_message,
                            status="PENDING"
                        )
                        db.add(outbox_entry)
                        db.commit()
                        print(f"[TELEGRAM BOT] Dispatched backfilled Order Confirmed message for order={order.order_number}", flush=True)
            else:
                send_telegram_api_request("sendMessage", {
                    "chat_id": chat_id,
                    "text": "Sorry, we could not find a customer record with that number. Please contact the shop."
                })
                print(f"[TELEGRAM BOT] Failed to link chat_id={chat_id}: no customer matching '{clean_phone}'", flush=True)
        else:
            send_telegram_api_request("sendMessage", {
                "chat_id": chat_id,
                "text": "To link your account, please type /start to register."
            })
    except Exception as e:
        print(f"[TELEGRAM BOT ERROR] Exception while handling message: {e}", flush=True)
    finally:
        db.close()

def run_telegram_bot_polling():
    """Bot long polling runner."""
    last_update_id = 0
    print("[TELEGRAM BOT] Starting long polling loop...", flush=True)
    
    while True:
        try:
            if not TELEGRAM_BOT_TOKEN or TELEGRAM_BOT_TOKEN == "MOCK_BOT_TOKEN":
                time.sleep(10)
                continue
                
            updates = send_telegram_api_request("getUpdates", {
                "offset": last_update_id + 1,
                "timeout": 30
            })
            
            if updates.get("ok") and updates.get("result"):
                for update in updates["result"]:
                    last_update_id = update["update_id"]
                    message = update.get("message")
                    if message and "text" in message:
                        chat_id = message["chat"]["id"]
                        text = message["text"]
                        handle_telegram_message(chat_id, text)
        except Exception as e:
            print(f"[TELEGRAM BOT POLLING ERROR] {e}", flush=True)
            time.sleep(10)
        time.sleep(1)

def run_notification_worker():
    """Notification Outbox scheduler worker."""
    print("[NOTIFICATION WORKER] Starting outbox dispatch loop...", flush=True)
    
    while True:
        db = SessionLocal()
        try:
            # Query pending outbox entries
            pending = db.query(models.NotificationOutbox).filter(
                models.NotificationOutbox.status == "PENDING"
            ).all()
            
            for entry in pending:
                if not entry.telegram_chat_id:
                    entry.status = "FAILED_NO_LINK"
                    entry.log_note = "Notification Skipped: Customer not linked"
                    db.commit()
                    continue
                
                # Send telegram message
                res = send_telegram_api_request("sendMessage", {
                    "chat_id": int(entry.telegram_chat_id),
                    "text": entry.message_body
                })
                
                if res.get("ok"):
                    entry.status = "SENT"
                    entry.sent_at = func.now()
                    entry.log_note = "Message sent successfully"
                else:
                    entry.status = "FAILED"
                    entry.log_note = res.get("description", "Telegram API Error")
                
                db.commit()
        except Exception as e:
            print(f"[NOTIFICATION WORKER ERROR] {e}", flush=True)
        finally:
            db.close()
            
        time.sleep(5)

def start_telegram_services():
    """Spawns Telegram Bot and Notification Outbox worker on daemon background threads."""
    bot_thread = threading.Thread(target=run_telegram_bot_polling, daemon=True)
    worker_thread = threading.Thread(target=run_notification_worker, daemon=True)
    bot_thread.start()
    worker_thread.start()
    print("[TELEGRAM BOT & WORKER] Services successfully spawned on background threads.", flush=True)
