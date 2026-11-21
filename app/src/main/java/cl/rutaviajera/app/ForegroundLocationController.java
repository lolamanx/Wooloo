package cl.rutaviajera.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Context;
import android.content.pm.PackageManager;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Handler;
import android.os.Looper;
import android.os.SystemClock;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Controla proveedores, permiso y recuperación GPS; sus callbacks se ejecutan en el hilo principal. */
final class ForegroundLocationController {
    interface Events {
        boolean isForeground();
        boolean isTrustedPage();
        void keepScreenOn(boolean enabled);
        void onPosition(JSONObject position);
        void onStatus(String message);
        void onError(String message);
        void onPaused();
    }

    private static final int LOCATION_PERMISSION = 21;
    private final Activity activity;
    private final Events events;
    private final LocationManager locationManager;
    private final Handler gpsHandler = new Handler(Looper.getMainLooper());
    private boolean listening;
    private boolean permissionPending;
    private boolean locationRequested;
    private long lastPreciseElapsed;
    private long lastRestartElapsed;
    private long gpsStartedElapsed;
    private CancellationSignal fastLocationRequest;

    ForegroundLocationController(Activity activity, Events events) {
        this.activity = activity;
        this.events = events;
        locationManager = (LocationManager) activity.getSystemService(Context.LOCATION_SERVICE);
    }

    private final Runnable gpsWatchdog = new Runnable() {
        @Override
        public void run() {
            if (!events.isForeground() || !locationRequested || !listening) return;
            long now = SystemClock.elapsedRealtime();
            if (now - Math.max(lastPreciseElapsed, gpsStartedElapsed) > 20000
                    && now - lastRestartElapsed > 30000) {
                lastRestartElapsed = now;
                events.onStatus(lastPreciseElapsed == 0
                        ? "Buscando señal GPS. La red puede dar una posición inicial aproximada."
                        : "Recuperando la señal GPS. La guía se conserva.");
                // Mantener GNSS activo evita alargar un arranque frío.
                requestFastLocation();
            }
            gpsHandler.postDelayed(this, 8000);
        }
    };

    private final LocationListener listener = new LocationListener() {
        @Override
        public void onLocationChanged(Location location) {
            deliverLocation(location);
        }

        @Override
        public void onProviderDisabled(String provider) {
            if (LocationManager.GPS_PROVIDER.equals(provider)) {
                events.onStatus("GPS desactivado. Actívalo para recuperar la guía precisa.");
            }
        }

        @Override
        public void onProviderEnabled(String provider) {
            if (listening) events.onStatus("Buscando señal GPS…");
        }

        @Override
        public void onStatusChanged(String provider, int status, Bundle extras) {
            // Se conserva el contrato de LocationListener para Android 8 y posteriores.
        }
    };

    private boolean canUseLocation() {
        return events.isForeground() && events.isTrustedPage();
    }

    private boolean hasPrecisePermission() {
        return activity.checkSelfPermission(Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    /** Se invoca desde el puente ya validado; el permiso se solicita una sola vez por diálogo. */
    void requestStart() {
        if (!canUseLocation()) return;
        locationRequested = true;
        if (!hasPrecisePermission()) {
            if (!permissionPending) {
                permissionPending = true;
                activity.requestPermissions(new String[] {
                        Manifest.permission.ACCESS_FINE_LOCATION,
                        Manifest.permission.ACCESS_COARSE_LOCATION
                }, LOCATION_PERMISSION);
            }
            return;
        }
        startLocation();
    }

    void requestStop() {
        locationRequested = false;
        stopLocation();
    }

    void resumeRequestedLocation() {
        if (locationRequested && hasPrecisePermission()) startLocation();
    }

    void pause() {
        stopLocation();
        if (!permissionPending) {
            locationRequested = false;
            events.onPaused();
        }
    }

    boolean isPermissionPending() {
        return permissionPending;
    }

    void onPermissionResult(int requestCode) {
        if (requestCode != LOCATION_PERMISSION) return;
        permissionPending = false;
        if (hasPrecisePermission()) startLocation();
        else events.onError("Se necesita ubicación precisa. Puedes habilitarla desde Ajustes → Aplicaciones → Wooloo → Permisos.");
    }

    @SuppressLint("MissingPermission")
    private void startLocation() {
        if (!canUseLocation() || !locationRequested || listening) return;
        if (!hasPrecisePermission()) return;
        listening = true;
        if (!registerProviders()) {
            stopLocation();
            events.onError("No se pudo activar la ubicación. Revisa los permisos del dispositivo.");
            return;
        }
        events.keepScreenOn(true);
        gpsStartedElapsed = SystemClock.elapsedRealtime();
        lastPreciseElapsed = 0;
        gpsHandler.removeCallbacks(gpsWatchdog);
        gpsHandler.postDelayed(gpsWatchdog, 8000);
        if (!locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            events.onStatus("Activa GPS para mejorar la precisión; intentando ubicación de red.");
        }
        deliverRecentCachedLocation();
        requestFastLocation();
    }

    @SuppressLint("MissingPermission")
    private boolean registerProviders() {
        boolean registered = false;
        for (String provider : new String[] {
                LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER
        }) {
            if (!locationManager.getAllProviders().contains(provider)) continue;
            try {
                locationManager.requestLocationUpdates(provider, 1000L, 0f, listener, Looper.getMainLooper());
                registered = true;
            } catch (SecurityException | IllegalArgumentException ignored) {
                // Cada proveedor se registra por separado; un fallo de red no cancela GPS.
            }
        }
        return registered;
    }

    @SuppressLint("MissingPermission")
    private void deliverRecentCachedLocation() {
        Location best = null;
        double bestScore = Double.MAX_VALUE;
        for (String provider : locationManager.getAllProviders()) {
            try {
                Location cached = locationManager.getLastKnownLocation(provider);
                if (cached == null || !cached.hasAccuracy() || cached.getAccuracy() > 100) continue;
                long age = Math.max(0, SystemClock.elapsedRealtimeNanos() - cached.getElapsedRealtimeNanos());
                if (age > 10000000000L) continue;
                double score = cached.getAccuracy() + age / 1000000000.0 * 3;
                if (score < bestScore) {
                    best = cached;
                    bestScore = score;
                }
            } catch (SecurityException | IllegalArgumentException ignored) {
                // Una posición no disponible no impide seguir esperando a los proveedores.
            }
        }
        if (best != null) listener.onLocationChanged(best);
    }

    private void deliverLocation(Location location) {
        if (!canUseLocation() || !listening) return;
        try {
            JSONObject data = new JSONObject();
            data.put("point", new JSONArray(new double[] {location.getLongitude(), location.getLatitude()}));
            data.put("accuracy", location.hasAccuracy() ? location.getAccuracy() : 9999);
            long ageNanos = Math.max(0, SystemClock.elapsedRealtimeNanos() - location.getElapsedRealtimeNanos());
            data.put("timestamp", System.currentTimeMillis() - ageNanos / 1000000);
            data.put("provider", location.getProvider());
            if (LocationManager.GPS_PROVIDER.equals(location.getProvider())
                    && location.hasAccuracy() && location.getAccuracy() <= 50) {
                lastPreciseElapsed = SystemClock.elapsedRealtime();
            }
            data.put("heading", location.hasBearing() ? location.getBearing() : JSONObject.NULL);
            data.put("speed", location.hasSpeed() ? location.getSpeed() : JSONObject.NULL);
            events.onPosition(data);
        } catch (JSONException ignored) {
            events.onError("La ubicación recibida no es válida.");
        }
    }

    @SuppressLint("MissingPermission")
    private void requestFastLocation() {
        if (android.os.Build.VERSION.SDK_INT < 30 || !events.isForeground()
                || !locationRequested || !listening) return;
        String provider = selectFastProvider();
        if (fastLocationRequest != null) fastLocationRequest.cancel();
        final CancellationSignal request = new CancellationSignal();
        fastLocationRequest = request;
        try {
            locationManager.getCurrentLocation(provider, request, activity.getMainExecutor(), location -> {
                if (fastLocationRequest == request) fastLocationRequest = null;
                if (location != null && !request.isCanceled() && events.isForeground()
                        && locationRequested && listening) listener.onLocationChanged(location);
            });
        } catch (SecurityException | IllegalArgumentException ignored) {
            if (fastLocationRequest == request) fastLocationRequest = null;
        }
    }

    private String selectFastProvider() {
        for (String candidate : new String[] {"fused", LocationManager.NETWORK_PROVIDER}) {
            if (locationManager.getAllProviders().contains(candidate)
                    && locationManager.isProviderEnabled(candidate)) return candidate;
        }
        return LocationManager.GPS_PROVIDER;
    }

    void stopLocation() {
        gpsHandler.removeCallbacks(gpsWatchdog);
        if (fastLocationRequest != null) {
            fastLocationRequest.cancel();
            fastLocationRequest = null;
        }
        if (locationManager != null) locationManager.removeUpdates(listener);
        events.keepScreenOn(false);
        listening = false;
    }
}
