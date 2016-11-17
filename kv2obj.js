function kv2obj(keys, vals) {
  let o = {};
  for (let i = 0; i < keys.length; i++) {
    o[keys[i]] = vals[i];
  }
  return o;
}
module.exports = kv2obj;
