from sqlalchemy import JSON, Boolean, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    telephone: Mapped[str] = mapped_column(String, unique=True)
    nom: Mapped[str] = mapped_column(String)
    role: Mapped[str] = mapped_column(String)
    langue: Mapped[str] = mapped_column(String)


class Parcelle(Base):
    __tablename__ = "parcelles"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    proprietaire_id: Mapped[str] = mapped_column(ForeignKey("utilisateurs.id"))
    nom: Mapped[str] = mapped_column(String)
    geometrie: Mapped[dict] = mapped_column(JSON)
    surface_ha: Mapped[float] = mapped_column(Float)
    source_eau: Mapped[str] = mapped_column(String)
    profondeur_puits_m: Mapped[float] = mapped_column(Float)
    debit_m3_h: Mapped[float] = mapped_column(Float)
    energie: Mapped[str] = mapped_column(String)
    culture_actuelle: Mapped[dict] = mapped_column(JSON)


class Analyse(Base):
    __tablename__ = "analyses"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcelle_id: Mapped[str] = mapped_column(ForeignKey("parcelles.id"))
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    sol: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    climat: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    eau_disponible_m3: Mapped[float | None] = mapped_column(Float, nullable=True)
    kwh_m3: Mapped[float | None] = mapped_column(Float, nullable=True)
    ndvi: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Culture(Base):
    __tablename__ = "cultures"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    nom: Mapped[dict] = mapped_column(JSON)
    kc_par_stade: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    rendement: Mapped[float | None] = mapped_column(Float, nullable=True)
    prix: Mapped[float | None] = mapped_column(Float, nullable=True)
    sols_compatibles: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tolerances: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    delai_production: Mapped[str | None] = mapped_column(String, nullable=True)
    fiche: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class Plan(Base):
    __tablename__ = "plans"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcelle_id: Mapped[str] = mapped_column(ForeignKey("parcelles.id"))
    repartition: Mapped[list] = mapped_column(JSON)
    eau_prevue_m3: Mapped[float | None] = mapped_column(Float, nullable=True)
    energie_prevue_kwh: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenu_prevu_dt: Mapped[float | None] = mapped_column(Float, nullable=True)
    date_adoption: Mapped[str | None] = mapped_column(String, nullable=True)


class Label(Base):
    __tablename__ = "labels"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ferme_id: Mapped[str] = mapped_column(String)
    note: Mapped[str] = mapped_column(String)
    statut: Mapped[str] = mapped_column(String)
    date_verification: Mapped[str | None] = mapped_column(String, nullable=True)
    qr: Mapped[str] = mapped_column(String, unique=True)


class Verification(Base):
    __tablename__ = "verifications"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    label_id: Mapped[str] = mapped_column(ForeignKey("labels.id"))
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    image: Mapped[str | None] = mapped_column(String, nullable=True)
    resultat_culture: Mapped[str | None] = mapped_column(String, nullable=True)
    resultat_irrigation: Mapped[str | None] = mapped_column(String, nullable=True)


class Produit(Base):
    __tablename__ = "produits"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    ferme_id: Mapped[str] = mapped_column(String)
    nom: Mapped[dict] = mapped_column(JSON)
    prix: Mapped[float] = mapped_column(Float)
    unite: Mapped[str] = mapped_column(String)
    stock: Mapped[float] = mapped_column(Float)
    label_id: Mapped[str] = mapped_column(ForeignKey("labels.id"))


class Commande(Base):
    __tablename__ = "commandes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    acheteur_id: Mapped[str] = mapped_column(ForeignKey("utilisateurs.id"))
    lignes: Mapped[list] = mapped_column(JSON)
    montant: Mapped[float] = mapped_column(Float)
    statut: Mapped[str] = mapped_column(String)
    moyen_paiement: Mapped[str | None] = mapped_column(String, nullable=True)


class Alerte(Base):
    __tablename__ = "alertes"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    parcelle_id: Mapped[str] = mapped_column(ForeignKey("parcelles.id"))
    type: Mapped[str] = mapped_column(String)
    message: Mapped[str] = mapped_column(String)
    date: Mapped[str | None] = mapped_column(String, nullable=True)
    lue: Mapped[bool] = mapped_column(Boolean, default=False)
