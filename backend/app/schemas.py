from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserCreate(ORMModel):
    id: str
    phone: str
    name: str
    role: Literal["farmer", "buyer", "professional"]
    language: Literal["fr", "ar", "darija"]


class UserOut(UserCreate):
    pass


class OTPRequest(BaseModel):
    phone: str = Field(min_length=8, max_length=20, pattern=r"^\+?[0-9]{8,15}$")


class OTPResponse(BaseModel):
    phone: str
    message: str
    demo_code: str


class OTPVerify(BaseModel):
    phone: str = Field(min_length=8, max_length=20, pattern=r"^\+?[0-9]{8,15}$")
    code: str = Field(pattern=r"^[0-9]{6}$")
    name: str = Field(min_length=1, max_length=100)
    role: Literal["farmer", "buyer", "professional"]
    language: Literal["fr", "ar", "darija"]


class ParcelleCreate(ORMModel):
    id: str
    owner_id: str
    name: str
    area_ha: float = Field(gt=0)
    geometry: dict
    water_source: Literal["well", "gda", "dam", "network"]
    well_depth_m: float | None = Field(default=None, ge=0)
    pump_flow_m3_h: float | None = Field(default=None, ge=0)
    energy_type: Literal["steg", "diesel", "solar"]
    current_crop_id: str | None = None


class ParcelleOut(ParcelleCreate):
    pass
