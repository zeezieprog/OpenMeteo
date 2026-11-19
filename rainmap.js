export function rainMap(places, choose) {
  const panel = document.getElementById('rainmap');
  if (!window.L) {
    panel.textContent = 'Peta belum tersedia. Gunakan pilihan lokasi untuk membaca cuaca.';
    return () => {};
  }
  const coords = places.map(p => [p[2],p[3]]);
  const map = L.map(panel,{scrollWheelZoom:false,minZoom:9,maxZoom:18});
  const overview = () => map.fitBounds(coords,{padding:[44,44],maxZoom:13});
  overview();
  const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
  }).addTo(map);
  const note = document.getElementById('mapnote');
  layer.on('tileerror',()=>{note.dataset.failed='1';if(!note.textContent.includes('Peta jalan'))note.append(' Peta jalan tidak termuat sepenuhnya.');});
  document.getElementById('fit').onclick=overview;
  let request;
  const custom=L.popup();
  map.on('click',async event=>{
    request?.abort();
    const controller=new AbortController();
    request=controller;
    const {lat,lng}=event.latlng;
    const title='Titik '+lat.toFixed(3)+', '+lng.toFixed(3);
    custom.setLatLng(event.latlng).setContent('Memuat estimasi…').openOn(map);
    if(!L.latLngBounds(coords).pad(0.25).contains(event.latlng)){
      custom.setContent('Pilih titik di sekitar delapan lokasi pantau Bandung.');
      return;
    }
    const timeout=setTimeout(()=>controller.abort(),12000);
    try{
      const query=new URLSearchParams({latitude:lat.toFixed(4),longitude:lng.toFixed(4),current:'precipitation',daily:'precipitation_sum',timezone:'Asia/Jakarta',past_days:7,forecast_days:1});
      const response=await fetch('https://api.open-meteo.com/v1/forecast?'+query,{signal:controller.signal});
      if(!response.ok)throw Error();
      const result=await response.json();
      if(request!==controller)return;
      const c=result.current,days=result.daily.time,values=result.daily.precipitation_sum.filter((_,i)=>days[i]<c.time.slice(0,10)).slice(-7);
      const fmt=v=>Number.isFinite(v)?v.toLocaleString('id-ID',{maximumFractionDigits:1}):'—';
      const total=values.length===7&&values.every(Number.isFinite)?values.reduce((a,b)=>a+b,0):null;
      const content=document.createElement('div');
      const heading=document.createElement('strong');heading.textContent=title;
      const text=document.createElement('p');text.textContent=fmt(c.precipitation)+' mm dalam '+c.interval/60+' menit hingga '+c.time.replace('T',' ')+' WIB. Total 7 hari lengkap sebelumnya '+fmt(total)+' mm.';
      content.append(heading,text,document.createTextNode('Estimasi grid Open-Meteo.'));
      custom.setContent(content);
    }catch{if(request===controller)custom.setContent('Estimasi titik ini belum tersedia. Ketuk peta untuk mencoba lagi.')}
    finally{clearTimeout(timeout)}
  });
  const markers=coords.map((coord,i)=>L.marker(coord,{title:places[i][0],icon:L.divIcon({className:'rain-marker'})})
    .on('click',()=>choose(i)).addTo(map));
  return (values,selected,caption,format) => {
    note.textContent=caption+(note.dataset.failed?' Peta jalan tidak termuat sepenuhnya.':'');
    markers.forEach((marker,i)=>{
      const value=values[i], name=places[i][0];
      marker.setIcon(L.divIcon({className:'rain-marker',iconSize:[50,30],iconAnchor:[25,15],
        html:'<span class="'+(value>0?'rainy ':'')+(selected===i?'chosen':'')+'">'+format(value)+'</span>'}));
      marker.getElement().setAttribute('aria-label',name+', '+format(value)+' milimeter');
      marker.unbindTooltip().bindTooltip(name,{direction:'top',offset:[0,-12],permanent:i===selected});
    });
  };
}
