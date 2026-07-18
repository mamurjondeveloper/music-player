import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin';
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (!existingUser) {
    await prisma.user.create({
      data: {
        username,
        passwordHash,
        avatarUrl: null,
      },
    });
    console.log(`Seeded user: ${username} with password: ${password}`);
  } else {
    console.log(`User '${username}' already exists.`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
