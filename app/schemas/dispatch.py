"""Pydantic schemas for WhatsApp dispatch and notifications."""

from typing import Optional
from pydantic import BaseModel, Field


class WhatsAppDispatchRequest(BaseModel):
    """Payload to trigger an automated WhatsApp directive message."""

    recipient_phone: str = Field(
        ...,
        description="Recipient mobile number in international format or Egyptian format (e.g. +201012345678 or 01012345678)",
        examples=["+201012345678", "01098765432"],
    )
    message: str = Field(
        ...,
        min_length=10,
        description="Directive body message text formatted for WhatsApp markdown.",
    )
    site_id: Optional[str] = Field(None, description="Identifier of the solar site")
    site_name: Optional[str] = Field(None, description="Name of the solar plant")


class WhatsAppDispatchResponse(BaseModel):
    """Response returned upon dispatching an automated WhatsApp message."""

    success: bool
    status: str = Field(..., description="'delivered', 'simulated', or 'failed'")
    provider: str = Field(..., description="'twilio' or 'heliopulse-mock-gateway'")
    message_id: str
    recipient_phone: str
    sent_at: str
    delivered_text: str
    notice: Optional[str] = None
