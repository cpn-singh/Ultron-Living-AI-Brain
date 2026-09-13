package in.nemio.ultron;

import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;


import java.io.File;
import java.io.FileWriter;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.List;
import java.util.Locale;

@CapacitorPlugin(
    name = "UltronFile",
    permissions = {
        @Permission(
            strings = {
                android.Manifest.permission.READ_EXTERNAL_STORAGE,
                android.Manifest.permission.WRITE_EXTERNAL_STORAGE
            },
            alias = "storage"
        )
    }
)
public class UltronFilePlugin extends Plugin {

    // Default root directory for all Ultron file operations
    private static final String ULTRON_ROOT = "Ultron";

    private File getUltronRoot() {
        File downloads = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
        File root = new File(downloads, ULTRON_ROOT);
        if (!root.exists()) root.mkdirs();
        return root;
    }

    private File resolvePath(String relativePath) {
        if (relativePath == null || relativePath.isEmpty() || relativePath.equals("/")) {
            return getUltronRoot();
        }
        // Strip leading slash
        if (relativePath.startsWith("/")) relativePath = relativePath.substring(1);
        return new File(getUltronRoot(), relativePath);
    }

    // ──────────────────────────── CREATE FILE ────────────────────────────

    @PluginMethod
    public void createFile(PluginCall call) {
        String name = call.getString("name", "");
        String path = call.getString("path", "");
        String content = call.getString("content", "");

        if (name == null || name.trim().isEmpty()) {
            call.reject("File name is required");
            return;
        }

        try {
            File dir = resolvePath(path);
            if (!dir.exists()) dir.mkdirs();

            File file = new File(dir, name);
            if (!file.exists()) file.createNewFile();

            if (!content.isEmpty()) {
                try (FileWriter fw = new FileWriter(file, false)) {
                    fw.write(content);
                }
            }

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("path", file.getAbsolutePath());
            result.put("name", file.getName());
            result.put("message", "File created: " + file.getAbsolutePath());
            call.resolve(result);
        } catch (IOException e) {
            call.reject("Failed to create file: " + e.getMessage());
        }
    }

    // ──────────────────────────── CREATE FOLDER ────────────────────────────

    @PluginMethod
    public void createFolder(PluginCall call) {
        String name = call.getString("name", "");
        String path = call.getString("path", "");

        if (name == null || name.trim().isEmpty()) {
            call.reject("Folder name is required");
            return;
        }

        File parent = resolvePath(path);
        File folder = new File(parent, name);
        boolean created = folder.mkdirs();

        JSObject result = new JSObject();
        result.put("success", created || folder.exists());
        result.put("path", folder.getAbsolutePath());
        result.put("name", folder.getName());
        result.put("message", (created ? "Folder created: " : "Folder already exists: ") + folder.getAbsolutePath());
        call.resolve(result);
    }

    // ──────────────────────────── LIST DIRECTORY ────────────────────────────

    @PluginMethod
    public void listDirectory(PluginCall call) {
        String path = call.getString("path", "");
        File dir = resolvePath(path);

        JSObject result = new JSObject();

        if (!dir.exists() || !dir.isDirectory()) {
            result.put("success", false);
            result.put("message", "Directory not found: " + dir.getAbsolutePath());
            result.put("entries", new JSArray());
            call.resolve(result);
            return;
        }

        File[] files = dir.listFiles();
        JSArray entries = new JSArray();

        if (files != null) {
            SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd HH:mm", Locale.getDefault());
            for (File f : files) {
                JSObject entry = new JSObject();
                entry.put("name", f.getName());
                entry.put("path", f.getAbsolutePath());
                entry.put("isDirectory", f.isDirectory());
                entry.put("size", f.isFile() ? f.length() : 0);
                entry.put("modified", sdf.format(new Date(f.lastModified())));
                entries.put(entry);
            }
        }

        result.put("success", true);
        result.put("path", dir.getAbsolutePath());
        result.put("entries", entries);
        call.resolve(result);
    }

    // ──────────────────────────── OPEN FILE ────────────────────────────

    @PluginMethod
    public void openFile(PluginCall call) {
        String path = call.getString("path", "");
        if (path == null || path.isEmpty()) {
            call.reject("File path is required");
            return;
        }

        File file = new File(path);
        if (!file.exists()) {
            // Try resolving relative to Ultron root
            file = resolvePath(path);
        }

        if (!file.exists()) {
            call.reject("File not found: " + path);
            return;
        }

        try {
            Uri fileUri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file
            );

            String mimeType = getMimeType(file.getName());
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(fileUri, mimeType);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);

            JSObject result = new JSObject();
            result.put("success", true);
            result.put("path", file.getAbsolutePath());
            call.resolve(result);
        } catch (Exception e) {
            call.reject("Failed to open file: " + e.getMessage());
        }
    }

    // ──────────────────────────── LAUNCH APP ────────────────────────────

    @PluginMethod
    public void launchApp(PluginCall call) {
        String packageName = call.getString("packageName", "");
        String appName = call.getString("appName", "");

        // If exact package provided, launch it directly
        if (packageName != null && !packageName.isEmpty()) {
            if (tryLaunchByPackage(packageName)) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("packageName", packageName);
                result.put("message", "Launched: " + packageName);
                call.resolve(result);
                return;
            }
            call.reject("App not found or cannot be launched: " + packageName);
            return;
        }

        // Fuzzy search by app name
        if (appName != null && !appName.isEmpty()) {
            String foundPkg = findPackageByName(appName);
            if (foundPkg != null && tryLaunchByPackage(foundPkg)) {
                JSObject result = new JSObject();
                result.put("success", true);
                result.put("packageName", foundPkg);
                result.put("appName", appName);
                result.put("message", "Launched " + appName + " (" + foundPkg + ")");
                call.resolve(result);
                return;
            }
            call.reject("Could not find app: " + appName);
            return;
        }

        call.reject("Either packageName or appName is required");
    }

    // ──────────────────────────── GET INSTALLED APPS ────────────────────────────

    @PluginMethod
    public void getInstalledApps(PluginCall call) {
        PackageManager pm = getContext().getPackageManager();
        Intent mainIntent = new Intent(Intent.ACTION_MAIN);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<android.content.pm.ResolveInfo> apps = pm.queryIntentActivities(mainIntent, 0);

        JSArray appList = new JSArray();
        for (android.content.pm.ResolveInfo info : apps) {
            JSObject app = new JSObject();
            app.put("name", info.loadLabel(pm).toString());
            app.put("packageName", info.activityInfo.packageName);
            appList.put(app);
        }

        JSObject result = new JSObject();
        result.put("apps", appList);
        call.resolve(result);
    }

    // ──────────────────────────── HELPERS ────────────────────────────

    private boolean tryLaunchByPackage(String packageName) {
        try {
            Intent intent = getContext().getPackageManager().getLaunchIntentForPackage(packageName);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(intent);
                return true;
            }
        } catch (Exception e) {
            // fall through
        }
        return false;
    }

    private String findPackageByName(String appName) {
        PackageManager pm = getContext().getPackageManager();
        Intent mainIntent = new Intent(Intent.ACTION_MAIN);
        mainIntent.addCategory(Intent.CATEGORY_LAUNCHER);
        List<android.content.pm.ResolveInfo> apps = pm.queryIntentActivities(mainIntent, 0);

        String lowerQuery = appName.toLowerCase(Locale.getDefault());
        String bestMatch = null;
        int bestScore = Integer.MAX_VALUE;

        for (android.content.pm.ResolveInfo info : apps) {
            String label = info.loadLabel(pm).toString().toLowerCase(Locale.getDefault());
            if (label.equals(lowerQuery)) return info.activityInfo.packageName; // exact
            if (label.contains(lowerQuery) || lowerQuery.contains(label)) {
                int score = Math.abs(label.length() - lowerQuery.length());
                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = info.activityInfo.packageName;
                }
            }
        }
        return bestMatch;
    }

    private String getMimeType(String fileName) {
        String ext = "";
        int dot = fileName.lastIndexOf('.');
        if (dot >= 0) ext = fileName.substring(dot + 1).toLowerCase(Locale.getDefault());
        switch (ext) {
            case "pdf": return "application/pdf";
            case "jpg": case "jpeg": return "image/jpeg";
            case "png": return "image/png";
            case "gif": return "image/gif";
            case "mp4": return "video/mp4";
            case "mp3": return "audio/mpeg";
            case "txt": return "text/plain";
            case "html": case "htm": return "text/html";
            case "doc": case "docx": return "application/msword";
            case "xls": case "xlsx": return "application/vnd.ms-excel";
            case "zip": return "application/zip";
            case "apk": return "application/vnd.android.package-archive";
            default: return "*/*";
        }
    }
}
