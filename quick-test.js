#!/usr/bin/env node

const API_URL = 'http://localhost:4000';

async function quickTest() {
  console.log('🔍 Quick Server Test\n');

  try {
    // Test health endpoint
    console.log('Testing health endpoint...');
    const healthResponse = await fetch(`${API_URL}/health`);
    const healthText = await healthResponse.text();
    console.log('Health response:', healthText);

    // Test a simple GET that should return 404
    console.log('\nTesting non-existent endpoint...');
    const notFoundResponse = await fetch(`${API_URL}/nonexistent`);
    const notFoundText = await notFoundResponse.text();
    console.log('404 response:', notFoundText.substring(0, 100));

    // Test POST to auth/register
    console.log('\nTesting auth/register endpoint...');
    const registerResponse = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'student',
        identifier: 'quicktest',
        password: 'password123',
        name: 'Quick Test'
      })
    });
    const registerText = await registerResponse.text();
    console.log('Register response:', registerText.substring(0, 200));

  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

quickTest();