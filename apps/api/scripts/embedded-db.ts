import { ensureDatabases, ensureEmbeddedCluster, embeddedUrl } from '../test/embedded-db.js';

async function main(): Promise<void> {
  const cluster = await ensureEmbeddedCluster();
  await ensureDatabases(['engineering_lab', 'engineering_lab_test']);

  console.log('Embedded PostgreSQL is ready.');
  console.log(`  Dev URL:  ${embeddedUrl('engineering_lab')}`);
  console.log(`  Test URL: ${embeddedUrl('engineering_lab_test')}`);
  console.log('Press Ctrl+C to stop the cluster.');

  const shutdown = async (): Promise<void> => {
    await cluster.stop();
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown());
  process.on('SIGTERM', () => void shutdown());

  // Keep the process alive while the cluster runs.
  await new Promise(() => {});
}

main().catch((error: unknown) => {
  console.error('Embedded PostgreSQL failed to start:', error);
  process.exit(1);
});
