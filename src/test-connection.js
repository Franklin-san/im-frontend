const API_BASE = 'http://localhost:3000';

async function testConnection() {
  console.log('🔍 Testing frontend-backend connection...\n');

  try {
    // Test 1: Basic AI response
    console.log('1️⃣ Testing basic AI response...');
    const response = await fetch(`${API_BASE}/ai/invoke`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        toolChoice: 'none'
      })
    });
    
    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response body:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testConnection(); 