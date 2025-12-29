import { PrismaClient, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const password = '12345678';
  const passwordHash = await argon2.hash(password);

  // 創建 demo-user（一般用戶）
  const demoUser = await prisma.user.upsert({
    where: { username: 'demo-user' },
    update: { passwordHash },
    create: {
      username: 'demo-user',
      email: 'demo-user@example.com',
      passwordHash,
      role: UserRole.USER,
      emailVerifiedAt: new Date(),
    },
  });
  console.log('Created/Updated demo-user:', demoUser.username);

  // 創建 demo-admin（權限仍是 USER，但可以告訴他們是"觀看用"）
  const demoAdmin = await prisma.user.upsert({
    where: { username: 'demo-admin' },
    update: { passwordHash },
    create: {
      username: 'demo-admin',
      email: 'demo-admin@example.com',
      passwordHash,
      role: UserRole.USER, // 仍然是 USER 權限
      emailVerifiedAt: new Date(),
    },
  });
  console.log('Created/Updated demo-admin:', demoAdmin.username);

  console.log('\nDemo accounts created successfully!');
  console.log('帳號：demo-user   密碼：12345678');
  console.log('帳號：demo-admin  密碼：12345678');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
