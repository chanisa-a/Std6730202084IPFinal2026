import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { LoadingScreen } from '@/components/LoadingScreen';
import { appColors, appRadius, appSpacing } from '@/constants/appTheme';
import { useAuth } from '@/contexts/AuthContext';
import { createEmployee, deleteEmployee, getEmployees, getSalaryClusters, toggleEmployeeStatus, updateEmployee, type Employee, type SalaryCluster } from '@/lib/hrApi';

function formatSalary(salary: number | null) {
  return salary === null ? '—' : `฿${salary.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

export default function DashboardScreen() {
  const { user, signOut } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [clusters, setClusters] = useState<SalaryCluster[] | null>(null);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [position, setPosition] = useState('');
  const [salary, setSalary] = useState('');
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formStatus, setFormStatus] = useState<Employee['status']>('Active');

  const refreshEmployees = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setEmployees(await getEmployees());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'โหลดข้อมูลพนักงานไม่สำเร็จ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshEmployees();
  }, [refreshEmployees]);

  const addEmployee = async () => {
    const normalizedName = name.trim();
    const normalizedPosition = position.trim();
    const parsedSalary = Number(salary);
    if (!normalizedName || !normalizedPosition || !salary.trim()) {
      showAlert('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อ ตำแหน่ง และเงินเดือน');
      return;
    }
    if (!Number.isFinite(parsedSalary) || parsedSalary < 0 || parsedSalary > 99999999.99) {
      showAlert('เงินเดือนไม่ถูกต้อง', 'กรุณากรอกเงินเดือนตั้งแต่ 0 ถึง 99,999,999.99 บาท');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const employee = await createEmployee({ name: normalizedName, position: normalizedPosition, salary: parsedSalary });
      setEmployees((current) => [...current, employee]);
      setName('');
      setPosition('');
      setSalary('');
      setEditingId(null);
      setFormStatus('Active');
      setClusters(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'เพิ่มพนักงานไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const saveEmployee = async () => {
    const normalizedName = name.trim();
    const normalizedPosition = position.trim();
    const parsedSalary = Number(salary);
    if (!normalizedName || !normalizedPosition || !salary.trim()) {
      showAlert('กรอกข้อมูลไม่ครบ', 'กรุณากรอกชื่อ ตำแหน่ง และเงินเดือน');
      return;
    }
    if (!Number.isFinite(parsedSalary) || parsedSalary < 0 || parsedSalary > 99999999.99) {
      showAlert('เงินเดือนไม่ถูกต้อง', 'กรุณากรอกเงินเดือนตั้งแต่ 0 ถึง 99,999,999.99 บาท');
      return;
    }
    if (!editingId) return;

    setSaving(true);
    setError('');
    try {
      const employee = await updateEmployee(editingId, {
        name: normalizedName,
        position: normalizedPosition,
        salary: parsedSalary,
        status: formStatus,
      });
      setEmployees((current) => current.map((item) => item.id === employee.id ? employee : item));
      setEditingId(null);
      setName('');
      setPosition('');
      setSalary('');
      setFormStatus('Active');
      setClusters(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'แก้ไขข้อมูลพนักงานไม่สำเร็จ');
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (employee: Employee) => {
    setEditingId(employee.id);
    setName(employee.name);
    setPosition(employee.position);
    setSalary(String(employee.salary));
    setFormStatus(employee.status);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setName('');
    setPosition('');
    setSalary('');
    setFormStatus('Active');
  };

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === 'web') {
      window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const changeStatus = async (employee: Employee) => {
    setError('');
    try {
      const updated = await toggleEmployeeStatus(employee.id);
      setEmployees((current) => current.map((item) => item.id === updated.id ? updated : item));
      setClusters(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : 'เปลี่ยนสถานะไม่สำเร็จ');
    }
  };

  const removeEmployee = async (employee: Employee) => {
    setError('');
    try {
      await deleteEmployee(employee.id);
      setEmployees((current) => current.filter((item) => item.id !== employee.id));
      setClusters(null);
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'ลบพนักงานไม่สำเร็จ');
    }
  };

  const confirmDelete = (employee: Employee) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure? Delete ${employee.name}?`)) void removeEmployee(employee);
      return;
    }
    Alert.alert('ยืนยันการลบ', `Are you sure? ต้องการลบ ${employee.name} หรือไม่`, [
      { text: 'ยกเลิก', style: 'cancel' },
      { text: 'ลบพนักงาน', style: 'destructive', onPress: () => void removeEmployee(employee) },
    ]);
  };

  const analyzeSalaries = async () => {
    setAnalyzing(true);
    setError('');
    try {
      setClusters(await getSalaryClusters());
    } catch (analysisError) {
      setError(analysisError instanceof Error ? analysisError.message : 'วิเคราะห์เงินเดือนไม่สำเร็จ');
    } finally {
      setAnalyzing(false);
    }
  };

  const averageSalary = employees.length
    ? employees.reduce((total, employee) => total + employee.salary, 0) / employees.length
    : 0;
  const visibleEmployees = employees.filter((employee) => (
    [employee.name, employee.position, employee.status, String(employee.salary)]
      .some((value) => value.toLowerCase().includes(search.trim().toLowerCase()))
  ));

  if (loading) return <LoadingScreen label="กำลังโหลดข้อมูลพนักงาน..." />;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>PEOPLE OPERATIONS · WORKSPACE</Text>
          <Text style={styles.title}>Employee dashboard</Text>
          <Text style={styles.subtitle}>จัดการทีมและติดตามโครงสร้างเงินเดือนขององค์กร</Text>
        </View>
        <Pressable onPress={() => void signOut()} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={17} color={appColors.primaryDark} />
          <Text style={styles.signOutText}>ออกจากระบบ</Text>
        </Pressable>
      </View>

      <View style={styles.welcomeCard}>
        <View style={styles.welcomeIcon}><Ionicons name="people-outline" size={27} color="#FFFFFF" /></View>
        <View style={styles.welcomeCopy}>
          <Text style={styles.welcomeEyebrow}>HR MANAGER</Text>
          <Text style={styles.welcomeTitle}>ยินดีต้อนรับ, {user?.username}</Text>
          <Text style={styles.welcomeText}>ข้อมูลพนักงานอ่านและบันทึกผ่านเซิร์ฟเวอร์ลงฐานข้อมูล MySQL</Text>
        </View>
        <View style={styles.liveBadge}><View style={styles.liveDot} /><Text style={styles.liveText}>LIVE</Text></View>
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={19} color={appColors.danger} />
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityLabel="โหลดข้อมูลอีกครั้ง" onPress={() => void refreshEmployees()}><Ionicons name="refresh" size={18} color={appColors.primaryDark} /></Pressable>
        </View>
      ) : null}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: '#E9F0FF' }]}><Ionicons name="people" size={19} color="#5474C8" /></View>
          <Text style={styles.statValue}>{employees.length}</Text>
          <Text style={styles.statLabel}>พนักงานทั้งหมด</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: appColors.mintSoft }]}><Ionicons name="checkmark-circle" size={19} color={appColors.mint} /></View>
          <Text style={styles.statValue}>{employees.filter((employee) => employee.status === 'Active').length}</Text>
          <Text style={styles.statLabel}>ปฏิบัติงาน</Text>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: appColors.primarySoft }]}><Ionicons name="cash-outline" size={19} color={appColors.primary} /></View>
          <Text style={[styles.statValue, styles.averageValue]}>{formatSalary(averageSalary)}</Text>
          <Text style={styles.statLabel}>เงินเดือนเฉลี่ย</Text>
        </View>
      </View>

      <View style={styles.columns}>
        <View style={styles.formCard}>
          <View style={styles.sectionHeading}>
            <View><Text style={styles.sectionTitle}>{editingId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงาน'}</Text><Text style={styles.sectionSub}>{editingId ? 'ปรับข้อมูลแล้วบันทึกลงฐานข้อมูล' : 'กรอกข้อมูลเพื่อเพิ่มสมาชิกใหม่'}</Text></View>
            <Ionicons name="person-add-outline" size={21} color={appColors.primary} />
          </View>
          <Text style={styles.label}>ชื่อ-นามสกุล</Text>
          <TextInput onChangeText={setName} placeholder="เช่น Alex Lee" placeholderTextColor={appColors.subtle} style={styles.input} value={name} />
          <Text style={styles.label}>ตำแหน่ง</Text>
          <TextInput onChangeText={setPosition} placeholder="เช่น UX Designer" placeholderTextColor={appColors.subtle} style={styles.input} value={position} />
          <Text style={styles.label}>เงินเดือน (บาท)</Text>
          <TextInput keyboardType="decimal-pad" onChangeText={setSalary} placeholder="เช่น 45000" placeholderTextColor={appColors.subtle} style={styles.input} value={salary} />
          {editingId ? (
            <Pressable onPress={() => setFormStatus((current) => current === 'Active' ? 'On Leave' : 'Active')} style={styles.formStatusButton}>
              <Ionicons name="swap-horizontal" size={17} color={appColors.primaryDark} />
              <Text style={styles.formStatusText}>สถานะ: {formStatus} (แตะเพื่อสลับ)</Text>
            </Pressable>
          ) : null}
          <Pressable disabled={saving} onPress={() => void (editingId ? saveEmployee() : addEmployee())} style={({ pressed }) => [styles.addButton, pressed && styles.pressed, saving && styles.disabled]}>
            {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <><Ionicons name={editingId ? 'save-outline' : 'add'} size={19} color="#FFFFFF" /><Text style={styles.addButtonText}>{editingId ? 'บันทึกการแก้ไข' : 'เพิ่มพนักงาน'}</Text></>}
          </Pressable>
          {editingId ? <Pressable onPress={cancelEditing} style={styles.cancelEditButton}><Text style={styles.cancelEditText}>ยกเลิกการแก้ไข</Text></Pressable> : null}
        </View>

        <View style={styles.analysisCard}>
          <View style={styles.analysisIcon}><Ionicons name="analytics-outline" size={23} color="#FFFFFF" /></View>
          <Text style={styles.analysisEyebrow}>SALARY INSIGHTS</Text>
          <Text style={styles.analysisTitle}>วิเคราะห์โครงสร้างเงินเดือน</Text>
          <Text style={styles.analysisBody}>จัดกลุ่มเงินเดือนของพนักงานเป็น 3 ระดับด้วย K-Means Clustering</Text>
          <Pressable disabled={analyzing} onPress={() => void analyzeSalaries()} style={({ pressed }) => [styles.analyzeButton, pressed && styles.pressed, analyzing && styles.disabled]}>
            {analyzing ? <><ActivityIndicator color={appColors.ink} size="small" /><Text style={styles.analyzeButtonText}>กำลังวิเคราะห์...</Text></> : <><Ionicons name="bar-chart-outline" size={18} color={appColors.ink} /><Text style={styles.analyzeButtonText}>Analyze Salary Structure</Text></>}
          </Pressable>
          {clusters ? (
            <View style={styles.clusterResults}>
              {clusters.map((cluster, index) => (
                <View key={cluster.group} style={[styles.clusterCard, index === clusters.length - 1 && styles.clusterCardLast]}>
                  <View style={[styles.tierDot, { backgroundColor: tierColors[index % tierColors.length] }]} />
                  <View style={styles.clusterCopy}>
                    <Text style={styles.clusterName}>{cluster.group}</Text>
                    <Text style={styles.clusterCount}>{cluster.count} {cluster.count === 1 ? 'employee' : 'employees'}</Text>
                  </View>
                  <Text style={styles.clusterSalary}>{formatSalary(cluster.centroid)}</Text>
                </View>
              ))}
              <Text style={styles.clusterFootnote}>ค่าเฉลี่ยเงินเดือนของแต่ละกลุ่ม (centroid)</Text>
            </View>
          ) : (
            <View style={styles.analysisHint}><Ionicons name="sparkles-outline" size={16} color={appColors.primary} /><Text style={styles.analysisHintText}>ผลวิเคราะห์จะแสดงที่นี่</Text></View>
          )}
        </View>
      </View>

      <View style={styles.listCard}>
        <View style={styles.sectionHeading}>
          <View><Text style={styles.sectionTitle}>รายชื่อพนักงาน</Text><Text style={styles.sectionSub}>ค้นหา แก้ไข เปลี่ยนสถานะ หรือลบรายการได้</Text></View>
          <View style={styles.countBadge}><Text style={styles.countBadgeText}>{employees.length} คน</Text></View>
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color={appColors.muted} />
          <TextInput
            onChangeText={setSearch}
            placeholder="ค้นหาชื่อ ตำแหน่ง สถานะ หรือเงินเดือน"
            placeholderTextColor={appColors.subtle}
            style={styles.searchInput}
            value={search}
          />
          {search ? <Pressable accessibilityLabel="ล้างคำค้นหา" onPress={() => setSearch('')}><Ionicons name="close-circle" size={17} color={appColors.muted} /></Pressable> : null}
        </View>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeading, styles.employeeColumn]}>พนักงาน</Text>
          <Text style={[styles.tableHeading, styles.positionColumn]}>ตำแหน่ง</Text>
          <Text style={[styles.tableHeading, styles.statusColumn]}>สถานะ</Text>
          <Text style={[styles.tableHeading, styles.salaryColumn]}>เงินเดือน</Text>
          <Text style={[styles.tableHeading, styles.actionsColumn]}>จัดการ</Text>
        </View>
        {visibleEmployees.map((employee) => (
          <View key={employee.id} style={styles.employeeRow}>
            <View style={styles.employeeColumn}>
              <View style={styles.employeeIdentity}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{employee.name.slice(0, 1).toUpperCase()}</Text></View>
                <Text numberOfLines={1} style={styles.employeeName}>{employee.name}</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={[styles.employeePosition, styles.positionColumn]}>{employee.position}</Text>
            <View style={styles.statusColumn}>
              <View style={[styles.statusBadge, employee.status === 'Active' ? styles.statusActive : styles.statusLeave]}>
                <View style={[styles.statusDot, employee.status === 'Active' ? styles.statusDotActive : styles.statusDotLeave]} />
                <Text style={[styles.statusText, employee.status === 'Active' ? styles.statusTextActive : styles.statusTextLeave]}>{employee.status}</Text>
              </View>
            </View>
            <Text style={[styles.employeeSalary, styles.salaryColumn]}>{formatSalary(employee.salary)}</Text>
            <View style={[styles.actionsColumn, styles.actions]}>
              <Pressable accessibilityLabel={`Edit ${employee.name}`} onPress={() => startEditing(employee)} style={styles.actionButton}>
                <Ionicons name="create-outline" size={16} color={appColors.primaryDark} />
              </Pressable>
              <Pressable accessibilityLabel={`Toggle status for ${employee.name}`} onPress={() => void changeStatus(employee)} style={styles.actionButton}>
                <Ionicons name="swap-horizontal" size={17} color={appColors.primaryDark} />
              </Pressable>
              <Pressable accessibilityLabel={`Delete ${employee.name}`} onPress={() => confirmDelete(employee)} style={[styles.actionButton, styles.deleteButton]}>
                <Ionicons name="trash-outline" size={16} color={appColors.danger} />
              </Pressable>
            </View>
          </View>
        ))}
        {visibleEmployees.length === 0 ? <Text style={styles.emptyText}>{employees.length === 0 ? 'ยังไม่มีข้อมูลพนักงาน เพิ่มพนักงานได้จากแบบฟอร์มด้านบน' : 'ไม่พบพนักงานที่ตรงกับคำค้นหา'}</Text> : null}
      </View>
      <Text style={styles.footer}>HR MANAGER · EMPLOYEE DATA PERSISTED IN MYSQL</Text>
    </ScrollView>
  );
}

const tierColors = ['#5D7BD5', '#D49A42', '#54A184'];

const styles = StyleSheet.create({
  screen: { backgroundColor: appColors.background, flex: 1 },
  content: { alignSelf: 'center', maxWidth: 1180, padding: appSpacing.page, paddingBottom: 44, width: '100%' },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  headerCopy: { flex: 1 },
  eyebrow: { color: appColors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.7, marginBottom: 7 },
  title: { color: appColors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.5 },
  subtitle: { color: appColors.muted, fontSize: 11, marginTop: 5 },
  signOutButton: { alignItems: 'center', borderColor: appColors.border, borderRadius: 11, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 39, paddingHorizontal: 11 },
  signOutText: { color: appColors.primaryDark, fontSize: 10, fontWeight: '800' },
  welcomeCard: { alignItems: 'center', backgroundColor: appColors.dark, borderRadius: appRadius.card, flexDirection: 'row', marginBottom: 15, minHeight: 119, overflow: 'hidden', padding: 21 },
  welcomeIcon: { alignItems: 'center', backgroundColor: appColors.primary, borderRadius: 15, height: 52, justifyContent: 'center', marginRight: 15, width: 52 },
  welcomeCopy: { flex: 1, minWidth: 0 },
  welcomeEyebrow: { color: '#F2B79C', fontSize: 8, fontWeight: '900', letterSpacing: 1.8 },
  welcomeTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginTop: 5 },
  welcomeText: { color: '#C2B5B1', fontSize: 10, marginTop: 5 },
  liveBadge: { alignItems: 'center', backgroundColor: '#FFFFFF16', borderRadius: 20, flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 7 },
  liveDot: { backgroundColor: '#80C39E', borderRadius: 4, height: 7, width: 7 },
  liveText: { color: '#D8EEE1', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  errorBox: { alignItems: 'center', backgroundColor: appColors.dangerSoft, borderRadius: 11, flexDirection: 'row', gap: 9, marginBottom: 14, padding: 12 },
  errorText: { color: appColors.danger, flex: 1, fontSize: 11, lineHeight: 17 },
  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
  statCard: { backgroundColor: appColors.surface, borderColor: appColors.border, borderRadius: 14, borderWidth: 1, flex: 1, minWidth: 115, padding: 14 },
  statIcon: { alignItems: 'center', borderRadius: 10, height: 34, justifyContent: 'center', marginBottom: 11, width: 34 },
  statValue: { color: appColors.ink, fontSize: 23, fontWeight: '900', fontVariant: ['tabular-nums'] },
  averageValue: { fontSize: 18 },
  statLabel: { color: appColors.muted, fontSize: 9, fontWeight: '700', marginTop: 4 },
  columns: { flexDirection: 'row', flexWrap: 'wrap', gap: 13, marginBottom: 14 },
  formCard: { backgroundColor: appColors.surface, borderColor: appColors.border, borderRadius: appRadius.card, borderWidth: 1, flex: 1.1, minWidth: 270, padding: 18 },
  sectionHeading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: appColors.ink, fontSize: 15, fontWeight: '900' },
  sectionSub: { color: appColors.muted, fontSize: 9, marginTop: 4 },
  label: { color: appColors.ink, fontSize: 10, fontWeight: '900', marginBottom: 6, marginTop: 11 },
  input: { backgroundColor: '#FFFCF9', borderColor: appColors.border, borderRadius: 9, borderWidth: 1, color: appColors.ink, fontSize: 12, minHeight: 42, paddingHorizontal: 11 },
  addButton: { alignItems: 'center', backgroundColor: appColors.primary, borderRadius: 10, flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 16, minHeight: 44 },
  addButtonText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  formStatusButton: { alignItems: 'center', alignSelf: 'flex-start', backgroundColor: appColors.primarySoft, borderRadius: 9, flexDirection: 'row', gap: 6, marginTop: 12, minHeight: 36, paddingHorizontal: 10 },
  formStatusText: { color: appColors.primaryDark, fontSize: 9, fontWeight: '800' },
  cancelEditButton: { alignItems: 'center', justifyContent: 'center', marginTop: 10, minHeight: 32 },
  cancelEditText: { color: appColors.muted, fontSize: 10, fontWeight: '800' },
  pressed: { opacity: 0.82 },
  disabled: { opacity: 0.55 },
  analysisCard: { backgroundColor: appColors.surface, borderColor: appColors.border, borderRadius: appRadius.card, borderWidth: 1, flex: 1, minWidth: 270, padding: 18 },
  analysisIcon: { alignItems: 'center', backgroundColor: appColors.primary, borderRadius: 11, height: 42, justifyContent: 'center', marginBottom: 14, width: 42 },
  analysisEyebrow: { color: appColors.primary, fontSize: 8, fontWeight: '900', letterSpacing: 1.7 },
  analysisTitle: { color: appColors.ink, fontSize: 16, fontWeight: '900', marginTop: 5 },
  analysisBody: { color: appColors.muted, fontSize: 10, lineHeight: 16, marginTop: 6 },
  analyzeButton: { alignItems: 'center', backgroundColor: '#F3E8DE', borderRadius: 10, flexDirection: 'row', gap: 8, justifyContent: 'center', marginTop: 14, minHeight: 43 },
  analyzeButtonText: { color: appColors.ink, fontSize: 10, fontWeight: '900' },
  analysisHint: { alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 13 },
  analysisHintText: { color: appColors.subtle, fontSize: 9 },
  clusterResults: { marginTop: 13 },
  clusterCard: { alignItems: 'center', borderBottomColor: appColors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 48 },
  clusterCardLast: { borderBottomWidth: 0 },
  tierDot: { borderRadius: 5, height: 9, marginRight: 9, width: 9 },
  clusterCopy: { flex: 1 },
  clusterName: { color: appColors.ink, fontSize: 10, fontWeight: '900' },
  clusterCount: { color: appColors.muted, fontSize: 8, marginTop: 3 },
  clusterSalary: { color: appColors.ink, fontSize: 11, fontWeight: '900' },
  clusterFootnote: { color: appColors.subtle, fontSize: 8, marginTop: 4 },
  listCard: { backgroundColor: appColors.surface, borderColor: appColors.border, borderRadius: appRadius.card, borderWidth: 1, marginTop: 1, overflow: 'hidden', paddingHorizontal: 17, paddingTop: 16 },
  countBadge: { backgroundColor: appColors.primarySoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  countBadgeText: { color: appColors.primaryDark, fontSize: 9, fontWeight: '900' },
  searchBox: { alignItems: 'center', backgroundColor: '#FFFCF9', borderColor: appColors.border, borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 9, marginBottom: 12, minHeight: 42, paddingHorizontal: 11 },
  searchInput: { color: appColors.ink, flex: 1, fontSize: 10, minHeight: 40, paddingVertical: 0 },
  tableHeader: { alignItems: 'center', backgroundColor: '#F8F3EF', borderRadius: 8, flexDirection: 'row', minHeight: 34, paddingHorizontal: 9 },
  tableHeading: { color: appColors.muted, fontSize: 8, fontWeight: '900' },
  employeeColumn: { flex: 1.55, minWidth: 100 },
  positionColumn: { flex: 1.2, minWidth: 75 },
  statusColumn: { alignItems: 'flex-start', flex: 0.95, minWidth: 77 },
  salaryColumn: { flex: 0.85, minWidth: 74 },
  actionsColumn: { flexDirection: 'row', flex: 1.05, justifyContent: 'flex-end', minWidth: 99 },
  employeeRow: { alignItems: 'center', borderBottomColor: appColors.border, borderBottomWidth: 1, flexDirection: 'row', minHeight: 62, paddingHorizontal: 9 },
  employeeIdentity: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingRight: 5 },
  avatar: { alignItems: 'center', backgroundColor: '#FBE5D8', borderRadius: 17, height: 33, justifyContent: 'center', width: 33 },
  avatarText: { color: appColors.primaryDark, fontSize: 11, fontWeight: '900' },
  employeeName: { color: appColors.ink, flex: 1, fontSize: 9, fontWeight: '900' },
  employeePosition: { color: appColors.muted, fontSize: 9, paddingRight: 5 },
  statusBadge: { alignItems: 'center', borderRadius: 15, flexDirection: 'row', gap: 5, paddingHorizontal: 7, paddingVertical: 5 },
  statusActive: { backgroundColor: appColors.mintSoft },
  statusLeave: { backgroundColor: '#FFF1DF' },
  statusDot: { borderRadius: 4, height: 6, width: 6 },
  statusDotActive: { backgroundColor: appColors.mint },
  statusDotLeave: { backgroundColor: '#D49A42' },
  statusText: { fontSize: 8, fontWeight: '900' },
  statusTextActive: { color: '#4C8066' },
  statusTextLeave: { color: '#A87830' },
  employeeSalary: { color: appColors.ink, fontSize: 9, fontWeight: '900' },
  actions: { alignItems: 'center', gap: 5 },
  actionButton: { alignItems: 'center', backgroundColor: '#F7EEE8', borderRadius: 8, height: 30, justifyContent: 'center', width: 30 },
  deleteButton: { backgroundColor: appColors.dangerSoft },
  emptyText: { color: appColors.muted, fontSize: 11, padding: 20, textAlign: 'center' },
  footer: { color: appColors.subtle, fontSize: 8, fontWeight: '800', letterSpacing: 1.1, marginTop: 18, textAlign: 'center' },
});
