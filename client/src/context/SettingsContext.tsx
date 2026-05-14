import React, { createContext, useContext, useState } from 'react';

interface SettingsContextType {
  isBlindMode: boolean;
  toggleBlindMode: () => void;
  initialBalance: number;
  setInitialBalance: (val: number) => void;
  maxDailyLoss: number;
  setMaxDailyLoss: (val: number) => void;
  maxConsecutiveLosses: number;
  setMaxConsecutiveLosses: (val: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [isBlindMode, setIsBlindMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('isBlindMode');
    return saved ? JSON.parse(saved) : false;
  });

  const [initialBalance, setInitialBalanceState] = useState<number>(() => {
    const saved = localStorage.getItem('initialBalance');
    return saved ? parseFloat(saved) : 10000;
  });

  const [maxDailyLoss, setMaxDailyLossState] = useState<number>(() => {
    const saved = localStorage.getItem('maxDailyLoss');
    return saved ? parseFloat(saved) : 500;
  });

  const [maxConsecutiveLosses, setMaxConsecutiveLossesState] = useState<number>(() => {
    const saved = localStorage.getItem('maxConsecutiveLosses');
    return saved ? parseInt(saved, 10) : 3;
  });

  const toggleBlindMode = () => {
    setIsBlindMode(prev => {
      const next = !prev;
      localStorage.setItem('isBlindMode', JSON.stringify(next));
      return next;
    });
  };

  const setInitialBalance = (val: number) => {
    setInitialBalanceState(val);
    localStorage.setItem('initialBalance', val.toString());
  };

  const setMaxDailyLoss = (val: number) => {
    setMaxDailyLossState(val);
    localStorage.setItem('maxDailyLoss', val.toString());
  };

  const setMaxConsecutiveLosses = (val: number) => {
    setMaxConsecutiveLossesState(val);
    localStorage.setItem('maxConsecutiveLosses', val.toString());
  };

  return (
    <SettingsContext.Provider value={{ 
      isBlindMode, toggleBlindMode, 
      initialBalance, setInitialBalance,
      maxDailyLoss, setMaxDailyLoss,
      maxConsecutiveLosses, setMaxConsecutiveLosses
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
