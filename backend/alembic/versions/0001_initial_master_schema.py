"""Initial master schema (11 core tables)

Revision ID: 0001_initial_master_schema
Revises: None
Create Date: 2026-11-18 00:00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_master_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. users
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('MANAGER', 'CASHIER');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
    )
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("full_name", sa.String(), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column("profile_picture_url", sa.String(), nullable=True),
        sa.Column(
            "role",
            postgresql.ENUM("MANAGER", "CASHIER", name="userrole", create_type=False),
            nullable=False,
        ),
        sa.Column("admin_task", sa.String(), nullable=True),
        sa.Column("salary_day", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_users_id", "users", ["id"], unique=False, if_not_exists=True)
    op.create_index("ix_users_username", "users", ["username"], unique=True, if_not_exists=True)

    # 2. vendors
    op.create_table(
        "vendors",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("contact_info", sa.String(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        if_not_exists=True,
    )
    op.create_index("ix_vendors_id", "vendors", ["id"], unique=False, if_not_exists=True)
    op.create_index("ix_vendors_name", "vendors", ["name"], unique=False, if_not_exists=True)

    # 3. products
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE itemtype AS ENUM ('MAIN', 'CONSIGNMENT', 'ADD_ON');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
            CREATE TYPE maincategory AS ENUM ('COFFEE', 'NON_COFFEE', 'SNACKS', 'FOODS', 'CUSTOM');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
        """
    )
    op.create_table(
        "products",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("retail_price", sa.Float(), nullable=False),
        sa.Column(
            "item_type",
            postgresql.ENUM("MAIN", "CONSIGNMENT", "ADD_ON", name="itemtype", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "main_category",
            postgresql.ENUM(
                "COFFEE", "NON_COFFEE", "SNACKS", "FOODS", "CUSTOM", name="maincategory", create_type=False
            ),
            nullable=True,
        ),
        sa.Column("consignment_fee", sa.Float(), nullable=True),
        sa.Column("stock_quantity", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("vendor_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("vendors.id"), nullable=True),
        if_not_exists=True,
    )
    op.create_index("ix_products_id", "products", ["id"], unique=False, if_not_exists=True)
    op.create_index("ix_products_name", "products", ["name"], unique=False, if_not_exists=True)

    # 4. raw_stocks
    op.create_table(
        "raw_stocks",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("unit", sa.String(), nullable=False),
        sa.Column("current_quantity", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("cost_per_unit", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("low_stock_threshold", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_raw_stocks_id", "raw_stocks", ["id"], unique=False, if_not_exists=True)
    op.create_index("ix_raw_stocks_name", "raw_stocks", ["name"], unique=True, if_not_exists=True)

    # 5. stock_purchases
    op.create_table(
        "stock_purchases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("supplier_or_store", sa.String(), nullable=True),
        sa.Column("payment_method", sa.String(), nullable=False),
        sa.Column("total_cost", sa.Float(), nullable=False),
        sa.Column("receipt_image_url", sa.String(), nullable=True),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("reimbursement_status", sa.String(), nullable=False, server_default="not_applicable"),
        sa.Column("reimbursed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("purchased_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_stock_purchases_id", "stock_purchases", ["id"], unique=False, if_not_exists=True)
    op.create_index(
        "ix_stock_purchases_purchased_at", "stock_purchases", ["purchased_at"], unique=False, if_not_exists=True
    )

    # 6. stock_purchase_items
    op.create_table(
        "stock_purchase_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "purchase_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("stock_purchases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("raw_stock_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("raw_stocks.id"), nullable=False),
        sa.Column("quantity", sa.Float(), nullable=False),
        sa.Column("unit_cost", sa.Float(), nullable=False),
        sa.Column("subtotal_cost", sa.Float(), nullable=False),
        if_not_exists=True,
    )
    op.create_index(
        "ix_stock_purchase_items_id", "stock_purchase_items", ["id"], unique=False, if_not_exists=True
    )

    # 7. operational_costs
    op.create_table(
        "operational_costs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("category", sa.String(), nullable=False),
        sa.Column("amount", sa.Float(), nullable=False),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("receipt_image_url", sa.String(), nullable=True),
        sa.Column("expense_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("notes", sa.String(), nullable=True),
        sa.Column("reimbursement_status", sa.String(), nullable=False, server_default="not_applicable"),
        sa.Column("reimbursed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=True),
        if_not_exists=True,
    )
    op.create_index("ix_operational_costs_id", "operational_costs", ["id"], unique=False, if_not_exists=True)
    op.create_index(
        "ix_operational_costs_title", "operational_costs", ["title"], unique=False, if_not_exists=True
    )
    op.create_index(
        "ix_operational_costs_expense_date",
        "operational_costs",
        ["expense_date"],
        unique=False,
        if_not_exists=True,
    )

    # 8. orders (17 master columns)
    op.create_table(
        "orders",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("subtotal_amount", sa.Float(), nullable=False),
        sa.Column("discount_amount", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("total_amount", sa.Float(), nullable=False),
        sa.Column("net_cafe_revenue", sa.Float(), nullable=False),
        sa.Column("payment_method", sa.String(), nullable=True),
        sa.Column("payment_status", sa.String(), nullable=False, server_default="unpaid"),
        sa.Column("cash_amount_received", sa.Float(), nullable=True),
        sa.Column("change_given", sa.Float(), nullable=True),
        sa.Column("order_type", sa.String(), nullable=False, server_default="dine_in"),
        sa.Column("cashier_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("customer_name", sa.String(), nullable=True),
        sa.Column("table_number", sa.String(), nullable=True),
        sa.Column("daily_order_number", sa.Integer(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="queued"),
        sa.Column("void_reason", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_orders_id", "orders", ["id"], unique=False, if_not_exists=True)
    op.create_index("ix_orders_created_at", "orders", ["created_at"], unique=False, if_not_exists=True)

    # 9. order_items
    op.create_table(
        "order_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("order_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("orders.id"), nullable=False),
        sa.Column("product_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("products.id"), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_price", sa.Float(), nullable=False),
        sa.Column("addons_price", sa.Float(), nullable=False, server_default="0.0"),
        sa.Column("line_total", sa.Float(), nullable=False),
        sa.Column("calculated_cafe_revenue", sa.Float(), nullable=False),
        sa.Column("addon_ids", sa.JSON(), nullable=False),
        sa.Column("item_notes", sa.String(), nullable=True),
        if_not_exists=True,
    )
    op.create_index("ix_order_items_id", "order_items", ["id"], unique=False, if_not_exists=True)

    # 10. push_subscriptions
    op.create_table(
        "push_subscriptions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("endpoint", sa.Text(), nullable=False, unique=True),
        sa.Column("p256dh", sa.Text(), nullable=False),
        sa.Column("auth", sa.Text(), nullable=False),
        sa.Column("device_name", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_push_subscriptions_id", "push_subscriptions", ["id"], unique=False, if_not_exists=True)
    op.create_index(
        "ix_push_subscriptions_user_id", "push_subscriptions", ["user_id"], unique=False, if_not_exists=True
    )
    op.create_index(
        "ix_push_subscriptions_endpoint", "push_subscriptions", ["endpoint"], unique=True, if_not_exists=True
    )

    # 11. app_settings
    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(), primary_key=True, nullable=False),
        sa.Column("value", sa.String(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        if_not_exists=True,
    )
    op.create_index("ix_app_settings_key", "app_settings", ["key"], unique=False, if_not_exists=True)


def downgrade() -> None:
    op.drop_table("app_settings", if_exists=True)
    op.drop_table("push_subscriptions", if_exists=True)
    op.drop_table("order_items", if_exists=True)
    op.drop_table("orders", if_exists=True)
    op.drop_table("operational_costs", if_exists=True)
    op.drop_table("stock_purchase_items", if_exists=True)
    op.drop_table("stock_purchases", if_exists=True)
    op.drop_table("raw_stocks", if_exists=True)
    op.drop_table("products", if_exists=True)
    op.drop_table("vendors", if_exists=True)
    op.drop_table("users", if_exists=True)
