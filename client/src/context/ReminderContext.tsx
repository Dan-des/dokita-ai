import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';

export interface MedicationReminder {
  id: string;
  medication: string;
  dosage: string;
  time: string; // "HH:MM" 24h format
  instructions?: string;
  durationDays?: number;
  startDate: string;
  isActive: boolean;
  lastTriggeredDate?: string;
}

interface ReminderContextType {
  reminders: MedicationReminder[];
  addReminder: (med: Omit<MedicationReminder, 'id' | 'startDate' | 'isActive'>) => MedicationReminder;
  toggleReminder: (id: string) => void;
  deleteReminder: (id: string) => void;
  parseAndAddFromChat: (text: string) => MedicationReminder | null;
  activeAlert: MedicationReminder | null;
  dismissActiveAlert: () => void;
  requestNotificationPermission: () => Promise<boolean>;
  notificationPermission: NotificationPermission | 'default';
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export const ReminderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();

  const getUserKey = useCallback((): string => {
    const uid = user?._id || (user as any)?.id;
    return uid ? `dokita_med_reminders_user_${uid}` : 'dokita_med_reminders_guest';
  }, [user]);

  const [reminders, setReminders] = useState<MedicationReminder[]>([]);
  const [activeAlert, setActiveAlert] = useState<MedicationReminder | null>(null);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'default';
  });

  // Whenever the authenticated user changes (Login, Logout, Account Switch), reload strictly that user's reminders
  useEffect(() => {
    const key = getUserKey();
    try {
      const saved = localStorage.getItem(key);
      setReminders(saved ? JSON.parse(saved) : []);
    } catch {
      setReminders([]);
    }
    setActiveAlert(null); // Clear any pending alert from previous account
  }, [getUserKey]);

  // Persist reminders to the current user's isolated storage key
  useEffect(() => {
    const key = getUserKey();
    try {
      localStorage.setItem(key, JSON.stringify(reminders));
    } catch (e) {
      console.error('[Reminder Save Error]', e);
    }
  }, [reminders, getUserKey]);

  const requestNotificationPermission = async (): Promise<boolean> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setNotificationPermission(perm);
        return perm === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  };

  const addReminder = useCallback(
    (med: Omit<MedicationReminder, 'id' | 'startDate' | 'isActive'>): MedicationReminder => {
      const newReminder: MedicationReminder = {
        ...med,
        id: `med_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        startDate: new Date().toISOString(),
        isActive: true,
      };

      setReminders((prev) => [newReminder, ...prev]);

      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then((p) => setNotificationPermission(p));
      }

      return newReminder;
    },
    []
  );

  const toggleReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, isActive: !r.isActive } : r))
    );
  }, []);

  const deleteReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const dismissActiveAlert = useCallback(() => {
    setActiveAlert(null);
  }, []);

  // Natural Language Parser for in-chat reminder commands
  const parseAndAddFromChat = useCallback(
    (text: string): MedicationReminder | null => {
      const lower = text.toLowerCase();
      if (!lower.includes('remind') && !lower.includes('set reminder') && !lower.includes('take my')) {
        return null;
      }

      let medication = 'Medication';
      let dosage = '1 dose';
      let time = '08:00';
      let instructions = 'Take with water after meals';
      let durationDays = 5;

      const medMatch = text.match(/(?:take|use|drink)\s+([a-zA-Z0-9\s]+?)(?:\s+(?:at|every|for|in|\d+mg|\d+\s*tablet)|\s*$)/i);
      if (medMatch && medMatch[1]) {
        medication = medMatch[1].trim();
      }

      const dosageMatch = text.match(/(\d+\s*mg|\d+\s*tablets?|\d+\s*capsules?|\d+\s*ml|\d+\s*drops?)/i);
      if (dosageMatch && dosageMatch[1]) {
        dosage = dosageMatch[1].trim();
      }

      const timeMatch = text.match(/at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1], 10);
        const min = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
        const ampm = timeMatch[3]?.toLowerCase();

        if (ampm === 'pm' && hour < 12) hour += 12;
        if (ampm === 'am' && hour === 12) hour = 0;

        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMin = min.toString().padStart(2, '0');
        time = `${formattedHour}:${formattedMin}`;
      }

      const durationMatch = text.match(/for\s+(\d+)\s+days?/i);
      if (durationMatch && durationMatch[1]) {
        durationDays = parseInt(durationMatch[1], 10);
      }

      return addReminder({
        medication,
        dosage,
        time,
        instructions,
        durationDays,
      });
    },
    [addReminder]
  );

  // Stable ref for reminders to keep checkSchedule interval static without teardown cycles
  const remindersRef = useRef(reminders);
  useEffect(() => {
    remindersRef.current = reminders;
  }, [reminders]);

  // Background timer checking every 30 seconds for scheduled triggers
  useEffect(() => {
    const checkSchedule = () => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;
      const todayDateString = now.toISOString().split('T')[0];

      remindersRef.current.forEach((r) => {
        if (!r.isActive) return;

        if (r.time === currentTimeString && r.lastTriggeredDate !== todayDateString) {
          setActiveAlert(r);

          setReminders((prev) =>
            prev.map((item) =>
              item.id === r.id ? { ...item, lastTriggeredDate: todayDateString } : item
            )
          );

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(`⏰ DokitaAI Medication Reminder: ${r.medication}`, {
                body: `It's time to take your ${r.medication} (${r.dosage}). ${r.instructions || 'Stay healthy!'}`,
                icon: '/favicon.svg',
              });
            } catch (e) {
              console.error('[Notification Error]', e);
            }
          }
        }
      });
    };

    const interval = setInterval(checkSchedule, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        addReminder,
        toggleReminder,
        deleteReminder,
        parseAndAddFromChat,
        activeAlert,
        dismissActiveAlert,
        requestNotificationPermission,
        notificationPermission,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
};

export const useReminders = (): ReminderContextType => {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
};
