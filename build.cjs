const fs = require('fs');
const path = require('path');
const common=fs.readFileSync(path.join(__dirname,'src/common.js'),'utf8');
for(const [name,component] of [['speedtest','SpeedtestCommand'],['my-ip','MyIPCommand'],['network-check','NetworkCheckCommand']]) {
 const source=fs.readFileSync(path.join(__dirname,`src/${name}.js`),'utf8');
 fs.writeFileSync(path.join(__dirname,`${name}.js`),common+source+`\nmodule.exports = {default:${component}};\n`);
}
