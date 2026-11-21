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
