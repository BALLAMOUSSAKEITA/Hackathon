from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    phone: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(32))
    language: Mapped[str] = mapped_column(String(16), default="fr")
    parcelles: Mapped[list["Parcelle"]] = relationship(back_populates="owner")


class Parcelle(Base):
    __tablename__ = "parcelles"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    owner_id: Mapped[str] = mapped_column(ForeignKey("utilisateurs.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    geometry: Mapped[dict] = mapped_column(JSON)
    surface_hectares: Mapped[float] = mapped_column(Float)
    water_source: Mapped[str] = mapped_column(String(32))
    well_depth_m: Mapped[int] = mapped_column(Integer)
    pump_flow_m3_h: Mapped[float] = mapped_column(Float)
    current_crop: Mapped[str] = mapped_column(String(64))
    energy: Mapped[str] = mapped_column(String(32))

    owner: Mapped["Utilisateur"] = relationship(back_populates="parcelles")


class Analyse(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    parcelle_id: Mapped[str] = mapped_column(ForeignKey("parcelles.id"), index=True)
    data: Mapped[dict] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class Culture(Base):
    __tablename__ = "cultures"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    names: Mapped[dict] = mapped_column(JSON)
    data: Mapped[dict] = mapped_column(JSON)


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    parcelle_id: Mapped[str] = mapped_column(ForeignKey("parcelles.id"), index=True)
    data: Mapped[dict] = mapped_column(JSON)
    adopted: Mapped[bool] = mapped_column(Boolean, default=False)


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    qr: Mapped[str] = mapped_column(String(64), unique=True)
    letter: Mapped[str] = mapped_column(String(1))
    status: Mapped[str] = mapped_column(String(32), default="actif")


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    label_id: Mapped[str] = mapped_column(ForeignKey("labels.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    result: Mapped[str] = mapped_column(String(32))
    data: Mapped[dict] = mapped_column(JSON)


class Produit(Base):
    __tablename__ = "produits"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    parcelle_id: Mapped[str] = mapped_column(ForeignKey("parcelles.id"), index=True)
    name: Mapped[str] = mapped_column(String(128))
    category: Mapped[str] = mapped_column(String(64))
    label: Mapped[str] = mapped_column(String(1))
    qr: Mapped[str] = mapped_column(String(64), unique=True)
    price_tnd: Mapped[float] = mapped_column(Float)
    stock_kg: Mapped[float] = mapped_column(Float)


class Commande(Base):
    __tablename__ = "commandes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    buyer_id: Mapped[str] = mapped_column(ForeignKey("utilisateurs.id"), index=True)
    product_id: Mapped[str] = mapped_column(ForeignKey("produits.id"), index=True)
    quantity_kg: Mapped[float] = mapped_column(Float)
    status: Mapped[str] = mapped_column(String(32), default="en_attente")
    data: Mapped[dict] = mapped_column(JSON)


class Alerte(Base):
    __tablename__ = "alertes"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    parcelle_id: Mapped[str] = mapped_column(ForeignKey("parcelles.id"), index=True)
    kind: Mapped[str] = mapped_column(String(32))
    message: Mapped[str] = mapped_column(Text)
    read: Mapped[bool] = mapped_column(Boolean, default=False)
