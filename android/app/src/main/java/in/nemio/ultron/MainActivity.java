package in.nemio.ultron;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(UltronVoicePlugin.class);
        registerPlugin(UltronFilePlugin.class);
        super.onCreate(savedInstanceState);
    }
}
