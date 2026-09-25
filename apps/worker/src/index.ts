export function startWorker() {
  return '3od-worker';
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker();
}
