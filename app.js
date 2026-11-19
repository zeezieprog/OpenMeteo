import {localReadings} from './readings.js';
import {rainMap} from './rainmap.js';
import {weather,forecastCards} from './outlook.js';
const $=id=>document.getElementById(id);
const read=async url=>{const response=await fetch(url,{signal:AbortSignal.timeout(25000)});if(!response.ok)throw Error(response.status);return response.json()};
const page=document.body.dataset.page;
const [places,seed,archive,outlookSeed]=await Promise.all([
 read('locations.json'),read('snapshot.json'),
 page==='analisis'?read('history.json'):null,
 page==='prakiraan'?read('outlook.json'):null
]);
const names=places.map(p=>p[0]), number=new Intl.NumberFormat('id-ID',{maximumFractionDigits:1});
const fmt=n=>Number.isFinite(n)?number.format(n):'—';
const dateLabel=(s,options)=>new Date(s.slice(0,10)+'T12:00:00Z').toLocaleDateString('id-ID',{timeZone:'UTC',...options});
const stamp=s=>dateLabel(s,{day:'numeric',month:'short',year:'numeric'})+' · '+s.slice(11,16)+' WIB';
const sum=values=>values.length&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null;
const query={latitude:places.map(p=>p[2]).join(','),longitude:places.map(p=>p[3]).join(','),timezone:'Asia/Jakarta',daily:'precipitation_sum'};
let data=seed,history=archive,selected=null,mode='day',status='Salinan',busy=false,historyBusy=false,loadedMonth='';
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
 $('forecastnote').textContent=(hourly?'24 jam berikutnya':'Hari ini dan enam hari ke depan')+' · WIB · '+outlookStatus;
 $('forecastcards').innerHTML=forecastCards(outlook[selected],forecastMode,wibNow());
 $('probnote').textContent=hourly?'Peluang hujan menunjukkan kemungkinan hujan pada jam tersebut. Angka mm menunjukkan perkiraan jumlah air yang turun.':'Peluang yang ditampilkan adalah peluang hujan per jam tertinggi hari itu. Jumlah hujan dalam mm adalah total sehari.';
}
async function updateOutlook(){
 if(outlookBusy)return;outlookBusy=true;
 try{const next=await read('https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({...query,hourly:'temperature_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m',daily:'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum',forecast_days:7}));
 if(next.length!==places.length||!next.every(v=>v.hourly?.time?.length&&v.daily?.time?.length===7))throw Error();
 outlook=next;outlookStatus='Open-Meteo';}catch{outlookStatus='Menggunakan prakiraan tersimpan';}finally{outlookBusy=false;showForecast()}
}
if($('hourly')) $('hourly').onclick=()=>{forecastMode='hourly';showForecast();$('forecastcards').scrollLeft=0};
if($('daily')) $('daily').onclick=()=>{forecastMode='daily';showForecast();$('forecastcards').scrollLeft=0};
function cached(key,base){try{const item=JSON.parse(localStorage.getItem(key));if(item?.length===places.length&&item[0].current.time>base[0].current.time)return item}catch{}return base}
data=cached('bandung-weather-v1',seed);
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
const updateMap=page==='peta'?rainMap(places,choose):null;
function choose(i){
 selected=i;$('place').value=i??'';
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
 $('chartloc').textContent=names[selected].toUpperCase();if(!last)return;
 const period={day:isDay?'numeric':undefined,month:'short',year:'numeric'};
 $('range').textContent=(isDay?'Total harian':'Total bulanan · reanalisis')+' · '+dateLabel(first[0],period)+' – '+dateLabel(last[0],period)+(historyBusy&&!isDay?' · Memperbarui…':'');
 const max=Math.max(1,...all.map(x=>x[1]??0)),step=Math.ceil(max/4)||1,ceiling=step*4,space=820/all.length;
 let svg='<svg viewBox="0 0 900 188" role="img" aria-label="Grafik total hujan dalam milimeter"><g font-family="Arial" font-size="13" fill="#415e67">';
 for(let i=0;i<=4;i++){const y=143-i*30;svg+='<path d="M43 '+y+'h839" stroke="#dae5e4"/><text x="36" y="'+(y+4)+'" text-anchor="end">'+fmt(step*i)+'</text>'}
 all.forEach(([t,v],i)=>{const x=55+i*space,h=(v??0)/ceiling*120;svg+='<g><title>'+t+' · '+fmt(v)+' mm</title><rect x="'+x+'" y="'+(143-h)+'" width="'+space*.56+'" height="'+(v===null?0:Math.max(1,h))+'" rx="3" fill="#318a81"/><text x="'+(x+space*.28)+'" y="168" text-anchor="middle">'+dateLabel(t,isDay?{day:'numeric',month:'short'}:{month:'short'})+'</text></g>'});
 $('chart').innerHTML=svg+'</g></svg><details><summary>Nilai grafik (mm)</summary>'+all.map(([t,v])=>dateLabel(t,period)+' · '+fmt(v)+' mm').join(' &nbsp; | &nbsp; ')+'</details>';
 const a=isDay?sum(all.slice(0,7).map(x=>x[1])):all.at(-2)?.[1],b=isDay?sum(all.slice(-7).map(x=>x[1])):last[1];
 $('trend').textContent=Number.isFinite(a)&&Number.isFinite(b)?(isDay?'Tujuh hari terakhir':'Bulan terakhir pada grafik')+' mencatat '+fmt(b)+' mm, '+(Math.abs(b-a)<.05?'sama dengan':fmt(Math.abs(b-a))+' mm lebih '+(b>a?'tinggi':'rendah')+' dari')+' '+(isDay?'tujuh hari sebelumnya.':'bulan sebelumnya.'):'Data belum lengkap untuk menghitung perubahan.';
}
function render(){
 const currents=data.map(d=>d.current),valid=currents.filter(c=>Number.isFinite(c.precipitation)),wet=names.filter((_,i)=>currents[i].precipitation>0),temps=currents.map(c=>c.temperature_2m).filter(Number.isFinite),high=Math.max(...valid.map(c=>c.precipitation)),c=currents[selected],clock=currents[0],interval=clock.interval/60;
 const peak=high>0?names.filter((_,i)=>currents[i].precipitation===high).join(', '):'';
 if($('stamp'))$('stamp').textContent=status+' · '+stamp(clock.time);
 const metrics=[['Lokasi hujan',wet.length,'/ '+valid.length,'titik dengan data hujan'],['Hujan tertinggi',fmt(high),'mm','dalam '+interval+' menit'],['Rerata suhu',fmt(sum(temps)/temps.length),'°C','di titik pemantauan'],['Titik pantau',places.length,'lokasi','di Kota Bandung']];
 if($('stats'))$('stats').innerHTML=metrics.map(([l,v,u,n],i)=>'<div class="metric">'+icon(i)+'<label>'+l+'</label><strong>'+v+' <em>'+u+'</em></strong><p>'+n+'</p></div>').join('');
 if(updateMap){
   const weekly=$('layer').value==='week';
   const values=currents.map((v,i)=>weekly?sum(daily(i).slice(-7).map(x=>x[1])):v.precipitation);
   const dates=daily(0).slice(-7);
   updateMap(values,selected,weekly?'Akumulasi dalam mm · '+dates[0][0]+' sampai '+dates.at(-1)[0]:'Curah hujan dalam mm selama '+interval+' menit hingga '+stamp(clock.time),fmt);
 }
 if($('detail')&&c){
 const [baseLabel,explanation,type]=weather(c.weather_code);
 const mixed=c.precipitation>0&&[0,1,2,3,45,48].includes(c.weather_code);
 const condition=mixed?'Hujan terindikasi':baseLabel;
 const description=mixed?'Model mencatat air hujan dalam interval terakhir. Jenis hujannya belum dapat dipastikan.':explanation;
 const expandedReadings=[...$('detail').querySelectorAll('details')].map(item=>item.open);
 $('detail').innerHTML='<div class="reading"><strong>'+condition+'</strong><span>'+description+' '+fmt(c.precipitation)+' mm dalam '+interval+' menit</span></div><div class="reading-list">'+localReadings(c,fmt)+'</div><p class="detailnote">Estimasi model untuk '+names[selected]+'. Satu milimeter hujan setara dengan satu liter air per meter persegi.</p>';
 $('detail').querySelectorAll('details').forEach((item,i)=>{item.open=Boolean(expandedReadings[i])});
 }else if($('detail')){$('detail').textContent='Pilih lokasi untuk melihat curah hujan, kelembapan, suhu, dan anginnya.'}
 if($('freshness'))$('freshness').textContent='Cek otomatis setiap menit'+(checkedAt?' · Terakhir diperiksa '+checkedAt+' WIB':'')+'. Estimasi model memiliki interval '+interval+' menit.';
 for(const link of document.querySelectorAll('nav a,.destinations a')){
  const url=new URL(link.href);
  if(selected!==null&&!url.pathname.endsWith('index.html'))url.searchParams.set('lokasi',slug(names[selected]));else url.searchParams.delete('lokasi');
  link.href=url.href;
 }
 if($('prompt')){
  $('prompt').hidden=selected!==null;
  $(page==='analisis'?'riwayat':'prakiraan').hidden=selected===null;
 }
 if($('distribution'))$('distribution').textContent=wet.length?'Model menunjukkan hujan di '+wet.join(', ')+'. Akumulasi tertinggi '+fmt(high)+' mm di '+peak+'.':valid.length?'Model menunjukkan 0 mm pada '+valid.length+' titik dengan data untuk interval ini. Hujan lokal di antara titik pantau masih mungkin terjadi.':'Belum ada estimasi hujan untuk interval ini.';
 if($('rows'))$('rows').innerHTML=currents.map((v,i)=>'<tr><td><b>'+names[i]+'</b></td><td>'+(v.precipitation>0&&[0,1,2,3,45,48].includes(v.weather_code)?'Hujan terindikasi':weather(v.weather_code)[0])+'</td><td>'+fmt(v.precipitation)+' mm</td><td>'+fmt(v.temperature_2m)+' °C</td><td>'+fmt(sum(daily(i).slice(-7).map(x=>x[1])))+' mm</td></tr>').join('');
 chart();showForecast()
}
async function refresh(){if(busy)return;busy=true;if($('refresh'))$('refresh').disabled=true;try{const next=await read('https://api.open-meteo.com/v1/forecast?'+new URLSearchParams({...query,current:'precipitation,temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code',past_days:31,forecast_days:1}));if(next.length!==places.length||!next.every(d=>d.current?.time&&d.daily?.time))throw Error();data=next;status='Waktu data';try{localStorage.setItem('bandung-weather-v1',JSON.stringify(data))}catch{}}catch{status='Koneksi gagal · salinan'}finally{checkedAt=wibNow().slice(11);busy=false;if($('refresh'))$('refresh').disabled=false;render()}}
async function refreshHistory(){const date=new Date(Date.now()+7*3600000),y=date.getUTCFullYear(),m=date.getUTCMonth(),iso=d=>d.toISOString().slice(0,10),end=iso(new Date(Date.UTC(y,m,0)));if(historyBusy||loadedMonth===end)return;historyBusy=true;chart();try{const next=await read('https://archive-api.open-meteo.com/v1/archive?'+new URLSearchParams({...query,start_date:iso(new Date(Date.UTC(y,m-6,1))),end_date:end}));if(next.length===places.length&&next.every(d=>d.daily?.time?.length)){history=next;loadedMonth=end}}catch{}finally{historyBusy=false;chart()}}
if($('day')){
 $('day').onclick=()=>{mode='day';chart()};
 $('month').onclick=()=>{mode='month';chart();refreshHistory()};
}
if($('refresh'))$('refresh').onclick=refresh;
render();
if(page==='prakiraan'){
 updateOutlook();
 setInterval(()=>{if(!document.hidden)updateOutlook()},3600000);
}else{
 refresh();
 setInterval(()=>{if(!document.hidden)refresh()},60000);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden){if(page==='prakiraan')updateOutlook();else refresh()}});
