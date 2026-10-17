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

function SpeedtestCommand() {
  const [result,setResult] = React.useState(null);
  const [speedError,setSpeedError] = React.useState('');
  const [stage,setStage] = React.useState('');
  const speedLock = React.useRef(false), alive = React.useRef(true);
  React.useEffect(() => {alive.current=true; return () => {alive.current=false;};}, []);
  async function test() {
    if (speedLock.current) return;
    speedLock.current=true; setResult(null); setSpeedError(''); setStage('Preparing Speedtest…');
    try {
      const cli = (await run('/bin/sh',[path.join(environment.assetsPath,'prepare-cli.sh'), environment.supportPath],100000)).trim();
      if(!alive.current) return;
      setStage('Testing download, upload, and latency…');
      const value=parseSpeed(await run(cli,['--format=json','--progress=no','--accept-license','--accept-gdpr'],180000));
      if(alive.current) {setResult(value); showToast({style:Toast.Style.Success,title:'Speedtest complete'});}
    } catch(e) {if(alive.current) setSpeedError(e.message);}
    finally {speedLock.current=false; if(alive.current) setStage('');}
  }
  const rows=[];
  function row(title,value,icon=Icon.Info) {rows.push({title,value:String(value),icon});}
    if(stage) row('Speedtest',stage,Icon.Clock);
    else if(speedError) row('Speedtest failed',speedError,Icon.ExclamationMark);
    else if(!result) row('Run Speedtest','Press Enter to start',Icon.Play);
    if(result) {
      row('Download',speedValue(result.download.bandwidth),Icon.ArrowDown);
      row('Upload',speedValue(result.upload.bandwidth),Icon.ArrowUp);
      row('Latency',ms(result.ping.latency),Icon.Clock);
      row('Jitter',ms(result.ping.jitter),Icon.Clock);
      row('Packet loss',typeof result.packetLoss==='number'?`${result.packetLoss.toFixed(2)}%`:'Not reported');
      row('ISP',result.isp || 'Not reported',Icon.Network);
      row('Server',[result.server?.name,result.server?.location,result.server?.country].filter(Boolean).join(' · ') || 'Not reported');
      row('Speedtest public IP',result.interface?.externalIp || 'Not reported',Icon.Globe);
      row('Local IP',result.interface?.internalIp || 'Not reported',Icon.Desktop);
      row('Test completed',new Date(result.checkedAt).toLocaleString(),Icon.Clock);
    }
  const summary=rows.map(r=>`${r.title}: ${r.value}`).join('\n');
  function actions(value) {
    return h(ActionPanel,null,
      !stage && h(Action,{title:result?'Run Again':'Run Speedtest',icon:Icon.Play,onAction:test}),
      h(Action.CopyToClipboard,{title:'Copy Value',content:value}),
      h(Action.CopyToClipboard,{title:'Copy All Results',content:summary}),
      result?.result?.url?.startsWith('https://www.speedtest.net/') && h(Action.OpenInBrowser,{title:'Open Speedtest Result',url:result.result.url}),
      h(Action.OpenInBrowser,{title:'Ookla License',url:'https://www.speedtest.net/about/eula'}),
      h(Action.OpenInBrowser,{title:'Ookla Privacy Policy',url:'https://www.speedtest.net/about/privacy'})
    );
  }
  const items = entries => entries.map(r=>h(List.Item,{key:r.title,title:r.title,subtitle:r.value,icon:r.icon,actions:actions(r.value)}));
  return h(List,{isLoading:!!stage,navigationTitle:'Speedtest',searchBarPlaceholder:'Filter speed test results…'},
    h(List.Section,{title:'Speedtest',subtitle:!result&&!stage?'Starting a test accepts Ookla’s license and privacy terms. Tests use network data.':undefined},...items(rows))
  );
}

module.exports = {default:SpeedtestCommand};
