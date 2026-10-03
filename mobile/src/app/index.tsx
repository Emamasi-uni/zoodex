import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { DexTheme } from '../constants/dexTheme';
import { useDexStore } from '../store/dexStore';
import { DexHeader } from '../components/DexHeader';
import { DetectionOverlay } from '../components/DetectionOverlay';
import { DexInfoCard } from '../components/DexInfoCard';
import { UnlockModal } from '../components/UnlockModal';
import { DetectionItem } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIEWFINDER_HEIGHT = SCREEN_WIDTH * 1.05;

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customIp, setCustomIp] = useState('');
  const isTakingPictureRef = useRef(false);

  const {
    backendUrl,
    setBackendUrl,
    checkConnection,
    isOnline,
    batterySaver,
    setBatterySaver,
    autoContinuousScan,
    setAutoContinuousScan,
    isScanning,
    activeDetections,
    selectedDetection,
    setSelectedDetection,
    triggerScan,
    unlockedPopupAnimal,
    dismissPopup,
    setSelectedContinent,
  } = useDexStore();

  useEffect(() => {
    checkConnection();
    setCustomIp(backendUrl);
  }, []);

  // Continuous auto-scan effect with strict debouncing and concurrency guard
  useEffect(() => {
    if (!autoContinuousScan) return;
    const intervalTime = batterySaver ? 4000 : 2500;
    const timer = setInterval(() => {
      if (!isScanning && !isTakingPictureRef.current && cameraReady) {
        handleCaptureAndScan();
      }
    }, intervalTime);
    return () => clearInterval(timer);
  }, [autoContinuousScan, isScanning, batterySaver, cameraReady]);

  const handleCaptureAndScan = async () => {
    if (isScanning || isTakingPictureRef.current) return;

    if (!permission?.granted || !cameraReady || !cameraRef.current) {
      console.log('Fotocamera non pronta per lo scatto.');
      return;
    }

    try {
      isTakingPictureRef.current = true;
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.25, // Compact JPEG for fast transmission to detector
        base64: true,
        shutterSound: false,
      });

      if (photo?.base64) {
        await triggerScan(photo.base64);
      }
    } catch (e) {
      console.warn('Errore scatto fotocamera:', e);
    } finally {
      isTakingPictureRef.current = false;
    }
  };

  const handleTestDemoSubject = (animalKey: string) => {
    // Allows testing recognition immediately without camera setup
    triggerScan('demo_' + animalKey);
  };

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* Authentic Pokédex Red Upper Bezel & Sensor Eye */}
      <DexHeader
        title="ZOODEX · SCANNER"
        onSettingsPress={() => setSettingsVisible(true)}
      />

      <View style={styles.content}>
        {/* Camera Viewfinder Screen with Pokédex Metallic Bezel */}
        <View style={styles.viewfinderBezel}>
          <View style={styles.screenInner}>
            {permission?.granted ? (
              <CameraView
                ref={cameraRef}
                style={StyleSheet.absoluteFill}
                facing={facing}
                enableTorch={torch}
                onCameraReady={() => setCameraReady(true)}>
                <DetectionOverlay
                  width={SCREEN_WIDTH - 24}
                  height={VIEWFINDER_HEIGHT}
                  detections={activeDetections}
                  isScanning={isScanning}
                  selectedId={selectedDetection?.id}
                  onSelectDetection={(det) => setSelectedDetection(det)}
                />
              </CameraView>
            ) : (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={48} color="#00E5FF" />
                <Text style={styles.permissionTitle}>SENSORE OTTICO SPENTO</Text>
                <Text style={styles.permissionText}>
                  Permetti a Zoodex di attivare la fotocamera per scansionare e riconoscere gli animali.
                </Text>
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={requestPermission}
                  activeOpacity={0.8}>
                  <Text style={styles.permissionBtnText}>ATTIVA FOTOCAMERA</Text>
                </TouchableOpacity>

                {/* Instant offline test button */}
                <TouchableOpacity
                  style={[styles.permissionBtn, { backgroundColor: '#334155', marginTop: 10 }]}
                  onPress={() => handleTestDemoSubject('cat')}
                  activeOpacity={0.8}>
                  <Text style={styles.permissionBtnText}>PROVA DEMO SENSORE</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Viewfinder Controls: Torch & Camera flip */}
            <View style={styles.cameraFloatingControls}>
              <TouchableOpacity
                style={[styles.floatingBtn, torch && styles.floatingBtnActive]}
                onPress={() => setTorch(!torch)}>
                <Ionicons
                  name={torch ? 'flash' : 'flash-off'}
                  size={18}
                  color={torch ? '#FFCB05' : '#FFFFFF'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.floatingBtn}
                onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                <Ionicons name="camera-reverse" size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Quick Demo Subject Selector Bar */}
            <View style={styles.demoBar}>
              <Text style={styles.demoBarLabel}>TEST RAPIDO:</Text>
              {['Gatto', 'Cane', 'Uccello', 'Orso', 'Oggetti'].map((item, idx) => (
                <TouchableOpacity
                  key={item}
                  style={styles.demoChip}
                  onPress={() => handleTestDemoSubject(item.toLowerCase())}>
                  <Text style={styles.demoChipText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Selected Detection Information Drawer */}
        {selectedDetection && (
          <DexInfoCard
            detection={selectedDetection}
            onClose={() => setSelectedDetection(null)}
            onOpenDex={(continent) => {
              setSelectedContinent(continent);
              router.push('/explore');
            }}
          />
        )}

        {/* Pokédex Lower Hardware Controls */}
        <View style={styles.controlsBezel}>
          {/* Continuous Auto-Scan Toggle Switch */}
          <View style={styles.autoScanRow}>
            <View style={styles.autoScanLabelBox}>
              <Ionicons
                name="scan-circle"
                size={20}
                color={autoContinuousScan ? '#10B981' : '#94A3B8'}
              />
              <Text style={styles.autoScanLabel}>SCANSIONE CONTINUA</Text>
            </View>
            <Switch
              value={autoContinuousScan}
              onValueChange={setAutoContinuousScan}
              trackColor={{ false: '#334155', true: '#10B981' }}
              thumbColor={autoContinuousScan ? '#FFFFFF' : '#94A3B8'}
            />
          </View>

          {/* Master Pokédex Scan Action Button */}
          <View style={styles.scanButtonArea}>
            {/* Pokédex Directional Pad (Decoration) */}
            <View style={styles.dpad}>
              <View style={styles.dpadH} />
              <View style={styles.dpadV} />
              <View style={styles.dpadCenter} />
            </View>

            {/* Big Pokédex Center Scan Button */}
            <TouchableOpacity
              style={styles.scanOuterButton}
              activeOpacity={0.7}
              disabled={isScanning}
              onPress={handleCaptureAndScan}>
              <View
                style={[
                  styles.scanInnerButton,
                  isScanning && styles.scanInnerButtonActive,
                ]}>
                {isScanning ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="scan" size={26} color="#FFFFFF" />
                    <Text style={styles.scanButtonText}>SCANSIONA</Text>
                  </>
                )}
              </View>
            </TouchableOpacity>

            {/* Catalog Shortcut Button */}
            <TouchableOpacity
              style={styles.catalogShortcutBtn}
              onPress={() => router.push('/explore')}
              activeOpacity={0.8}>
              <Ionicons name="book" size={22} color="#FFFFFF" />
              <Text style={styles.catalogShortcutText}>DEX</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Discovery Celebration Modal */}
      <UnlockModal
        animal={unlockedPopupAnimal}
        onDismiss={dismissPopup}
        onViewInDex={(continent) => {
          setSelectedContinent(continent);
          router.push('/explore');
        }}
      />

      {/* Settings Modal */}
      <Modal visible={settingsVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.settingsCard}>
            <View style={styles.settingsHeader}>
              <Ionicons name="cog" size={22} color="#DC0A2D" />
              <Text style={styles.settingsTitle}>IMPOSTAZIONI ZOODEX</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>INDIRIZZO BACKEND SERVER:</Text>
            <TextInput
              style={styles.textInput}
              value={customIp}
              onChangeText={setCustomIp}
              placeholder="es. http://192.168.1.15:8000"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={styles.inputHelp}>
              Inserisci l'IP del tuo PC sulla stessa rete Wi-Fi o l'URL Cloudflare/HuggingFace.
            </Text>

            <TouchableOpacity
              style={styles.testBtn}
              onPress={async () => {
                setBackendUrl(customIp);
                await checkConnection();
                Alert.alert(
                  isOnline ? 'Connesso!' : 'Non Raggiungibile',
                  isOnline
                    ? 'Server Zoodex collegato con successo!'
                    : 'Impossibile contattare il server. Verifica porta 8000 e Wi-Fi.'
                );
              }}>
              <Text style={styles.testBtnText}>TESTA CONNESSIONE</Text>
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <View style={styles.settingSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.switchTitle}>RISPARMIO BATTERIA</Text>
                <Text style={styles.switchDesc}>
                  Riduce il framerate e la risoluzione per preservare la batteria sul Pixel 8a.
                </Text>
              </View>
              <Switch
                value={batterySaver}
                onValueChange={setBatterySaver}
                trackColor={{ false: '#CBD5E1', true: '#FFCB05' }}
              />
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => {
                setBackendUrl(customIp);
                setSettingsVisible(false);
              }}>
              <Text style={styles.saveBtnText}>CONFERMA E CHIUDI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: DexTheme.colors.pokedexRed,
  },
  content: {
    flex: 1,
    backgroundColor: DexTheme.colors.pokedexRed,
    justifyContent: 'space-between',
  },
  viewfinderBezel: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  screenInner: {
    width: '100%',
    height: VIEWFINDER_HEIGHT,
    backgroundColor: '#0F172A',
    borderRadius: 18,
    borderWidth: 4,
    borderColor: '#334155',
    overflow: 'hidden',
    position: 'relative',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    color: '#00E5FF',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1.5,
    marginTop: 12,
  },
  permissionText: {
    color: '#94A3B8',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: DexTheme.colors.pokemonBlue,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#60A5FA',
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  cameraFloatingControls: {
    position: 'absolute',
    top: 12,
    right: 12,
    gap: 8,
  },
  floatingBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  floatingBtnActive: {
    borderColor: '#FFCB05',
    backgroundColor: 'rgba(251, 191, 36, 0.25)',
  },
  demoBar: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 10,
    gap: 6,
  },
  demoBarLabel: {
    color: '#38BDF8',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  demoChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  demoChipText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  controlsBezel: {
    backgroundColor: DexTheme.colors.pokedexRed,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 2,
    borderTopColor: DexTheme.colors.pokedexRedDeep,
  },
  autoScanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: DexTheme.colors.pokedexRedDark,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 10,
  },
  autoScanLabelBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  autoScanLabel: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  scanButtonArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  dpad: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dpadH: {
    position: 'absolute',
    width: 60,
    height: 20,
    backgroundColor: '#1E293B',
    borderRadius: 4,
  },
  dpadV: {
    position: 'absolute',
    width: 20,
    height: 60,
    backgroundColor: '#1E293B',
    borderRadius: 4,
  },
  dpadCenter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#0F172A',
  },
  scanOuterButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#CBD5E1',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  scanInnerButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: DexTheme.colors.pokemonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#3B82F6',
  },
  scanInnerButtonActive: {
    backgroundColor: '#1D4ED8',
  },
  scanButtonText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 9,
    letterSpacing: 1,
    marginTop: 2,
  },
  catalogShortcutBtn: {
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#475569',
  },
  catalogShortcutText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  settingsCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#0F172A',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#475569',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0F172A',
  },
  inputHelp: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 4,
    marginBottom: 12,
  },
  testBtn: {
    backgroundColor: '#0F172A',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  testBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 16,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  switchDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    paddingRight: 10,
  },
  saveBtn: {
    backgroundColor: DexTheme.colors.pokedexRed,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
});
