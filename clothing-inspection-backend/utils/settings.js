const Setting = require('../models/Setting');

const cache = {};

async function getSetting(key) {
  if (cache[key] !== undefined) return cache[key];
  const row = await Setting.findByPk(key);
  cache[key] = row ? row.value : null;
  return cache[key];
}

async function setSetting(key, value) {
  await Setting.upsert({ key, value });
  cache[key] = value;
}

module.exports = { getSetting, setSetting }; 