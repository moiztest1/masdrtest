const enabled = !!process.env.DEBUG;
const stamp = () => new Date().toISOString();

function info(msg) {
  console.log(`[INFO  ${stamp()}] ${msg}`);
}

function warn(msg) {
  console.warn(`[WARN  ${stamp()}] ${msg}`);
}

function error(msg) {
  console.error(`[ERROR ${stamp()}] ${msg}`);
}

function debug(msg) {
  if (!enabled) return;
  console.log(`[DEBUG ${stamp()}] ${msg}`);
}

module.exports = { info, warn, error, debug };
