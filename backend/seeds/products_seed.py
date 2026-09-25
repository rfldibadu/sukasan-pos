import sys
import os
import uuid

# Ensure Python can resolve modules from the current directory
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.database import SessionLocal, Base, engine
from app.models.products import Product, Vendor, ItemType, MainCategory

def seed_products_data():
    # Make sure tables exist
    Base.metadata.create_all(bind=engine)

    with SessionLocal() as session:
        # 1. Check if products already exist
        existing_product = session.query(Product).first()
        if existing_product:
            print("ℹ️ Products already exist in the database. Skipping seed.")
            return

        print("🚀 Starting product seeding...")

        # 2. Seed Vendors
        palmer_vendor = Vendor(
            id=uuid.uuid4(),
            name="Palmer Coffee",
            contact_info="082191627400",
            is_active=True
        )
        sweetopia_vendor = Vendor(
            id=uuid.uuid4(),
            name="Sweetopia",
            contact_info="081245177396",
            is_active=True
        )

        session.add_all([palmer_vendor, sweetopia_vendor])
        session.commit()
        session.refresh(palmer_vendor)
        session.refresh(sweetopia_vendor)

        # 3. Seed Main Menu & Add-Ons
        products_data = [
            # --- COFFEE: SIGNATURES ---
            {"name": "Sweet Berry Latte", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 21000},
            {"name": "Sweeney Latte", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 21000},
            {"name": "Sweet Aren Latte", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 21000},

            # --- COFFEE: WHITE ---
            {"name": "Mocaccino (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 24000},
            {"name": "Mocaccino (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 25000},
            {"name": "Cappuccino (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 20000},
            {"name": "Cappuccino (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 22000},
            {"name": "Classic Arabusta Blend (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 16000},
            {"name": "Classic Arabusta Blend (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 17000},
            {"name": "Apan Latte (Aren Based)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 24000},
            {"name": "Cafe Latte (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 20000},
            {"name": "Cafe Latte (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 22000},
            {"name": "Flavoured Latte (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 21000},
            {"name": "Flavoured Latte (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 22000},
            {"name": "Spanish Latte", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 22000},
            {"name": "Slavomaltine (Spread Edition)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 28000},
            {"name": "Biscoff and Cream (Spread Edition)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 28000},

            # --- COFFEE: BLACK ---
            {"name": "Espresso", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 13000},
            {"name": "Long Black (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 16000},
            {"name": "Long Black (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 17000},
            {"name": "Americano (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 16000},
            {"name": "Americano (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 17000},
            {"name": "Peach Black Americano", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 26000},
            {"name": "Americano Honey", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 20000},

            # --- COFFEE: COLD FOAM SERIES ---
            {"name": "Buttercloud Tiramisu", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 25000},
            {"name": "Velvet Banana", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 28000},
            {"name": "Marie and Cream", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 28000},
            {"name": "Caramell Macchiato", "item_type": ItemType.MAIN, "main_category": MainCategory.COFFEE, "price": 25000},

            # --- NON-COFFEE: MILK-BASED ---
            {"name": "Chocolate (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 26000},
            {"name": "Chocolate (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 27000},
            {"name": "Matcha Latte (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 20000},
            {"name": "Matcha Latte (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 21000},
            {"name": "Red Velvet Latte (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 20000},
            {"name": "Red Velvet Latte (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 21000},
            {"name": "Taro Latte (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 20000},
            {"name": "Taro Latte (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 21000},
            {"name": "Choco Biscoff (Spread Edition)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 27000},
            {"name": "Chocomaltine (Spread Edition)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 27000},
            {"name": "Soft Tropfizz", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 17000},

            # --- NON-COFFEE: TROPICAL FIZZ ---
            {"name": "Strawberry Tropical Fizz", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 22000},
            {"name": "Mango Tropical Fizz", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 21000},
            {"name": "Orange Tropical Fizz", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 21000},
            {"name": "Apel Tropical Fizz", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 26000},

            # --- NON-COFFEE: THE CEREMONIAL ---
            {"name": "Matchacheese", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 31000},
            {"name": "Ceremonial Matcha Latte (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 26000},
            {"name": "Ceremonial Matcha Latte (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 27000},
            {"name": "Matchamisu (Hot)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 27000},
            {"name": "Matchamisu (Iced)", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 28000},
            {"name": "Strawberry Matcha Latte", "item_type": ItemType.MAIN, "main_category": MainCategory.NON_COFFEE, "price": 27000},

            # --- ADD-ONS ---
            {"name": "Tiramisu Cold Foam", "item_type": ItemType.ADD_ON, "main_category": None, "price": 5000},
            {"name": "Sea Salt Cold Foam", "item_type": ItemType.ADD_ON, "main_category": None, "price": 5000},
            {"name": "Cream Cheese Cold Foam", "item_type": ItemType.ADD_ON, "main_category": None, "price": 7000},
            {"name": "Biscuit Crumble", "item_type": ItemType.ADD_ON, "main_category": None, "price": 3000},
            {"name": "Espresso Shot", "item_type": ItemType.ADD_ON, "main_category": None, "price": 7000},
            {"name": "Biscoff", "item_type": ItemType.ADD_ON, "main_category": None, "price": 5000},
            {"name": "Ovamaltine", "item_type": ItemType.ADD_ON, "main_category": None, "price": 5000},
            {"name": "Oat Milk", "item_type": ItemType.ADD_ON, "main_category": None, "price": 5000},
        ]

        for item in products_data:
            session.add(
                Product(
                    id=uuid.uuid4(),
                    name=item["name"],
                    item_type=item["item_type"],
                    main_category=item["main_category"],
                    retail_price=float(item["price"]),
                    consignment_fee=None,
                    stock_quantity=None,
                    is_active=True,
                    vendor_id=None
                )
            )

        # 4. Seed Consignments
        consignments_data = [
            {"name": "Basque Burnt Cheesecake", "retail_price": 22000, "vendor_payout": 18000, "vendor_id": palmer_vendor.id, "initial_stock": 10},
            {"name": "Choco Almond Cheesecake", "retail_price": 31000, "vendor_payout": 26000, "vendor_id": palmer_vendor.id, "initial_stock": 10},
            {"name": "Tiramisu Almond Cheesecake", "retail_price": 31000, "vendor_payout": 26000, "vendor_id": palmer_vendor.id, "initial_stock": 10},
            {"name": "NY Style Cheesecake", "retail_price": 25000, "vendor_payout": 20000, "vendor_id": sweetopia_vendor.id, "initial_stock": 10},
        ]

        for item in consignments_data:
            fee = item["retail_price"] - item["vendor_payout"]
            session.add(
                Product(
                    id=uuid.uuid4(),
                    name=item["name"],
                    item_type=ItemType.CONSIGNMENT,
                    main_category=MainCategory.SNACKS,
                    retail_price=float(item["retail_price"]),
                    consignment_fee=float(fee),
                    stock_quantity=item["initial_stock"],
                    is_active=True,
                    vendor_id=item["vendor_id"]
                )
            )

        session.commit()
        print("✅ Successfully seeded all products and vendors!")

if __name__ == "__main__":
    seed_products_data()