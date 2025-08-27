require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixRounding() {
  try {
    // Get all products with tax rates
    const products = await prisma.product.findMany({
      include: { taxRate: true }
    });
    
    console.log(`Found ${products.length} products to check`);
    
    for (const product of products) {
      if (product.taxRate) {
        const currentBasePrice = parseFloat(product.basePrice);
        const taxRate = parseFloat(product.taxRate.rate);
        const currentDisplayPrice = currentBasePrice * (1 + taxRate);
        
        // Round display price to nearest 5p to determine what it should be
        const roundedDisplayPrice = Math.round(currentDisplayPrice * 20) / 20;
        
        // Calculate precise base price for the rounded display price
        const preciseBasePrice = roundedDisplayPrice / (1 + taxRate);
        
        // Only update if there's a meaningful difference (more than 0.5p difference in display)
        const displayDifference = Math.abs(currentDisplayPrice - roundedDisplayPrice);
        
        if (displayDifference > 0.005) {
          // Update the product with more precise base price
          await prisma.product.update({
            where: { id: product.id },
            data: { basePrice: preciseBasePrice.toFixed(4) }
          });
          
          console.log(`${product.name}:`);
          console.log(`  Base: ${currentBasePrice.toFixed(2)} -> ${preciseBasePrice.toFixed(4)}`);
          console.log(`  Display: ${currentDisplayPrice.toFixed(2)} -> ${roundedDisplayPrice.toFixed(2)}`);
          console.log('');
        }
      }
    }
    
    console.log('Rounding fix completed!');
    
  } catch (error) {
    console.error('Error fixing rounding:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixRounding();