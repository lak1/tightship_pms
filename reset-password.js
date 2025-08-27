// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' })

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetPassword() {
  const email = process.argv[2]
  const newPassword = process.argv[3]
  
  if (!email || !newPassword) {
    console.log('Usage: node reset-password.js <email> <new-password>')
    process.exit(1)
  }
  
  try {
    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)
    
    // Update the user's password
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword },
    })
    
    console.log(`Password updated successfully for user: ${user.email}`)
    
  } catch (error) {
    if (error.code === 'P2025') {
      console.log(`User with email ${email} not found`)
    } else {
      console.error('Error updating password:', error.message)
    }
  } finally {
    await prisma.$disconnect()
  }
}

resetPassword()