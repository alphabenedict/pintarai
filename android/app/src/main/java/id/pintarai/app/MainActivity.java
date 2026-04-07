package id.pintarai.app;

import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import id.pintarai.app.localai.LocalAiPlugin;
import java.util.HashMap;
import java.util.Map;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(LocalAiPlugin.class);
        super.onCreate(savedInstanceState);

        // COOP/COEP headers enable SharedArrayBuffer in WebView
        // Required for wllama multi-thread mode (3-4x faster inference)
        getBridge().getWebView().setWebViewClient(new BridgeWebViewClient(getBridge()) {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse response = super.shouldInterceptRequest(view, request);
                if (response != null) {
                    Map<String, String> headers = response.getResponseHeaders();
                    if (headers == null) headers = new HashMap<>();
                    headers.put("Cross-Origin-Opener-Policy", "same-origin");
                    headers.put("Cross-Origin-Embedder-Policy", "require-corp");
                    headers.put("Cross-Origin-Resource-Policy", "cross-origin");
                    response.setResponseHeaders(headers);
                }
                return response;
            }
        });
    }
}
