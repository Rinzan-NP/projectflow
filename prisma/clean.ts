import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clean() {
  console.log('🧹 Wiping all database records for clean deployment...');
  
  await prisma.activityLog.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.checklistItem.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.itemLabel.deleteMany({});
  await prisma.item.deleteMany({});
  await prisma.label.deleteMany({});
  await prisma.stage.deleteMany({});
  await prisma.milestone.deleteMany({});
  await prisma.project.deleteMany({});

  console.log('✅ Database is completely clean and empty (0 projects, 0 items).');
}

clean()
  .catch((e) => {
    console.error('Error cleaning database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
