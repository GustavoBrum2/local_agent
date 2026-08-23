import { create } from 'zustand';
import { detectHardwareDesktop } from '@/adapters/hardware-detector';
import { hardwareToBuild } from '@/adapters/hardware-detector/hardware-to-build';
import { createOrUpdateDigitalTwin } from '@/digital-twin/service';
import { deleteDigitalTwin, loadDigitalTwin, saveDigitalTwin } from '@/digital-twin/storage';
import type { LocalDigitalTwin } from '@/digital-twin/types';
import {
  MvpRecommendationService,
  type MvpRecommendation,
  type MvpRecommendationCategory,
} from '@/services/mvp-recommendation-service';

interface DesktopState {
  twin: LocalDigitalTwin | null;
  isLoading: boolean;
  isDetecting: boolean;
  error: string | null;
  recommendationCategory: MvpRecommendationCategory;
  recommendations: MvpRecommendation[];

  initialize: () => Promise<void>;
  detect: () => Promise<void>;
  setRecommendationCategory: (category: MvpRecommendationCategory) => void;
  generateRecommendations: () => void;
  reset: () => Promise<void>;
}

const recommendationService = new MvpRecommendationService();

export const useDesktopStore = create<DesktopState>((set, get) => ({
  twin: null,
  isLoading: true,
  isDetecting: false,
  error: null,
  recommendationCategory: 'ram',
  recommendations: [],

  initialize: async () => {
    try {
      const twin = await loadDigitalTwin();
      set({ twin, isLoading: false });
    } catch (error) {
      set({
        isLoading: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  detect: async () => {
    set({ isDetecting: true, error: null });
    try {
      const detected = await detectHardwareDesktop();
      const build = hardwareToBuild(detected, get().twin?.name ?? 'Meu PC');
      const twin = createOrUpdateDigitalTwin(get().twin, build, detected);
      await saveDigitalTwin(twin);
      set({ twin, isDetecting: false, recommendations: [] });
    } catch (error) {
      set({
        isDetecting: false,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  setRecommendationCategory: (recommendationCategory) => {
    set({ recommendationCategory, recommendations: [] });
  },

  generateRecommendations: () => {
    const { twin, recommendationCategory } = get();
    if (!twin) return;
    const recommendations = recommendationService.recommend(
      twin.current.build,
      recommendationCategory,
    );
    set({ recommendations });
  },

  reset: async () => {
    await deleteDigitalTwin();
    set({ twin: null, recommendations: [], error: null });
  },
}));
