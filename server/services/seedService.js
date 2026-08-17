const User = require('../models/User');
const Hospital = require('../models/Hospital');

const seedInitialData = async () => {
  try {
    // 1. Seed initial admin if specified in env and not existing
    const adminEmail = process.env.ADMIN_INIT_EMAIL;
    const adminPassword = process.env.ADMIN_INIT_PASSWORD;

    if (adminEmail && adminPassword) {
      const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase().trim() });
      if (!existingAdmin) {
        const adminUser = new User({
          name: 'Dokita System Administrator',
          email: adminEmail.toLowerCase().trim(),
          password: adminPassword,
          role: 'admin',
          phoneNumber: '+2348000000000',
        });
        await adminUser.save();
        console.log(`[Seed] Initial Admin user created: ${adminEmail}`);
      }
    }

    // 2. Seed initial hospitals if directory is empty or missing coordinates
    const hospitalCount = await Hospital.countDocuments();
    if (hospitalCount === 0) {
      const defaultAdmin = await User.findOne({ role: 'admin' });
      const initialHospitals = [
        {
          name: 'National Hospital Trauma Center',
          address: 'Plot 132 Central Business District',
          city: 'Abuja',
          state: 'FCT',
          phone: '+234 9 234 8888',
          is24Hours: true,
          latitude: 9.0436,
          longitude: 7.4816,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
        {
          name: 'Cedarcrest Orthopaedic & Emergency Hospital',
          address: 'Sam Mbakwe Avenue, Apo District',
          city: 'Abuja',
          state: 'FCT',
          phone: '+234 809 355 5500',
          is24Hours: true,
          latitude: 9.0064,
          longitude: 7.4981,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
        {
          name: 'Lagos University Teaching Hospital (LUTH)',
          address: 'Ishaga Road, Idi-Araba',
          city: 'Lagos',
          state: 'Lagos',
          phone: '+234 1 897 0001',
          is24Hours: true,
          latitude: 6.5218,
          longitude: 3.3592,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
        {
          name: 'Reddington Multi-Specialist Hospital',
          address: '12 Idowu Martins Street, Victoria Island',
          city: 'Lagos',
          state: 'Lagos',
          phone: '+234 1 271 5340',
          is24Hours: true,
          latitude: 6.4281,
          longitude: 3.4219,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
        {
          name: 'St. Nicholas Specialist Hospital',
          address: '57 Campbell Street, Lagos Island',
          city: 'Lagos',
          state: 'Lagos',
          phone: '+234 1 875 4321',
          is24Hours: true,
          latitude: 6.4531,
          longitude: 3.3958,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
        {
          name: 'University College Hospital (UCH)',
          address: 'Queen Elizabeth II Road',
          city: 'Ibadan',
          state: 'Oyo',
          phone: '+234 2 241 0088',
          is24Hours: true,
          latitude: 7.4042,
          longitude: 3.9010,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
        {
          name: 'University of Port Harcourt Teaching Hospital (UPTH)',
          address: 'East-West Road, Choba',
          city: 'Port Harcourt',
          state: 'Rivers',
          phone: '+234 84 461 771',
          is24Hours: true,
          latitude: 4.9022,
          longitude: 6.9242,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
        {
          name: 'Aminu Kano Teaching Hospital (AKTH)',
          address: 'Zaria Road, Tarauni',
          city: 'Kano',
          state: 'Kano',
          phone: '+234 64 669 000',
          is24Hours: true,
          latitude: 11.9708,
          longitude: 8.5388,
          addedBy: defaultAdmin ? defaultAdmin._id : null,
        },
      ];

      await Hospital.insertMany(initialHospitals);
      console.log(`[Seed] Initialized ${initialHospitals.length} hospital directory entries with GPS coordinates.`);
    }
  } catch (error) {
    console.error('[Seed Error] Failed to initialize default records:', error.message);
  }
};

module.exports = { seedInitialData };
