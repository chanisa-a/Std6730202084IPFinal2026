import { Alert, Linking, Platform } from 'react-native';

export async function openLink(url: string) {
  const supported = await Linking.canOpenURL(url);

  if (supported) {
    await Linking.openURL(url);
    return;
  }

  if (Platform.OS !== 'web') {
    Alert.alert('Unable to open link', url);
  }
}
