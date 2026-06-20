import { setupTestEnvironment, seedTestData } from '../__tests__/helpers/testEnv.pg.js'
async function run() {
  await setupTestEnvironment();
  console.log("Truncated!");
  await seedTestData();
  console.log("Seeded!");
  process.exit(0);
}
run();
