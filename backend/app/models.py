from sqlalchemy import JSON, Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


class User(Base):
    __tablename__ = "users"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    phone: Mapped[str] = mapped_column(String, unique=True)
    name: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    language: Mapped[str] = mapped_column(String)


class Parcelle(Base):
    __tablename__ = "parcelles"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String)
    area_ha: Mapped[float] = mapped_column(Float)
    geometry: Mapped[dict] = mapped_column(JSON)
    location_consent: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
    water_source: Mapped[str] = mapped_column(String)
    well_depth_m: Mapped[float | None] = mapped_column(Float, nullable=True)
    pump_flow_m3_h: Mapped[float | None] = mapped_column(Float, nullable=True)
    energy_type: Mapped[str] = mapped_column(String)
    current_crop_id: Mapped[str | None] = mapped_column(String, nullable=True)


class Analyse(Base):
    __tablename__ = "analyses"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcelles.id"))
    soil_texture: Mapped[str] = mapped_column(String)
    ph: Mapped[float] = mapped_column(Float)
    organic_matter_percent: Mapped[float] = mapped_column(Float)
    rain_mm: Mapped[float] = mapped_column(Float)
    temperature_c: Mapped[float] = mapped_column(Float)
    et0_mm: Mapped[float] = mapped_column(Float)
    available_water_m3: Mapped[float] = mapped_column(Float)
    pumping_energy_kwh_m3: Mapped[float] = mapped_column(Float)


class AnalyseDetail(Base):
    __tablename__ = "analyse_details"
    analysis_id: Mapped[str] = mapped_column(
        String, ForeignKey("analyses.id"), primary_key=True
    )
    solar_irradiance_kwh_m2_day: Mapped[float] = mapped_column(Float)
    sources: Mapped[dict] = mapped_column(JSON)
    ndvi_monthly: Mapped[list[dict]] = mapped_column(JSON)
    assumptions: Mapped[dict] = mapped_column(JSON)


class Culture(Base):
    __tablename__ = "cultures"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    name: Mapped[dict] = mapped_column(JSON)
    water_need_mm: Mapped[float] = mapped_column(Float)
    yield_t_ha: Mapped[float] = mapped_column(Float)
    price_tnd_t: Mapped[float] = mapped_column(Float)
    duration_days: Mapped[int] = mapped_column()
    water_demand: Mapped[str] = mapped_column(String)


class CultureDetail(Base):
    __tablename__ = "culture_details"
    culture_id: Mapped[str] = mapped_column(
        String, ForeignKey("cultures.id"), primary_key=True
    )
    kc_by_stage: Mapped[dict] = mapped_column(JSON)
    yield_range_t_ha: Mapped[dict] = mapped_column(JSON)
    price_range_tnd_t: Mapped[dict] = mapped_column(JSON)
    price_source: Mapped[str] = mapped_column(String)
    costs_tnd_ha: Mapped[dict] = mapped_column(JSON)
    compatible_soils: Mapped[list[str]] = mapped_column(JSON)
    salt_tolerance_dS_m: Mapped[float] = mapped_column(Float)
    heat_tolerance_c: Mapped[float] = mapped_column(Float)
    first_production_days: Mapped[int] = mapped_column()
    kc_source: Mapped[str] = mapped_column(String)


class Plan(Base):
    __tablename__ = "plans"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcelles.id"))
    data: Mapped[dict] = mapped_column(JSON)


class Label(Base):
    __tablename__ = "labels"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    farm_id: Mapped[str] = mapped_column(String)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcelles.id"))
    grade: Mapped[str] = mapped_column(String)
    qr_code: Mapped[str] = mapped_column(String, unique=True)
    status: Mapped[str] = mapped_column(String)


class Verification(Base):
    __tablename__ = "verifications"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcelles.id"))
    kind: Mapped[str] = mapped_column(String)
    status: Mapped[str] = mapped_column(String)
    evidence: Mapped[dict] = mapped_column(JSON)


class SuiviSatellite(Base):
    __tablename__ = "suivi_satellite"
    parcel_id: Mapped[str] = mapped_column(
        String, ForeignKey("parcelles.id"), primary_key=True
    )
    zones: Mapped[list] = mapped_column(JSON)
    processed_image_ids: Mapped[list] = mapped_column(JSON)
    last_image_id: Mapped[str | None] = mapped_column(String, nullable=True)
    last_image_at: Mapped[str | None] = mapped_column(String, nullable=True)
    updated_at: Mapped[str] = mapped_column(String)


class Produit(Base):
    __tablename__ = "produits"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    farm_id: Mapped[str] = mapped_column(String)
    label_id: Mapped[str] = mapped_column(String, ForeignKey("labels.id"))
    name: Mapped[str] = mapped_column(String)
    category: Mapped[str] = mapped_column(String)
    quantity_kg: Mapped[float] = mapped_column(Float)
    price_tnd_kg: Mapped[float] = mapped_column(Float)
    photo_url: Mapped[str | None] = mapped_column(String, nullable=True)


class Commande(Base):
    __tablename__ = "commandes"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    buyer_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    product_id: Mapped[str] = mapped_column(String, ForeignKey("produits.id"))
    quantity_kg: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String)
    payment_method: Mapped[str | None] = mapped_column(String, nullable=True)
    total_tnd: Mapped[float | None] = mapped_column(Float, nullable=True)
    payment_status: Mapped[str | None] = mapped_column(String, nullable=True)
    counteroffer_price_tnd_kg: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )


class Alerte(Base):
    __tablename__ = "alertes"
    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcel_id: Mapped[str] = mapped_column(String, ForeignKey("parcelles.id"))
    type: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    severity: Mapped[str] = mapped_column(String)
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    read: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
