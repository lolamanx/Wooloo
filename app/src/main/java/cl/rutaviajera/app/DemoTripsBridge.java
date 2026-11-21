package cl.rutaviajera.app;

import android.os.Build;
import android.webkit.JavascriptInterface;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** Cliente HTTP local para el emulador o un teléfono conectado por ADB. */
final class DemoTripsBridge {
    private static final String HOST = "ranchu".equals(Build.HARDWARE)
            || "goldfish".equals(Build.HARDWARE) ? "10.0.2.2" : "127.0.0.1";
    @JavascriptInterface
    public String request(String method, String id, String body) {
        if (!BuildConfig.DEBUG || id == null || body == null || body.length() > 16000
                || (!id.isEmpty() && !id.matches("trip-[a-zA-Z0-9-]{1,80}"))) return "";
        boolean writesBody = "POST".equals(method) || "PUT".equals(method);
        boolean allowed = "GET".equals(method)
                || ("POST".equals(method) && id.isEmpty())
                || (("PUT".equals(method) || "DELETE".equals(method)) && !id.isEmpty());
        if (!allowed) return "";
        HttpURLConnection connection = null;
        try {
            String route = id.isEmpty() ? "/api/trips" : "/api/trips/" + id;
            connection = (HttpURLConnection) new URL("http://" + HOST + ":43101" + route).openConnection();
            connection.setRequestMethod(method);
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(2000);
            connection.setReadTimeout(2000);
            connection.setRequestProperty("X-Wooloo-Client", "android-demo");
            if (writesBody) {
                connection.setDoOutput(true);
                connection.setRequestProperty("Content-Type", "application/json");
                try (java.io.OutputStream output = connection.getOutputStream()) {
                    output.write(body.getBytes(StandardCharsets.UTF_8));
                }
            }
            if (connection.getResponseCode() / 100 != 2) return "";
            try (InputStream input = connection.getInputStream();
                    ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
                byte[] buffer = new byte[4096];
                int count;
                while ((count = input.read(buffer)) != -1) {
                    if (bytes.size() + count > 1024 * 1024) return "";
                    bytes.write(buffer, 0, count);
                }
                return bytes.toString("UTF-8");
            }
        } catch (java.io.IOException exception) {
            return "";
        } finally {
            if (connection != null) connection.disconnect();
        }
    }
}
