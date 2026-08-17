import React, { useState } from 'react';
import { useReminders } from '../context/ReminderContext';
import { 
  Bell, 
  Plus, 
  Trash2, 
  Clock, 
  Pill, 
  Check, 
  AlertCircle, 
  X,
  BellRing,
  Volume2
} from 'lucide-react';

interface MedicationReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MedicationReminderModal: React.FC<MedicationReminderModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { 
    reminders, 
    addReminder, 
    toggleReminder, 
    deleteReminder, 
    requestNotificationPermission,
    notificationPermission
  } = useReminders();

  const [medication, setMedication] = useState('');
  const [dosage, setDosage] = useState('');
  const [time, setTime] = useState('08:00');
  const [durationDays, setDurationDays] = useState('5');
  const [instructions, setInstructions] = useState('Take with clean water after meals');
  const [showAddForm, setShowAddForm] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!medication.trim() || !time) return;

    addReminder({
      medication: medication.trim(),
      dosage: dosage.trim() || '1 standard dose',
      time,
      durationDays: parseInt(durationDays, 10) || 5,
      instructions: instructions.trim() || undefined,
    });

    setMedication('');
    setDosage('');
    setTime('08:00');
    setShowAddForm(false);
    setSuccessMsg('Medication reminder scheduled successfully.');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-700 text-white flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Medication Reminders</h3>
              <p className="text-[10px] text-slate-500">Automated dosage and refill alerts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Notification Permission Banner */}
          {notificationPermission !== 'granted' && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs flex items-center justify-between gap-2 text-amber-900">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Enable device push notifications for live audio chimes.</span>
              </div>
              <button
                onClick={requestNotificationPermission}
                className="px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-semibold hover:bg-amber-700 cursor-pointer shrink-0"
              >
                Allow
              </button>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Reminder Toggle Button */}
          {!showAddForm ? (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-teal-700 bg-slate-50 hover:bg-teal-50/50 text-slate-700 hover:text-teal-800 text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-teal-700" />
              <span>Add New Medication Reminder</span>
            </button>
          ) : (
            <form onSubmit={handleAdd} className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-3 text-xs">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <span className="font-bold text-slate-900">Schedule Medication</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Medication Name *</label>
                <input
                  type="text"
                  required
                  value={medication}
                  onChange={(e) => setMedication(e.target.value)}
                  placeholder="e.g. Paracetamol, Amoxicillin, Omeprazole"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Dosage</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 500mg (1 tablet)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Daily Time *</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={durationDays}
                    onChange={(e) => setDurationDays(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-teal-700"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Instructions</label>
                  <input
                    type="text"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. Take after food"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-xs focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors cursor-pointer mt-2"
              >
                Save & Activate Reminder
              </button>
            </form>
          )}

          {/* Existing Reminders List */}
          <div className="space-y-2 pt-2">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Active Schedules ({reminders.length})
            </h4>

            {reminders.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl border border-slate-200">
                <Pill className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
                <p>No medication reminders set yet.</p>
                <p className="text-[10px] text-slate-400 mt-1">
                  You can also type in chat: <em>"Remind me to take Paracetamol at 8pm"</em>
                </p>
              </div>
            ) : (
              reminders.map((r) => (
                <div
                  key={r.id}
                  className={`p-3.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                    r.isActive
                      ? 'bg-white border-slate-300'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleReminder(r.id)}
                      className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                        r.isActive
                          ? 'bg-teal-700 border-teal-700 text-white'
                          : 'border-slate-300 bg-white text-transparent'
                      }`}
                      title={r.isActive ? 'Pause Reminder' : 'Activate Reminder'}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {r.medication} <span className="text-slate-500 font-normal">({r.dosage})</span>
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-teal-700" />
                        <span className="font-semibold text-slate-700">{r.time} Daily</span>
                        {r.instructions && <span>• {r.instructions}</span>}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => deleteReminder(r.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Reminder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>Reminders trigger locally on this device</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
