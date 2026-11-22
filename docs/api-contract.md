# Contrat d'API Ardi — Sprint 1

Base locale : `http://127.0.0.1:8000`

Toutes les données de démonstration sont chargées depuis `fixtures/sprint-01.json`.

## Contrat partagé

### `GET /health`

Réponse `200` :

```json
{
  "status": "ok",
  "service": "ardi-api",
  "sprint": 1
}
```

### `GET /demo`

Réponse `200` : contenu complet de `fixtures/sprint-01.json`.

### `GET /`

Réponse `200` :

```json
{
  "name": "Ardi API",
  "version": "1.0.0",
  "docs": "/docs"
}
```

### `POST /parcelles`

Corps attendu :

```json
{
  "owner_id": "usr-demo",
  "name": "Bloc nord",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      [[10.165, 36.806], [10.170, 36.806], [10.170, 36.802], [10.165, 36.802], [10.165, 36.806]]
    ]
  },
  "water_source": "puits",
  "well_depth_m": 60,
  "pump_flow_m3_h": 12,
  "current_crop": "tomate",
  "energy": "solaire"
}
```

Réponse `201` :

```json
{
  "id": "parcelle-demo",
  "owner_id": "usr-demo",
  "name": "Bloc nord",
  "surface_hectares": 3.7,
  "geometry": {
    "type": "Polygon",
    "coordinates": []
  },
  "water_source": "puits",
  "well_depth_m": 60,
  "pump_flow_m3_h": 12,
  "current_crop": "tomate",
  "energy": "solaire"
}
```

Un polygone ouvert ou sans au moins quatre points reçoit `422`. Un polygone dont
l'aire est nulle reçoit `422`.

## Entités attendues

`Utilisateur`, `Parcelle`, `Analyse`, `Culture`, `Plan`, `Label`,
`Vérification`, `Produit`, `Commande` et `Alerte`.

## Routes prévues par les sprints suivants

Les routes ci-dessous sont documentées dans l'OpenAPI dès que leur modèle est
activé dans un sprint ultérieur :

- `POST /auth/otp`
- `POST /auth/verify`
- `POST /parcelles/{id}/analyse`
- `GET /parcelles/{id}/recommandations`
- `POST /parcelles/{id}/simulation`
- `POST /parcelles/{id}/plan`
- `GET /labels/{qr}`
- `POST /assistant`
- `GET /produits`
- `POST /commandes`
- `PATCH /commandes/{id}`
- `GET /parcelles/{id}/solaire`
- `GET /parcelles/{id}/suivi`
