/**
 * Estado explícito compartido de la sesión; no persiste posiciones GPS.
 * Módulo clásico: depende del estado y de las funciones declaradas en el índice de carga.
 */

"use strict";

const E = RouteEngine;

const ORIGIN_KEY = "current";

const storageKey = "rutaviajera.trips.v1";

let map, originalLine, activeLine, markers, userMarker, accuracyCircle;

let plan = null,
  planKey = "",
  navigatorState = null,
  generation = 0,
  loading = false;

let activeNavigation = false,
  watching = false,
  browserWatch = null,
  lastLocation = null,
  lastResult = null;

let rerouting = false,
  following = false,
  wantStart = false,
  arrived = false,
  finished = false;

let locationTimer = null;

const routingClient = new RoutingIO.RoutingClient(() => ROUTE_CONFIG);

const planningStore = new RoutingIO.PlanStore();

let originFix = null,
  awaitingOrigin = false,
  lastMatrixAttempt = 0,
  routeFailure = null;

const routeParams = {
  overview: "false",
  geometries: "polyline6",
  steps: "true",
  annotations: "duration",
  alternatives: "false",
  continue_straight: "false",
};

let drawnOriginalPlan = null;

const routeCache = new Map();

let matrixCache = null,
  matrixPromise = null,
  detourRevision = 0,
  matrixEpoch = 0;

let gpsFilter = new E.LocationFilter(),
  lastGoodNavigationAt = 0,
  cameraReady = false,
  cameraZoomAt = 0,
  markerAnimation = null;

let drawerReturnFocus = null;

let retainedMapSession = false,
  retainedCamera = null,
  mainScrollTop = 0,
  mapFrame = null;

let tripsData = [
  {
    id: "trip-sur-1",
    name: "Ruta 5 Sur Familiar",
    originKey: "current",
    destKey: "osorno",
    departureISO: getNextDepartureDate(8, 30),
    stops: [
      { key: "curico", detourMin: 10, stayMin: 30 },
      { key: "saltolaja", detourMin: 15, stayMin: 60 },
      { key: "temuco", detourMin: 10, stayMin: 45 },
    ],
  },
  {
    id: "trip-costa-2",
    name: "Fin de Semana Litoral",
    originKey: "current",
    destKey: "valpo",
    departureISO: getNextDepartureDate(9, 0),
    stops: [{ key: "casablanca", detourMin: 5, stayMin: 45 }],
  },
];

let activeTripId = "trip-sur-1";

let selectedDetailKey = "saltolaja";

let navigationHistory = ["trips"];

let pendingDestKey = null;
