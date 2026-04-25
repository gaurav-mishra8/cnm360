from pydantic import BaseModel, EmailStr
from datetime import datetime


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    org_name: str
    org_gst_number: str | None = None
    org_pan_number: str | None = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class OrganisationResponse(BaseModel):
    id: str
    name: str
    gst_number: str | None
    pan_number: str | None

    model_config = {"from_attributes": True}


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    org_id: str
    organisation: OrganisationResponse
    created_at: datetime

    model_config = {"from_attributes": True}
