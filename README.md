# Bandung Rain Tracker

Dashboard cuaca 22 titik di Bandung, sekitar ITB Jatinangor, dan sekitar ITB Cirebon (Arjawinangun). Data kondisi terkini dan prakiraan berasal dari Open-Meteo. Halaman kondisi terkini memeriksa sumber setiap menit selama aktif. Prakiraan diperbarui setiap jam. Setiap wilayah meminta data untuk koordinatnya sendiri. Sumber koordinat titik tambahan tercantum di locations.json dan regions/*/locations.json. Peta menggunakan ubin OpenStreetMap hingga zoom 19. Estimasi model terkini menggunakan interval 15 menit.

Jalankan `python -m http.server` dari folder ini lalu buka `http://localhost:8000`.
