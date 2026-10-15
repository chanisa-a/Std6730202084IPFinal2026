import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { appColors } from '@/constants/appTheme';

export function LoadingScreen({ label = 'กำลังเตรียมระบบ...' }: { label?: string }) {
  return (
    <View style={styles.container}>
      <View style={styles.mark}><Text style={styles.markText}>M</Text></View>
      <ActivityIndicator color={appColors.primary} size="small" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', backgroundColor: appColors.background, flex: 1, justifyContent: 'center', padding: 24 },
  mark: { alignItems: 'center', backgroundColor: appColors.primary, borderRadius: 18, height: 58, justifyContent: 'center', marginBottom: 22, width: 58 },
  markText: { color: '#FFF', fontSize: 28, fontWeight: '900' },
  label: { color: appColors.muted, fontSize: 12, marginTop: 12 },
});
