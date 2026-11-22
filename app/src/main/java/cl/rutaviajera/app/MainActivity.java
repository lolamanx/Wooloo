package cl.rutaviajera.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.FrameLayout;
import org.json.JSONException;
import org.json.JSONObject;

/** Punto de entrada Android: compone vista, puente, ubicación y ciclo de vida. */
public final class MainActivity extends Activity {
    private WebView webView;
    private ForegroundLocationController locationController;
    private DemoTripsBridge demoTripsBridge;
    private boolean foreground;

    @SuppressLint("AddJavascriptInterface")
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        webView.setBackgroundColor(Color.rgb(245, 248, 252));
        locationController = new ForegroundLocationController(this, locationEvents());
        SecureWebViewClient.configure(webView);
        webView.setWebViewClient(new SecureWebViewClient(this));
        webView.addJavascriptInterface(new LocationBridge(), "AndroidLocation");
        if (BuildConfig.DEBUG) {
            demoTripsBridge = new DemoTripsBridge(this::dispatchTripResponse);
            webView.addJavascriptInterface(demoTripsBridge, "AndroidDemoTrips");
        }
        FrameLayout root = createViewport();
        setContentView(root);
        root.requestApplyInsets();
        webView.loadUrl(SecureWebViewClient.START_URL);
    }

    /** Reduce el tamaño real del WebView con las barras, recortes y teclado del dispositivo. */
    private FrameLayout createViewport() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(245, 248, 252));
        root.addView(webView, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            getWindow().setDecorFitsSystemWindows(false);
        } else {
            getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        root.setOnApplyWindowInsetsListener((view, insets) -> applyViewportInsets(view, insets));
        return root;
    }

    private WindowInsets applyViewportInsets(View view, WindowInsets insets) {
        if (android.os.Build.VERSION.SDK_INT >= 30) {
            android.graphics.Insets bars = insets.getInsets(WindowInsets.Type.systemBars()
                    | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
            view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            return WindowInsets.CONSUMED;
        }
        view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
        return insets.consumeSystemWindowInsets();
    }

    private boolean trustedPage() {
        return webView != null && SecureWebViewClient.trustedUri(
                Uri.parse(webView.getUrl() == null ? "" : webView.getUrl()));
    }

    /** Superficie JavaScript original: solo iniciar y detener, sin parámetros ejecutables. */
    private final class LocationBridge {
        @JavascriptInterface
        public void start() {
            runOnUiThread(() -> {
                if (!foreground || !trustedPage()) return;
                locationController.requestStart();
            });
        }

        @JavascriptInterface
        public void stop() {
            runOnUiThread(() -> locationController.requestStop());
        }
    }

    private ForegroundLocationController.Events locationEvents() {
        return new ForegroundLocationController.Events() {
            @Override public boolean isForeground() { return foreground; }
            @Override public boolean isTrustedPage() { return trustedPage(); }
            @Override public void keepScreenOn(boolean enabled) {
                if (webView != null) webView.setKeepScreenOn(enabled);
            }
            @Override public void onPosition(JSONObject position) { dispatch("nativePosition", position); }
            @Override public void onStatus(String message) { dispatchMessage("nativeLocationStatus", message); }
            @Override public void onError(String message) { dispatchMessage("nativeLocationError", message); }
            @Override public void onPaused() { dispatch("nativePause", new JSONObject()); }
        };
    }

    private void dispatchMessage(String eventName, String message) {
        try {
            JSONObject data = new JSONObject();
            data.put("message", message);
            dispatch(eventName, data);
        } catch (JSONException ignored) {
            // Los mensajes son texto local; no se registra información GPS.
        }
    }

    private void dispatch(String eventName, JSONObject detail) {
        if (webView != null && trustedPage()) {
            webView.evaluateJavascript("window.dispatchEvent(new CustomEvent("
                    + JSONObject.quote(eventName) + ",{detail:" + detail + "}));", null);
        }
    }

    private void dispatchTripResponse(int requestId, String response) {
        runOnUiThread(() -> {
            try {
                JSONObject detail = new JSONObject();
                detail.put("requestId", requestId);
                detail.put("response", response);
                dispatch("nativeTripResponse", detail);
            } catch (JSONException ignored) {
                // La interfaz puede reintentar si se agota el plazo.
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        foreground = true;
        if (webView != null) webView.onResume();
        if (locationController != null) locationController.resumeRequestedLocation();
    }

    @Override
    protected void onPause() {
        foreground = false;
        locationController.pause();
        if (webView != null && !locationController.isPermissionPending()) webView.onPause();
        super.onPause();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        locationController.onPermissionResult(requestCode);
    }

    @Override
    protected void onDestroy() {
        locationController.stopLocation();
        if (demoTripsBridge != null) demoTripsBridge.close();
        if (webView != null) {
            webView.removeJavascriptInterface("AndroidLocation");
            if (BuildConfig.DEBUG) webView.removeJavascriptInterface("AndroidDemoTrips");
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        if (!trustedPage()) {
            super.onBackPressed();
            return;
        }
        webView.evaluateJavascript(
                "navigationHistory.length>1 || !document.getElementById(\"drawerLayer\").hidden", result -> {
                    if ("true".equals(result)) webView.evaluateJavascript("goBack()", null);
                    else finish();
                });
    }
}
