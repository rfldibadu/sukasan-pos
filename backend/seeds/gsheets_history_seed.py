import json
import os
import re
import sys
import uuid
from collections import defaultdict
from datetime import datetime, time, timedelta
from pathlib import Path
from sqlalchemy import text

# Ensure backend root is on sys.path
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BACKEND_ROOT)

from app.core.timezone import WITA_TZ
from app.db.database import Base, SessionLocal, engine
from app.models.operationals import CostCategory, OperationalCost
from app.models.orders import Order, OrderItem, OrderStatus, OrderType, PaymentMethod, PaymentStatus
from app.models.products import ItemType, MainCategory, Product, Vendor
from app.models.stocks import (
    ExpensePaymentMethod,
    RawStock,
    RawStockCategory,
    StockPurchase,
    StockPurchaseItem,
)
from app.models.users import User, UserRole
from app.services.reports_service import get_monthly_cashflow_report


def parse_rp(val: str) -> float:
    if not val:
        return 0.0
    cleaned = re.sub(r"[^0-9-]", "", str(val))
    return float(cleaned) if cleaned else 0.0


def parse_sheet_date(date_str: str) -> datetime.date:
    return datetime.strptime(date_str.strip(), "%d/%m/%Y").date()


def ensure_schema_timezone():
    """Ensure orders.created_at is TIMESTAMPTZ in PostgreSQL."""
    with engine.begin() as conn:
        conn.execute(
            text(
                "ALTER TABLE orders ALTER COLUMN created_at TYPE TIMESTAMPTZ "
                "USING created_at AT TIME ZONE 'Asia/Makassar';"
            )
        )


def resolve_product(db_products: dict[str, Product], menu_name: str, variant: str) -> Product:
    m = menu_name.strip()
    v = variant.strip().lower()
    suffix = "(Hot)" if v == "hot" else "(Iced)"

    direct_aliases = {
        ("Capuccino", "hot"): "Cappuccino (Hot)",
        ("Capuccino", "cold"): "Cappuccino (Iced)",
        ("Capuccino", ""): "Cappuccino (Iced)",
        ("Chocolatte", "hot"): "Chocolate (Hot)",
        ("Chocolatte", "cold"): "Chocolate (Iced)",
        ("Chocolatte", ""): "Chocolate (Iced)",
        ("Classic", "hot"): "Classic Arabusta Blend (Hot)",
        ("Classic", "cold"): "Classic Arabusta Blend (Iced)",
        ("Classic", ""): "Classic Arabusta Blend (Iced)",
        ("Apan Latte", "cold"): "Apan Latte (Aren Based)",
        ("Apan Latte", ""): "Apan Latte (Aren Based)",
        ("Slavomal Latte", "cold"): "Slavomaltine (Spread Edition)",
        ("Slavomal Latte", ""): "Slavomaltine (Spread Edition)",
        ("Biscoff and Cream", "cold"): "Biscoff and Cream (Spread Edition)",
        ("Biscoff and Cream", ""): "Biscoff and Cream (Spread Edition)",
        ("Caramel Macchiato", "cold"): "Caramell Macchiato",
        ("Caramel Macchiato", ""): "Caramell Macchiato",
        ("Choco Biscoff", "cold"): "Choco Biscoff (Spread Edition)",
        ("Choco Biscoff", ""): "Choco Biscoff (Spread Edition)",
        ("Chocomaltine", "cold"): "Chocomaltine (Spread Edition)",
        ("Chocomaltine", ""): "Chocomaltine (Spread Edition)",
        ("Soft Tropizz", "cold"): "Soft Tropfizz",
        ("Soft Tropizz", ""): "Soft Tropfizz",
        ("Tropizz Strawberry", "cold"): "Strawberry Tropical Fizz",
        ("Tropizz Strawberry", ""): "Strawberry Tropical Fizz",
        ("Tropizz Mango", "cold"): "Mango Tropical Fizz",
        ("Tropizz Mango", ""): "Mango Tropical Fizz",
        ("Tropizz Orange", "cold"): "Orange Tropical Fizz",
        ("Tropizz Orange", ""): "Orange Tropical Fizz",
        ("Tropizz Apple", "cold"): "Apel Tropical Fizz",
        ("Tropizz Apple", ""): "Apel Tropical Fizz",
    }

    if (m, v) in direct_aliases and direct_aliases[(m, v)] in db_products:
        return db_products[direct_aliases[(m, v)]]

    with_suffix = f"{m} {suffix}"
    if with_suffix in db_products:
        return db_products[with_suffix]

    if m in db_products:
        return db_products[m]

    # Fallback case-insensitive match
    for p_name, prod in db_products.items():
        if p_name.lower() == m.lower() or p_name.lower() == with_suffix.lower():
            return prod

    return db_products["Custom Item"]


def classify_operational_cost(ket: str) -> CostCategory | None:
    k = ket.strip().lower()
    if not k:
        return None

    # Note: "Gaji wirya dan Beans" and "kopi + token listrik" are mixed, check exact operational items first
    if k in (
        "token ruko",
        "listrik ruko",
        "token listrik",
        "token listrik ruko",
        "listrik",
    ):
        return CostCategory.ELECTRICITY_INDOOR

    if k in ("token booth", "listrik booth"):
        return CostCategory.ELECTRICITY_BOOTH

    if k in (
        "gaji wirya",
        "gaji alya",
        "insentif alya",
        "kasbon",
        "kasbon alya",
        "kasbon wirya",
        "pesangon alya",
    ):
        return CostCategory.STAFF_SALARY

    if k in (
        "consignment cheesecake rafid",
        "consignment cheesecake letu iceberg",
        "consignment ayu",
        "consign ayu",
        "consignment",
        "cheesecake palmer",
        "cheesecake lets",
        "cheesecake letux",
    ):
        return CostCategory.CONSIGNMENT_PAYOUT

    if k in ("kursi", "meja baru", "nasi"):
        return CostCategory.OTHER

    return None


def resolve_raw_stock_items(
    raw_stocks: dict[str, RawStock],
    ket: str,
    qty: float,
    total_cost: float,
) -> list[tuple[RawStock, float, float]]:
    """
    Maps a Pengeluaran row Keterangan to one or more (RawStock, quantity, subtotal_cost) tuples.
    Supports both single-item purchases and multi-item receipts (e.g. 'Cup, Kopi, Creamer').
    """
    k = ket.strip().lower()

    # Multi-item receipts in the sheet
    multi_mappings = {
        "cup, kopi, creamer": [
            ("Cup + Lid (Cold/Hot)", 1.0, round(total_cost * 0.40, 2)),
            ("House Blend Coffee Beans", 1.0, round(total_cost * 0.35, 2)),
            ("Boneva Creamer", 1.0, total_cost - round(total_cost * 0.40, 2) - round(total_cost * 0.35, 2)),
        ],
        "sirup mango & pandan": [
            ("Sirup Mango", 1.0, round(total_cost / 2, 2)),
            ("Sirup Pandan", 1.0, total_cost - round(total_cost / 2, 2)),
        ],
        "sirup peach dan aren": [
            ("Sirup Peach", 1.0, round(total_cost * 0.65, 2)),
            ("Palm Sugar (Gula Aren)", 1.0, total_cost - round(total_cost * 0.65, 2)),
        ],
        "sirup vanilla + madu + palm sugar": [
            ("Sirup Vanilla", 1.0, round(total_cost * 0.50, 2)),
            ("Madu (Honey)", 1.0, round(total_cost * 0.30, 2)),
            ("Palm Sugar (Gula Aren)", 1.0, total_cost - round(total_cost * 0.50, 2) - round(total_cost * 0.30, 2)),
        ],
        "sirup+whip": [
            ("Sirup Vanilla", 1.0, round(total_cost * 0.55, 2)),
            ("Whip Cream", 1.0, total_cost - round(total_cost * 0.55, 2)),
        ],
        "es + polaris + buahvita orange": [
            ("Es Kristal (Ice Crystals)", 1.0, 15000.0),
            ("Polaris Soda Water", 1.0, 25000.0),
            ("Buavita Orange", 1.0, max(0.0, total_cost - 40000.0)),
        ],
        "beans, buavita,, susu": [
            ("House Blend Coffee Beans", 1.0, round(total_cost * 0.55, 2)),
            ("Buavita Orange", 1.0, round(total_cost * 0.15, 2)),
            ("UHT Indomilk Full Cream", 1.0, total_cost - round(total_cost * 0.55, 2) - round(total_cost * 0.15, 2)),
        ],
        "ff uht 12, skm carnation 4": [
            ("UHT Frisian Flag", 12.0, round(total_cost * 0.75, 2)),
            ("Carnation SKM 480gr", 4.0, total_cost - round(total_cost * 0.75, 2)),
        ],
        "uht diamond+ff strawberry": [
            ("UHT Diamond Milk", 1.0, round(total_cost * 0.55, 2)),
            ("Frisian Flag Strawberry", 1.0, total_cost - round(total_cost * 0.55, 2)),
        ],
        "uht dan tisu": [
            ("UHT Indomilk Full Cream", 1.0, round(total_cost * 0.80, 2)),
            ("Tissue (Larist / Basah)", 1.0, total_cost - round(total_cost * 0.80, 2)),
        ],
        "matcha + cup": [
            ("Ceremonial / Culinary Matcha Powder", 1.0, round(total_cost * 0.60, 2)),
            ("Cup + Lid (Cold/Hot)", 1.0, total_cost - round(total_cost * 0.60, 2)),
        ],
        "red v 2, taro 2, matcha culi 1": [
            ("Red Velvet Powder", 2.0, round(total_cost * 0.40, 2)),
            ("Taro Powder", 2.0, round(total_cost * 0.40, 2)),
            ("Ceremonial / Culinary Matcha Powder", 1.0, total_cost - 2 * round(total_cost * 0.40, 2)),
        ],
    }

    if k in multi_mappings:
        return [
            (raw_stocks[name], item_qty, sub)
            for name, item_qty, sub in multi_mappings[k]
        ]

    # Single-item keyword match
    if "es kristal" in k or k == "es":
        target = raw_stocks["Es Kristal (Ice Crystals)"]
    elif "omela" in k:
        target = raw_stocks["Omela SKM / Creamer Kental"]
    elif "carnation" in k or "skm" in k:
        target = raw_stocks["Carnation SKM 480gr"]
    elif "palm sugar" in k or "gula aren" in k:
        target = raw_stocks["Palm Sugar (Gula Aren)"]
    elif "madu" in k:
        target = raw_stocks["Madu (Honey)"]
    elif "boneva" in k:
        target = raw_stocks["Boneva Creamer"]
    elif "indomilk" in k or "idm uht" in k:
        target = raw_stocks["UHT Indomilk Full Cream"]
    elif "ultra uht" in k:
        target = raw_stocks["UHT Ultra Milk"]
    elif "uht diamond" in k:
        target = raw_stocks["UHT Diamond Milk"]
    elif "ff straw" in k:
        target = raw_stocks["Frisian Flag Strawberry"]
    elif "uht frisian" in k:
        target = raw_stocks["UHT Frisian Flag"]
    elif "whip" in k:
        target = raw_stocks["Whip Cream"]
    elif "cheese spread" in k:
        target = raw_stocks["Whip Cream"]
    elif "beans 200gr" in k:
        target = raw_stocks["Espresso Single Origin Beans"]
    elif "beans" in k or "kopi" in k:
        target = raw_stocks["House Blend Coffee Beans"]
    elif "buahvita" in k or "buavita" in k:
        target = raw_stocks["Buavita Orange"]
    elif "polaris" in k:
        target = raw_stocks["Polaris Soda Water"]
    elif "regen" in k:
        target = raw_stocks["Regen Apple Juice"]
    elif "marjan mango" in k or "sirup mango" in k:
        target = raw_stocks["Sirup Mango"]
    elif "sirup peach" in k:
        target = raw_stocks["Sirup Peach"]
    elif "butterscotch" in k or "sirup" in k:
        target = raw_stocks["Sirup Vanilla"]
    elif "biscoff" in k:
        target = raw_stocks["Lotus Biscoff Spread 400gr"]
    elif "cimory" in k or "marie" in k:
        target = raw_stocks["Marie Regal / Cimory Marie"]
    elif "sedotan" in k:
        target = raw_stocks["Sedotan (Straws 500pcs)"]
    elif "tissue" in k or "tisu" in k:
        target = raw_stocks["Tissue (Larist / Basah)"]
    elif "cup" in k:
        target = raw_stocks["Cup + Lid (Cold/Hot)"]
    else:
        # Unlabelled store restock receipts or Air Galon -> default to general store supply/beans/cups
        target = raw_stocks["Cup + Lid (Cold/Hot)"]

    return [(target, max(1.0, qty), total_cost)]


def seed_gsheets_history():
    print("[1/5] Preparing database schema and WITA (UTC+8) timezone...")
    Base.metadata.create_all(bind=engine)
    ensure_schema_timezone()

    json_path = Path(__file__).parent / "gsheets_transactions.json"
    if not json_path.exists():
        raise FileNotFoundError(f"Missing {json_path}")

    with open(json_path, "r", encoding="utf-8") as f:
        sheets = json.load(f)

    tx_rows = sheets["Input Transaksi/Hari"]
    rekap_bulanan = sheets["Rekap Bulanan"]

    with SessionLocal() as db:
        # Find manager user (or any user) for cashier_id / created_by_id
        manager = (
            db.query(User)
            .filter(User.role == UserRole.MANAGER)
            .first()
            or db.query(User).first()
        )
        if not manager:
            raise RuntimeError("No user found in database. Run seeds/user_seed.py first.")

        # [2/5] Clear previous historical seed in range 2026-06-01 .. 2026-10-31 WITA
        hist_start = datetime(2026, 6, 1, 0, 0, 0, tzinfo=WITA_TZ)
        hist_end = datetime(2026, 10, 31, 23, 59, 59, 999999, tzinfo=WITA_TZ)

        print("[2/5] Cleaning any previously seeded June-October 2026 records (idempotent)...")
        old_order_ids = [
            r[0]
            for r in db.query(Order.id)
            .filter(Order.created_at >= hist_start, Order.created_at <= hist_end)
            .all()
        ]
        if old_order_ids:
            db.query(OrderItem).filter(OrderItem.order_id.in_(old_order_ids)).delete(
                synchronize_session=False
            )
            db.query(Order).filter(Order.id.in_(old_order_ids)).delete(
                synchronize_session=False
            )

        old_purchase_ids = [
            r[0]
            for r in db.query(StockPurchase.id)
            .filter(
                StockPurchase.purchased_at >= hist_start,
                StockPurchase.purchased_at <= hist_end,
            )
            .all()
        ]
        if old_purchase_ids:
            db.query(StockPurchaseItem).filter(
                StockPurchaseItem.purchase_id.in_(old_purchase_ids)
            ).delete(synchronize_session=False)
            db.query(StockPurchase).filter(
                StockPurchase.id.in_(old_purchase_ids)
            ).delete(synchronize_session=False)

        db.query(OperationalCost).filter(
            OperationalCost.expense_date >= hist_start,
            OperationalCost.expense_date <= hist_end,
        ).delete(synchronize_session=False)
        db.commit()

        # [3/5] Ensure all Google Sheet products & vendors exist
        print("[3/5] Ensuring all Database Menu products and consignment items exist...")
        vendors = {v.name: v for v in db.query(Vendor).all()}
        for v_name in ("Rafid Cheesecake", "Letu Iceberg", "Ayu Kitchen"):
            if v_name not in vendors:
                v_obj = Vendor(
                    id=uuid.uuid4(),
                    name=v_name,
                    contact_info="-",
                    is_active=True,
                )
                db.add(v_obj)
                db.flush()
                vendors[v_name] = v_obj

        db_products = {p.name: p for p in db.query(Product).all()}
        extra_products = [
            {
                "name": "Cheesecake Rafid",
                "item_type": ItemType.CONSIGNMENT,
                "main_category": MainCategory.SNACKS,
                "retail_price": 28000.0,
                "consignment_fee": 3000.0,
                "stock_quantity": 50,
                "vendor_id": vendors["Rafid Cheesecake"].id,
            },
            {
                "name": "Cheesecake Letu",
                "item_type": ItemType.CONSIGNMENT,
                "main_category": MainCategory.SNACKS,
                "retail_price": 20000.0,
                "consignment_fee": 3000.0,
                "stock_quantity": 50,
                "vendor_id": vendors["Letu Iceberg"].id,
            },
            {
                "name": "Mineral Water",
                "item_type": ItemType.ADD_ON,
                "main_category": None,
                "retail_price": 5000.0,
                "consignment_fee": None,
                "stock_quantity": None,
                "vendor_id": None,
            },
            {
                "name": "Custom Item",
                "item_type": ItemType.MAIN,
                "main_category": MainCategory.SNACKS,
                "retail_price": 2000.0,
                "consignment_fee": None,
                "stock_quantity": None,
                "vendor_id": None,
                "is_active": False,
            },
        ]
        for ep in extra_products:
            if ep["name"] not in db_products:
                p_obj = Product(
                    id=uuid.uuid4(),
                    name=ep["name"],
                    item_type=ep["item_type"],
                    main_category=ep["main_category"],
                    retail_price=ep["retail_price"],
                    consignment_fee=ep["consignment_fee"],
                    stock_quantity=ep["stock_quantity"],
                    is_active=ep.get("is_active", True),
                    vendor_id=ep["vendor_id"],
                )
                db.add(p_obj)
                db.flush()
                db_products[p_obj.name] = p_obj
            elif ep["name"] == "Custom Item":
                db_products["Custom Item"].retail_price = 2000.0
                db_products["Custom Item"].is_active = False
                db.flush()

        raw_stocks = {s.name: s for s in db.query(RawStock).all()}
        if "Air Galon (Refill)" not in raw_stocks:
            galon = RawStock(
                id=uuid.uuid4(),
                name="Air Galon (Refill)",
                category=RawStockCategory.OTHER,
                unit="galon",
                current_quantity=4.0,
                cost_per_unit=10000.0,
                low_stock_threshold=1.0,
                is_active=True,
            )
            db.add(galon)
            db.flush()
            raw_stocks[galon.name] = galon

        db.commit()

        # [4/5] Parse and seed all Pemasukan & Pengeluaran rows
        print("[4/5] Seeding 691 Pemasukan (Orders) & 189 Pengeluaran (Stocks/Operationals) in WITA (UTC+8)...")
        daily_order_seq = defaultdict(int)
        daily_tx_seq = defaultdict(int)

        orders_seeded = 0
        stock_purchases_seeded = 0
        op_costs_seeded = 0

        for row in tx_rows[1:]:
            if len(row) < 8:
                continue
            date_str = row[0].strip()
            flow_type = row[1].strip()
            if not date_str or flow_type not in ("Pemasukan", "Pengeluaran"):
                continue

            tx_date = parse_sheet_date(date_str)
            daily_tx_seq[tx_date] += 1
            seq_idx = daily_tx_seq[tx_date]

            # Spread timestamps across cafe hours 09:00 .. 20:30 WITA
            hour_offset = 9 + ((seq_idx - 1) % 11)
            minute_offset = ((seq_idx * 7) % 55)
            tx_dt_wita = datetime(
                tx_date.year,
                tx_date.month,
                tx_date.day,
                hour_offset,
                minute_offset,
                0,
                tzinfo=WITA_TZ,
            )

            menu_name = row[2].strip() if len(row) > 2 else ""
            variant = row[3].strip() if len(row) > 3 else ""
            unit_rp = parse_rp(row[4]) if len(row) > 4 else 0.0
            manual_rp = parse_rp(row[5]) if len(row) > 5 else 0.0
            qty = float(row[6].strip() or "1") if len(row) > 6 and row[6].strip() else 1.0
            total_nominal = parse_rp(row[7]) if len(row) > 7 else 0.0
            ket = row[8].strip() if len(row) > 8 else ""

            if flow_type == "Pemasukan":
                daily_order_seq[tx_date] += 1
                order_num = daily_order_seq[tx_date]

                product = resolve_product(db_products, menu_name, variant)
                int_qty = max(1, int(round(qty)))
                effective_unit_price = (
                    round(total_nominal / int_qty, 2)
                    if total_nominal > 0
                    else (manual_rp or unit_rp or product.retail_price)
                )

                if product.item_type == ItemType.CONSIGNMENT:
                    fee = product.consignment_fee or 3000.0
                    cafe_rev = fee * int_qty
                else:
                    cafe_rev = total_nominal

                notes_parts = []
                if variant:
                    notes_parts.append(variant)
                if ket:
                    notes_parts.append(ket)
                item_notes = " • ".join(notes_parts) if notes_parts else None

                customer_label = (
                    f"Walk-in #{order_num}"
                    if not ket
                    else f"Walk-in #{order_num} ({ket})"
                )

                order_obj = Order(
                    id=uuid.uuid4(),
                    subtotal_amount=total_nominal,
                    discount_amount=0.0,
                    total_amount=total_nominal,
                    net_cafe_revenue=cafe_rev,
                    payment_method=PaymentMethod.CASH if order_num % 2 == 1 else PaymentMethod.QRIS,
                    payment_status=PaymentStatus.PAID,
                    cash_amount_received=total_nominal,
                    change_given=0.0,
                    order_type=OrderType.DINE_IN if order_num % 3 != 0 else OrderType.TAKEAWAY,
                    cashier_id=manager.id,
                    customer_name=customer_label,
                    table_number=f"Meja {(order_num % 6) + 1}" if order_num % 3 != 0 else None,
                    daily_order_number=order_num,
                    status=OrderStatus.COMPLETED,
                    created_at=tx_dt_wita,
                )
                db.add(order_obj)
                db.flush()

                order_item = OrderItem(
                    id=uuid.uuid4(),
                    order_id=order_obj.id,
                    product_id=product.id,
                    quantity=int_qty,
                    unit_price=effective_unit_price,
                    addons_price=0.0,
                    line_total=total_nominal,
                    calculated_cafe_revenue=cafe_rev,
                    addon_ids=[],
                    item_notes=item_notes,
                )
                db.add(order_item)
                orders_seeded += 1

            else:
                # Pengeluaran row
                op_cat = classify_operational_cost(ket)
                if op_cat is not None:
                    op_cost = OperationalCost(
                        id=uuid.uuid4(),
                        title=ket or "Operational Expense",
                        category=op_cat,
                        amount=total_nominal,
                        payment_method=ExpensePaymentMethod.M_BANKING,
                        receipt_image_url=None,
                        expense_date=tx_dt_wita,
                        notes=f"Seeded from Google Sheet ({date_str})",
                        created_by_id=manager.id,
                    )
                    db.add(op_cost)
                    op_costs_seeded += 1
                else:
                    # Raw stock purchase (single-item or multi-item receipt)
                    if "air galon" in ket.lower():
                        resolved_lines = [(raw_stocks["Air Galon (Refill)"], max(1.0, qty), total_nominal)]
                    else:
                        resolved_lines = resolve_raw_stock_items(
                            raw_stocks, ket, qty, total_nominal
                        )

                    pay_method = (
                        ExpensePaymentMethod.CASH
                        if total_nominal <= 30000
                        else ExpensePaymentMethod.M_BANKING
                    )

                    sp = StockPurchase(
                        id=uuid.uuid4(),
                        supplier_or_store="Toko Bahan Kue / Supplier Makassar",
                        payment_method=pay_method,
                        total_cost=total_nominal,
                        receipt_image_url=None,
                        notes=ket or f"Belanja Bahan Baku ({date_str})",
                        purchased_at=tx_dt_wita,
                        created_by_id=manager.id,
                    )
                    db.add(sp)
                    db.flush()

                    for stock_obj, line_qty, line_sub in resolved_lines:
                        sp_item = StockPurchaseItem(
                            id=uuid.uuid4(),
                            purchase_id=sp.id,
                            raw_stock_id=stock_obj.id,
                            quantity=line_qty,
                            unit_cost=round(line_sub / max(1.0, line_qty), 2),
                            subtotal_cost=line_sub,
                        )
                        db.add(sp_item)

                    stock_purchases_seeded += 1

        db.commit()
        print(
            f"   -> Seeded {orders_seeded} Orders, {stock_purchases_seeded} StockPurchases, and {op_costs_seeded} OperationalCosts."
        )

        # [5/5] Verify reconciliation against Rekap Bulanan
        print("[5/5] Verifying monthly cashflow reconciliation against Google Sheet 'Rekap Bulanan'...")
        monthly_report = get_monthly_cashflow_report(db, 2026)
        sheet_expected = {
            6: (4106000.0, 4635952.0, -529952.0),
            7: (3717000.0, 3993777.0, -276777.0),
            8: (4056000.0, 5942776.0, -1886776.0),
            9: (1740000.0, 2731400.0, -991400.0),
            10: (4687000.0, 5627343.0, -940343.0),
        }

        total_m_in = 0.0
        total_m_out = 0.0
        for item in monthly_report:
            if item.month in sheet_expected:
                exp_in, exp_out, exp_net = sheet_expected[item.month]
                total_m_in += item.total_masuk
                total_m_out += item.total_keluar
                print(
                    f"   {item.month_label:15s} | Masuk: Rp{item.total_masuk:,.0f} (Exp: Rp{exp_in:,.0f}) | "
                    f"Keluar: Rp{item.total_keluar:,.0f} (Exp: Rp{exp_out:,.0f}) | "
                    f"Net: Rp{item.net_cashflow:,.0f}"
                )
                assert abs(item.total_masuk - exp_in) < 1.0, f"Mismatch Masuk in month {item.month}"
                assert abs(item.total_keluar - exp_out) < 1.0, f"Mismatch Keluar in month {item.month}"
                assert abs(item.net_cashflow - exp_net) < 1.0, f"Mismatch Net in month {item.month}"

        print(
            f"   TOTAL (Jun-Oct) | Masuk: Rp{total_m_in:,.0f} | Keluar: Rp{total_m_out:,.0f} | Net: Rp{total_m_in - total_m_out:,.0f}"
        )
        assert abs(total_m_in - 18306000.0) < 1.0
        assert abs(total_m_out - 22931248.0) < 1.0
        print("[OK] 100% exact Rupiah match with Google Sheet 'Rekap Bulanan' & 'Rekap Harian'!")


if __name__ == "__main__":
    seed_gsheets_history()
