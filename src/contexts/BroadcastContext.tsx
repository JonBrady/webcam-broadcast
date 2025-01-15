import React, { createContext, useContext, useState } from 'react';

interface BroadcastContextType {
  isCurrentlyBroadcasting: boolean;
  setIsCurrentlyBroadcasting: (value: boolean) => void;
}

const BroadcastContext = createContext<BroadcastContextType | undefined>(undefined);

export const BroadcastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCurrentlyBroadcasting, setIsCurrentlyBroadcasting] = useState(false);

  return (
    <BroadcastContext.Provider value={{ isCurrentlyBroadcasting, setIsCurrentlyBroadcasting }}>
      {children}
    </BroadcastContext.Provider>
  );
};

export const useBroadcast = () => {
  const context = useContext(BroadcastContext);
  if (context === undefined) {
    throw new Error('useBroadcast must be used within a BroadcastProvider');
  }
  return context;
}; 