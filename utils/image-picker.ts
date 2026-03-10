import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export interface PickedImage {
  uri: string;
  width: number;
  height: number;
}

/**
 * Request camera permissions
 */
async function requestCameraPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'カメラの許可が必要です',
      'カメラを使用するには設定から許可してください。'
    );
    return false;
  }
  return true;
}

/**
 * Request media library permissions
 */
async function requestMediaLibraryPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return true;

  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      'フォトライブラリの許可が必要です',
      'フォトライブラリにアクセスするには設定から許可してください。'
    );
    return false;
  }
  return true;
}

/**
 * Pick images from library
 */
export async function pickImages(allowMultiple = true): Promise<PickedImage[]> {
  const hasPermission = await requestMediaLibraryPermission();
  if (!hasPermission) return [];

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: allowMultiple,
    quality: 0.8,
    allowsEditing: !allowMultiple,
  });

  if (result.canceled) return [];

  return result.assets.map((asset) => ({
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  }));
}

/**
 * Take a photo with camera
 */
export async function takePhoto(): Promise<PickedImage | null> {
  const hasPermission = await requestCameraPermission();
  if (!hasPermission) return null;

  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ['images'],
    quality: 0.8,
    allowsEditing: true,
  });

  if (result.canceled || result.assets.length === 0) return null;

  const asset = result.assets[0];
  return {
    uri: asset.uri,
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Show image picker action sheet
 */
export function showImagePickerOptions(
  onPickFromLibrary: () => void,
  onTakePhoto: () => void
): void {
  Alert.alert(
    '画像を追加',
    '',
    [
      { text: 'フォトライブラリから選択', onPress: onPickFromLibrary },
      { text: 'カメラで撮影', onPress: onTakePhoto },
      { text: 'キャンセル', style: 'cancel' },
    ]
  );
}
