package in.nemio.ultron;

import android.content.Intent;
import android.os.Bundle;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.util.ArrayList;
import java.util.Locale;

@CapacitorPlugin(
    name = "UltronVoice",
    permissions = {
        @Permission(strings = { android.Manifest.permission.RECORD_AUDIO }, alias = "microphone")
    }
)
public class UltronVoicePlugin extends Plugin {

    private SpeechRecognizer speechRecognizer;
    private PluginCall savedCall;

    @PluginMethod
    public void startListening(PluginCall call) {
        if (!getPermissionState("microphone").toString().equals("granted")) {
            savedCall = call;
            requestPermissionForAlias("microphone", call, "microphonePermissionCallback");
            return;
        }
        doStartListening(call);
    }

    @PermissionCallback
    private void microphonePermissionCallback(PluginCall call) {
        if (getPermissionState("microphone").toString().equals("granted")) {
            doStartListening(call);
        } else {
            call.reject("Microphone permission denied");
        }
    }

    private void doStartListening(PluginCall call) {
        call.setKeepAlive(true);
        getActivity().runOnUiThread(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.destroy();
            }
            speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
            speechRecognizer.setRecognitionListener(new RecognitionListener() {
                @Override
                public void onReadyForSpeech(Bundle params) {
                    JSObject event = new JSObject();
                    event.put("status", "ready");
                    notifyListeners("speechStatus", event);
                }

                @Override
                public void onBeginningOfSpeech() {
                    JSObject event = new JSObject();
                    event.put("status", "listening");
                    notifyListeners("speechStatus", event);
                }

                @Override
                public void onRmsChanged(float rmsdB) {}

                @Override
                public void onBufferReceived(byte[] buffer) {}

                @Override
                public void onEndOfSpeech() {
                    JSObject event = new JSObject();
                    event.put("status", "processing");
                    notifyListeners("speechStatus", event);
                }

                @Override
                public void onError(int error) {
                    String errorMsg = getSpeechErrorMessage(error);
                    JSObject event = new JSObject();
                    event.put("error", errorMsg);
                    event.put("code", error);
                    notifyListeners("speechError", event);
                    call.resolve(new JSObject().put("transcript", "").put("error", errorMsg));
                }

                @Override
                public void onResults(Bundle results) {
                    ArrayList<String> matches = results.getStringArrayList(
                            SpeechRecognizer.RESULTS_RECOGNITION);
                    String transcript = (matches != null && !matches.isEmpty()) ? matches.get(0) : "";
                    JSObject result = new JSObject();
                    result.put("transcript", transcript);
                    result.put("error", "");
                    notifyListeners("speechResult", result);
                    call.resolve(result);
                }

                @Override
                public void onPartialResults(Bundle partialResults) {
                    ArrayList<String> partial = partialResults.getStringArrayList(
                            SpeechRecognizer.RESULTS_RECOGNITION);
                    if (partial != null && !partial.isEmpty()) {
                        JSObject event = new JSObject();
                        event.put("partial", partial.get(0));
                        notifyListeners("speechPartial", event);
                    }
                }

                @Override
                public void onEvent(int eventType, Bundle params) {}
            });

            Intent intent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                    RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            intent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, Locale.getDefault());
            // Prefer offline recognition — works without internet on Android 10+
            intent.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, true);
            intent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            intent.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 1500);
            intent.putExtra(RecognizerIntent.EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 500);

            speechRecognizer.startListening(intent);
        });
    }

    @PluginMethod
    public void stopListening(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (speechRecognizer != null) {
                speechRecognizer.stopListening();
            }
        });
        call.resolve();
    }

    @PluginMethod
    public void isAvailable(PluginCall call) {
        boolean available = SpeechRecognizer.isRecognitionAvailable(getContext());
        JSObject ret = new JSObject();
        ret.put("available", available);
        call.resolve(ret);
    }

    private String getSpeechErrorMessage(int error) {
        switch (error) {
            case SpeechRecognizer.ERROR_AUDIO: return "Audio recording error";
            case SpeechRecognizer.ERROR_CLIENT: return "Client side error";
            case SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS: return "Insufficient permissions";
            case SpeechRecognizer.ERROR_NETWORK: return "Network error (try offline mode)";
            case SpeechRecognizer.ERROR_NETWORK_TIMEOUT: return "Network timeout";
            case SpeechRecognizer.ERROR_NO_MATCH: return "No speech match found";
            case SpeechRecognizer.ERROR_RECOGNIZER_BUSY: return "Recognition service busy";
            case SpeechRecognizer.ERROR_SERVER: return "Server error";
            case SpeechRecognizer.ERROR_SPEECH_TIMEOUT: return "No speech input detected";
            default: return "Unknown error: " + error;
        }
    }

    @Override
    protected void handleOnDestroy() {
        if (speechRecognizer != null) {
            speechRecognizer.destroy();
            speechRecognizer = null;
        }
    }
}
