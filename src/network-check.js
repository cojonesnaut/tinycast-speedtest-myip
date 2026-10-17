const {Color} = require('@raycast/api');
const probes=[
  {name:'Apple',url:'https://captive.apple.com/hotspot-detect.html',valid:text=>/<body>\s*Success\s*<\/body>/i.test(text)},
  {name:'Microsoft',url:'https://www.msftconnecttest.com/connecttest.txt',valid:text=>text.trim()==='Microsoft Connect Test'}
];
async function probeNetwork(probe) {
  const controller=new AbortController();let timer;
  const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(new Error('Timed out'));},6000);});
  try {
    const response=await Promise.race([fetch(probe.url+'?check='+Date.now(),{headers:{'Cache-Control':'no-cache'},signal:controller.signal}),timeout]);
    const text=await Promise.race([response.text(),timeout]);
    return {name:probe.name,ok:response.ok&&probe.valid(text)};
  } catch {return {name:probe.name,ok:false};}
  finally {clearTimeout(timer);}
}
async function checkNetwork(){
  const results=await Promise.all(probes.map(probeNetwork));
  return {online:results.some(r=>r.ok),results,checkedAt:new Date().toISOString()};
}
function NetworkCheckCommand(){
  const [status,setStatus]=React.useState(null),[busy,setBusy]=React.useState(true);
  const alive=React.useRef(true),lock=React.useRef(false),timer=React.useRef(null);
  async function refresh(){
    if(lock.current)return;
    clearTimeout(timer.current);lock.current=true;setBusy(true);
    try {const next=await checkNetwork();if(alive.current)setStatus(next);}
    finally{lock.current=false;if(alive.current){setBusy(false);timer.current=setTimeout(refresh,15000);}}
  }
  React.useEffect(()=>{alive.current=true;refresh();return()=>{alive.current=false;clearTimeout(timer.current);};},[]);
  const color=status?(status.online?Color.Green:Color.Red):Color.SecondaryText;
  const label=status?(status.online?'Connected':'No Internet Access'):'Checking Network…';
  const actions=h(ActionPanel,null,
    h(Action,{title:'Check Again',icon:Icon.ArrowClockwise,onAction:refresh,shortcut:{modifiers:['cmd'],key:'r'}}),
    status&&h(Action.CopyToClipboard,{title:'Copy Network Status',content:label+'\nChecked: '+status.checkedAt})
  );
  return h(List,{isLoading:busy,navigationTitle:'Network Check',searchBarPlaceholder:'Network status'},
    h(List.Item,{title:label,subtitle:status?(status.online?'Internet connection available':'Connectivity checks failed — check Wi-Fi, Ethernet, or sign-in'):'Testing internet access…',icon:{source:Icon.CircleFilled,tintColor:color},accessories:[{tag:{value:status?(status.online?'Online':'Offline'):'Checking',color}}],actions}),
    status&&h(List.Item,{title:'Last Checked',subtitle:new Date(status.checkedAt).toLocaleTimeString(),icon:Icon.Clock,actions}),
    h(List.Item,{title:'Automatic Refresh',subtitle:'Every 15 seconds while this view is open',icon:Icon.ArrowClockwise,actions})
  );
}
