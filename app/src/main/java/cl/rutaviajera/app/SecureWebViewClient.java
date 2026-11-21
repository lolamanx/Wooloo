package cl.rutaviajera.app;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.webkit.CookieManager;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

/** Sirve los recursos locales y conserva las reglas de navegación del WebView. */
final class SecureWebViewClient extends WebViewClient {
    private static final String HOST = "appassets.androidplatform.net";
    static final String START_URL = "https://" + HOST + "/assets/index.html";
    private static final String CONTENT_POLICY =
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; "
                    + "img-src 'self' data: https://tile.openstreetmap.org; "
                    + "connect-src 'self' https://router.project-osrm.org; object-src 'none'; "
                    + "frame-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'";

    private final Activity activity;

    SecureWebViewClient(Activity activity) {
        this.activity = activity;
    }

    /** Configura capacidades del navegador; no solicita ubicación ni inicia una ruta. */
    @SuppressLint("SetJavaScriptEnabled")
    static void configure(WebView webView) {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setGeolocationEnabled(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setSafeBrowsingEnabled(true);
        settings.setUserAgentString(settings.getUserAgentString()
                + " Wooloo/" + BuildConfig.VERSION_NAME + " (+https://www.openstreetmap.org)");
        CookieManager.getInstance().setAcceptCookie(false);
        CookieManager.getInstance().setAcceptThirdPartyCookies(webView, false);
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
    }

    static boolean trustedUri(Uri uri) {
        return uri != null
                && "https".equals(uri.getScheme())
                && HOST.equals(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443)
                && uri.getUserInfo() == null
                && "/assets/index.html".equals(uri.getPath());
    }

    @Override
    public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (isCopyrightLink(request, uri)) {
            openCopyrightInBrowser(uri);
            return true;
        }
        return !trustedUri(request.getUrl());
    }

    private boolean isCopyrightLink(WebResourceRequest request, Uri uri) {
        return request.hasGesture()
                && "https".equals(uri.getScheme())
                && "www.openstreetmap.org".equals(uri.getHost())
                && "/copyright".equals(uri.getPath());
    }

    private void openCopyrightInBrowser(Uri uri) {
        try {
            activity.startActivity(new Intent(Intent.ACTION_VIEW, uri));
        } catch (ActivityNotFoundException ignored) {
            // El dispositivo puede no tener una aplicación que abra enlaces.
        }
    }

    @Override
    public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        if (request.isForMainFrame() && !trustedUri(uri)) return blocked();
        if (!"https".equals(uri.getScheme())) return blocked();
        if (HOST.equals(uri.getHost())) return localAsset(uri);
        return null; // Teselas y rutas HTTPS; la CSP conserva sus límites originales.
    }

    private WebResourceResponse localAsset(Uri uri) {
        String path = uri.getPath();
        if (path == null || !path.startsWith("/assets/") || path.contains("..")
                || path.contains("\\") || path.contains("\u0000")) return blocked();
        String name = path.substring("/assets/".length());
        String mime = assetMimeType(name);
        try {
            InputStream stream = activity.getAssets().open(name);
            Map<String, String> headers = localAssetHeaders();
            String encoding = "image/png".equals(mime) ? null : "UTF-8";
            return new WebResourceResponse(mime, encoding, 200, "OK", headers, stream);
        } catch (IOException ignored) {
            return blocked();
        }
    }

    private static String assetMimeType(String name) {
        if (name.endsWith(".html")) return "text/html";
        if (name.endsWith(".js")) return "application/javascript";
        if (name.endsWith(".css")) return "text/css";
        if (name.endsWith(".png")) return "image/png";
        return "text/plain";
    }

    private static Map<String, String> localAssetHeaders() {
        Map<String, String> headers = new HashMap<>();
        headers.put("X-Content-Type-Options", "nosniff");
        headers.put("Cache-Control", "no-store");
        headers.put("Referrer-Policy", "strict-origin-when-cross-origin");
        headers.put("Content-Security-Policy", CONTENT_POLICY);
        return headers;
    }

    private static WebResourceResponse blocked() {
        return new WebResourceResponse("text/plain", "UTF-8", 403, "Forbidden", new HashMap<>(),
                new ByteArrayInputStream("Blocked".getBytes(StandardCharsets.UTF_8)));
    }
}
