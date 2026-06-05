const Settings = require("../models/Settings");

let cache = null;
let loadingPromise = null;

async function loadFresh() {
  const s = await Settings.getOrCreate();
  cache = s;
  return s;
}

async function getSettings() {
  if (cache) return cache;
  if (loadingPromise) return loadingPromise;
  loadingPromise = loadFresh().finally(() => {
    loadingPromise = null;
  });
  return loadingPromise;
}

function invalidate() {
  cache = null;
}

async function refresh() {
  return loadFresh();
}

module.exports = { getSettings, invalidate, refresh };
