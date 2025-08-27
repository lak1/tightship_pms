require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixTaxRates() {
  try {
    // Get the Standard VAT tax rate (20%)
    const standardVATRate = await prisma.taxRate.findFirst({
      where: { name: 'Standard VAT' }
    });
    
    if (!standardVATRate) {
      console.log('Standard VAT tax rate not found');
      return;
    }
    
    console.log('Found Standard VAT rate:', standardVATRate);
    
    // Update all products that don't have a tax rate to use Standard VAT
    // Based on the CSV, most products had VAT applied
    const result = await prisma.product.updateMany({
      where: { 
        taxRateId: null 
      },
      data: { 
        taxRateId: standardVATRate.id 
      }
    });
    
    console.log(`Updated ${result.count} products with Standard VAT tax rate`);
    
    // Show some sample products to verify
    const sampleProducts = await prisma.product.findMany({
      select: { id: true, name: true, basePrice: true, taxRateId: true, taxRate: true },
      take: 5,
      include: { taxRate: true }
    });
    
    console.log('Sample products after update:', sampleProducts);
    
  } catch (error) {
    console.error('Error fixing tax rates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixTaxRates();