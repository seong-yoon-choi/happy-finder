package net.happyfinder.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.ModifiedMainActivityForSocialLoginPlugin;

public class MainActivity extends BridgeActivity implements ModifiedMainActivityForSocialLoginPlugin {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppNotificationSettingsPlugin.class);
        super.onCreate(savedInstanceState);
    }

    @Override
    public void IHaveModifiedTheMainActivityForTheUseWithSocialLoginPlugin() {
        // Marker interface required by the Social Login plugin when requesting scopes.
    }
}
