import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/axios';
import { useAuth } from './AuthContext';

export interface Shift {
  id: string | number;
  name: string;
  time: string;
  date: string;
  type: 'primary' | 'tertiary' | 'error';
  label: string;
  backendData?: any;
}

interface ShiftContextType {
  shifts: Shift[];
  isLoading: boolean;
  fetchShifts: () => Promise<void>;
  addShift: (shift: any) => Promise<void>;
  removeShift: (id: string | number) => Promise<void>;
  claimShift: (id: string | number) => Promise<void>;
  unclaimShift: (id: string | number) => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const fetchShifts = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const response = await api.get('/shifts/');
      const rawShifts = response.data;
      const formattedShifts: Shift[] = rawShifts.map((s: any) => {
        const timeStr = `${s.start_time?.substring(0, 5)} - ${s.end_time?.substring(0, 5)}`;
        return {
          id: s.id,
          name: s.store_address || s.store_name || 'Hệ thống',
          time: timeStr,
          date: s.date,
          type: s.is_emergency ? 'error' : (s.is_open ? 'primary' : 'tertiary'),
          label: s.note || `Ca làm (${s.assignments?.length || 0}/${s.max_workers})`,
          backendData: s
        };
      });
      setShifts(formattedShifts);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const addShift = async (shiftData: {
    date: string;
    start_time: string;
    end_time: string;
    note?: string;
    is_open?: boolean;
    is_emergency?: boolean;
    max_workers?: number;
    salary_multiplier?: string;
    store?: number;
  }) => {
    const pad = (t: string) => t.length === 5 ? t + ':00' : t;
    const payload = {
      date: shiftData.date,
      start_time: pad(shiftData.start_time),
      end_time: pad(shiftData.end_time),
      note: shiftData.note || '',
      is_open: shiftData.is_open ?? true,
      is_emergency: shiftData.is_emergency ?? false,
      max_workers: shiftData.max_workers ?? 1,
      salary_multiplier: shiftData.salary_multiplier ?? '1.00',
      store: shiftData.store ?? 1,
    };
    await api.post('/shifts/', payload);
    await fetchShifts();
  };

  const removeShift = async (id: string | number) => {
    try {
      await api.delete(`/shifts/${id}/`);
      setShifts(prev => prev.filter(s => s.id !== id));
    } catch (error) {
      console.error('Failed to delete shift:', error);
    }
  };

  const claimShift = async (id: string | number) => {
    try {
      await api.post(`/shifts/${id}/claim/`);
      await fetchShifts();
    } catch (error: any) {
      console.error('Failed to claim shift:', error);
      throw error;
    }
  };

  const unclaimShift = async (id: string | number) => {
    try {
      await api.delete(`/shifts/${id}/assignments/me/`);
      await fetchShifts();
    } catch (error: any) {
      console.error('Failed to unclaim shift:', error);
      throw error;
    }
  };

  return (
    <ShiftContext.Provider value={{ shifts, isLoading, fetchShifts, addShift, removeShift, claimShift, unclaimShift }}>
      {children}
    </ShiftContext.Provider>
  );
}

export const useShifts = () => {
  const context = useContext(ShiftContext);
  if (!context) {
    throw new Error('useShifts must be used within a ShiftProvider');
  }
  return context;
};
