/**
 * useNearbyHospitals — Real GPS-based hospital locator
 * Calls the DokitaAI backend which uses Google Places API (with OSM fallback).
 * API key is kept securely server-side — never exposed in the frontend bundle.
 */

export interface NearbyHospital {
  _id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  is24Hours: boolean;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  source: string;
  rating?: number;
  googleMapsUrl: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

import { safeStorage } from '../utils/storage';

/**
 * Fetch hospitals/clinics near a GPS coordinate via DokitaAI backend
 * (backend uses Google Places API with OSM fallback)
 */
export async function fetchNearbyHospitals(
  lat: number,
  lng: number,
  radiusKm = 10
): Promise<NearbyHospital[]> {
  const token = safeStorage.getItem('dokita_token');
  const url = `${API_BASE}/hospitals/nearby?lat=${lat}&lng=${lng}&radius=${radiusKm}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Hospital API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.message || 'Hospital lookup failed');

  return data.hospitals as NearbyHospital[];
}

/**
 * Search the hospital directory using a text query (city, name, search term)
 */
export async function searchHospitalsByQuery(
  query: string
): Promise<NearbyHospital[]> {
  const token = safeStorage.getItem('dokita_token');
  const url = `${API_BASE}/hospitals?search=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Hospital API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) throw new Error(data.message || 'Hospital lookup failed');

  return data.hospitals as NearbyHospital[];
}

/**
 * Format hospital results into a clean chat-readable message
 */
export function formatHospitalResults(hospitals: NearbyHospital[]): string {
  if (!hospitals || hospitals.length === 0) {
    return `I searched your GPS location but couldn't find registered hospitals nearby.\n\n**Try these instead:**\n- Search "hospitals near me" on Google Maps\n- Call national emergency line: **112** or **767**\n- Tell me your city (e.g. *"Find hospitals in Ikeja, Lagos"*)`;
  }

  const lines: string[] = [
    `📍 **Hospitals & Clinics Near You** (sorted by distance)\n`,
  ];

  hospitals.slice(0, 8).forEach((h, i) => {
    const emergencyTag = h.is24Hours ? ' 🚨 **24/7**' : '';
    const distStr = h.distanceKm != null ? `${h.distanceKm}km away` : 'nearby';
    const ratingStr = h.rating ? ` • ⭐ ${h.rating}` : '';
    const sourceStr = h.source?.includes('Google') ? ' · *Google*' : ' · *OpenStreetMap*';
    const phoneStr = h.phone && !h.phone.includes('112') ? `\n   📞 ${h.phone}` : '';

    lines.push(
      `**${i + 1}. ${h.name}**${emergencyTag}\n` +
      `   📍 ${h.address}, ${h.city}${ratingStr}${sourceStr}\n` +
      `   🚗 ${distStr}${phoneStr}\n` +
      `   [Get Directions ↗](${h.googleMapsUrl})`
    );
  });

  lines.push(
    `\n---\n⚠️ *Always call ahead to confirm availability. Life-threatening emergency? Call **112** immediately.*`
  );

  return lines.join('\n');
}

/**
 * Detect if a user message is asking for nearby hospitals
 */
export function isHospitalQuery(message: string): boolean {
  const lower = message.toLowerCase();
  const hospitalKeywords = [
    'hospital near', 'hospitals near', 'clinic near', 'clinics near',
    'hospital close', 'emergency room', 'emergency hospital',
    'nearest hospital', 'nearest clinic', 'find hospital', 'find clinic',
    'hospital around', 'doctors near', 'health centre near',
    '24/7 hospital', '24/7 emergency', 'hospital near me',
    'find me a hospital', 'where is hospital', 'hospitals around me',
    // Pidgin
    'hospital for here', 'find hospital for me', 'where i go find hospital',
    'hospital wey dey near', 'emergency for near', 'hospital near',
  ];
  return hospitalKeywords.some((kw) => lower.includes(kw));
}
