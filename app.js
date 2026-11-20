import {localReadings} from './readings.js';
import {rainMap} from './rainmap.js?v=regional2';
import {weather,forecastCards} from './outlook.js';
const $=id=>document.getElementById(id);
async function read(url) {
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),18000);
 try {
  const response=await fetch(url,{signal:controller.signal});
  if(!response.ok)throw Error('HTTP '+response.status);
  return await response.json();
 } finally { clearTimeout(timer); }
}
const page=document.body.dataset.page;
const regions = {bandung:'Bandung', jatinangor:'Jatinangor', cirebon:'Cirebon'};
const requestedRegion = new URLSearchParams(location.search).get('wilayah');
const region = Object.hasOwn(regions, requestedRegion) ? requestedRegion : 'bandung';
const regionLabel = regions[region];
const folder = region === 'bandung' ? '' : 'regions/'+region+'/';
for (const link of document.querySelectorAll('[data-region]')) {
 if (link.dataset.region === region) link.setAttribute('aria-current','true');
}
const heading = document.querySelector('h1');
heading.textContent += ' · '+regionLabel;
document.title = heading.textContent+' | Rain Tracker Meteo';
const dataset = name => folder+name+(region==='jatinangor'?'?v=jat7':region==='bandung'?'?v=bdg13':'');
const [places,seed,archive,outlookSeed]=await Promise.all([
 read(dataset('locations.json')),read(dataset('snapshot.json')),
 page==='analisis'?read(dataset('history.json')):null,
 page==='prakiraan'?read(dataset('outlook.json')):null
]);
const names=places.map(p=>p[0]), number=new Intl.NumberFormat('id-ID',{maximumFractionDigits:1});
const locationKey = places.map(p=>p.slice(0,4).join('/')).join('|');
const cacheKey = type => region+'-'+type+'-'+locationKey;
const fmt=n=>Number.isFinite(n)?number.format(n):'—';
const dateLabel=(s,options)=>new Date(s.slice(0,10)+'T12:00:00Z').toLocaleDateString('id-ID',{timeZone:'UTC',...options});
const stamp=s=>dateLabel(s,{day:'numeric',month:'short',year:'numeric'})+' · '+s.slice(11,16)+' WIB';
const sum=values=>values.length>0&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null;
const query={latitude:places.map(p=>p[2]).join(','),longitude:places.map(p=>p[3]).join(','),timezone:'Asia/Jakarta',daily:'precipitation_sum'};
let data=seed,history=archive,selected=null,mode='day',status='Salinan',busy=false,historyBusy=false,loadedMonth='',historyStatus='Salinan arsip';
let outlook=outlookSeed,forecastMode='hourly',outlookBusy=false,outlookStatus='Salinan prakiraan',checkedAt='';
const wibNow=()=>new Date(Date.now()+7*3600000).toISOString().slice(0,16);
function showForecast(){
 if(selected===null || page!=='prakiraan')return;
 const hourly=forecastMode==='hourly';
 const now=wibNow(), point=outlook[selected], series=hourly?point.hourly:point.daily;
 const periods=series.time.map((time,i)=>({time,i})).filter(v=>hourly?v.time>now:v.time>=now.slice(0,10)).slice(0,hourly?24:7);
 const amount=hourly?series.precipitation:series.precipitation_sum;
 const available=periods.filter(v=>Number.isFinite(amount[v.i]));
 const peak=available.reduce((best,v)=>!best||amount[v.i]>amount[best.i]?v:best,null);
 const when=peak ? dateLabel(peak.time,{weekday:'short',day:'numeric',month:'short'})+(hourly?' pukul '+peak.time.slice(11,16)+' WIB':''):'';
 $('outlookbrief').textContent=!peak?'Prakiraan belum tersedia untuk periode ini.':amount[peak.i]>0?'Di '+names[selected]+', jumlah hujan tertinggi dalam periode ini diperkirakan '+when+', sekitar '+fmt(amount[peak.i])+' mm.':'Seluruh periode dengan data menunjukkan perkiraan 0 mm di '+names[selected]+'. Periksa kembali menjelang keberangkatan.';

 $('hourly').setAttribute('aria-pressed',hourly);$('daily').setAttribute('aria-pressed',!hourly);
 $('forecastloc').textContent=names[selected].toUpperCase();
 $('forecastnote').textContent=(periods.length+' '+(hourly?'jam':'hari')+' tersedia')+' · WIB · '+outlookStatus;
 const previousScroll=$('forecastcards').scrollLeft;
 $('forecastcards').innerHTML=forecastCards(outlook[selected],forecastMode,wibNow());
 $('forecastcards').scrollLeft=previousScroll;
 updateArrows();
 $('probnote').textContent=hourly?'Peluang hujan menunjukkan kemungkinan hujan pada jam tersebut. Angka mm menunjukkan perkiraan jumlah air yang turun.':'Peluang yang ditampilkan adalah peluang hujan per jam tertinggi hari itu. Jumlah hujan dalam mm adalah total sehari.';
}
async function updateOutlook(){
 if(outlookBusy)return;outlookBusy=true;
 try{const next=await read('https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({...query,hourly:'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',forecast_days:7}));
 if(!validForecast(next))throw Error();
 outlook=next;try{localStorage.setItem(cacheKey('forecast'),JSON.stringify(next))}catch{}outlookStatus='Open-Meteo';}catch{outlookStatus='Menggunakan prakiraan tersimpan';}finally{outlookBusy=false;showForecast()}
}
function updateArrows(){
 const strip=$('forecastcards');if(!strip)return;
 $('prev').disabled=strip.scrollLeft<2;
 $('next').disabled=strip.scrollLeft+strip.clientWidth>=strip.scrollWidth-2;
}
if($('forecastcards')){
 const strip=$('forecastcards');
 strip.addEventListener('scroll',updateArrows,{passive:true});
 for(const [id,direction] of [['prev',-1],['next',1]])$(id).onclick=()=>strip.scrollBy({left:direction*strip.clientWidth*.85,behavior:'smooth'});
}
if($('hourly')) $('hourly').onclick=()=>{forecastMode='hourly';showForecast();$('forecastcards').scrollLeft=0};
if($('daily')) $('daily').onclick=()=>{forecastMode='daily';showForecast();$('forecastcards').scrollLeft=0};
function completeSeries(series,fields){
 return Array.isArray(series?.time)&&series.time.length>0&&series.time.every(t=>typeof t==='string')&&fields.every(key=>Array.isArray(series[key])&&series[key].length===series.time.length);
}
function validCurrent(rows){
 return Array.isArray(rows)&&rows.length===places.length&&rows.every(d=>typeof d?.current?.time==='string'&&d.current.interval>0&&completeSeries(d.daily,['precipitation_sum']));
}
function validForecast(rows){
 return Array.isArray(rows)&&rows.length===places.length&&rows.every(d=>completeSeries(d.hourly,['temperature_2m','precipitation_probability','precipitation','weather_code'])&&completeSeries(d.daily,['temperature_2m_min','temperature_2m_max','precipitation_probability_max','precipitation_sum','weather_code']));
}
function cached(key,base,valid,date){
 try{const saved=JSON.parse(localStorage.getItem(key));if(valid(saved)&&date(saved)>=date(base))return saved}catch{}
 return base;
}
data=cached(cacheKey('weather'),seed,validCurrent,rows=>rows[0].current.time);
if(outlook)outlook=cached(cacheKey('forecast'),outlook,validForecast,rows=>rows[0].hourly.time.at(-1));
function weekly(i){
 const entries=daily(i).slice(-7);
 return entries.length===7?sum(entries.map(entry=>entry[1])):null;
}
function daily(i){const d=data[i];return d.daily.time.flatMap((t,j)=>t<d.current.time.slice(0,10)?[[t,d.daily.precipitation_sum[j]]]:[])}
function monthly(i){const d=history[i].daily,groups=new Map();d.time.forEach((t,j)=>{const k=t.slice(0,7);if(!groups.has(k))groups.set(k,[]);groups.get(k).push(d.precipitation_sum[j])});return [...groups].map(([k,v])=>[k+'-01',v.length===new Date(Date.UTC(+k.slice(0,4),+k.slice(5),0)).getUTCDate()?sum(v):null])}
const shapes=['<path d="M7 15h10a4 4 0 0 0 .5-8A6 6 0 0 0 6 8a3.5 3.5 0 0 0 1 7Zm2 3-1 2m6-2-1 2"/>','<path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0c0-5-7-13-7-13Z"/>','<path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a4 4 0 1 1-4 0Zm2-6v8"/>','<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z"/><circle cx="12" cy="10" r="2"/>'];
const icon=i=>'<span class="icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round">'+shapes[i]+'</svg></span>';
$('place').insertAdjacentHTML('beforeend',names.map((n,i)=>'<option value="'+i+'">'+n+'</option>').join(''));
const slug=n=>n.toLowerCase().replaceAll(' ','-');
const requested=new URLSearchParams(location.search).get('lokasi');
const initial=page==='index'?-1:names.findIndex(n=>slug(n)===requested);
selected=initial<0?null:initial;
$('place').value=selected??'';
const updateMap=page==='peta'?rainMap(places,choose,region):null;
function choose(i){
 selected=i;$('place').value=i??'';if($('forecastcards'))$('forecastcards').scrollLeft=0;
 if(page!=='index'){
   const url=new URL(location.href);
   if(i===null)url.searchParams.delete('lokasi');else url.searchParams.set('lokasi',slug(names[i]));
   window.history.replaceState(null,'',url);
 }
 render();
}
$('place').onchange=e=>choose(e.target.value===''?null:Number(e.target.value));
if($('layer'))$('layer').onchange=()=>render();
function chart(){
 if(selected===null || page!=='analisis')return;
 const isDay=mode==='day',all=isDay?daily(selected).slice(-14):monthly(selected),last=all.at(-1),first=all[0];
 $('day').setAttribute('aria-pressed',isDay);$('month').setAttribute('aria-pressed',!isDay);
 $('chartloc').textContent=names[selected].toUpperCase();if(!last){$('chart').textContent='Data belum tersedia.';$('trend').textContent='';$('range').textContent='';return;}
 const period={day:isDay?'numeric':undefined,month:'short',year:'numeric'};
 $('range').textContent=(isDay?'Total harian':'Total bulanan · reanalisis')+' · '+dateLabel(first[0],period)+' – '+dateLabel(last[0],period)+(isDay?'':' · '+(historyBusy?'Memperbarui…':historyStatus));
 const width=Math.max(235,Math.round($('chart').getBoundingClientRect().width));
 const small=width<500,left=38,right=12,baseline=165,height=132;
 const step=Math.max(1,Math.ceil(Math.max(0,...all.map(x=>x[1]??0))/4));
 const spacing=(width-left-right)/all.length;
 const ticks=Array.from({length:5},(_,i)=>{
  const y=baseline-i*height/4;
  return '<path d="M'+left+' '+y+'H'+(width-right)+'" stroke="#d8e3e6"/><text x="'+(left-6)+'" y="'+(y+4)+'" text-anchor="end">'+fmt(step*i)+'</text>';
 }).join('');
 const bars=all.map(([t,v],i)=>{
  const x=left+(i+.5)*spacing,h=(v??0)/(step*4)*height;
  const label=!small||i%3===0||(!isDay&&i===all.length-1);
  return '<g><title>'+t+' · '+fmt(v)+' mm</title><rect x="'+(x-spacing*.29)+'" y="'+(baseline-h)+'" width="'+spacing*.58+'" height="'+(v===null?0:Math.max(1,h))+'" rx="3" fill="#227b74"/>'+(label?'<text x="'+x+'" y="186" text-anchor="middle">'+dateLabel(t,isDay?{day:'numeric'}:{month:'short'})+'</text>':'')+'</g>';
 }).join('');
 const wasOpen=$('chart').querySelector('details')?.open;
 $('chart').innerHTML='<svg viewBox="0 0 '+width+' 198" role="img" aria-label="Jumlah hujan dalam milimeter"><g font-family="Arial" font-size="12" fill="#435e67"><text x="4" y="17">mm</text>'+ticks+bars+'</g></svg><details><summary>Nilai per '+(isDay?'tanggal':'bulan')+'</summary><dl>'+all.map(([t,v])=>'<div><dt>'+dateLabel(t,period)+'</dt><dd>'+fmt(v)+' mm</dd></div>').join('')+'</dl></details>';
 $('chart').querySelector('details').open=Boolean(wasOpen);
 const a=isDay?(all.length===14?sum(all.slice(0,7).map(x=>x[1])):null):all.at(-2)?.[1],b=isDay?sum(all.slice(-7).map(x=>x[1])):last[1];
 $('trend').textContent=Number.isFinite(a)&&Number.isFinite(b)?(isDay?'Tujuh hari terakhir':'Bulan terakhir pada grafik')+' mencatat '+fmt(b)+' mm, '+(Math.abs(b-a)<.05?'sama dengan':fmt(Math.abs(b-a))+' mm lebih '+(b>a?'tinggi':'rendah')+' dari')+' '+(isDay?'tujuh hari sebelumnya.':'bulan sebelumnya.'):'Data belum lengkap untuk menghitung perubahan.';
}
function render(){
 const currents=data.map(d=>d.current),valid=currents.filter(c=>Number.isFinite(c.precipitation)),wet=names.filter((_,i)=>currents[i].precipitation>0),temps=currents.map(c=>c.temperature_2m).filter(Number.isFinite),high=Math.max(...valid.map(c=>c.precipitation)),c=currents[selected],clock=currents[0],interval=clock.interval/60;
 const peak=high>0?names.filter((_,i)=>currents[i].precipitation===high).join(', '):'';
 if($('stamp'))$('stamp').textContent=status+' · '+stamp(clock.time);
 const metrics=[['Lokasi hujan',wet.length,'/ '+valid.length,'titik dengan data hujan'],['Hujan tertinggi',fmt(high),'mm','dalam '+interval+' menit'],['Rerata suhu',fmt(sum(temps)/temps.length),'°C','di titik pemantauan'],['Titik pantau',places.length,'lokasi','di '+regionLabel]];
 if($('stats'))$('stats').innerHTML=metrics.map(([l,v,u,n],i)=>'<div class="metric">'+icon(i)+'<label>'+l+'</label><strong>'+v+' <em>'+u+'</em></strong><p>'+n+'</p></div>').join('');
 if(updateMap){
   const weekLayer=$('layer').value==='week';
   const values=currents.map((v,i)=>weekLayer?weekly(i):v.precipitation);
   const dates=daily(0).slice(-7);
   const list=$('mapplaces');
   if(list){
    if(!list.childElementCount){
     names.forEach((name,i)=>{
      const btn=document.createElement('button');
      const label=document.createElement('span');label.textContent=name;
      btn.append(label,document.createElement('b'));btn.onclick=()=>choose(i);list.append(btn);
     });
    }
    [...list.children].forEach((btn,i)=>{
     btn.setAttribute('aria-pressed',String(i===selected));
     btn.lastElementChild.textContent=fmt(values[i])+' mm';
    });
   }
   updateMap(values,selected,weekLayer?(dates.length===7?'Akumulasi dalam mm · '+dates[0][0]+' sampai '+dates.at(-1)[0]:'Data tujuh hari belum lengkap.'):'Curah hujan dalam mm selama '+interval+' menit hingga '+stamp(clock.time),fmt);
 }
 if($('detail')&&c){
 const [baseLabel,explanation,type]=weather(c.weather_code);
 const mixed=c.precipitation>0&&[0,1,2,3,45,48].includes(c.weather_code);
 const condition=mixed?'Hujan terindikasi':baseLabel;
 const description=mixed?'Model mencatat air hujan dalam interval terakhir. Jenis hujannya belum dapat dipastikan.':explanation;
 const expandedReadings=[...$('detail').querySelectorAll('details')].map(item=>item.open);
 $('detail').innerHTML='<div class="reading"><strong>'+condition+'</strong><span>'+description+' '+fmt(c.precipitation)+' mm dalam '+interval+' menit</span></div><div class="reading-list">'+localReadings(c,fmt)+'</div><p class="detailnote">Estimasi model untuk '+names[selected]+'. Satu milimeter hujan setara dengan satu liter air per meter persegi.</p>';
 const point=places[selected], source=document.createElement('a');
 source.textContent=((region==='jatinangor'||point[4])?point[1]+' · ':'Koordinat titik · ')+Math.abs(point[2]).toFixed(4)+'° LS, '+point[3].toFixed(4)+'° BT';
 source.href=point[4] || 'https://www.openstreetmap.org/?mlat='+point[2]+'&mlon='+point[3];
 source.target='_blank';source.rel='noopener';source.className='point-source';$('detail').append(source);
 $('detail').querySelectorAll('details').forEach((item,i)=>{item.open=Boolean(expandedReadings[i])});
 }else if($('detail')){$('detail').textContent=page==='peta'?'':'Pilih lokasi untuk melihat curah hujan, kelembapan, suhu, dan anginnya.'}
 if($('freshness'))$('freshness').textContent='Cek otomatis setiap menit'+(checkedAt?' · Terakhir diperiksa '+checkedAt+' WIB':'')+'. Estimasi model memiliki interval '+interval+' menit.';
 for(const link of document.querySelectorAll('nav a,.destinations a')){
  const url=new URL(link.href);
  url.searchParams.set('wilayah',region);
  if(selected!==null&&!url.pathname.endsWith('index.html'))url.searchParams.set('lokasi',slug(names[selected]));else url.searchParams.delete('lokasi');
  link.href=url.href;
 }
 if($('prompt')){
  $('prompt').hidden=selected!==null;
  $(page==='analisis'?'riwayat':'prakiraan').hidden=selected===null;
 }
 if($('distribution'))$('distribution').textContent=wet.length?'Model menunjukkan hujan di '+wet.join(', ')+'. Akumulasi tertinggi '+fmt(high)+' mm di '+peak+'.':valid.length?'Seluruh '+valid.length+' titik dengan data menunjukkan 0 mm dalam '+interval+' menit terakhir. Hujan lokal masih mungkin turun di antara titik pantau.':'Belum ada estimasi hujan untuk interval ini.';
 if($('selectgrid')&&selected===null){
  const buttons=$('selectgrid');
  if(!buttons.children.length){
   names.forEach((name,i)=>{const button=document.createElement('button');button.textContent=name;button.onclick=()=>choose(i);buttons.append(button)});
  }
 }
 if($('rows'))$('rows').innerHTML=currents.map((v,i)=>'<tr><td><b>'+names[i]+'</b></td><td>'+(v.precipitation>0&&[0,1,2,3,45,48].includes(v.weather_code)?'Hujan terindikasi':weather(v.weather_code)[0])+'</td><td>'+fmt(v.precipitation)+' mm</td><td>'+fmt(v.temperature_2m)+' °C</td><td>'+fmt(weekly(i))+' mm</td></tr>').join('');
 chart();showForecast()
}
async function refresh(){if(busy)return;busy=true;if($('refresh'))$('refresh').disabled=true;try{const next=await read('https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({...query,current:'precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',past_days:31,forecast_days:1}));if(!validCurrent(next))throw Error();if(next[0].current.time<data[0].current.time)throw Error('older');data=next;status='Waktu data';try{localStorage.setItem(cacheKey('weather'),JSON.stringify(data))}catch{}}catch{status='Koneksi gagal · salinan'}finally{checkedAt=wibNow().slice(11);busy=false;if($('refresh'))$('refresh').disabled=false;render()}}
async function refreshHistory(){const date=new Date(Date.now()+7*3600000),y=date.getUTCFullYear(),m=date.getUTCMonth(),iso=d=>d.toISOString().slice(0,10),end=iso(new Date(Date.UTC(y,m,0)));if(historyBusy||loadedMonth===end)return;historyBusy=true;chart();try{const next=await read('https://archive-api.open-meteo.com/v1/archive?'+new URLSearchParams({...query,start_date:iso(new Date(Date.UTC(y,m-6,1))),end_date:end}));if(next.length===places.length&&next.every(d=>completeSeries(d.daily,['precipitation_sum']))){history=next;loadedMonth=end;historyStatus='Arsip Open-Meteo'}}catch{historyStatus='Koneksi gagal · salinan arsip'}finally{historyBusy=false;chart()}}
if($('day')){
 $('day').onclick=()=>{mode='day';chart()};
 $('month').onclick=()=>{mode='month';chart();refreshHistory()};
}
if($('refresh'))$('refresh').onclick=refresh;
render();
window.addEventListener('resize',()=>{if(page==='analisis')chart();if(page==='prakiraan')updateArrows()});
if(page==='prakiraan'){
 updateOutlook();
 setInterval(()=>{if(!document.hidden)updateOutlook()},3600000);
}else{
 refresh();
 setInterval(()=>{if(!document.hidden)refresh()},60000);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(page==='prakiraan')updateOutlook();else refresh()}});
