require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixPrices() {
  try {
    // Get all products with tax rates
    const products = await prisma.product.findMany({
      include: { taxRate: true }
    });
    
    console.log(`Found ${products.length} products to process`);
    
    for (const product of products) {
      if (product.taxRate) {
        // Current basePrice in DB is actually the display price
        const currentDisplayPrice = parseFloat(product.basePrice);
        const taxRate = product.taxRate.rate;
        
        // Calculate the correct base price (removing tax)
        const correctBasePrice = currentDisplayPrice / (1 + taxRate);
        
        // Update the product with correct base price
        await prisma.product.update({
          where: { id: product.id },
          data: { basePrice: correctBasePrice.toFixed(2) }
        });
        
        console.log(`${product.name}: ${currentDisplayPrice.toFixed(2)} -> base: ${correctBasePrice.toFixed(2)}, display: ${currentDisplayPrice.toFixed(2)}`);
      }
    }
    
    console.log('Price correction completed!');
    
  } catch (error) {
    console.error('Error fixing prices:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPrices();