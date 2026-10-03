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
  Image,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const DEFAULT_VIEWFINDER_HEIGHT = SCREEN_HEIGHT * 0.58;
const INSPECT_VIEWFINDER_HEIGHT = SCREEN_HEIGHT * 0.43;

export default function ScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<any>(null);

  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [torch, setTorch] = useState<boolean>(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [customIp, setCustomIp] = useState('');
  const [capturedPhotoUri, setCapturedPhotoUri] = useState<string | null>(null);
  const [scanNotice, setScanNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<any>(null);
  const isTakingPictureRef = useRef(false);

  const {
    backendUrl,
    setBackendUrl,
    checkConnection,
    isOnline,
    batterySaver,
    setBatterySaver,
    isScanning,
    activeDetections,
    selectedDetection,
    setSelectedDetection,
    triggerScan,
    confirmAndUnlock,
    unlockedPopupAnimal,
    dismissPopup,
    setSelectedContinent,
  } = useDexStore();

  useEffect(() => {
    checkConnection();
    setCustomIp(backendUrl);
  }, []);

  const showNotice = (msg: string) => {
    setScanNotice(msg);
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = setTimeout(() => setScanNotice(null), 3500);
  };

  const unfreezeCamera = () => {
    setCapturedPhotoUri(null);
    setSelectedDetection(null);
    setScanNotice(null);
    useDexStore.getState().setActiveDetections([]);
  };

  const handleManualScan = async () => {
    if (isScanning || isTakingPictureRef.current) return;
    if (!permission?.granted || !cameraReady || !cameraRef.current) {
      showNotice('Sensore ottico non pronto');
      return;
    }

    try {
      isTakingPictureRef.current = true;
      // Close any previously opened card
      setSelectedDetection(null);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.35,
        base64: true,
        shutterSound: true,
      });

      if (photo?.base64) {
        // Freeze frame with captured photo so contours align with the exact snapped image!
        if (photo.uri) {
          setCapturedPhotoUri(photo.uri);
        }

        const res = await triggerScan(photo.base64, false);

        if (res.detections && res.detections.length > 0) {
          const animalDets = res.detections.filter((d) => d.is_animal);
          if (animalDets.length > 0) {
            showNotice(
              `Rilevato: ${animalDets[0].dex_entry?.name || animalDets[0].class_name}. Tocca l'elemento per ispezionarlo.`
            );
          } else {
            showNotice('Elementi rilevati. Tocca il riquadro per i dettagli.');
          }
        } else {
          showNotice('Nessun bersaglio identificato. Prova ad avvicinarti al soggetto.');
        }
      }
    } catch (e) {
      console.warn('Errore scatto manuale:', e);
      showNotice('Errore durante l\'acquisizione del fotogramma');
    } finally {
      isTakingPictureRef.current = false;
    }
  };

  // Viewfinder height dynamically adjusts when inspecting to give DexInfoCard perfect breathing room
  const currentViewfinderHeight = selectedDetection
    ? INSPECT_VIEWFINDER_HEIGHT
    : DEFAULT_VIEWFINDER_HEIGHT;

  return (
    <SafeAreaView style={styles.safeContainer} edges={['top']}>
      {/* High-Tech Clean DexHeader */}
      <DexHeader
        title="ZOODEX · BIO-SCANNER"
        onSettingsPress={() => setSettingsVisible(true)}
      />

      <View style={styles.mainContainer}>
        {/* Floating Scan Notice Toast */}
        {scanNotice && (
          <View style={styles.toastNoticeBox}>
            <Ionicons name="information-circle-outline" size={16} color="#00E5FF" />
            <Text style={styles.toastNoticeText}>{scanNotice}</Text>
          </View>
        )}

        {/* Viewfinder Screen with Cybernetic Frame */}
        <View style={[styles.viewfinderWrapper, { height: currentViewfinderHeight }]}>
          <View style={styles.screenInner}>
            {permission?.granted ? (
              <View style={StyleSheet.absoluteFill}>
                {/* CameraView is ALWAYS mounted so shutter never fails or crashes */}
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing={facing}
                  enableTorch={torch}
                  onCameraReady={() => setCameraReady(true)}
                />

                {/* Frozen image overlay on top of camera after scan with tap-to-unfreeze */}
                {capturedPhotoUri && (
                  <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={() => {
                      if (selectedDetection) {
                        setSelectedDetection(null);
                      } else {
                        unfreezeCamera();
                      }
                    }}>
                    <Image
                      source={{ uri: capturedPhotoUri }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                )}

                {/* SVG Segmentation Contours & HUD Target Overlay */}
                <DetectionOverlay
                  width={SCREEN_WIDTH - 20}
                  height={currentViewfinderHeight}
                  detections={activeDetections}
                  isScanning={isScanning}
                  selectedId={selectedDetection?.id}
                  onSelectDetection={(det) => {
                    setSelectedDetection(det);
                  }}
                />
              </View>
            ) : (
              <View style={styles.permissionBox}>
                <Ionicons name="camera-outline" size={44} color="#00E5FF" />
                <Text style={styles.permissionTitle}>SENSORE OTTICO NON ATTIVO</Text>
                <Text style={styles.permissionText}>
                  Autorizza l'accesso alla fotocamera per analizzare e segmentare gli elementi inquadrati.
                </Text>
                <TouchableOpacity
                  style={styles.permissionBtn}
                  onPress={requestPermission}
                  activeOpacity={0.8}>
                  <Text style={styles.permissionBtnText}>ABILITA FOTOCAMERA</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Top Floating Controls Bar */}
            <View style={styles.floatingTopBar}>
              {capturedPhotoUri ? (
                <TouchableOpacity
                  style={[styles.statusBadge, styles.statusBadgeUnlockBtn]}
                  onPress={unfreezeCamera}
                  activeOpacity={0.8}>
                  <Ionicons name="videocam-outline" size={13} color="#00E5FF" />
                  <Text style={styles.statusBadgeUnlockText}>SBLOCCA CAMERA</Text>
                  <Ionicons name="close-circle" size={14} color="#38BDF8" />
                </TouchableOpacity>
              ) : (
                <View style={styles.statusBadge}>
                  <View
                    style={[
                      styles.pulsingDot,
                      isScanning ? styles.dotScanning : styles.dotReady,
                    ]}
                  />
                  <Text style={styles.statusBadgeText}>
                    {isScanning ? 'ELABORAZIONE...' : 'SENSORE OTTICO PRONTO'}
                  </Text>
                </View>
              )}

              <View style={styles.cameraActionButtons}>
                <TouchableOpacity
                  style={[styles.floatingBtn, torch && styles.floatingBtnActive]}
                  onPress={() => setTorch(!torch)}>
                  <Ionicons
                    name={torch ? 'flash' : 'flash-off-outline'}
                    size={16}
                    color={torch ? '#FFCB05' : '#FFFFFF'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.floatingBtn}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                  <Ionicons name="camera-reverse-outline" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Bottom Viewfinder Telemetry Bar */}
            <View style={styles.telemetryBar}>
              <View style={styles.telemetryItem}>
                <Text style={styles.telemetryLabel}>ELEMENTI SCONTORNATI:</Text>
                <Text style={styles.telemetryValue}>{activeDetections.length}</Text>
              </View>

              {capturedPhotoUri && (
                <TouchableOpacity
                  style={styles.unfreezePillBtn}
                  onPress={unfreezeCamera}
                  activeOpacity={0.8}>
                  <Ionicons name="eye-outline" size={12} color="#00E5FF" />
                  <Text style={styles.unfreezePillText}>TORNA DAL VIVO</Text>
                </TouchableOpacity>
              )}

              {isScanning && (
                <View style={styles.scanningMiniSpinner}>
                  <ActivityIndicator size="small" color="#00E5FF" />
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Selected Biometric Inspection Card with Expand to Full-Screen */}
        {selectedDetection && (
          <DexInfoCard
            detection={selectedDetection}
            onClose={() => setSelectedDetection(null)}
            onOpenDex={(continent) => {
              setSelectedContinent(continent);
              router.push('/explore');
            }}
            onConfirmUnlock={(animal) => {
              confirmAndUnlock({
                ...animal,
                confidence: selectedDetection.confidence,
              });
              setSelectedDetection(null);
            }}
          />
        )}

        {/* Bottom Navigation Console with Single "SCANSIONA" Button */}
        <View style={styles.bottomConsole}>
          {/* Left: Global Fauna Catalog */}
          <TouchableOpacity
            style={styles.sideConsoleBtn}
            onPress={() => router.push('/explore')}
            activeOpacity={0.8}>
            <Ionicons name="albums-outline" size={20} color="#FFFFFF" />
            <Text style={styles.sideConsoleBtnText}>ZOODEX</Text>
          </TouchableOpacity>

          {/* Center: The Single Dedicated "SCANSIONA" Button */}
          <TouchableOpacity
            style={[styles.scanTriggerBtn, isScanning && styles.scanTriggerBtnActive]}
            onPress={handleManualScan}
            disabled={isScanning}
            activeOpacity={0.85}>
            <View style={styles.scanTriggerOuterRing}>
              <View
                style={[
                  styles.scanTriggerInnerCore,
                  isScanning && styles.scanTriggerCoreActive,
                ]}>
                <Ionicons
                  name={isScanning ? 'sync-outline' : 'scan-sharp'}
                  size={26}
                  color="#FFFFFF"
                />
              </View>
            </View>
            <Text style={styles.scanTriggerLabel}>
              {isScanning ? 'ANALISI...' : 'SCANSIONA'}
            </Text>
          </TouchableOpacity>

          {/* Right: Settings and Configuration */}
          <TouchableOpacity
            style={styles.sideConsoleBtn}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.8}>
            <Ionicons name="settings-outline" size={20} color="#94A3B8" />
            <Text style={[styles.sideConsoleBtnText, { color: '#94A3B8' }]}>OPZIONI</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Discovery Celebration Modal with Real Animal Photo */}
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
              <Text style={styles.settingsTitle}>CONFIGURAZIONE SISTEMA</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>SERVER BACKEND IP:</Text>
            <TextInput
              style={styles.textInput}
              value={customIp}
              onChangeText={setCustomIp}
              placeholder="es. http://192.168.1.65:8000"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.testBtn}
              onPress={async () => {
                const isNowOnline = await setBackendUrl(customIp);
                Alert.alert(
                  isNowOnline ? 'Connessione Riuscita' : 'Server Non Raggiungibile',
                  isNowOnline
                    ? 'Il Bio-Scanner è collegato con successo al server di elaborazione YOLO!'
                    : 'Impossibile raggiungere il server. Verifica l\'URL inserito e la connessione internet.'
                );
              }}>
              <Text style={styles.testBtnText}>TEST CONNESSIONE</Text>
            </TouchableOpacity>

            <View style={styles.settingDivider} />

            <View style={styles.settingSwitchRow}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.switchTitle}>RISPARMIO ENERGETICO PIXEL 8A</Text>
                <Text style={styles.switchDesc}>
                  Ottimizza la compressione delle immagini scansionate per preservare la batteria.
                </Text>
              </View>
              <Switch
                value={batterySaver}
                onValueChange={setBatterySaver}
                trackColor={{ false: '#334155', true: '#10B981' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <TouchableOpacity
              style={styles.saveBtn}
              onPress={() => setSettingsVisible(false)}>
              <Text style={styles.saveBtnText}>CONFERMA</Text>
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
  mainContainer: {
    flex: 1,
    backgroundColor: DexTheme.colors.pokedexRedDeep,
    justifyContent: 'space-between',
  },
  toastNoticeBox: {
    position: 'absolute',
    top: 10,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.95)',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#00E5FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 99,
    elevation: 10,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  toastNoticeText: {
    color: '#E2E8F0',
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
    lineHeight: 16,
  },
  viewfinderWrapper: {
    marginHorizontal: 10,
    marginTop: 6,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    borderWidth: 2.5,
    borderColor: '#334155',
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  screenInner: {
    flex: 1,
    backgroundColor: '#020617',
    position: 'relative',
  },
  permissionBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#090D16',
  },
  permissionTitle: {
    color: '#F8FAFC',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    marginTop: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    color: '#94A3B8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  permissionBtn: {
    backgroundColor: '#0284C7',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#38BDF8',
  },
  permissionBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.8,
  },
  floatingTopBar: {
    position: 'absolute',
    top: 10,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 6,
  },
  pulsingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  dotReady: {
    backgroundColor: '#10B981',
  },
  dotScanning: {
    backgroundColor: '#00E5FF',
  },
  dotCaptured: {
    backgroundColor: '#FBBF24',
  },
  statusBadgeText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  statusBadgeUnlockBtn: {
    backgroundColor: 'rgba(15, 23, 42, 0.94)',
    borderWidth: 1.5,
    borderColor: '#00E5FF',
    gap: 6,
  },
  statusBadgeUnlockText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.8,
  },
  unfreezePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#00E5FF',
    gap: 4,
  },
  unfreezePillText: {
    color: '#00E5FF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cameraActionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  floatingBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  floatingBtnActive: {
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
    borderColor: '#00E5FF',
  },
  telemetryBar: {
    position: 'absolute',
    bottom: 6,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  telemetryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  telemetryLabel: {
    color: '#94A3B8',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  telemetryValue: {
    color: '#00E5FF',
    fontSize: 10,
    fontWeight: '900',
  },
  scanningMiniSpinner: {
    paddingRight: 4,
  },
  bottomConsole: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingBottom: 16,
    paddingTop: 4,
  },
  sideConsoleBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E293B',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    minWidth: 80,
    gap: 4,
  },
  sideConsoleBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 0.8,
  },
  scanTriggerBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -14,
  },
  scanTriggerBtnActive: {
    opacity: 0.85,
  },
  scanTriggerOuterRing: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: 'rgba(220, 10, 45, 0.28)',
    borderWidth: 2.5,
    borderColor: '#00E5FF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
  },
  scanTriggerInnerCore: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: DexTheme.colors.pokedexRed,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTriggerCoreActive: {
    backgroundColor: DexTheme.colors.pokemonBlue,
    borderColor: '#00E5FF',
  },
  scanTriggerLabel: {
    color: '#F8FAFC',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 1.2,
    marginTop: 4,
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
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#F8FAFC',
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: '#FFFFFF',
  },
  testBtn: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  testBtnText: {
    color: '#38BDF8',
    fontWeight: '800',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  settingDivider: {
    height: 1,
    backgroundColor: '#334155',
    marginVertical: 16,
  },
  settingSwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  switchTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  switchDesc: {
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: DexTheme.colors.pokemonBlue,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
});
