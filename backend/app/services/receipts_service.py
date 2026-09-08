import io
import uuid
from jinja2 import Environment, FileSystemLoader
import base64
from pathlib import Path
from xhtml2pdf import pisa
from fastapi import HTTPException

from app.db.database import SessionLocal
from app.models.orders import Order
from app.models.products import Product
from app.models.users import User

env = Environment(loader=FileSystemLoader("app/templates"))
logo_path = Path("app/static/sukasan_logo.png") # Adjust relative to backend directory

logo_base64 = ""
if logo_path.exists():
    with open(logo_path, "rb") as image_file:
        logo_base64 = base64.b64encode(image_file.read()).decode('utf-8')

def generate_order_pdf(order_id: uuid.UUID) -> io.BytesIO:
    with SessionLocal() as session:
        order = session.query(Order).filter(Order.id == order_id).first()
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        cashier = session.query(User).filter(User.id == order.cashier_id).first()
        cashier_name = cashier.full_name if cashier else "Unknown"

        items_data = []
        for item in order.items:
            product = session.query(Product).filter(Product.id == item.product_id).first()
            
            # Resolve Add-ons names & prices
            addons_list = []
            if item.addon_ids:
                # If addon_ids is stored as list of UUIDs
                for addon_id in item.addon_ids:
                    addon_product = session.query(Product).filter(Product.id == addon_id).first()
                    if addon_product:
                        addons_list.append({
                            "name": addon_product.name,
                            "price": addon_product.retail_price
                        })

            items_data.append({
                "product_name": product.name if product else "Item",
                "quantity": item.quantity,
                "line_total": item.line_total,
                "item_notes": item.item_notes,
                "addons": addons_list
            })

        # Format Enum string cleanly (e.g. 'takeaway' -> 'Takeaway')
        order_type_str = order.order_type.value if hasattr(order.order_type, 'value') else str(order.order_type)

        template = env.get_template("receipt.html")
        html_content = template.render(
            order=order,
            order_type_display=order_type_str.replace('_', ' ').title(),
            cashier_name=cashier_name,
            items=items_data,
            logo_base64=logo_base64,
            str=str
        )

        pdf_stream = io.BytesIO()
        pisa_status = pisa.pisaDocument(
            src=io.StringIO(html_content),
            dest=pdf_stream
        )

        if getattr(pisa_status, "err", False):
            raise HTTPException(status_code=500, detail="Error generating PDF receipt")

        pdf_stream.seek(0)
        return pdf_stream