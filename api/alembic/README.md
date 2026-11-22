# PostgreSQL/PostGIS

L'API utilise SQLite pour la démonstration locale. En production, définir
`DATABASE_URL=postgresql+psycopg://...` puis exécuter :

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
ALTER TABLE parcelles ADD COLUMN IF NOT EXISTS geom geometry(Polygon, 4326);
```

La géométrie JSON reste présente dans le modèle partagé Sprint 1; `geom`
est ajouté comme colonne PostGIS sans modifier le contrat de l'API.
