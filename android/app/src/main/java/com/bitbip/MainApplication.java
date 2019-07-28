package com.bitbip;

import android.app.Application;

import com.facebook.react.ReactApplication;
import com.reactnativecommunity.slider.ReactSliderPackage;
import com.reactnativecommunity.netinfo.NetInfoPackage;
import com.reactnativecommunity.asyncstorage.AsyncStoragePackage;
import org.reactnative.camera.RNCameraPackage;
import com.airbnb.android.react.lottie.LottiePackage;
import com.janeasystems.rn_nodejs_mobile.RNNodeJsMobilePackage;
import com.oblador.vectoricons.VectorIconsPackage;
import com.rnfingerprint.FingerprintAuthPackage;
import com.horcrux.svg.SvgPackage;
import com.BV.LinearGradient.LinearGradientPackage;
import com.bitgo.randombytes.RandomBytesPackage;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.react.shell.MainReactPackage;
import com.facebook.soloader.SoLoader;
import com.oblador.keychain.KeychainPackage;

import java.util.Arrays;
import java.util.List;

public class MainApplication extends Application implements ReactApplication {

  private final ReactNativeHost mReactNativeHost = new ReactNativeHost(this) {
    @Override
    public boolean getUseDeveloperSupport() {
      return BuildConfig.DEBUG;
    }

    @Override
    protected List<ReactPackage> getPackages() {
      return Arrays.<ReactPackage>asList(
          new MainReactPackage(),
            new ReactSliderPackage(),
            new NetInfoPackage(),
            new AsyncStoragePackage(),
            new RNCameraPackage(),
            new LottiePackage(),
            new RNNodeJsMobilePackage(),
            new VectorIconsPackage(),
            new FingerprintAuthPackage(),
            new SvgPackage(),
            new LinearGradientPackage(),
            new RandomBytesPackage(),
            new KeychainPackage(),
            new LndNativePackage()
      );
    }

    @Override
    protected String getJSMainModuleName() {
      return "index";
    }
  };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
  }
}
