import bcrypt from 'bcryptjs';
import { prisma, Role } from '../src/prisma.js';

const PASSWORD = 'password123';

const acmeProducts = [
  { sku: 'KEY-001', name: 'Mechanical Keyboard', quantity: 12, price: '89.99' },
  { sku: 'MSE-002', name: 'Wireless Mouse', quantity: 40, price: '24.50' },
  { sku: 'HUB-003', name: 'USB-C Hub', quantity: 25, price: '45.00' },
  { sku: 'MON-004', name: '27" 4K Monitor', quantity: 6, price: '329.00' },
  { sku: 'CAM-005', name: 'Webcam 1080p', quantity: 18, price: '59.95' },
  {
    sku: 'HDS-006',
    name: 'Noise Cancelling Headset',
    quantity: 9,
    price: '149.99',
  },
  { sku: 'STD-009', name: 'Laptop Stand', quantity: 3, price: '34.99' },
  { sku: 'CHR-010', name: '65W GaN Charger', quantity: 0, price: '39.50' },
];

const globexProducts = [
  { sku: 'GLX-001', name: 'Secret Prototype', quantity: 1, price: '9999.00' },
  { sku: 'GLX-002', name: 'Doomsday Device', quantity: 2, price: '4999.00' },
];

async function main() {
  await prisma.$executeRaw`TRUNCATE "User", "Organization" RESTART IDENTITY CASCADE`;

  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const user = (name: string, email: string) =>
    prisma.user.create({ data: { name, email, passwordHash } });

  const owner = await user('Olivia Owner', 'owner@acme.test');
  const admin = await user('Adam Admin', 'admin@acme.test');
  const member = await user('Mia Member', 'member@acme.test');
  const outsider = await user('Gary Globex', 'owner@globex.test');

  await prisma.organization.create({
    data: {
      name: 'Acme Inc',
      memberships: {
        create: [
          { userId: owner.id, role: Role.OWNER },
          { userId: admin.id, role: Role.ADMIN },
          { userId: member.id, role: Role.MEMBER },
        ],
      },
      products: { create: acmeProducts },
    },
  });

  await prisma.organization.create({
    data: {
      name: 'Globex',
      memberships: { create: { userId: outsider.id, role: Role.OWNER } },
      products: { create: globexProducts },
    },
  });

  console.log(
    `Seeded 4 users (password: ${PASSWORD}) across Acme Inc and Globex`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
