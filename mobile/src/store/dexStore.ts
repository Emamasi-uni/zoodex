import { create } from 'zustand';
import { AnimalCandidate, DetectionItem, DexEntry, ScanResult, ZoodexApi } from '../services/api';

interface DexState {
  backendUrl: string;
  isOnline: boolean;
  batterySaver: boolean;
  autoContinuousScan: boolean;
  isScanning: boolean;
  activeDetections: DetectionItem[];
  selectedDetection: DetectionItem | null;
  lastScanResult: ScanResult | null;
  confirmCandidate: AnimalCandidate | null;
  unlockedPopupAnimal: DexEntry | null;
  selectedContinent: string;

  // Actions
  setBackendUrl: (url: string) => Promise<boolean>;
  checkConnection: () => Promise<boolean>;
  setBatterySaver: (val: boolean) => void;
  setAutoContinuousScan: (val: boolean) => void;
  setIsScanning: (val: boolean) => void;
  setActiveDetections: (items: DetectionItem[]) => void;
  setSelectedDetection: (item: DetectionItem | null) => void;
  setConfirmCandidate: (candidate: AnimalCandidate | null) => void;
  confirmAndUnlock: (candidate: AnimalCandidate) => Promise<void>;
  triggerScan: (base64Img: string, askConfirmation?: boolean) => Promise<ScanResult>;
  dismissPopup: () => void;
  setSelectedContinent: (c: string) => void;
}

export const useDexStore = create<DexState>((set, get) => ({
  backendUrl: ZoodexApi.getBaseUrl(),
  isOnline: false,
  batterySaver: false,
  autoContinuousScan: false,
  isScanning: false,
  activeDetections: [],
  selectedDetection: null,
  lastScanResult: null,
  confirmCandidate: null,
  unlockedPopupAnimal: null,
  selectedContinent: 'all',

  setBackendUrl: async (url: string): Promise<boolean> => {
    ZoodexApi.setBaseUrl(url);
    const cleaned = ZoodexApi.getBaseUrl();
    set({ backendUrl: cleaned });
    return await get().checkConnection();
  },

  checkConnection: async (): Promise<boolean> => {
    const online = await ZoodexApi.checkHealth();
    set({ isOnline: online });
    return online;
  },

  setBatterySaver: (val: boolean) => set({ batterySaver: val }),
  setAutoContinuousScan: (val: boolean) => set({ autoContinuousScan: val }),
  setIsScanning: (val: boolean) => set({ isScanning: val }),
  setActiveDetections: (items: DetectionItem[]) => set({ activeDetections: items }),
  setSelectedDetection: (item: DetectionItem | null) => set({ selectedDetection: item }),
  setConfirmCandidate: (candidate: AnimalCandidate | null) => set({ confirmCandidate: candidate }),
  dismissPopup: () => set({ unlockedPopupAnimal: null }),
  setSelectedContinent: (c: string) => set({ selectedContinent: c }),

  confirmAndUnlock: async (candidate: AnimalCandidate) => {
    try {
      await ZoodexApi.unlockAnimal(candidate.dex_number, 'pixel8a_user');
      set({
        confirmCandidate: null,
        unlockedPopupAnimal: candidate,
      });
    } catch (e) {
      console.warn('Errore conferma sblocco:', e);
      set({ confirmCandidate: null });
    }
  },

  triggerScan: async (base64Img: string, askConfirmation: boolean = false) => {
    set({ isScanning: true });
    try {
      const result = await ZoodexApi.scanImage(base64Img, 'pixel8a_user');
      const currentSelected = get().selectedDetection;
      let updatedSelected: DetectionItem | null = null;
      if (currentSelected) {
        updatedSelected = result.detections.find((d) => d.id === currentSelected.id) || null;
      }

      // If manual scan was pressed or explicit confirmation requested:
      let nextCandidate: AnimalCandidate | null = get().confirmCandidate;
      if (askConfirmation && result.candidates && result.candidates.length > 0) {
        // Pick the top detected candidate
        nextCandidate = result.candidates[0];
      }

      set({
        lastScanResult: result,
        activeDetections: result.detections,
        selectedDetection: updatedSelected,
        confirmCandidate: nextCandidate,
      });
      return result;
    } finally {
      set({ isScanning: false });
    }
  },
}));
