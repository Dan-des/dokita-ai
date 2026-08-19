import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getHospitals } from '../api/hospitals';
import { Hospital } from '../types';
import { HospitalIcon, SearchIcon, MapPinIcon, PhoneIcon, ClockIcon, LoaderIcon, NavigationIcon, ExternalLinkIcon, CompassIcon, AlertCircleIcon, CloseIcon } from '../components/Icons';

export const Hospitals: React.FC = () => {
  const location = useLocation();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [only24Hours, setOnly24Hours] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // GPS Geolocation state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationStatus, setLocationStatus] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const fetchHospitalList = async (coords = userCoords) => {
    setIsLoading(true);
    try {
      const res = await getHospitals({
        search: searchTerm || undefined,
        city: selectedCity || undefined,
        is24Hours: only24Hours ? true : undefined,
        lat: coords?.lat,
        lng: coords?.lng,
      });
      if (res.success) {
        setHospitals(res.hospitals);
      }
    } catch (err) {
      console.error('Failed to load hospitals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your current browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setLocationStatus('Accessing device GPS coordinates...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserCoords(coords);
        setIsLocating(false);
        setLocationStatus(`Coordinates: ${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°`);
        fetchHospitalList(coords);
      },
      (error) => {
        setIsLocating(false);
        setLocationStatus(null);
        if (error.code === error.PERMISSION_DENIED) {
          setLocationError('Location permission denied. Select a city or enable browser location.');
        } else {
          setLocationError('Unable to retrieve current coordinates. Showing full directory.');
        }
        fetchHospitalList(null);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleClearGPS = () => {
    setUserCoords(null);
    setLocationStatus(null);
    setLocationError(null);
    fetchHospitalList(null);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('nearMe') === 'true') {
      handleLocateMe();
    } else {
      fetchHospitalList();
    }
  }, [location.search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHospitalList(userCoords);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, selectedCity, only24Hours]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Emergency Hotlines */}
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
              <HospitalIcon className="w-3.5 h-3.5" />
              <span>Trauma Centers & Hospital Directory</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Emergency Medical Facilities & Proximity Locator
            </h1>
            <p className="text-slate-600 text-xs sm:text-sm max-w-2xl">
              Find 24/7 general hospitals, university teaching hospitals, and emergency trauma units sorted by proximity to your device.
            </p>
          </div>

          {/* GPS Button */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={isLocating}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLocating ? (
                <>
                  <LoaderIcon className="w-4 h-4 animate-spin" />
                  <span>Accessing GPS...</span>
                </>
              ) : (
                <>
                  <NavigationIcon className="w-4 h-4" />
                  <span>Locate Hospitals Near Me (GPS)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* GPS Live Status Alert */}
        {locationStatus && (
          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CompassIcon className="w-4 h-4 text-teal-700 animate-pulse shrink-0" />
              <span>
                <strong>GPS Active:</strong> {locationStatus}. Showing hospital facilities sorted by proximity.
              </span>
            </div>
            <button
              onClick={handleClearGPS}
              className="p-1 rounded-lg text-teal-800 hover:bg-teal-100 transition-colors cursor-pointer"
              title="Clear GPS sorting"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {locationError && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircleIcon className="w-4 h-4 text-amber-700 shrink-0" />
              <span>{locationError}</span>
            </div>
            <button onClick={() => setLocationError(null)} className="text-xs font-bold underline cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Emergency Hotline Callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-600 text-white flex items-center justify-center font-bold text-sm">
                112
              </div>
              <div>
                <p className="text-xs font-bold text-red-900">National Emergency</p>
                <p className="text-[11px] text-red-700 font-medium">Police, Fire & Ambulance</p>
              </div>
            </div>
            <a
              href="tel:112"
              className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <PhoneIcon className="w-4 h-4" />
            </a>
          </div>

          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-sm">
                767
              </div>
              <div>
                <p className="text-xs font-bold text-amber-900">Emergency Dispatch</p>
                <p className="text-[11px] text-amber-800 font-medium">State Ambulance & Trauma</p>
              </div>
            </div>
            <a
              href="tel:767"
              className="p-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors cursor-pointer"
            >
              <PhoneIcon className="w-4 h-4" />
            </a>
          </div>

          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-sm">
                911
              </div>
              <div>
                <p className="text-xs font-bold text-teal-900">International Paramedic</p>
                <p className="text-[11px] text-teal-800 font-medium">Emergency Response Service</p>
              </div>
            </div>
            <a
              href="tel:911"
              className="p-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg transition-colors cursor-pointer"
            >
              <PhoneIcon className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-300 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by hospital name or street..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700"
            />
          </div>

          <div className="relative">
            <MapPinIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-700/20 focus:border-teal-700 text-slate-700"
            >
              <option value="">All Cities / Regions</option>
              <option value="Abuja">Abuja (FCT)</option>
              <option value="Lagos">Lagos</option>
              <option value="Ibadan">Ibadan (Oyo)</option>
              <option value="Port Harcourt">Port Harcourt (Rivers)</option>
              <option value="Enugu">Enugu</option>
              <option value="Kaduna">Kaduna</option>
              <option value="Kano">Kano</option>
            </select>
          </div>

          <div className="flex items-center justify-between md:justify-center px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl">
            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <ClockIcon className="w-3.5 h-3.5 text-teal-700" />
              <span>Only 24/7 Emergency Facilities</span>
            </span>
            <input
              type="checkbox"
              checked={only24Hours}
              onChange={(e) => setOnly24Hours(e.target.checked)}
              className="w-4 h-4 text-teal-700 rounded border-slate-300 focus:ring-teal-700 cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Hospital Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Showing {hospitals.length} Facilities {userCoords ? '(Sorted by GPS Proximity)' : ''}
          </p>
        </div>

        {isLoading ? (
          /* Skeleton Loaders */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((sk) => (
              <div key={sk} className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4">
                <div className="h-5 w-3/4 skeleton-box" />
                <div className="h-4 w-1/2 skeleton-box" />
                <div className="h-4 w-full skeleton-box" />
                <div className="pt-4 border-t border-slate-100 flex justify-between">
                  <div className="h-4 w-1/3 skeleton-box" />
                  <div className="h-8 w-20 skeleton-box" />
                </div>
              </div>
            ))}
          </div>
        ) : hospitals.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-300 space-y-3">
            <HospitalIcon className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No Hospitals Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No matching hospital facilities were found with the applied filters. Try clearing your search or city filter.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {hospitals.map((hospital) => {
              const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
                `${hospital.name}, ${hospital.address}, ${hospital.city}, ${hospital.state}`
              )}`;

              return (
                <div
                  key={hospital._id}
                  className="bg-white rounded-2xl p-6 border border-slate-300 hover:border-teal-700 transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-bold text-slate-900 leading-tight">
                        {hospital.name}
                      </h3>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        {hospital.is24Hours ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            <ClockIcon className="w-3 h-3 text-emerald-700" />
                            24/7 ER
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium">
                            Standard
                          </span>
                        )}

                        {/* GPS Distance Badge */}
                        {hospital.distanceKm !== undefined && hospital.distanceKm !== null && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-teal-50 border border-teal-200 text-teal-900 text-[10px] font-bold">
                            <NavigationIcon className="w-2.5 h-2.5 text-teal-700 fill-teal-700" />
                            {hospital.distanceKm} km
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      <p className="flex items-start gap-2">
                        <MapPinIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{hospital.address}</span>
                      </p>
                      <p className="pl-5 text-slate-500 font-medium">
                        {hospital.city}, {hospital.state}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-mono font-medium text-slate-700 truncate">
                      {hospital.phone}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Google Maps Directions Link */}
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Get directions on Google Maps"
                      >
                        <ExternalLinkIcon className="w-3 h-3 text-slate-500" />
                        <span>Directions</span>
                      </a>

                      {/* Direct Call Button */}
                      <a
                        href={`tel:${hospital.phone}`}
                        className="px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <PhoneIcon className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
