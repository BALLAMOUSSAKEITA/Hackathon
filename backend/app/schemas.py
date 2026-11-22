from typing import Literal
from pydantic import BaseModel, ConfigDict, Field, model_validator


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


class AnalyseRequest(BaseModel):
    pump_hours_per_day: float | None = Field(default=None, ge=0, le=24)
    season_days: int | None = Field(default=None, gt=0, le=366)
    efficiency: float | None = Field(default=None, gt=0, le=1)


class SimulationAllocation(BaseModel):
    crop_id: str = Field(min_length=1)
    area_ha: float = Field(ge=0, allow_inf_nan=False)


class SimulationRequest(BaseModel):
    allocations: list[SimulationAllocation] = Field(min_length=1)


class AssistantRequest(BaseModel):
    question_text: str | None = Field(default=None, min_length=1, max_length=500)
    audio_transcript: str | None = Field(default=None, min_length=1, max_length=500)
    language: Literal["darija", "ar", "fr"] = "darija"

    @model_validator(mode="after")
    def require_one_question_source(self):
        has_text = bool(self.question_text and self.question_text.strip())
        has_audio_transcript = bool(
            self.audio_transcript and self.audio_transcript.strip()
        )
        if has_text == has_audio_transcript:
            raise ValueError("Provide either question_text or audio_transcript")
        return self


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
