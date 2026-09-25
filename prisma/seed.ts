import { prisma } from '../src/prisma.js'

// A small spread of stock: healthy quantities, a couple of low-stock rows, and
// one at zero so "out of stock" cases have something to hit.
const products = [
  { sku: 'KEY-001', name: 'Mechanical Keyboard', quantity: 12, price: '89.99' },
  { sku: 'MSE-002', name: 'Wireless Mouse', quantity: 40, price: '24.50' },
  { sku: 'HUB-003', name: 'USB-C Hub', quantity: 25, price: '45.00' },
  { sku: 'MON-004', name: '27" 4K Monitor', quantity: 6, price: '329.00' },
  { sku: 'CAM-005', name: 'Webcam 1080p', quantity: 18, price: '59.95' },
  { sku: 'HDS-006', name: 'Noise Cancelling Headset', quantity: 9, price: '149.99' },
  { sku: 'SSD-007', name: '1TB External SSD', quantity: 31, price: '109.00' },
  { sku: 'CBL-008', name: 'HDMI Cable 2m', quantity: 120, price: '8.75' },
  { sku: 'STD-009', name: 'Laptop Stand', quantity: 3, price: '34.99' },
  { sku: 'CHR-010', name: '65W GaN Charger', quantity: 0, price: '39.50' },
]

async function main() {
  // Start clean so re-running the seed is idempotent rather than a unique-key crash.
  await prisma.product.deleteMany()

  // createMany sends one INSERT for all ten rows instead of ten round trips.
  const { count } = await prisma.product.createMany({ data: products })

  console.log(`Seeded ${count} products`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err)
    await prisma.$disconnect()
    process.exit(1)
  })
