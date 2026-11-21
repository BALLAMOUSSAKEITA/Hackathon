import json
import os
from pathlib import Path

from sqlalchemy import create_engine, text
from sqlalchemy.orm import DeclarativeBase, sessionmaker

API_DIR = Path(__file__).resolve().parents[1]
REPO_DIR = API_DIR.parent
FIXTURE_DIR = REPO_DIR / "fixtures"
DB_PATH = API_DIR / "ardi.db"

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")
CONNECT_ARGS = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(DATABASE_URL, connect_args=CONNECT_ARGS)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    pass


def load_fixture(sprint: str = "01") -> dict:
    path = FIXTURE_DIR / f"sprint-{sprint}.json"
    return json.loads(path.read_text(encoding="utf-8"))


def init_db() -> None:
    from app import models  # noqa: F401

    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(engine)
    _assurer_colonne_fiche()
    if engine.dialect.name == "postgresql":
        with engine.begin() as connection:
            connection.execute(
                text(
                    "ALTER TABLE parcelles "
                    "ADD COLUMN IF NOT EXISTS geometrie_postgis geometry(Polygon, 4326)"
                )
            )


def _assurer_colonne_fiche() -> None:
    from sqlalchemy import inspect

    insp = inspect(engine)
    if "cultures" not in insp.get_table_names():
        return
    colonnes = {colonne["name"] for colonne in insp.get_columns("cultures")}
    if "fiche" in colonnes:
        return
    with engine.begin() as connection:
        connection.execute(text("ALTER TABLE cultures ADD COLUMN fiche JSON"))


def postgis_version() -> str | None:
    if engine.dialect.name != "postgresql":
        return None
    with engine.connect() as connection:
        return connection.execute(text("SELECT PostGIS_Version()")).scalar()
