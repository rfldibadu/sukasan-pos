import uuid
from fastapi import APIRouter, Response
from app.services.receipts_service import generate_order_pdf

router = APIRouter(prefix="/receipts", tags=["Receipts"])

@router.get("/{order_id}/pdf")
def get_receipt_pdf(order_id: uuid.UUID):
    pdf_buffer = generate_order_pdf(order_id)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"inline; filename=receipt_{order_id}.pdf"}
    )