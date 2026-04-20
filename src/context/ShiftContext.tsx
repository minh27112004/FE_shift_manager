import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../lib/axios';
import { useAuth } from './AuthContext';

export interface Shift {
  id: string | number;
  name: string; // Map from store or template or note
  time: string; // Map from start_time - end_time
  date: string; // ISO format YYYY-MM-DD
  type: 'primary' | 'tertiary' | 'error'; // Map from is_emergency
  label: string;
  backendData?: any; // Keep original raw data
}

interface ShiftContextType {
  shifts: Shift[];
  isLoading: boolean;
  fetchShifts: () => Promise<void>;
  addShift: (shift: any) => Promise<void>;
  removeShift: (id: string | number) => Promise<void>;
  claimShift: (id: string | number) => Promise<void>;
}

const ShiftContext = createContext<ShiftContextType | undefined>(undefined);

export function ShiftProvider({ children }: { children: React.ReactNode }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth(); // Assume AuthContext exists and wraps this or is accessible

  const fetchShifts = useCallback(async () => {
    if (!isAuthenticated) return;
    
    setIsLoading(true);
    try {
      const response = await api.get('/shifts/');
      const rawShifts = response.data;
      
      // Transform backend data to frontend interface
      const formattedShifts: Shift[] = rawShifts.map((s: any) => {
        const timeStr = `${s.start_time?.substring(0, 5)} - ${s.end_time?.substring(0, 5)}`;
        return {
          id: s.id,
          name: s.created_by_name || 'Hệ thống',
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
      // optionally load from localstorage as fallback or show error
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const addShift = async (shiftData: any) => {
    try {
      const payload = {
        date: shiftData.date,
        start_time: shiftData.time?.split('-')[0]?.trim() + ':00',
        end_time: shiftData.time?.split('-')[1]?.trim() + ':00',
        note: shiftData.label,
        is_emergency: shiftData.type === 'error',
        max_workers: 5,
        store: 1, // hardcoded for now or fetch stores list
      };
      
      await api.post('/shifts/', payload);
      await fetchShifts();
    } catch (error) {
      console.error('Failed to create shift:', error);
      throw error;
    }
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

  return (
    <ShiftContext.Provider value={{ shifts, isLoading, fetchShifts, addShift, removeShift, claimShift }}>
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
