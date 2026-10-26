package cn.bubei.biology;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.content.Intent;
import android.net.Uri;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.util.Log;
import android.widget.Toast;
import java.io.OutputStream;
import java.io.InputStream;
import java.io.ByteArrayOutputStream;
import org.json.JSONObject;
import java.io.ByteArrayInputStream;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView web;
    private String pendingExport;
    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setFlags(1024,1024);
        getWindow().setStatusBarColor(Color.rgb(223,228,223));
        getWindow().setNavigationBarColor(Color.rgb(252,252,249));
        if(android.os.Build.VERSION.SDK_INT>=28) {
            android.view.WindowManager.LayoutParams params=getWindow().getAttributes();
            params.layoutInDisplayCutoutMode=1;
            getWindow().setAttributes(params);
        }
        getWindow().getDecorView().setSystemUiVisibility(5894 | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        web = new WebView(this);
        WebView.setWebContentsDebuggingEnabled((getApplicationInfo().flags & android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE)!=0);
        web.setBackgroundColor(Color.rgb(248,248,245));
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setTextZoom(100);
        web.addJavascriptInterface(new ExportBridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                String scheme=request.getUrl().getScheme();
                if (!"file".equals(scheme) && !"data".equals(scheme) && !"about".equals(scheme))
                    return new WebResourceResponse("text/plain","UTF-8",new ByteArrayInputStream(new byte[0]));
                return null;
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onConsoleMessage(android.webkit.ConsoleMessage message) {
                Log.d("BubeiBiology", message.message()+" @"+message.lineNumber());
                return true;
            }
        });
        setContentView(web);
        web.loadUrl("file:///android_asset/index.html");
    }
    private class ExportBridge {
        @JavascriptInterface public void openRecord() {
            runOnUiThread(() -> {
                Intent intent=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("*/*");
                intent.putExtra(Intent.EXTRA_MIME_TYPES,new String[]{"application/json","text/plain","application/octet-stream"});
                try { startActivityForResult(intent,101); }
                catch(Exception e) { Toast.makeText(MainActivity.this,"无法打开文件选择器",Toast.LENGTH_LONG).show(); }
            });
        }

        @JavascriptInterface public void saveRecord(String json) {
            if (json==null || json.length()>8_000_000) return;
            runOnUiThread(() -> {
                pendingExport=json;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);
                intent.addCategory(Intent.CATEGORY_OPENABLE);
                intent.setType("application/json");
                intent.putExtra(Intent.EXTRA_TITLE,"不背生物-学习记录.json");
                try { startActivityForResult(intent,100); }
                catch(Exception e) { pendingExport=null; Toast.makeText(MainActivity.this,"无法打开文件选择器",Toast.LENGTH_LONG).show(); }
            });
        }
    }
    @Override protected void onActivityResult(int request,int result,Intent data) {
        super.onActivityResult(request,result,data);
        if(request==101 && result==RESULT_OK && data!=null && data.getData()!=null) {
            final Uri uri=data.getData();
            new Thread(() -> {
                try(InputStream input=getContentResolver().openInputStream(uri); ByteArrayOutputStream bytes=new ByteArrayOutputStream()) {
                    if(input==null) throw new java.io.IOException();
                    byte[] buffer=new byte[8192]; int n;
                    while((n=input.read(buffer))!=-1) {
                        if(bytes.size()+n>8_000_000) throw new java.io.IOException();
                        bytes.write(buffer,0,n);
                    }
                    final String payload=new String(bytes.toByteArray(),StandardCharsets.UTF_8);
                    runOnUiThread(() -> { if(!isFinishing() && !isDestroyed()) web.evaluateJavascript("window.receiveBackup("+JSONObject.quote(payload)+")",null); });
                } catch(Exception e) { runOnUiThread(() -> Toast.makeText(this,"无法读取文件，请选择小于 8 MB 的 JSON 备份",Toast.LENGTH_LONG).show()); }
            }).start();
        }
        if(request==100) {
            if(result==RESULT_OK && data!=null && data.getData()!=null && pendingExport!=null) {
                try(OutputStream out=getContentResolver().openOutputStream(data.getData())) {
                    if(out!=null) out.write(pendingExport.getBytes(StandardCharsets.UTF_8));
                    Toast.makeText(this,"学习记录已保存",Toast.LENGTH_SHORT).show();
                } catch(Exception e) { Toast.makeText(this,"保存失败，请重试",Toast.LENGTH_LONG).show(); }
            }
            pendingExport=null;
        }
    }
    @Override public void onBackPressed() {
        web.evaluateJavascript("window.appBack ? window.appBack() : false", value -> {
            if(!"true".equals(value)) finish();
        });
    }
    @Override protected void onDestroy() {
        if(web!=null) { web.removeJavascriptInterface("Android");web.destroy(); }
        super.onDestroy();
    }
}
