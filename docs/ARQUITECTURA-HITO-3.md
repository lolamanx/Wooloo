# Wooloo · Diagramas de arquitectura del Hito 3

## Componentes e integración

```mermaid
flowchart LR
    U[Usuario] --> UI[Android WebView: Mis viajes y formulario]
    UI --> DOM[Controlador y repositorio de viajes JS]
    DOM --> BR[Puente Android debug]
    BR -->|HTTP local por ADB o emulador| API[Express: rutas y controladores]
    API --> S[Servicios y validaciones]
    S --> R[Repositorio SQLite]
    R --> DB[(Viajes y paradas)]
    API --> M[Historial del monitor de la demo]
    M --> PC[Navegador del PC]
    UI -->|Ruta y mapa, cuando se usan| EXT[OSRM y OpenStreetMap]
```

La API escucha en el PC en `127.0.0.1:43101` en modo demo. El puente usa `127.0.0.1` con ADB reverse en un teléfono y `10.0.2.2` en el emulador. El monitor observa tráfico de Viajes del modo demo. El cálculo vial y el mapa tienen sus propios proveedores.

## Ciclo de guardado, desconexión y reintento

```mermaid
sequenceDiagram
    actor U as Usuario
    participant I as Formulario Android
    participant E as Express
    participant D as SQLite
    U->>I: Completa nombre, destino y fecha
    I->>I: Valida y asigna ID al borrador
    I->>E: POST /api/trips
    alt Conexión disponible
        E->>D: Valida y guarda en transacción
        D-->>E: Resultado confirmado
        E-->>I: 201 y viaje guardado
        I-->>U: Pantalla de paradas
    else Error de conexión
        I-->>U: Explica el error y conserva los campos
        U->>I: Reconecta y pulsa Guardar de nuevo
        I->>E: POST con el mismo ID
        Note over I,E: Si recibe 409, consulta y verifica los datos de ese ID.
        E->>D: Guarda o recupera el mismo viaje
        E-->>I: Respuesta que confirma el viaje
    end
    U->>I: Cierra y reabre la app
    I->>E: GET /api/trips
    E->>D: Lee los viajes y paradas
    E-->>I: 200 y lista persistida
```

## Datos

```mermaid
erDiagram
    CATALOG_LOCATIONS ||--o{ TRIPS : destino
    TRIPS ||--o{ STOPS : contiene
    CATALOG_LOCATIONS ||--o{ STOPS : ubicacion
```

El viaje y sus paradas se escriben en una transacción. La clave foránea del viaje elimina sus paradas al borrar el viaje. Una ubicación referenciada se conserva y la API responde 409 si se intenta eliminar.
