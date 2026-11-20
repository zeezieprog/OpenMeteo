# Bandung Rain Tracker

Dashboard cuaca 14 titik di Bandung, sekitar ITB Jatinangor, dan sekitar ITB Cirebon (Arjawinangun). Data kondisi terkini dan prakiraan berasal dari Open-Meteo. Halaman kondisi terkini memeriksa sumber setiap menit selama aktif. Prakiraan diperbarui setiap jam. Setiap wilayah meminta data untuk koordinatnya sendiri. Sumber koordinat enam titik tambahan tercantum di regions/*/locations.json. Peta menggunakan ubin OpenStreetMap hingga zoom 19. Estimasi model terkini menggunakan interval 15 menit.

Jalankan `python -m http.server` dari folder ini lalu buka `http://localhost:8000`.
