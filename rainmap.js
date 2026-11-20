export function rainMap(places, choose, region) {
  const panel = document.getElementById('rainmap');
  const note=document.getElementById('mapnote');
  const fit=document.getElementById('fit');
  if(!window.L){
    fit.hidden=true;
    return (_values,_selected,caption)=>{note.textContent=caption+'. Gunakan pilihan lokasi untuk membaca data titik.'};
  }
  const coords=places.map(p=>[p[2],p[3]]);
  const bounds=L.latLngBounds(coords);
  const map=L.map(panel,{scrollWheelZoom:true,minZoom:9,maxZoom:19});
  const overview=()=>map.fitBounds(bounds,{padding:[38,38],maxZoom:15,animate:false});
  overview();
  const attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
  if(region==='bandung'){
    L.imageOverlay('bandung-streets.webp',[[-7.0136679276,107.490234375],[-6.7955350257,107.7978515625]],{
      attribution:attribution+' · OpenFreeMap',pane:'tilePane',zIndex:0
    }).addTo(map);
  }
  const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
    maxZoom:19, attribution, zIndex:2
  });
  const tileStatus=document.createElement('small');
  tileStatus.setAttribute('role','status');
  panel.parentElement.after(tileStatus);
  tiles.on('loading',()=>{tileStatus.textContent=''});
  tiles.on('tileerror',()=>{tileStatus.textContent='Sebagian detail jalan gagal dimuat. Daftar titik tetap tersedia.'});
  tiles.addTo(map);
  L.control.scale({imperial:false}).addTo(map);
  fit.onclick=()=>{map.closePopup();overview()};
  if(window.ResizeObserver)new ResizeObserver(()=>map.invalidateSize({pan:false})).observe(panel);
  let request;
  const custom=L.popup();
  map.on('click',async event=>{
    request?.abort();
    const controller=new AbortController();
    request=controller;
    const {lat,lng}=event.latlng;
    const title='Titik '+lat.toFixed(3)+', '+lng.toFixed(3);
    custom.setLatLng(event.latlng).setContent('Memuat estimasi…').openOn(map);
    if(!bounds.pad(1).contains(event.latlng)){
      custom.setContent('Pilih titik di sekitar lokasi pantau di wilayah ini.');
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
    .on('click',()=>{map.closePopup();choose(i)}).addTo(map));
  let previousSelection=null;
  return (values,selected,caption,format) => {
    note.textContent=caption;
    if(selected!==previousSelection&&selected!==null)map.setView(coords[selected],Math.max(map.getZoom(),16));
    previousSelection=selected;
    markers.forEach((marker,i)=>{
      const value=values[i], name=places[i][0];
      const key=String(value)+'/'+(selected===i);
      if(marker.options.renderKey===key)return;
      marker.options.renderKey=key;
      marker.setIcon(L.divIcon({className:'rain-marker',iconSize:[50,30],iconAnchor:[25,15],
        html:'<span class="'+(value==null?'unavailable ':value>0?'rainy ':'')+(selected===i?'chosen':'')+'">'+format(value)+'</span>'}));
      marker.getElement().setAttribute('aria-label',name+', '+format(value)+' milimeter');
      marker.unbindTooltip().bindTooltip(name,{direction:'top',offset:[0,-12],permanent:i===selected});
    });
  };
}
