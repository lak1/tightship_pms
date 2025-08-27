// Simple RLS test script
// Run with: node test-rls.js

const { PrismaClient } = require('@prisma/client')

async function testRLS() {
  const prisma = new PrismaClient()
  
  try {
    console.log('🔍 Testing RLS policies...')
    
    // Test 1: Try to access all users (should be restricted)
    console.log('\n1. Testing user access without JWT context...')
    try {
      const users = await prisma.user.findMany()
      console.log(`❌ Found ${users.length} users - RLS not working correctly`)
    } catch (error) {
      console.log('✅ User access properly restricted:', error.message)
    }
    
    // Test 2: Set JWT context and try again
    console.log('\n2. Testing with demo user JWT context...')
    await prisma.$executeRaw`
      SELECT set_config('request.jwt.claims', '{"email": "demo@tightship.com"}', true)
    `
    
    const userWithContext = await prisma.user.findMany()
    console.log(`✅ Found ${userWithContext.length} users with proper context`)
    
    // Test 3: Try to access organizations
    console.log('\n3. Testing organization access...')
    const orgs = await prisma.organization.findMany()
    console.log(`✅ Found ${orgs.length} organizations`)
    
    // Test 4: Try to access restaurants
    console.log('\n4. Testing restaurant access...')
    const restaurants = await prisma.restaurant.findMany()
    console.log(`✅ Found ${restaurants.length} restaurants`)
    
    console.log('\n🎉 RLS test completed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
  } finally {
    await prisma.$disconnect()
  }
}

testRLS()