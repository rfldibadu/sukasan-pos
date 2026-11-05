import sys
import os

# Ensure Python can resolve modules from the backend root directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal, Base, engine
from app.models.users import User, UserRole
from app.core.security import hash_password


def seed_initial_data():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        # 1. Default Manager account
        admin = session.query(User).filter(User.username == "admin").first()
        if not admin:
            default_manager = User(
                username="admin",
                full_name="Rifaldi",
                password_hash=hash_password("!admin123"),
                role=UserRole.MANAGER,
                is_active=True,
            )
            session.add(default_manager)
            session.commit()
            print("[OK] Default manager account created: (Username: 'admin', Password: '!admin123')")
        else:
            print("[INFO] Manager account 'admin' already exists. Skipping seed.")

        # 2. Default Cashier account
        cashier = session.query(User).filter(User.username == "cashier").first()
        if not cashier:
            default_cashier = User(
                username="cashier",
                full_name="Clarissa Putri",
                password_hash=hash_password("!cashier123"),
                role=UserRole.CASHIER,
                is_active=True,
            )
            session.add(default_cashier)
            session.commit()
            print("[OK] Default cashier account created: (Username: 'cashier', Password: '!cashier123')")
        else:
            print("[INFO] Cashier account 'cashier' already exists. Skipping seed.")


if __name__ == "__main__":
    seed_initial_data()
