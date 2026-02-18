import { create } from 'zustand';
import type { TerritoryLevel, ViewMode } from '../lib/types';

type FilterState = {
  indicator: string;
  level: TerritoryLevel;
  year: number;
  regionCode: string;
  ufCode: string;
  municipalityCode: string;
  search: string;
  viewMode: ViewMode;
  setFilter: (partial: Partial<Omit<FilterState, 'setFilter'>>) => void;
};

export const useFilterStore = create<FilterState>((set) => ({
  indicator: 'population',
  level: 'UF',
  year: 2022,
  regionCode: '',
  ufCode: '',
  municipalityCode: '',
  search: '',
  viewMode: 'choropleth',
  setFilter: (partial) => set((state) => ({ ...state, ...partial })),
}));

