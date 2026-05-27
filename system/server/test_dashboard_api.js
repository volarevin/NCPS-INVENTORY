const axios = require('axios');
const jwt = require('jsonwebtoken');

// Generate a test token for admin user
const testUserId = 1; // Admin user ID (sherwin)
const testToken = jwt.sign(
  { id: testUserId, role: 'Admin' },
  process.env.JWT_SECRET || 'your-secret-key'
);

const baseURL = 'http://localhost:5000';
const headers = {
  'Authorization': `Bearer ${testToken}`,
  'Content-Type': 'application/json'
};

async function testAPIs() {
  console.log('Testing Admin Dashboard APIs...\n');

  try {
    // Test 1: Get Stats
    console.log('1. Testing /api/admin/stats...');
    const statsRes = await axios.get(`${baseURL}/api/admin/stats`, { headers });
    console.log('✓ Stats response:', JSON.stringify(statsRes.data, null, 2));
    console.log('');

    // Test 2: Get Monthly Stats
    console.log('2. Testing /api/admin/monthly-stats...');
    const monthlyRes = await axios.get(`${baseURL}/api/admin/monthly-stats`, { headers });
    console.log('✓ Monthly stats response:', JSON.stringify(monthlyRes.data, null, 2));
    console.log('');

    // Test 3: Get Service Distribution
    console.log('3. Testing /api/admin/service-distribution...');
    const servicesRes = await axios.get(`${baseURL}/api/admin/service-distribution`, { headers });
    console.log('✓ Service distribution response:', JSON.stringify(servicesRes.data, null, 2));
    console.log('');

    // Test 4: Get Recent Activity
    console.log('4. Testing /api/admin/recent-activity...');
    const activityRes = await axios.get(`${baseURL}/api/admin/recent-activity`, { headers });
    console.log('✓ Recent activity response:', JSON.stringify(activityRes.data, null, 2));
    console.log('');

    // Test 5: Get Reports
    console.log('5. Testing /api/admin/reports...');
    const reportsRes = await axios.get(`${baseURL}/api/admin/reports`, { headers });
    console.log('✓ Reports response:', JSON.stringify(reportsRes.data, null, 2));
    console.log('');

    console.log('✓ All APIs are responding correctly!');
  } catch (error) {
    console.error('✗ Error:', error.response?.data || error.message);
  }
}

testAPIs();
