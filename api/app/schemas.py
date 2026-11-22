from typing import Any

from pydantic import BaseModel, Field


class GeoJSONPolygon(BaseModel):
    type: str = "Polygon"
    coordinates: list[list[list[float]]]


class ParcelleCreate(BaseModel):
    owner_id: str = Field(min_length=1)
    name: str = Field(min_length=1)
    geometry: GeoJSONPolygon
    water_source: str
    well_depth_m: int = Field(gt=0)
    pump_flow_m3_h: float = Field(gt=0)
    current_crop: str
    energy: str


class ParcelleResponse(BaseModel):
    id: str
    owner_id: str
    name: str
    geometry: dict[str, Any]
    surface_hectares: float
    water_source: str
    well_depth_m: int
    pump_flow_m3_h: float
    current_crop: str
    energy: str


class OTPRequest(BaseModel):
    phone: str = Field(min_length=8)
    role: str
    name: str = Field(min_length=1)
    language: str = Field(pattern="^(fr|ar|darija)$")


class OTPVerify(BaseModel):
    phone: str = Field(min_length=8)
    code: str = Field(min_length=6, max_length=6)


class SimulationRequest(BaseModel):
    allocations: dict[str, float]


class AssistantRequest(BaseModel):
    question: str = Field(min_length=1)
    audio: bool = False


class CommandeCreate(BaseModel):
    buyer_id: str = Field(min_length=1)
    product_id: str = Field(min_length=1)
    quantity: float = Field(gt=0)
    payment_method: str
