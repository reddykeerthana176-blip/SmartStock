import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';
import { useSocket } from '../../context/SocketContext';
import { ConnectionStatus } from './ConnectionStatus';
import api from '../../services/api';
import { Menu, Sun, Moon, Bell } from 'lucide-react';

export const Header = ({ onOpenSidebar }) => {
  const { isDark, toggleTheme } = useTheme();
  const { lastAlertEvent } = useSocket();
  const [unreadAlertCount, setUnreadAlertCount] = useState(0);

  const fetchUnreadAlerts = async () => {
    try {
      const res = await api.get('/alerts?limit=1');
      if (res.data?.success) {
        setUnreadAlertCount(res.data.data.unreadCount || 0);
      }
    } catch {
      // offline silent
    }
  };

  useEffect(() => {
    fetchUnreadAlerts();
  }, [lastAlertEvent]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/80 dark:bg-darkBg-card/80 backdrop-blur-md border-b border-gray-200/80 dark:border-darkBg-border transition-colors">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-900 dark:hover:text-white lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {/* Offline / Online Sync Status Pill */}
        <ConnectionStatus />

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle Theme"
          className="p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-darkBg-hover transition"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notifications Alert Bell */}
        <Link
          to="/alerts"
          className="relative p-2 rounded-xl text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-darkBg-hover transition"
        >
          <Bell className="w-4 h-4" />
          {unreadAlertCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};
