from pydantic import BaseModel
from typing import Optional


class EmbeddedSignupCallback(BaseModel):
    code: str
    waba_id: str
    phone_number_id: str


class SendMessageRequest(BaseModel):
    conversation_id: str
    content: str


class TakeOverRequest(BaseModel):
    conversation_id: str


class PriceItem(BaseModel):
    id: Optional[str] = None
    name: str
    description: Optional[str] = None
    price: float
    unit: str = "un"
    active: bool = True


class AgentConfigUpdate(BaseModel):
    enabled: bool
    system_prompt: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    voice_tone: Optional[str] = None
    business_desc: Optional[str] = None


class FollowUpStatusUpdate(BaseModel):
    status: str
