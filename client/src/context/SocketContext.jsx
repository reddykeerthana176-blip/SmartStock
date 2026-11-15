import React, { createContext, useContext, useEffect, useState } from 'react';
import { getClientSocket } from '../services/socket';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { isAuthenticated, business } = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastStockUpdate, setLastStockUpdate] = useState(null);
  const [lastSaleEvent, setLastSaleEvent] = useState(null);
  const [lastAlertEvent, setLastAlertEvent] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !business?.id) {
      setSocket(null);
      return;
    }

    const s = getClientSocket();
    setSocket(s);

    if (s) {
      const handleStockUpdated = (data) => {
        setLastStockUpdate({ ...data, timestamp: Date.now() });
      };

      const handleSaleCreated = (data) => {
        setLastSaleEvent({ ...data, timestamp: Date.now() });
      };

      const handleAlertNew = (data) => {
        setLastAlertEvent({ ...data, timestamp: Date.now() });
      };

      s.on('stock:updated', handleStockUpdated);
      s.on('sale:created', handleSaleCreated);
      s.on('alert:new', handleAlertNew);

      return () => {
        s.off('stock:updated', handleStockUpdated);
        s.off('sale:created', handleSaleCreated);
        s.off('alert:new', handleAlertNew);
      };
    }
  }, [isAuthenticated, business?.id]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        lastStockUpdate,
        lastSaleEvent,
        lastAlertEvent,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
