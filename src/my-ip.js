// Keep all enrichment tied to the exact IP returned by the connection endpoint.
async function requestJSON(url) {
  const controller=new AbortController();let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Request timed out'));},10000);});
  try {
    const response=await Promise.race([fetch(url,{headers:{Accept:'application/json'},signal:controller.signal}),timeout]);
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    return JSON.parse(await Promise.race([response.text(),timeout]));
  } finally {clearTimeout(timer);}
}
function ipv4Parts(ip) {
  if(!/^\d+\.\d+\.\d+\.\d+$/.test(ip))return null;
  const parts=ip.split('.');return parts.every(p=>Number(p)<=255&&String(Number(p))===p)?parts:null;
}
function ptrName(ip) {
  const v4=ipv4Parts(ip);if(v4)return v4.reverse().join('.')+'.in-addr.arpa';
  let input=ip.toLowerCase();
  if(input.includes('.')) {
    const last=input.lastIndexOf(':');const tail=ipv4Parts(input.slice(last+1));if(!tail)return null;
    input=input.slice(0,last+1)+((Number(tail[0])<<8)+Number(tail[1])).toString(16)+':'+((Number(tail[2])<<8)+Number(tail[3])).toString(16);
  }
  if(!/^[0-9a-f:]+$/.test(input))return null;
  const halves=input.split('::');if(halves.length>2)return null;
  const left=halves[0]?halves[0].split(':'):[],right=halves[1]?halves[1].split(':'):[];
  const missing=8-left.length-right.length;
  if(halves.length===1&&missing!==0||halves.length===2&&missing<1)return null;
  const groups=halves.length===1?left:[...left,...Array(missing).fill('0'),...right];
  if(!groups.every(g=>/^[0-9a-f]{1,4}$/.test(g)))return null;
  return groups.map(g=>g.padStart(4,'0')).join('').split('').reverse().join('.')+'.ip6.arpa';
}
function publicIP(value) {
  if(typeof value!=='string'||!ptrName(value))throw new Error('Invalid IP response');
  return value;
}
function sameIP(a,b){return ptrName(a)===ptrName(b);}
async function lookupIP(onPartial=()=>{}) {
  let ip,port='Unavailable',source;
  try {
    const data=await requestJSON('https://ifconfig.me/all.json');
    ip=publicIP(data.ip_addr);source='ifconfig.me';
    if(/^\d+$/.test(String(data.port))&&Number(data.port)>0&&Number(data.port)<=65535)port=String(data.port);
  } catch {
    try {
      const data=await requestJSON('https://ipwho.is/');
      if(data.success!==true)throw new Error('IP service unavailable');
      ip=publicIP(data.ip);source='ipwho.is (fallback)';
    } catch {
      try{ip=publicIP((await requestJSON('https://api.myip.com/')).ip);source='MyIP.com (fallback)';}
      catch{throw new Error('IP services are unavailable. Check your connection and press Enter to retry.');}
    }
  }
  const result={ip,port,host:'Looking up…',isp:'Looking up…',country:'Looking up…',source,checkedAt:new Date().toISOString()};
  onPartial({...result});
  await Promise.all([
    (async()=>{
      try {
        const data=await requestJSON('https://ipwho.is/'+encodeURIComponent(ip));
        if(data.success!==true||!sameIP(publicIP(data.ip),ip))throw new Error('IP details mismatch');
        result.isp=typeof data.connection?.isp==='string'&&data.connection.isp?data.connection.isp:'Not reported';
        result.country=typeof data.country==='string'?data.country:'Not reported';
      } catch {result.isp='Unavailable — refresh to retry';result.country='Unavailable';}
      onPartial({...result});
    })(),
    (async()=>{
      try {
        const data=await requestJSON('https://dns.google/resolve?name='+encodeURIComponent(ptrName(ip))+'&type=PTR');
        if(data.Status!==0&&data.Status!==3)throw new Error('DNS lookup failed');
        const answer=data.Answer?.find(a=>a.type===12&&typeof a.data==='string');
        result.host=answer?answer.data.replace(/\.$/,''):'No reverse DNS record';
      } catch {result.host='Unavailable — refresh to retry';}
      onPartial({...result});
    })()
  ]);
  return result;
}
function ipRows(ip) {
  return [['IP Address',ip.ip],['Host',ip.host],['Remote Port',ip.port],['ISP',ip.isp],['Country',ip.country],['Connection Source',ip.source],['Checked',new Date(ip.checkedAt).toLocaleString()]];
}
function MyIPCommand() {
  const [ip,setIP] = React.useState(null);
  const [error,setError] = React.useState('');
  const [busy,setBusy] = React.useState(true);
  const lock=React.useRef(false), alive=React.useRef(true);
  React.useEffect(()=>{alive.current=true;refresh();return()=>{alive.current=false;};},[]);
  async function refresh() {
    if(lock.current) return;
    lock.current=true;setBusy(true);setError('');setIP(null);
    try {const value=await lookupIP(value=>{if(alive.current)setIP(value);});if(alive.current)setIP(value);}
    catch(e){if(alive.current)setError(e.message || 'Unable to contact MyIP.com. Press Enter to retry.');}
    finally{lock.current=false;if(alive.current)setBusy(false);}
  }
  const actions=value=>h(ActionPanel,null,
    ip && h(Action.CopyToClipboard,{title:'Copy Public IP',content:ip.ip}),
    !busy && h(Action,{title:ip?'Refresh IP':'Retry IP Lookup',icon:Icon.ArrowClockwise,onAction:refresh,shortcut:{modifiers:['cmd'],key:'r'}}),
    ip && h(Action.CopyToClipboard,{title:'Copy Value',content:value}),
    ip && h(Action.CopyToClipboard,{title:'Copy All IP Details',content:ipRows(ip).map(([label,value])=>`${label}: ${value}`).join('\n')}),
    h(Action.OpenInBrowser,{title:'IP Service Details',url:'https://ifconfig.me/'})
  );
  const rows=ip ? ipRows(ip)
    : [[busy?'Looking up IP…':'IP Lookup Failed',busy?'Checking public connection…':error]];
  return h(List,{isLoading:busy,navigationTitle:'My IP Lookup',searchBarPlaceholder:'Filter IP details…'},
    h(List.Section,{title:'Public Connection',subtitle:busy&&ip?'Looking up host and ISP…':undefined},...rows.map(([title,value])=>h(List.Item,{key:title,title,subtitle:value,icon:Icon.Globe,actions:actions(value)})))
  );
}
