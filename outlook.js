const descriptions = [
  [[0], 'Cerah', 'Langit diperkirakan cerah.', 'sun'],
  [[1], 'Umumnya cerah', 'Sebagian besar langit cerah dengan sedikit awan.', 'sun'],
  [[2], 'Berawan sebagian', 'Awan menutupi sebagian langit.', 'partly'],
  [[3], 'Berawan', 'Awan menutupi sebagian besar langit. Awan tebal saja belum memastikan hujan turun.', 'cloud'],
  [[45,48], 'Berkabut', 'Butir air di dekat permukaan dapat mengurangi jarak pandang.', 'fog'],
  [[51,53,55,56,57], 'Gerimis', 'Tetes air halus diperkirakan turun di sekitar titik ini.', 'rain'],
  [[61,80], 'Hujan ringan', 'Hujan berintensitas ringan diperkirakan turun di sekitar titik ini.', 'rain'],
  [[63,81], 'Hujan sedang', 'Model memperkirakan hujan dengan intensitas sedang di sekitar titik ini.', 'rain'],
  [[65,82], 'Hujan lebat', 'Model memperkirakan hujan deras. Kondisi dapat berbeda di jalan atau kawasan sebelah.', 'rain'],
  [[95], 'Badai petir', 'Model mengindikasikan badai petir di sekitar lokasi. Sambaran petir memerlukan konfirmasi pengamatan.', 'storm'],
  [[96,99], 'Badai petir dan potensi hujan es', 'Model mengindikasikan petir disertai kemungkinan butiran es.', 'storm']
];
export function weather(code) {
  return descriptions.find(([codes])=>codes.includes(code))?.slice(1) ??
    ['Kondisi belum teridentifikasi','Jenis cuaca belum dapat ditentukan dari kode sumber.','unknown'];
}
export function symbol(type,night=false) {
  const cloud='<path d="M9 26h20a6 6 0 0 0 0-12 9 9 0 0 0-17-1 6.5 6.5 0 0 0-3 13Z" fill="#e3eef2" stroke="#7194a5"/>';
  const sun='<circle cx="19" cy="15" r="7" fill="#ffcf65" stroke="#da9f37"/><path d="M19 3v2m0 20v3M7 15H4m27 0h3M9 6l2 2m16 15 2 2M28 6l-2 2M10 23l-2 2" stroke="#d6a437"/>';
  const moon='<path d="M24 5a12 12 0 1 0 6 19A13 13 0 0 1 24 5Z" fill="#b1bce5" stroke="#7d8bb9"/>';
  const extra={rain:'<path d="m12 30-2 3m10-3-2 3m10-3-2 3" stroke="#408eb1"/>',storm:'<path d="m21 23-5 8h5l-2 5 9-11h-6l2-2" fill="#e9ac39"/>',fog:'<path d="M7 30h21m-17 4h15" stroke="#91a7ae"/>'};
  return '<svg width="38" height="38" viewBox="0 0 38 38" fill="none" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">'+(type==='unknown'?'<text x="14" y="25" fill="#768994">?</text>':type==='sun'?(night?moon:sun):type==='partly'?'<g transform="translate(8 -2) scale(.78)">'+(night?moon:sun)+'</g>'+cloud:cloud+(extra[type]||''))+'</svg>';
}
const format=n=>Number.isFinite(n)?new Intl.NumberFormat('id-ID',{maximumFractionDigits:1}).format(n):'—';
const date=(s,options)=>new Date(s+'T12:00:00+07:00').toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',...options});
export function forecastCards(entry,mode,now){
  const hourly=mode==='hourly',d=entry[mode],today=now.slice(0,10);
  const slots=d.time.map((time,i)=>({time,i})).filter(({time})=>hourly?time>now:time>=today).slice(0,hourly?24:7);
  if(!slots.length)return '<p>Periode prakiraan tersimpan sudah berakhir. Menunggu data baru dari sumber.</p>';
  return slots.map(({time,i})=>{
    const [label,,icon]=weather(d.weather_code[i]),hour=+time.slice(11,13),day=time.slice(0,10);
    const temp=hourly?format(d.temperature_2m[i])+'°':format(d.temperature_2m_min[i])+'–'+format(d.temperature_2m_max[i])+'°';
    const prob=hourly?d.precipitation_probability[i]:d.precipitation_probability_max[i];
    const rain=hourly?d.precipitation[i]:d.precipitation_sum[i];
    return '<div class="period"><span>'+date(day,{weekday:'short',day:'numeric',month:'short'})+'</span><b>'+(hourly?time.slice(11,16)+' WIB':day===today?'Hari ini':date(day,{weekday:'long'}))+'</b>'+symbol(icon,hourly&&(hour>=18||hour<6))+'<strong>'+temp+'</strong><div>'+label+'</div><small>Peluang '+format(prob)+'%</small><small>Hujan '+format(rain)+' mm</small></div>';
  }).join('');
}
