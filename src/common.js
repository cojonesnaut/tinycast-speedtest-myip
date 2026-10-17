const React = require('react');
const {List, Action, ActionPanel, Icon, environment, showToast, Toast} = require('@raycast/api');
const {execFile} = require('child_process');
const path = require('path');
const h = React.createElement;

function run(file, args, timeout) {
  return new Promise((resolve, reject) => execFile(file, args, {encoding:'utf8', timeout, maxBuffer:2*1024*1024}, (error, stdout, stderr) => {
    if (error) reject(new Error(String(stderr || error.message).trim().slice(0,600)));
    else resolve(String(stdout));
  }));
}
function parseIP(text) {
  const data = JSON.parse(text);
  if (!data || typeof data.ip !== 'string' || !data.ip.trim() || typeof data.country !== 'string' || typeof data.cc !== 'string') throw new Error('MyIP returned an invalid response. Try again.');
  return {ip:data.ip, country:data.country, cc:data.cc, checkedAt:new Date().toISOString()};
}
function parseSpeed(text) {
  const data = text.trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)).find(item => item.type === 'result');
  if (!data || ![data.download?.bandwidth, data.upload?.bandwidth, data.ping?.latency, data.ping?.jitter].every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0)) throw new Error('Speedtest did not return a complete result. Try again.');
  return {...data, checkedAt:new Date().toISOString()};
}
const speedValue = n => `${(n * 8 / 1000000).toFixed(2)} Mbps`;
const ms = n => `${n.toFixed(2)} ms`;

