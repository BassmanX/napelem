// prisma/seed.ts
import { PrismaClient, Prisma } from '@prisma/client';


const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding racks ...`);

  // Opcionális: Régi rekeszek és a hozzájuk tartozó készletelemek törlése
  // Csak akkor használd, ha teljesen újra akarod generálni a rekeszeket!
  // Figyelem: Ez minden készletadatot töröl!
  // console.log(`Deleting existing inventory items and racks...`);
  // await prisma.inventoryItem.deleteMany({});
  // await prisma.rack.deleteMany({});
  // console.log('Old inventory items and racks deleted.');

  const racksToCreate: Prisma.RackCreateInput[] = [];;
  const rows = 10; // 10 sor
  const columns = 4; // 4 oszlop soronként
  const levels = 6; // 6 szint (rekesz) oszloponként
  const defaultMaxCapacity = 50; // Alapértelmezett kapacitás minden rekeszhez (ezt módosíthatod)

  for (let r = 1; r <= rows; r++) {
    for (let c = 1; c <= columns; c++) {
      for (let l = 1; l <= levels; l++) {
        racksToCreate.push({
          row: r,
          column: c,
          level: l,
          maxCapacity: defaultMaxCapacity,
        });
      }
    }
  }

  console.log(`Attempting to create ${racksToCreate.length} racks...`);

  // Rekeszek létrehozása a createMany paranccsal
  const result = await prisma.rack.createMany({
    data: racksToCreate,
    skipDuplicates: true, // Ha valamiért már létezne (pl. többször futtatod a seedert törlés nélkül), ne álljon le hibával.
  });

  console.log(`Created ${result.count} new racks.`); // Kiírja, hány ÚJ rekord jött létre

  console.log(`Seeding finished.`);
}

main()
  .catch(async (e) => {
    console.error('Error during seeding:', e);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });