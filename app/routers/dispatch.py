"""API router for automated operations dispatching (WhatsApp, etc.)."""

from fastapi import APIRouter, HTTPException, status
from app.schemas.dispatch import WhatsAppDispatchRequest, WhatsAppDispatchResponse
from app.services.whatsapp_service import whatsapp_service

router = APIRouter(tags=["Operations Dispatch"])


@router.post(
    "/dispatch/whatsapp",
    response_model=WhatsAppDispatchResponse,
    status_code=status.HTTP_200_OK,
    summary="Dispatch Automated WhatsApp Directive",
    description=(
        "Dispatches an automated, formatted WhatsApp cleaning directive to an O&M engineer or plant manager. "
        "Operates via Twilio API when credentials are set, or uses HelioPulse resilient simulation mode."
    ),
)
def dispatch_whatsapp_directive(payload: WhatsAppDispatchRequest) -> WhatsAppDispatchResponse:
    """Dispatches a WhatsApp directive to the recipient."""
    try:
        response = whatsapp_service.dispatch(payload)
        return response
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to dispatch WhatsApp directive: {str(e)}",
        )
