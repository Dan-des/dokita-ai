import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { safeStorage } from '../utils/storage';
import { apiClient } from '../api/client';

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

const VAPID_PUBLIC_KEY = 'BI-IyOdOrPucrDn_u48HUecrFd-rOiwyCtM8ykle-zg1sU2vpZwNSjKK0FtDJ8JE7Z1kBxsFo7LgleJc9R_MbqE';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function subscribeUserToPush(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    return subscription;
  } catch (err) {
    console.warn('[Push Subscription Error]', err);
    return null;
  }
}

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

  // Whenever the authenticated user changes, load reminders from DB or localStorage
  useEffect(() => {
    const loadReminders = async () => {
      if (isAuthenticated) {
        try {
          const response = await apiClient.get('/reminders');
          if (response.data?.success) {
            setReminders(response.data.reminders.map((r: any) => ({
              id: r.reminderId,
              medication: r.medication,
              dosage: r.dosage,
              time: r.time,
              instructions: r.instructions,
              isActive: r.isActive,
              startDate: r.createdAt
            })));
            return;
          }
        } catch (err) {
          console.warn('[Sync Reminders Load Failed, falling back to local]', err);
        }
      }

      // Guest / Fallback localStorage loading
      const key = getUserKey();
      try {
        const saved = safeStorage.getItem(key);
        setReminders(saved ? JSON.parse(saved) : []);
      } catch {
        setReminders([]);
      }
    };

    loadReminders();
    setActiveAlert(null); // Clear any pending alert from previous account
  }, [getUserKey, isAuthenticated]);

  // Persist reminders to local storage only for guests
  useEffect(() => {
    if (!isAuthenticated) {
      const key = getUserKey();
      try {
        safeStorage.setItem(key, JSON.stringify(reminders));
      } catch (e) {
        console.error('[Reminder Save Error]', e);
      }
    }
  }, [reminders, getUserKey, isAuthenticated]);

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
      const id = `med_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const newReminder: MedicationReminder = {
        ...med,
        id,
        startDate: new Date().toISOString(),
        isActive: true,
      };

      setReminders((prev) => [newReminder, ...prev]);

      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted' && isAuthenticated) {
          subscribeUserToPush().then((subscription) => {
            if (subscription) {
              apiClient.post('/reminders', {
                reminderId: id,
                medication: med.medication,
                dosage: med.dosage,
                time: med.time,
                instructions: med.instructions,
                subscription,
                isActive: true
              }).catch(err => console.warn('[Backend Reminder Sync Failed]', err));
            }
          });
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((p) => {
            setNotificationPermission(p);
            if (p === 'granted' && isAuthenticated) {
              subscribeUserToPush().then((subscription) => {
                if (subscription) {
                  apiClient.post('/reminders', {
                    reminderId: id,
                    medication: med.medication,
                    dosage: med.dosage,
                    time: med.time,
                    instructions: med.instructions,
                    subscription,
                    isActive: true
                  }).catch(err => console.warn('[Backend Reminder Sync Failed]', err));
                }
              });
            }
          });
        }
      }

      return newReminder;
    },
    [isAuthenticated]
  );

  const toggleReminder = useCallback((id: string) => {
    setReminders((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          const nextActive = !r.isActive;
          if (isAuthenticated) {
            apiClient.put(`/reminders/${id}`, { isActive: nextActive })
              .catch(err => console.warn('[Backend Reminder Toggle Failed]', err));
          }
          return { ...r, isActive: nextActive };
        }
        return r;
      })
    );
  }, [isAuthenticated]);

  const deleteReminder = useCallback((id: string) => {
    setReminders((prev) => prev.filter((r) => r.id !== id));
    if (isAuthenticated) {
      apiClient.delete(`/reminders/${id}`)
        .catch(err => console.warn('[Backend Reminder Delete Failed]', err));
    }
  }, [isAuthenticated]);

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
  const remindersRef = useRef<MedicationReminder[]>(reminders);
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

      remindersRef.current.forEach((r: MedicationReminder) => {
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
              const title = `⏰ DokitaAI Medication Reminder: ${r.medication}`;
              const options = {
                body: `It's time to take your ${r.medication} (${r.dosage}). ${r.instructions || 'Stay healthy!'}`,
                icon: '/icon-192.svg',
                badge: '/favicon.svg',
                tag: `reminder-${r.id}`,
                renotify: true,
                silent: false,
                vibrate: [200, 100, 200],
              };

              // Trigger real device-level push notification if PWA Service Worker is active
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready
                  .then((registration) => {
                    registration.showNotification(title, options);
                  })
                  .catch(() => {
                    new Notification(title, options);
                  });
              } else {
                new Notification(title, options);
              }
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
