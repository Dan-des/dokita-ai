import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getHospitals, createHospital, deleteHospital } from '../api/hospitals';
import { getFeedbacks } from '../api/feedback';
import { Hospital, Feedback } from '../types';
import { 
  ShieldCheck, 
  Building2, 
  Plus, 
  Trash2, 
  MessageSquare, 
  Star, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Phone, 
  MapPin,
  Activity,
  Navigation
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'hospitals' | 'feedback'>('hospitals');

  // Hospitals state
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(true);
  const [showAddHospitalModal, setShowAddHospitalModal] = useState(false);
  const [newHospital, setNewHospital] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    phone: '',
    is24Hours: true,
    latitude: '',
    longitude: '',
  });
  const [isSubmittingHospital, setIsSubmittingHospital] = useState(false);
  const [hospitalMsg, setHospitalMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Feedback state
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [isLoadingFeedback, setIsLoadingFeedback] = useState(true);

  const fetchHospitalList = async () => {
    try {
      setIsLoadingHospitals(true);
      const res = await getHospitals();
      if (res.success) {
        setHospitals(res.hospitals);
      }
    } catch (err) {
      console.error('Admin fetch hospitals error:', err);
    } finally {
      setIsLoadingHospitals(false);
    }
  };

  const fetchFeedbackList = async () => {
    try {
      setIsLoadingFeedback(true);
      const res = await getFeedbacks();
      if (res.success) {
        setFeedbacks(res.feedbacks);
        setAverageRating(res.averageRating);
      }
    } catch (err) {
      console.error('Admin fetch feedbacks error:', err);
    } finally {
      setIsLoadingFeedback(false);
    }
  };

  useEffect(() => {
    fetchHospitalList();
    fetchFeedbackList();
  }, []);

  const handleCreateHospital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHospital.name || !newHospital.address || !newHospital.city || !newHospital.state || !newHospital.phone) {
      setHospitalMsg({ type: 'error', text: 'All basic hospital fields are required.' });
      return;
    }

    try {
      setIsSubmittingHospital(true);
      setHospitalMsg(null);
      const res = await createHospital({
        ...newHospital,
        latitude: newHospital.latitude ? parseFloat(newHospital.latitude) : null,
        longitude: newHospital.longitude ? parseFloat(newHospital.longitude) : null,
      });
      if (res.success) {
        setHospitalMsg({ type: 'success', text: 'Hospital entry successfully created.' });
        setNewHospital({
          name: '',
          address: '',
          city: '',
          state: '',
          phone: '',
          is24Hours: true,
          latitude: '',
          longitude: '',
        });
        setShowAddHospitalModal(false);
        fetchHospitalList();
      }
    } catch (err: any) {
      setHospitalMsg({
        type: 'error',
        text: err.response?.data?.message || 'Failed to create hospital record.',
      });
    } finally {
      setIsSubmittingHospital(false);
    }
  };

  const handleDeleteHospital = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from the hospital directory?`)) {
      return;
    }

    try {
      const res = await deleteHospital(id);
      if (res.success) {
        setHospitals((prev) => prev.filter((h) => h._id !== id));
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete hospital.');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-teal-900/60 border border-teal-700 text-teal-300 text-xs font-semibold">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Administrator Access Control (RBAC)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            DokitaAI Command & Operations
          </h1>
          <p className="text-xs text-slate-400">
            Active Administrator: <span className="text-teal-300 font-semibold">{user?.email}</span>
          </p>
        </div>

        {/* Tab Toggle */}
        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('hospitals')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'hospitals'
                ? 'bg-teal-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Hospital Directory ({hospitals.length})
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === 'feedback'
                ? 'bg-teal-700 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Feedback ({feedbacks.length})
          </button>
        </div>
      </div>

      {/* Hospital Messages */}
      {hospitalMsg && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between ${
            hospitalMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {hospitalMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{hospitalMsg.text}</span>
          </div>
          <button onClick={() => setHospitalMsg(null)} className="text-xs font-bold underline cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {/* TAB 1: HOSPITALS MANAGEMENT */}
      {activeTab === 'hospitals' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Hospital Directory Entries</h2>
              <p className="text-xs text-slate-500">
                Manage verified 24/7 hospitals and emergency clinics with GPS coordinates
              </p>
            </div>
            <button
              onClick={() => setShowAddHospitalModal(true)}
              className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hospital Entry</span>
            </button>
          </div>

          {/* Hospitals Table */}
          <div className="bg-white rounded-2xl border border-slate-300 overflow-hidden">
            {isLoadingHospitals ? (
              <div className="py-16 text-center">
                <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading directory records...</p>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No hospitals registered yet. Click "Add Hospital Entry" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-900 font-semibold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">Hospital Name</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4">GPS Coordinates</th>
                      <th className="py-3.5 px-4">Contact Phone</th>
                      <th className="py-3.5 px-4">Hours</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {hospitals.map((h) => (
                      <tr key={h._id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 sm:px-6 font-semibold text-slate-900">
                          {h.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <p>{h.address}</p>
                          <p className="text-slate-400 font-medium">{h.city}, {h.state}</p>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                          {h.latitude && h.longitude ? (
                            <span>{h.latitude.toFixed(4)}°, {h.longitude.toFixed(4)}°</span>
                          ) : (
                            <span className="text-slate-400 italic">Not set</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono">{h.phone}</td>
                        <td className="py-3.5 px-4">
                          {h.is24Hours ? (
                            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                              24/7 ER
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                              Standard
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleDeleteHospital(h._id, h.name)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Delete Hospital Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: FEEDBACK LOGS */}
      {activeTab === 'feedback' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-300">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Patient Triage Feedback Logs</h2>
              <p className="text-xs text-slate-500">
                Continuous clinical ratings and user reviews
              </p>
            </div>
            <div className="flex items-center gap-3 bg-amber-50 px-4 py-2 rounded-xl border border-amber-200">
              <div className="flex items-center gap-1 text-amber-500">
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">
                  Average Rating: {averageRating} / 5
                </p>
                <p className="text-[10px] text-amber-700">
                  Based on {feedbacks.length} submitted reviews
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoadingFeedback ? (
              <div className="col-span-full py-16 text-center">
                <Loader2 className="w-8 h-8 text-teal-700 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-500">Loading user reviews...</p>
              </div>
            ) : feedbacks.length === 0 ? (
              <div className="col-span-full p-8 text-center bg-white rounded-2xl border border-slate-300 text-xs text-slate-500">
                No user feedback submitted yet.
              </div>
            ) : (
              feedbacks.map((f) => (
                <div
                  key={f._id}
                  className="bg-white p-5 rounded-2xl border border-slate-300 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, idx) => (
                        <Star
                          key={idx}
                          className={`w-3.5 h-3.5 ${
                            idx < f.rating
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-slate-100 text-slate-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(f.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed italic">
                    "{f.comment}"
                  </p>

                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>Submitted by: {f.userId?.name || 'Guest Patient'}</span>
                    <span className="text-[10px] text-slate-400">{f.userId?.email || 'N/A'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ADD HOSPITAL MODAL */}
      {showAddHospitalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-300 overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add New Hospital Record</h3>
              <button
                onClick={() => setShowAddHospitalModal(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-semibold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateHospital} className="p-6 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Hospital Name *</label>
                <input
                  type="text"
                  required
                  value={newHospital.name}
                  onChange={(e) => setNewHospital({ ...newHospital, name: e.target.value })}
                  placeholder="e.g. National Trauma Center"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Street Address *</label>
                <input
                  type="text"
                  required
                  value={newHospital.address}
                  onChange={(e) => setNewHospital({ ...newHospital, address: e.target.value })}
                  placeholder="e.g. Plot 132 Central District"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">City *</label>
                  <input
                    type="text"
                    required
                    value={newHospital.city}
                    onChange={(e) => setNewHospital({ ...newHospital, city: e.target.value })}
                    placeholder="e.g. Abuja"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">State *</label>
                  <input
                    type="text"
                    required
                    value={newHospital.state}
                    onChange={(e) => setNewHospital({ ...newHospital, state: e.target.value })}
                    placeholder="e.g. FCT"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Emergency Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newHospital.phone}
                  onChange={(e) => setNewHospital({ ...newHospital, phone: e.target.value })}
                  placeholder="e.g. +234 9 234 8888"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-teal-700"
                />
              </div>

              {/* GPS Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Latitude (GPS) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newHospital.latitude}
                    onChange={(e) => setNewHospital({ ...newHospital, latitude: e.target.value })}
                    placeholder="e.g. 9.0436"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Longitude (GPS) <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={newHospital.longitude}
                    onChange={(e) => setNewHospital({ ...newHospital, longitude: e.target.value })}
                    placeholder="e.g. 7.4816"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-slate-50 text-xs focus:bg-white focus:outline-none focus:border-teal-700"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="is24HoursCheck"
                  checked={newHospital.is24Hours}
                  onChange={(e) => setNewHospital({ ...newHospital, is24Hours: e.target.checked })}
                  className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-700 cursor-pointer"
                />
                <label htmlFor="is24HoursCheck" className="text-slate-700 font-medium cursor-pointer">
                  Operates 24/7 Emergency Room Services
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddHospitalModal(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingHospital}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-semibold rounded-xl text-xs disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingHospital ? 'Saving...' : 'Save Hospital'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
