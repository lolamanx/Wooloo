# Contrato HTTP de Wooloo

API JSON local bajo `/api`. El servidor estándar usa el puerto 3000 y el modo de demostración usa 43101. Las rutas vigentes corresponden al contrato 1.0. Se conservan las rutas actuales para Android y la demo web. Si se necesita introducir un cambio incompatible, se publicará bajo un prefijo nuevo como `/api/v2` y se documentará la migración.

Envía `Content-Type: application/json` en POST y PUT. Las respuestas de recursos incluyen `success` y, cuando se devuelve el registro, `data`. Las listas incluyen `count`. POST devuelve `Location` con la ruta individual.

| Método y ruta | Parámetro | Cuerpo | Éxito | Errores previstos |
| --- | --- | --- | --- | --- |
| GET /health | — | — | 200 | 500 |
| GET /api/trips | — | — | 200 | 500 |
| POST /api/trips | — | A | 201 | 400, 409, 500 |
| GET /api/trips/:id | id de viaje | — | 200 | 404, 500 |
| PUT /api/trips/:id | id de viaje | A | 200 | 400, 404, 409, 500 |
| DELETE /api/trips/:id | id de viaje | — | 200 | 404, 500 |
| GET /api/catalog | — | — | 200 | 500 |
| POST /api/catalog | — | B incl. key | 201 | 400, 409, 500 |
| GET /api/catalog/:key | clave del lugar | — | 200 | 404, 500 |
| PUT /api/catalog/:key | clave del lugar | B | 200 | 400, 404, 500 |
| DELETE /api/catalog/:key | clave del lugar | — | 200 | 404, 409, 500 |

## Ejemplo A · Viaje

```json
{
  "name": "Ruta de prueba al sur",
  "destKey": "osorno",
  "departureISO": "2030-12-15T08:00:00.000Z",
  "stops": [{"key": "chillan", "stayMin": 30}]
}
```

Nombre de 1 a 120 caracteres. Destino existente. Fecha ISO 8601 con zona horaria, opcional en POST y obligatoria en PUT. El servidor genera el ID si POST no lo incluye. Hasta diez paradas sin repeticiones. Cada parada usa una clave del catálogo distinta del destino y admite entre 0 y 1440 minutos enteros. Si se omite `stayMin`, se usan 30 minutos. PUT reemplaza los campos editables y la lista de paradas. Si se omite la lista, se guarda vacía.

## Ejemplo B · Catálogo

```json
{
  "key": "mirador-demo",
  "name": "Mirador ficticio",
  "lat": -40.5,
  "lng": -73.0,
  "icon": "📍",
  "description": "Ubicación de ensayo"
}
```

Clave de hasta 50 caracteres, con letras minúsculas, números y guiones. Comienza con una letra o número. La clave es obligatoria en POST e inmutable en PUT. Nombre de 1 a 120 caracteres, latitud entre −90 y 90, longitud entre −180 y 180, icono de hasta 16 unidades UTF-16 y descripción opcional de hasta 500.

## Ejemplo de error

```json
{
  "success": false,
  "error": {"code": 409, "message": "La ubicación está asociada a un viaje o una parada."}
}
```

400 indica entrada inválida o JSON mal formado. 404 indica ruta o registro inexistente. 409 indica un duplicado o conflicto de integridad. 413 indica que el JSON excede el límite de 1 MB. 500 devuelve un mensaje genérico. DELETE devuelve 200 con un mensaje si el registro fue eliminado.
