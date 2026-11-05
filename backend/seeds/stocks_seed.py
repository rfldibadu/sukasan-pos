import sys
import os
from datetime import datetime, UTC
from sqlalchemy import text

# Ensure Python can resolve modules from the backend root directory
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal, Base, engine
from app.models import users, products, orders, stocks, operationals
from app.models.stocks import RawStock, RawStockCategory


def migrate_and_seed_raw_stocks():
    print("Applying schema migrations for Raw Stocks & Operational Costs...")
    with engine.begin() as conn:
        # 1. Drop obsolete consignment_stocks table (consignment stock is tracked on products.stock_quantity)
        conn.execute(text("DROP TABLE IF EXISTS consignment_stocks CASCADE;"))

        # 2. Ensure raw_stocks has new columns if table already existed
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'raw_stocks') THEN
                        ALTER TABLE raw_stocks ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'other' NOT NULL;
                        ALTER TABLE raw_stocks ADD COLUMN IF NOT EXISTS low_stock_threshold DOUBLE PRECISION DEFAULT 0.0 NOT NULL;
                        ALTER TABLE raw_stocks ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;
                        ALTER TABLE raw_stocks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
                        UPDATE raw_stocks SET category = LOWER(category);
                    END IF;
                END $$;
                """
            )
        )

        # 3. Ensure operational_costs has new columns & flexible VARCHAR category
        conn.execute(
            text(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'operational_costs') THEN
                        ALTER TABLE operational_costs ALTER COLUMN category TYPE VARCHAR USING LOWER(category::text);
                        ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS payment_method VARCHAR DEFAULT 'm_banking';
                        ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS receipt_image_url VARCHAR;
                        ALTER TABLE operational_costs ADD COLUMN IF NOT EXISTS created_by_id UUID REFERENCES users(id);
                    END IF;
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
                        UPDATE orders SET status = LOWER(status::text), payment_status = LOWER(payment_status::text), order_type = LOWER(order_type::text);
                        UPDATE orders SET payment_method = LOWER(payment_method::text) WHERE payment_method IS NOT NULL;
                    END IF;
                    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'stock_purchases') THEN
                        ALTER TABLE stock_purchases ALTER COLUMN receipt_image_url DROP NOT NULL;
                    END IF;
                END $$;
                """
            )
        )

    # Create any newly introduced tables (stock_purchases, stock_purchase_items, etc.)
    Base.metadata.create_all(bind=engine)
    print("Database tables verified.")

    # Seed Raw Stocks from Laporan Keuangan Google Sheet
    raw_stocks_catalog = [
        # --- BEANS ---
        {"name": "House Blend Coffee Beans", "category": RawStockCategory.BEANS, "unit": "kg", "qty": 2.0, "cost": 234000, "threshold": 1.0},
        {"name": "Espresso Single Origin Beans", "category": RawStockCategory.BEANS, "unit": "gr", "qty": 400.0, "cost": 185, "threshold": 200.0},
        # --- MILK & DAIRY ---
        {"name": "UHT Indomilk Full Cream", "category": RawStockCategory.MILK_DAIRY, "unit": "liter", "qty": 12.0, "cost": 19000, "threshold": 4.0},
        {"name": "UHT Ultra Milk", "category": RawStockCategory.MILK_DAIRY, "unit": "liter", "qty": 12.0, "cost": 19000, "threshold": 4.0},
        {"name": "UHT Diamond Milk", "category": RawStockCategory.MILK_DAIRY, "unit": "liter", "qty": 6.0, "cost": 19500, "threshold": 3.0},
        {"name": "UHT Frisian Flag", "category": RawStockCategory.MILK_DAIRY, "unit": "liter", "qty": 4.0, "cost": 18500, "threshold": 2.0},
        {"name": "Frisian Flag Strawberry", "category": RawStockCategory.MILK_DAIRY, "unit": "pcs", "qty": 10.0, "cost": 5000, "threshold": 3.0},
        {"name": "Oatside Oatmilk", "category": RawStockCategory.MILK_DAIRY, "unit": "liter", "qty": 3.0, "cost": 36000, "threshold": 1.0},
        {"name": "Whip Cream", "category": RawStockCategory.MILK_DAIRY, "unit": "liter", "qty": 2.0, "cost": 83000, "threshold": 1.0},
        # --- CREAMER & SWEETENERS ---
        {"name": "Omela SKM / Creamer Kental", "category": RawStockCategory.CREAMER_SWEETENER, "unit": "can", "qty": 6.0, "cost": 11200, "threshold": 2.0},
        {"name": "Carnation SKM 480gr", "category": RawStockCategory.CREAMER_SWEETENER, "unit": "can", "qty": 4.0, "cost": 15400, "threshold": 2.0},
        {"name": "Boneva Creamer", "category": RawStockCategory.CREAMER_SWEETENER, "unit": "box", "qty": 2.0, "cost": 38000, "threshold": 1.0},
        {"name": "Palm Sugar (Gula Aren)", "category": RawStockCategory.CREAMER_SWEETENER, "unit": "pack", "qty": 3.0, "cost": 10000, "threshold": 1.0},
        {"name": "Madu (Honey)", "category": RawStockCategory.CREAMER_SWEETENER, "unit": "bottle", "qty": 2.0, "cost": 45000, "threshold": 1.0},
        # --- SYRUPS & BEVERAGES ---
        {"name": "Sirup Mango", "category": RawStockCategory.SYRUP_BEVERAGE, "unit": "bottle", "qty": 2.0, "cost": 96750, "threshold": 1.0},
        {"name": "Sirup Pandan", "category": RawStockCategory.SYRUP_BEVERAGE, "unit": "bottle", "qty": 2.0, "cost": 96750, "threshold": 1.0},
        {"name": "Sirup Vanilla", "category": RawStockCategory.SYRUP_BEVERAGE, "unit": "bottle", "qty": 2.0, "cost": 95000, "threshold": 1.0},
        {"name": "Sirup Peach", "category": RawStockCategory.SYRUP_BEVERAGE, "unit": "bottle", "qty": 2.0, "cost": 102000, "threshold": 1.0},
        {"name": "Buavita Orange", "category": RawStockCategory.SYRUP_BEVERAGE, "unit": "pcs", "qty": 6.0, "cost": 9000, "threshold": 2.0},
        {"name": "Regen Apple Juice", "category": RawStockCategory.SYRUP_BEVERAGE, "unit": "pcs", "qty": 3.0, "cost": 29400, "threshold": 1.0},
        {"name": "Polaris Soda Water", "category": RawStockCategory.SYRUP_BEVERAGE, "unit": "can", "qty": 8.0, "cost": 4300, "threshold": 3.0},
        # --- POWDERS, SPREADS & TOPPINGS ---
        {"name": "Ceremonial / Culinary Matcha Powder", "category": RawStockCategory.POWDER_SPREAD, "unit": "pack", "qty": 2.0, "cost": 185000, "threshold": 1.0},
        {"name": "Red Velvet Powder", "category": RawStockCategory.POWDER_SPREAD, "unit": "pack", "qty": 2.0, "cost": 65000, "threshold": 1.0},
        {"name": "Taro Powder", "category": RawStockCategory.POWDER_SPREAD, "unit": "pack", "qty": 2.0, "cost": 65000, "threshold": 1.0},
        {"name": "Lotus Biscoff Spread 400gr", "category": RawStockCategory.POWDER_SPREAD, "unit": "jar", "qty": 2.0, "cost": 75000, "threshold": 1.0},
        {"name": "Marie Regal / Cimory Marie", "category": RawStockCategory.POWDER_SPREAD, "unit": "pack", "qty": 3.0, "cost": 7000, "threshold": 1.0},
        # --- ICE ---
        {"name": "Es Kristal (Ice Crystals)", "category": RawStockCategory.ICE, "unit": "bag", "qty": 2.0, "cost": 14000, "threshold": 1.0},
        # --- PACKAGING & SUPPLIES ---
        {"name": "Cup + Lid (Cold/Hot)", "category": RawStockCategory.PACKAGING_SUPPLY, "unit": "pack", "qty": 5.0, "cost": 45000, "threshold": 2.0},
        {"name": "Sedotan (Straws 500pcs)", "category": RawStockCategory.PACKAGING_SUPPLY, "unit": "pack", "qty": 2.0, "cost": 40000, "threshold": 1.0},
        {"name": "Tissue (Larist / Basah)", "category": RawStockCategory.PACKAGING_SUPPLY, "unit": "pack", "qty": 3.0, "cost": 12500, "threshold": 1.0},
    ]

    with SessionLocal() as session:
        added_count = 0
        for item in raw_stocks_catalog:
            exists = session.query(RawStock).filter(RawStock.name.ilike(item["name"])).first()
            if not exists:
                session.add(
                    RawStock(
                        name=item["name"],
                        category=item["category"],
                        unit=item["unit"],
                        current_quantity=item["qty"],
                        cost_per_unit=item["cost"],
                        low_stock_threshold=item["threshold"],
                        is_active=True,
                        updated_at=datetime.now(UTC),
                    )
                )
                added_count += 1
        session.commit()
        print(f"Seeded {added_count} raw stock items (Total in catalog: {session.query(RawStock).count()}).")


if __name__ == "__main__":
    migrate_and_seed_raw_stocks()
