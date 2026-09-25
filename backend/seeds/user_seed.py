# seed.py
import sys
import os

# Ensure Python can resolve modules from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, Base, engine
from app.models.users import User, UserRole
from app.core.security import hash_password

def seed_initial_data():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        # Check if an admin/manager already exists
        admin = session.query(User).filter(User.username == "admin").first()
        
        if not admin:
            default_manager = User(
                username="admin",
                full_name="Manager Sukasan",
                password_hash=hash_password("!Sukasan25"),  # Change password as needed!
                role=UserRole.MANAGER,
                is_active=True
            )
            session.add(default_manager)
            session.commit()
            print("✅ Default manager account created: (Username: 'admin', Password: '!Sukasan25')")
        else:
            print("ℹ️ Manager account 'admin' already exists. Skipping seed.")

if __name__ == "__main__":
    seed_initial_data()