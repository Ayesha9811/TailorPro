import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.models import Role, User
from app.core.security import get_password_hash

def seed_db():
    db = SessionLocal()
    try:
        roles = [
            {"name": "Super Admin", "permissions": ["all"]},
            {"name": "Owner / Manager", "permissions": ["all"]},
            {"name": "CEO", "permissions": ["all"]},
            {"name": "Finance", "permissions": ["dashboard", "orders", "invoices", "reports"]},
            {"name": "Cashier", "permissions": ["invoices", "payments", "view_orders", "view_customers", "view_others"]},
            {"name": "Tailor", "permissions": ["measurements", "create_orders", "update_order_status"]}
        ]
        
        for role_data in roles:
            role = db.query(Role).filter(Role.name == role_data["name"]).first()
            if not role:
                role = Role(name=role_data["name"], permissions=role_data["permissions"])
                db.add(role)
        db.commit()
        
        # Create super admin user
        super_admin_role = db.query(Role).filter(Role.name == "Super Admin").first()
        if super_admin_role:
            admin_user = db.query(User).filter(User.email == "admin@tailorpro.com").first()
            if not admin_user:
                admin_user = User(
                    role_id=super_admin_role.id,
                    full_name="System Administrator",
                    email="admin@tailorpro.com",
                    hashed_password=get_password_hash("admin123"), # Default password
                    is_active=True
                )
                db.add(admin_user)
                db.commit()
                print("Super Admin created: admin@tailorpro.com / admin123")
            else:
                print("Super Admin already exists.")

        print("Database seeded successfully!")

    finally:
        db.close()

if __name__ == "__main__":
    seed_db()
