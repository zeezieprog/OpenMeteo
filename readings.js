export function humidityMeaning(value) {
  if (!Number.isFinite(value) || value < 0 || value > 100) return 'Data kelembapan belum tersedia.';
  if (value === 100) return 'Udara sudah jenuh pada suhu ini. Jika udara mendingin, sebagian uap air dapat mengembun.';
  if (value >= 90) return 'Udara sangat lembap dan hampir jenuh. Sedikit pendinginan dapat membuat uap air mengembun.';
  if (value >= 70) return 'Udara lembap. Air di permukaan cenderung lebih lambat menguap dibandingkan saat udara lebih kering pada suhu yang sama.';
  if (value >= 40) return 'Udara masih cukup jauh dari kondisi jenuh pada suhu ini.';
  return 'Udara relatif kering. Air lebih mudah menguap pada suhu yang sama.';
}

export function windMeaning(speed) {
  if (!Number.isFinite(speed) || speed < 0) return 'Data angin belum tersedia.';
  const rounded = Math.round(speed);
  if (rounded < 1) return 'Udara nyaris tenang. Asap biasanya naik hampir lurus.';
  if (rounded <= 5) return 'Hembusan sangat lemah. Asap bisa melayang perlahan ke samping, sementara daun masih tampak diam.';
  if (rounded <= 11) return 'Angin sepoi-sepoi. Hembusannya dapat terasa di wajah dan daun mulai bergerak.';
  if (rounded <= 19) return 'Daun dan ranting kecil biasanya terus bergerak tertiup angin.';
  if (rounded <= 28) return 'Angin cukup terasa untuk mengangkat debu atau kertas lepas dan menggerakkan cabang kecil.';
  if (rounded <= 38) return 'Pepohonan kecil berdaun mulai bergoyang.';
  if (rounded <= 49) return 'Cabang besar dapat bergerak dan payung terasa sulit dipegang.';
  if (rounded <= 61) return 'Pepohonan dapat bergoyang dan berjalan melawan angin terasa sulit.';
  return 'Angin sangat kuat. Pada kecepatan ini, sebagian ranting dapat patah.';
}

export function localReadings(current, format) {
  const rh = current.relative_humidity_2m;
  const wind = current.wind_speed_10m;
  const rows = [
    ['Kelembapan relatif', format(rh) + '%', humidityMeaning(rh), 'Persentase ini menunjukkan seberapa dekat udara dengan kondisi jenuh pada suhu sekarang. Peluang hujan ditampilkan di bagian prakiraan.'],
    ['Kecepatan angin', format(wind) + ' km/jam', windMeaning(wind), 'Estimasi pada ketinggian 10 meter. Di antara gedung atau pepohonan, hembusan yang terasa bisa berbeda.'],
    ['Suhu udara', format(current.temperature_2m) + ' °C', 'Estimasi suhu udara sekitar dua meter di atas permukaan tanah.', '']
  ];
  return rows.map(([label,value,meaning,note])=>`<div class="reading-row"><div class="reading-line"><span>${label}</span><strong>${value}</strong></div><p>${meaning}</p>${note ? '<details><summary>Arti pengukuran</summary><p>'+note+'</p></details>' : ''}</div>`).join('');
}
