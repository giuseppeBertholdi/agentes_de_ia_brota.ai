from pydantic import BaseModel
from typing import Optional


class EmbeddedSignupCallback(BaseModel):
    code: str
    waba_id: str
    phone_number_id: str


class TestNumberConnect(BaseModel):
    waba_id: str
    phone_number_id: str


class SendMessageRequest(BaseModel):
    conversation_id: str
    content: str


class TakeOverRequest(BaseModel):
    conversation_id: str


class PriceQuestionsRequest(BaseModel):
    name: str


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
    max_discount_pct: Optional[float] = None
    escalation_keywords: Optional[str] = None


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    voice_tone: Optional[str] = None
    business_desc: Optional[str] = None
    business_hours: Optional[str] = None
    payment_instructions: Optional[str] = None
    followup_template_name: Optional[str] = None
    followup_template_language: Optional[str] = None


class AiModeUpdate(BaseModel):
    enabled: bool


class FollowUpStatusUpdate(BaseModel):
    status: str


class DepartmentCreate(BaseModel):
    name: str
    description: Optional[str] = None


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class TeamMemberUpdate(BaseModel):
    department_id: Optional[str] = None
