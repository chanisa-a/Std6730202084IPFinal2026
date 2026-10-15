import { Ionicons } from '@expo/vector-icons';
import { Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { appColors, appRadius, appSpacing } from '@/constants/appTheme';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { user, signIn } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  if (user) return <Redirect href="/dashboard" />;

  const submit = async () => {
    if (!username.trim() || !password) {
      showAlert('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    setBusy(true);
    const error = await signIn(username, password);
    setBusy(false);
    if (error) {
      showAlert('เข้าสู่ระบบไม่สำเร็จ', error);
      return;
    }
    router.replace('/dashboard');
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.brandIcon}><Ionicons name="people" size={24} color="#FFFFFF" /></View>
          <View>
            <Text style={styles.brandName}>PEOPLE<Text style={styles.brandAccent}>OPS</Text></Text>
            <Text style={styles.brandCaption}>HR MANAGER & SALARY ANALYTICS</Text>
          </View>
        </View>

        <View style={styles.intro}>
          <Text style={styles.eyebrow}>WORKFORCE MANAGEMENT</Text>
          <Text style={styles.title}>ทีมที่ดี เริ่มจาก{'\n'}ข้อมูลที่ชัดเจน</Text>
          <Text style={styles.subtitle}>เข้าสู่ระบบเพื่อจัดการพนักงานและวิเคราะห์โครงสร้างเงินเดือนขององค์กร</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>เข้าสู่ระบบผู้ดูแล</Text>
          <Text style={styles.label}>ชื่อผู้ใช้</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="username"
            onChangeText={setUsername}
            onSubmitEditing={submit}
            placeholder="กรอกชื่อผู้ใช้"
            placeholderTextColor={appColors.subtle}
            returnKeyType="next"
            style={styles.input}
            value={username}
          />
          <Text style={styles.label}>รหัสผ่าน</Text>
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            onSubmitEditing={submit}
            placeholder="กรอกรหัสผ่าน"
            placeholderTextColor={appColors.subtle}
            returnKeyType="done"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Pressable disabled={busy} onPress={submit} style={({ pressed }) => [styles.submit, pressed && styles.pressed, busy && styles.disabled]}>
            {busy ? <ActivityIndicator color="#FFFFFF" /> : <><Text style={styles.submitText}>เข้าสู่ระบบ</Text><Ionicons name="arrow-forward" size={15} color="#FFFFFF" /></>}
          </Pressable>
          <View style={styles.credentials}>
            <Ionicons name="information-circle-outline" size={18} color={appColors.primary} />
            <Text style={styles.credentialsText}>บัญชีสำหรับทดสอบ: <Text style={styles.credentialValue}>admin</Text> / <Text style={styles.credentialValue}>password123</Text></Text>
          </View>
        </View>
        <Text style={styles.footer}>IN-MEMORY EMPLOYEE DATA · K-MEANS SALARY ANALYSIS</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: appColors.background, flex: 1 },
  content: { alignSelf: 'center', flexGrow: 1, justifyContent: 'center', maxWidth: 620, padding: appSpacing.page, width: '100%' },
  brand: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 45 },
  brandIcon: { alignItems: 'center', backgroundColor: appColors.primary, borderRadius: 14, height: 48, justifyContent: 'center', width: 48 },
  brandName: { color: appColors.ink, fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
  brandAccent: { color: appColors.primary },
  brandCaption: { color: appColors.subtle, fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginTop: 4 },
  intro: { marginBottom: 26 },
  eyebrow: { color: appColors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 11 },
  title: { color: appColors.ink, fontSize: 37, fontWeight: '900', letterSpacing: -1, lineHeight: 43 },
  subtitle: { color: appColors.muted, fontSize: 13, lineHeight: 21, marginTop: 12, maxWidth: 440 },
  card: { backgroundColor: appColors.surface, borderColor: appColors.border, borderRadius: appRadius.card, borderWidth: 1, padding: 21 },
  cardTitle: { color: appColors.ink, fontSize: 17, fontWeight: '900', marginBottom: 8 },
  label: { color: appColors.ink, fontSize: 11, fontWeight: '900', marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: '#FFFCF9', borderColor: appColors.border, borderRadius: appRadius.control, borderWidth: 1, color: appColors.ink, fontSize: 14, minHeight: 48, paddingHorizontal: 14 },
  submit: { alignItems: 'center', backgroundColor: appColors.primary, borderRadius: appRadius.control, flexDirection: 'row', justifyContent: 'center', marginTop: 22, minHeight: 51 },
  submitText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
  credentials: { alignItems: 'center', backgroundColor: appColors.primarySoft, borderRadius: 10, flexDirection: 'row', gap: 8, marginTop: 17, padding: 12 },
  credentialsText: { color: appColors.muted, flex: 1, fontSize: 10, lineHeight: 16 },
  credentialValue: { color: appColors.primaryDark, fontWeight: '900' },
  footer: { color: appColors.subtle, fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 22, textAlign: 'center' },
});
