/**
 * useNearbyHospitals — Real GPS-based hospital locator using OpenStreetMap Overpass API
 * Free, no API key required, works worldwide.
 */

export interface NearbyHospital {
  id: number;
  name: string;
  type: string;
  distance: number; // in km
  address?: string;
  phone?: string;
  emergency?: boolean;
  lat: number;
  lng: number;
  mapsUrl: string;
}

/**
 * Haversine formula — calculate km distance between two GPS coordinates
 */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch hospitals/clinics near a GPS coordinate using OpenStreetMap Overpass API
 */
export async function fetchNearbyHospitals(
  lat: number,
  lng: number,
  radiusMeters = 5000
): Promise<NearbyHospital[]> {
  const query = `
    [out:json][timeout:20];
    (
      node["amenity"~"hospital|clinic|doctors|health_centre|pharmacy"](around:${radiusMeters},${lat},${lng});
      way["amenity"~"hospital|clinic|doctors|health_centre"](around:${radiusMeters},${lat},${lng});
    );
    out center tags;
  `;

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('Overpass API error');

  const data = await response.json();
  const elements: any[] = data.elements || [];

  const results: NearbyHospital[] = elements
    .map((el: any) => {
      const elLat = el.lat ?? el.center?.lat;
      const elLng = el.lon ?? el.center?.lon;
      if (!elLat || !elLng) return null;

      const tags = el.tags || {};
      const name = tags.name || tags['name:en'] || 'Unnamed Facility';
      const amenity = tags.amenity || 'health_facility';
      const distance = haversineKm(lat, lng, elLat, elLng);
      const emergency = tags.emergency === 'yes' || amenity === 'hospital';

      return {
        id: el.id,
        name,
        type: amenity.replace(/_/g, ' '),
        distance: Math.round(distance * 10) / 10,
        address: [tags['addr:street'], tags['addr:city']].filter(Boolean).join(', ') || undefined,
        phone: tags.phone || tags['contact:phone'] || undefined,
        emergency,
        lat: elLat,
        lng: elLng,
        mapsUrl: `https://www.google.com/maps/search/?api=1&query=${elLat},${elLng}`,
      } as NearbyHospital;
    })
    .filter(Boolean) as NearbyHospital[];

  // Sort by distance, hospitals first
  return results
    .sort((a, b) => {
      if (a.emergency && !b.emergency) return -1;
      if (!a.emergency && b.emergency) return 1;
      return a.distance - b.distance;
    })
    .slice(0, 10);
}

/**
 * Format hospital results into a clean chat-readable message
 */
export function formatHospitalResults(hospitals: NearbyHospital[], userLat: number, userLng: number): string {
  if (hospitals.length === 0) {
    return `I searched within 5km of your GPS location but couldn't find any registered hospitals or clinics in OpenStreetMap's database for your area.\n\n**What you can do:**\n- Try Google Maps and search "hospitals near me"\n- Call the national emergency line: **112** or **767**\n- Ask me for specific hospital names in your city`;
  }

  const lines = [
    `📍 **Verified Facilities Near Your Location** (within 5km)\n`,
    ...hospitals.slice(0, 8).map((h, i) => {
      const emergencyTag = h.emergency ? ' 🚨 **[24/7 Emergency]**' : '';
      const phoneStr = h.phone ? `\n   📞 ${h.phone}` : '';
      const addressStr = h.address ? `\n   📌 ${h.address}` : '';
      return `**${i + 1}. ${h.name}**${emergencyTag}\n   🏥 ${h.type} • ${h.distance}km away${addressStr}${phoneStr}\n   [Open in Maps](${h.mapsUrl})`;
    }),
    `\n---\n⚠️ *Data from OpenStreetMap. Always call ahead to confirm availability. For life-threatening emergencies, call **112** immediately.*`,
  ];

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
    'find me a hospital', 'where is hospital',
    // Pidgin
    'hospital for here', 'find hospital for me', 'where i go find hospital',
    'hospital wey dey near', 'emergency for near',
  ];
  return hospitalKeywords.some((kw) => lower.includes(kw));
}
