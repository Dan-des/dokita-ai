require('dotenv').config({ path: __dirname + '/../.env' });
process.env.ADMIN_REGISTRATION_KEY = 'dokita_master_admin_secret_key_2026';

const axios = require('axios');
const { startServer } = require('../index');
const { disconnectDB } = require('../config/db');

const runTests = async () => {
  console.log('🚀 Starting DokitaAI Full-Stack System Verification Suite...\n');

  let serverInstance = null;
  const testPort = 5066;
  const baseURL = `http://127.0.0.1:${testPort}/api`;

  try {
    serverInstance = await startServer(testPort);
    console.log('✅ Server started on test port:', testPort);

    // 1. Health Check
    console.log('\n--- 1. Testing Health Endpoint ---');
    const healthRes = await axios.get(`${baseURL}/health`);
    console.log('Status:', healthRes.data.status, '| AI Provider:', healthRes.data.aiProvider);
    if (healthRes.data.status !== 'online') throw new Error('Health check failed');
    console.log('✅ Health Check passed.');

    // 2. User Registration (Role: 'user', zero OTP)
    console.log('\n--- 2. Testing User Registration ---');
    const testUserEmail = `patient_${Date.now()}@example.com`;
    const regRes = await axios.post(`${baseURL}/auth/register`, {
      name: 'John Patient',
      email: testUserEmail,
      password: 'SecurePassword123!',
      phoneNumber: '+2348011223344',
    });
    console.log('Registered User ID:', regRes.data.user.id, '| Role:', regRes.data.user.role);
    if (regRes.data.user.role !== 'user' || !regRes.data.token) {
      throw new Error('User registration failed or invalid role/token');
    }
    const userToken = regRes.data.token;
    console.log('✅ User Registration passed (Default role: "user").');

    // 3. User Login
    console.log('\n--- 3. Testing User Login ---');
    const loginRes = await axios.post(`${baseURL}/auth/login`, {
      email: testUserEmail,
      password: 'SecurePassword123!',
    });
    if (!loginRes.data.token || loginRes.data.user.email !== testUserEmail) {
      throw new Error('User login failed');
    }
    console.log('✅ User Login passed.');

    // 4. Admin User Registration with adminKey
    console.log('\n--- 4. Testing Admin Registration ---');
    const testAdminEmail = `admin_${Date.now()}@dokita.ai`;
    const adminRegRes = await axios.post(`${baseURL}/auth/register`, {
      name: 'Dr. Sarah Admin',
      email: testAdminEmail,
      password: 'AdminPassword123!',
      adminKey: 'dokita_master_admin_secret_key_2026',
    });
    if (adminRegRes.data.user.role !== 'admin' || !adminRegRes.data.token) {
      throw new Error('Admin registration failed or invalid role');
    }
    const adminToken = adminRegRes.data.token;
    console.log('Registered Admin ID:', adminRegRes.data.user.id, '| Role:', adminRegRes.data.user.role);
    console.log('✅ Admin Registration passed (Role: "admin").');

    // 5. RBAC Enforcement: Standard user trying to POST /api/hospitals -> MUST RETURN 403 Forbidden!
    console.log('\n--- 5. Testing RBAC: Standard User Forbidden from POST /api/hospitals ---');
    try {
      await axios.post(
        `${baseURL}/hospitals`,
        {
          name: 'Unauthorized Clinic',
          address: '123 Fake St',
          city: 'Lagos',
          state: 'Lagos',
          phone: '08000000000',
          is24Hours: true,
        },
        {
          headers: { Authorization: `Bearer ${userToken}` },
        }
      );
      throw new Error('SECURITY VIOLATION: Standard user was able to create a hospital!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('✅ RBAC Verified: Standard user received HTTP 403 Forbidden as expected.');
      } else {
        throw err;
      }
    }

    // 6. Admin User creating hospital with GPS coordinates (POST /api/hospitals -> 201 Created)
    console.log('\n--- 6. Testing Admin Hospital Creation with GPS Coords ---');
    const createHospRes = await axios.post(
      `${baseURL}/hospitals`,
      {
        name: 'First Cardiology Center & Critical Care',
        address: '20 Thompson Avenue, Ikoyi',
        city: 'Lagos',
        state: 'Lagos',
        phone: '+234 1 291 5824',
        is24Hours: true,
        latitude: 6.4474,
        longitude: 3.4357,
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` },
      }
    );
    if (createHospRes.status !== 201 || !createHospRes.data.hospital._id) {
      throw new Error('Admin hospital creation failed');
    }
    const createdHospitalId = createHospRes.data.hospital._id;
    console.log('Created Hospital ID:', createdHospitalId, '| Name:', createHospRes.data.hospital.name);
    console.log('✅ Admin Hospital Creation passed.');

    // 7. GPS Proximity Search (Lagos Coordinates: lat=6.5244, lng=3.3792)
    console.log('\n--- 7. Testing GPS Near Me Proximity Sorting ---');
    const gpsRes = await axios.get(`${baseURL}/hospitals?lat=6.5244&lng=3.3792`);
    console.log('User Location parsed:', gpsRes.data.userLocation);
    console.log('Nearest Hospital:', gpsRes.data.hospitals[0]?.name, `(${gpsRes.data.hospitals[0]?.distanceKm} km away)`);
    if (!gpsRes.data.hospitals[0]?.distanceKm && gpsRes.data.hospitals[0]?.distanceKm !== 0) {
      throw new Error('GPS proximity calculation failed: distanceKm missing');
    }
    console.log('✅ GPS Near Me Proximity sorting passed.');

    // 8. Admin Deleting Hospital
    console.log('\n--- 8. Testing Admin Hospital Deletion ---');
    const delHospRes = await axios.delete(`${baseURL}/hospitals/${createdHospitalId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (delHospRes.status !== 200 || delHospRes.data.id !== createdHospitalId) {
      throw new Error('Admin hospital deletion failed');
    }
    console.log('✅ Admin Hospital Deletion passed.');

    // 9. AI Medical Chat Triage (POST /api/chat/ask)
    console.log('\n--- 9. Testing AI Medical Triage Chat ---');
    const chatRes = await axios.post(
      `${baseURL}/chat/ask`,
      {
        prompt: 'I have severe chest pain radiating to left arm and dizziness for 2 hours',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    if (!chatRes.data.success || !chatRes.data.message.content) {
      throw new Error('AI Chat triage returned invalid response');
    }
    console.log('Triage Urgency Level:', chatRes.data.message.urgency);
    console.log('Sources Cited:', chatRes.data.message.sources.map(s => s.title));
    console.log('Session ID:', chatRes.data.sessionId);
    if (chatRes.data.message.urgency !== 'EMERGENCY') {
      throw new Error('Expected EMERGENCY urgency for acute radiating chest pain');
    }
    console.log('✅ AI Medical Chat Triage passed (Urgency correctly categorized as EMERGENCY).');

    // 10. Feedback Submission
    console.log('\n--- 10. Testing Feedback Submission ---');
    const feedbackRes = await axios.post(
      `${baseURL}/feedback`,
      {
        rating: 5,
        comment: 'DokitaAI provided extremely fast and helpful guidance for my symptoms.',
      },
      {
        headers: { Authorization: `Bearer ${userToken}` },
      }
    );
    if (!feedbackRes.data.success || feedbackRes.data.feedback.rating !== 5) {
      throw new Error('Feedback submission failed');
    }
    console.log('✅ Feedback Submission passed.');

    // 11. Admin Viewing Feedback
    console.log('\n--- 11. Testing Admin Feedback Review ---');
    const adminFeedbackRes = await axios.get(`${baseURL}/feedback`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!adminFeedbackRes.data.success || adminFeedbackRes.data.feedbacks.length === 0) {
      throw new Error('Admin feedback review failed');
    }
    console.log('Total Feedbacks:', adminFeedbackRes.data.count, '| Average Rating:', adminFeedbackRes.data.averageRating);
    console.log('✅ Admin Feedback Review passed.');

    // 12. WhatsApp Webhook Handshake Verification
    console.log('\n--- 12. Testing WhatsApp Webhook Handshake ---');
    const verifyTokenVal = process.env.WHATSAPP_VERIFY_TOKEN || 'dokita_whatsapp_verify_token_2026';
    const challengeVal = 'meta_test_challenge_123456';
    const waRes = await axios.get(`${baseURL}/webhook/whatsapp`, {
      params: {
        'hub.mode': 'subscribe',
        'hub.verify_token': verifyTokenVal,
        'hub.challenge': challengeVal,
      },
    });
    if (waRes.data !== challengeVal) {
      throw new Error('WhatsApp webhook handshake challenge response mismatch');
    }
    console.log('WhatsApp Handshake Response:', waRes.data);
    console.log('✅ WhatsApp Webhook Handshake passed.');

    console.log('\n🎉 ======================================================= 🎉');
    console.log('🌟 ALL 12 BACKEND, GPS & RBAC VERIFICATION TESTS PASSED 100%! 🌟');
    console.log('🎉 ======================================================= 🎉\n');
  } catch (error) {
    console.error('❌ Verification Suite Failed:', error.response?.data || error.message);
    process.exitCode = 1;
  } finally {
    if (serverInstance) {
      serverInstance.close();
    }
    await disconnectDB();
    process.exit();
  }
};

runTests();
