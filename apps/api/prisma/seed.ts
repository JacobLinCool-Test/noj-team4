import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Initial allowed email domains.
 * These are trusted domains that users can register with.
 */
const INITIAL_ALLOWED_DOMAINS = [
  // Major email providers
  { domain: 'gmail.com', note: 'Google Gmail' },
  { domain: 'outlook.com', note: 'Microsoft Outlook' },
  { domain: 'hotmail.com', note: 'Microsoft Hotmail' },
  { domain: 'live.com', note: 'Microsoft Live' },
  { domain: 'msn.com', note: 'Microsoft MSN' },
  { domain: 'icloud.com', note: 'Apple iCloud' },
  { domain: 'me.com', note: 'Apple Me' },
  { domain: 'mac.com', note: 'Apple Mac' },
  { domain: 'yahoo.com', note: 'Yahoo' },
  { domain: 'yahoo.com.tw', note: 'Yahoo Taiwan' },

  // Taiwan educational institutions
  { domain: 'ntnu.edu.tw', note: 'National Taiwan Normal University' },
  { domain: 'gapps.ntnu.edu.tw', note: 'NTNU Google Apps' },
  { domain: 'std.ntnu.edu.tw', note: 'NTNU Student' },

  // Pattern: All .edu.tw domains (Taiwan educational institutions)
  { domain: '*.edu.tw', note: 'All Taiwan educational institutions' },
];

async function main() {
  console.log('Seeding allowed email domains...');

  for (const { domain, note } of INITIAL_ALLOWED_DOMAINS) {
    const existing = await prisma.allowedEmailDomain.findUnique({
      where: { domain },
    });

    if (!existing) {
      await prisma.allowedEmailDomain.create({
        data: {
          domain,
          note,
          enabled: true,
        },
      });
      console.log(`  Created: ${domain}`);
    } else {
      console.log(`  Skipped (exists): ${domain}`);
    }
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
