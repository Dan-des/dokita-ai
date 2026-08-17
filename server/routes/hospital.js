const express = require('express');
const router = express.Router();
const Hospital = require('../models/Hospital');
const { verifyToken, requireRole } = require('../middleware/auth');
const { findNearbyHospitals, calculateDistanceKm } = require('../services/mapsService');

/**
 * @route   GET /api/hospitals/nearby
 * @desc    Get live real-time nearby hospitals from Google Places & OpenStreetMap Overpass live API
 * @access  Public
 */
router.get('/nearby', async (req, res) => {
  try {
    const { lat, lng, radius } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        message: 'Latitude and Longitude query parameters are required for live GPS search.',
      });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 30;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid coordinate parameters.',
      });
    }

    const hospitals = await findNearbyHospitals(latitude, longitude, radiusKm);

    return res.status(200).json({
      success: true,
      count: hospitals.length,
      userLocation: { lat: latitude, lng: longitude },
      radiusKm,
      hospitals,
    });
  } catch (error) {
    console.error('[Get Nearby Hospitals Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve live map hospital results.',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/hospitals
 * @desc    Get hospital directory with city/state, search, or live GPS proximity
 * @access  Public
 */
router.get('/', async (req, res) => {
  try {
    const { city, state, search, is24Hours, lat, lng, radius } = req.query;

    // If user provided GPS coordinates, route to live map search
    if (lat && lng) {
      const userLat = parseFloat(lat);
      const userLng = parseFloat(lng);
      const radiusKm = radius ? parseFloat(radius) : 30;

      if (!isNaN(userLat) && !isNaN(userLng)) {
        let hospitals = await findNearbyHospitals(userLat, userLng, radiusKm);

        if (is24Hours !== undefined) {
          const req24 = is24Hours === 'true' || is24Hours === true;
          if (req24) {
            hospitals = hospitals.filter((h) => h.is24Hours);
          }
        }

        if (search) {
          const s = search.toLowerCase().trim();
          hospitals = hospitals.filter(
            (h) =>
              h.name.toLowerCase().includes(s) ||
              h.address.toLowerCase().includes(s) ||
              h.city.toLowerCase().includes(s)
          );
        }

        return res.status(200).json({
          success: true,
          count: hospitals.length,
          userLocation: { lat: userLat, lng: userLng },
          hospitals,
        });
      }
    }

    const filter = {};

    if (city) {
      filter.city = { $regex: new RegExp(city.trim(), 'i') };
    }

    if (state) {
      filter.state = { $regex: new RegExp(state.trim(), 'i') };
    }

    if (is24Hours !== undefined) {
      filter.is24Hours = is24Hours === 'true' || is24Hours === true;
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { address: searchRegex },
        { city: searchRegex },
        { state: searchRegex },
      ];
    }

    const hospitals = await Hospital.find(filter)
      .populate('addedBy', 'name email role')
      .sort({ name: 1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: hospitals.length,
      hospitals: hospitals.map((h) => ({
        ...h,
        googleMapsUrl: `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
          `${h.name}, ${h.address}, ${h.city}`
        )}`,
      })),
    });
  } catch (error) {
    console.error('[Get Hospitals Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve hospitals.',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/hospitals
 * @desc    Create a new hospital entry (Admin only)
 * @access  Private (verifyToken + requireRole('admin'))
 */
router.post('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { name, address, city, state, phone, is24Hours, latitude, longitude } = req.body;

    if (!name || !address || !city || !state || !phone) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, address, city, state, and phone number.',
      });
    }

    const hospital = new Hospital({
      name: name.trim(),
      address: address.trim(),
      city: city.trim(),
      state: state.trim(),
      phone: phone.trim(),
      is24Hours: is24Hours !== undefined ? Boolean(is24Hours) : true,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      addedBy: req.user.id,
    });

    await hospital.save();

    return res.status(201).json({
      success: true,
      message: 'Hospital directory entry created successfully.',
      hospital,
    });
  } catch (error) {
    console.error('[Create Hospital Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create hospital directory entry.',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/hospitals/:id
 * @desc    Delete a hospital entry (Admin only)
 * @access  Private (verifyToken + requireRole('admin'))
 */
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const hospital = await Hospital.findById(id);
    if (!hospital) {
      return res.status(404).json({
        success: false,
        message: 'Hospital record not found.',
      });
    }

    await Hospital.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: 'Hospital entry deleted successfully.',
      id,
    });
  } catch (error) {
    console.error('[Delete Hospital Error]', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete hospital entry.',
      error: error.message,
    });
  }
});

module.exports = router;
