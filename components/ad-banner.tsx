import { View, StyleSheet, Platform } from 'react-native';

// react-native-google-mobile-ads はネイティブモジュールのため
// Expo Go では使用不可。動的requireでクラッシュを防ぐ。
let BannerAd: any = null;
let BannerAdSize: any = null;
let TestIds: any = null;

try {
  const ads = require('react-native-google-mobile-ads');
  BannerAd = ads.BannerAd;
  BannerAdSize = ads.BannerAdSize;
  TestIds = ads.TestIds;
} catch {
  // Expo Go など、ネイティブモジュール未対応環境では何もしない
}

/**
 * 本番AdMob広告ユニットID（リリース前にここを差し替える）
 * Android: ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
 * iOS:     ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX
 */
const PROD_UNIT_ID = {
  android: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
  ios: 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX',
};

export default function AdBanner() {
  // ネイティブモジュールが読み込めなかった場合は何も表示しない
  if (!BannerAd || !BannerAdSize || !TestIds) {
    return null;
  }

  const adUnitId = __DEV__
    ? TestIds.ADAPTIVE_BANNER
    : Platform.OS === 'android'
    ? PROD_UNIT_ID.android
    : PROD_UNIT_ID.ios;

  return (
    <View style={styles.container}>
      <BannerAd
        unitId={adUnitId}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        requestOptions={{ requestNonPersonalizedAdsOnly: true }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    width: '100%',
  },
});
