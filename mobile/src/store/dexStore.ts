import { create } from 'zustand';
import { DetectionItem, DexEntry, ScanResult, ZoodexApi } from '../services/api';

interface DexState {
  backendUrl: string;
  isOnline: boolean;
  batterySaver: boolean;
  autoContinuousScan: boolean;
  isScanning: boolean;
  activeDetections: DetectionItem[];
  selectedDetection: DetectionItem | null;
  lastScanResult: ScanResult | null;
  unlockedPopupAnimal: DexEntry | null;
  selectedContinent: string;

  // Actions
  setBackendUrl: (url: string) => void;
  checkConnection: () => Promise<void>;
  setBatterySaver: (val: boolean) => void;
  setAutoContinuousScan: (val: boolean) => void;
  setIsScanning: (val: boolean) => void;
  setActiveDetections: (items: DetectionItem[]) => void;
  setSelectedDetection: (item: DetectionItem | null) => void;
  triggerScan: (base64Img: string) => Promise<ScanResult>;
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
  unlockedPopupAnimal: null,
  selectedContinent: 'all',

  setBackendUrl: (url: string) => {
    ZoodexApi.setBaseUrl(url);
    set({ backendUrl: url });
    get().checkConnection();
  },

  checkConnection: async () => {
    const online = await ZoodexApi.checkHealth();
    set({ isOnline: online });
  },

  setBatterySaver: (val: boolean) => set({ batterySaver: val }),
  setAutoContinuousScan: (val: boolean) => set({ autoContinuousScan: val }),
  setIsScanning: (val: boolean) => set({ isScanning: val }),
  setActiveDetections: (items: DetectionItem[]) => set({ activeDetections: items }),
  setSelectedDetection: (item: DetectionItem | null) => set({ selectedDetection: item }),
  dismissPopup: () => set({ unlockedPopupAnimal: null }),
  setSelectedContinent: (c: string) => set({ selectedContinent: c }),

  triggerScan: async (base64Img: string) => {
    set({ isScanning: true });
    try {
      const result = await ZoodexApi.scanImage(base64Img, 'pixel8a_user');
      set({
        lastScanResult: result,
        activeDetections: result.detections,
        selectedDetection: result.detections.length > 0 ? result.detections[0] : null,
        unlockedPopupAnimal: result.newly_unlocked.length > 0 ? result.newly_unlocked[0] : null,
      });
      return result;
    } finally {
      set({ isScanning: false });
    }
  },
}));
