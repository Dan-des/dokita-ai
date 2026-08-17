const axios = require('axios');
const Hospital = require('../models/Hospital');

/**
 * Calculate geographical distance in kilometers using the Haversine formula
 */
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Query Nominatim / OpenStreetMap Search API for fast live hospital results (<1s)
 */
const queryNominatimHospitals = async (lat, lng, radiusKm = 30) => {
  // Approximate 1 deg latitude ~= 111km, 1 deg longitude ~= 111 * cos(lat)
  const degDelta = radiusKm / 111;
  const minLat = lat - degDelta;
  const maxLat = lat + degDelta;
  const minLng = lng - degDelta;
  const maxLng = lng + degDelta;

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&viewbox=${minLng},${maxLat},${maxLng},${minLat}&bounded=1&limit=25&addressdetails=1`;

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'DokitaAI-Medical-App/1.0 (contact@dokita.ai)',
        'Accept-Language': 'en',
      },
      timeout: 5000,
    });

    const items = response.data || [];
    return items.map((item) => {
      const itemLat = parseFloat(item.lat);
      const itemLng = parseFloat(item.lon);
      const distance = calculateDistanceKm(lat, lng, itemLat, itemLng);
      const addr = item.address || {};
      const name = item.name || item.display_name.split(',')[0];
      const city = addr.city || addr.town || addr.county || addr.state || 'Local Area';
      const street = [addr.house_number, addr.road, addr.suburb].filter(Boolean).join(' ') || item.display_name;

      return {
        _id: `osm_nom_${item.place_id}`,
        name: name.trim(),
        address: street.trim(),
        city: city.trim(),
        state: addr.state || 'Emergency District',
        phone: '+234 112 / 767 (Emergency Line)',
        is24Hours: true,
        latitude: itemLat,
        longitude: itemLng,
        distanceKm: distance,
        source: 'Live OpenStreetMap Geospatial Service',
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${name}, ${street}`
        )}`,
      };
    });
  } catch (err) {
    console.warn(`[Nominatim Live Map] Query notice: ${err.message}`);
    return [];
  }
};

/**
 * Query OpenStreetMap Overpass Live API for detailed tagging
 */
const queryOverpassHospitals = async (lat, lng, radiusMeters = 25000) => {
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json][timeout:10];
    (
      node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      way["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
      node["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
      way["healthcare"="hospital"](around:${radiusMeters},${lat},${lng});
    );
    out center 20;
  `;

  try {
    const response = await axios.post(
      overpassUrl,
      `data=${encodeURIComponent(query)}`,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'DokitaAI/1.0 (Clinical Triage Platform)',
        },
        timeout: 8000,
      }
    );

    const elements = response.data?.elements || [];
    const results = [];

    for (const elem of elements) {
      const tags = elem.tags || {};
      const name = tags.name || tags['name:en'] || tags.operator;
      if (!name) continue;

      const itemLat = elem.lat || elem.center?.lat;
      const itemLng = elem.lon || elem.center?.lon;
      if (itemLat == null || itemLng == null) continue;

      const street = tags['addr:street'] || tags['addr:road'] || '';
      const housenumber = tags['addr:housenumber'] || '';
      const suburb = tags['addr:suburb'] || tags['addr:district'] || '';
      const city = tags['addr:city'] || tags['addr:town'] || suburb || 'Local District';
      const state = tags['addr:state'] || 'Emergency Medical District';

      let address = [housenumber, street, suburb].filter(Boolean).join(' ');
      if (!address) {
        address = `${name} Area, ${city}`;
      }

      const phone =
        tags.phone ||
        tags['contact:phone'] ||
        tags['emergency:phone'] ||
        '+234 112 (Emergency Line)';

      const is24Hours =
        tags.opening_hours === '24/7' ||
        tags.emergency === 'yes' ||
        tags.healthcare === 'hospital' ||
        tags.amenity === 'hospital';

      const distance = calculateDistanceKm(lat, lng, itemLat, itemLng);

      results.push({
        _id: `osm_${elem.id}`,
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        phone: phone.trim(),
        is24Hours: Boolean(is24Hours),
        latitude: itemLat,
        longitude: itemLng,
        distanceKm: distance,
        source: 'Live OpenStreetMap Geospatial Service',
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${name}, ${address}`
        )}`,
      });
    }

    return results;
  } catch (error) {
    return [];
  }
};

/**
 * Query Google Places Nearby Search API if GOOGLE_MAPS_API_KEY is configured
 */
const queryGooglePlacesHospitals = async (lat, lng, radiusMeters = 25000, apiKey) => {
  const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radiusMeters}&type=hospital&key=${apiKey}`;

  try {
    const response = await axios.get(url, { timeout: 8000 });
    const results = response.data?.results || [];

    return results.map((place) => {
      const itemLat = place.geometry?.location?.lat;
      const itemLng = place.geometry?.location?.lng;
      const distance = calculateDistanceKm(lat, lng, itemLat, itemLng);

      return {
        _id: `gplace_${place.place_id}`,
        name: place.name,
        address: place.vicinity || 'Local Area',
        city: 'Local Area',
        state: 'Emergency Zone',
        phone: '+234 112 / 767',
        is24Hours: place.opening_hours?.open_now !== false,
        latitude: itemLat,
        longitude: itemLng,
        distanceKm: distance,
        source: 'Live Google Places API',
        rating: place.rating,
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          place.name
        )}&query_place_id=${place.place_id}`,
      };
    });
  } catch (err) {
    console.warn(`[Google Places] Live query notice: ${err.message}`);
    return [];
  }
};

/**
 * Master dynamic live map locator
 * Dynamically queries Google Places (if key provided), Nominatim, Overpass, and local verified DB
 */
const findNearbyHospitals = async (lat, lng, radiusKm = 30) => {
  const radiusMeters = Math.min(Math.max(radiusKm * 1000, 5000), 50000);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;

  let liveResults = [];

  // 1. If Google Maps key is set in environment, use Google Places
  if (apiKey) {
    liveResults = await queryGooglePlacesHospitals(lat, lng, radiusMeters, apiKey);
  }

  // 2. Query Nominatim OpenStreetMap fast live engine (<1s)
  if (liveResults.length === 0) {
    liveResults = await queryNominatimHospitals(lat, lng, radiusKm);
  }

  // 3. Fallback to Overpass if needed
  if (liveResults.length === 0) {
    liveResults = await queryOverpassHospitals(lat, lng, radiusMeters);
  }

  // 4. Query local MongoDB hospitals and merge
  try {
    const dbHospitals = await Hospital.find().lean();
    const dbResults = dbHospitals
      .map((h) => {
        let distance = null;
        if (h.latitude != null && h.longitude != null) {
          distance = calculateDistanceKm(lat, lng, h.latitude, h.longitude);
        }
        return {
          ...h,
          distanceKm: distance,
          source: 'Verified Clinical Directory',
          googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
            `${h.name}, ${h.address}, ${h.city}`
          )}`,
        };
      })
      .filter((h) => h.distanceKm !== null && h.distanceKm <= radiusKm);

    // Merge without duplicate names
    const merged = [...liveResults];
    for (const dbItem of dbResults) {
      if (!merged.some((m) => m.name.toLowerCase() === dbItem.name.toLowerCase())) {
        merged.push(dbItem);
      }
    }

    // Sort by proximity ascending
    merged.sort((a, b) => {
      if (a.distanceKm === null && b.distanceKm === null) return 0;
      if (a.distanceKm === null) return 1;
      if (b.distanceKm === null) return -1;
      return a.distanceKm - b.distanceKm;
    });

    return merged;
  } catch (e) {
    return liveResults.sort((a, b) => (a.distanceKm || 0) - (b.distanceKm || 0));
  }
};

module.exports = {
  findNearbyHospitals,
  calculateDistanceKm,
};
