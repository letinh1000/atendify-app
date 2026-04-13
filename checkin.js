import { API_BASE, currentUser } from "./app.js";

document.addEventListener('DOMContentLoaded', () => {
    if(!document.getElementById('scan-qr-btn')) return;

    let localStream = null;
    let qrReaderInterval = null;
    let currentEventId = null;
    let currentEventInfo = null;

    const video = document.getElementById('qr-video');
    const canvas = document.createElement('canvas'); // Để phân tích QR JS

    // Tính GPS
    function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
        var R = 6371000;
        var dLat = deg2rad(lat2-lat1);  
        var dLon = deg2rad(lon2-lon1); 
        var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        return R * c; 
    }
    function deg2rad(deg) { return deg * (Math.PI/180) }

    // Start Scanner
    document.getElementById('scan-qr-btn').addEventListener('click', async () => {
        document.getElementById('scan-qr-btn').parentNode.classList.add('hidden');
        document.getElementById('scanner-view').classList.remove('hidden');

        try {
            localStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            video.srcObject = localStream;
            video.setAttribute("playsinline", true);
            video.play();
            video.style.display = 'block';
            document.getElementById('camera-loading').style.display = 'none';

            // Check FPS nhẹ
            qrReaderInterval = setInterval(scanFrame, 500);

        } catch (error) {
            console.error("Camera Error:", error);
            alert("Không thể truy cập Camera. Vui lòng cấp quyền web!");
            closeScanner();
        }
    });

    // Close Scanner
    function closeScanner() {
        if(qrReaderInterval) clearInterval(qrReaderInterval);
        if(localStream) localStream.getTracks().forEach(track => track.stop());
        
        document.getElementById('scanner-view').classList.add('hidden');
        document.getElementById('scan-qr-btn').parentNode.classList.remove('hidden');
        document.getElementById('selfie-container').classList.add('hidden');
        document.getElementById('location-status').style.display = 'none';

        video.style.display = 'none';
        document.getElementById('camera-loading').style.display = 'block';
    }

    document.getElementById('cancel-scan-btn').addEventListener('click', closeScanner);

    // Xử lý Check QR Frame
    function scanFrame() {
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
            canvas.height = video.videoHeight;
            canvas.width = video.videoWidth;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

            if (code) {
                console.log("QR Catch:", code.data);
                clearInterval(qrReaderInterval); // Ngưng tìm qr tránh giật
                verifyQRCode(code.data);
            }
        }
    }

    async function verifyQRCode(qrData) {
        const parts = qrData.split('|');
        if(parts.length !== 2) {
            alert("Mã QR này không hợp lệ!");
            qrReaderInterval = setInterval(scanFrame, 500);
            return;
        }

        const [eventId, qrTimestamp] = parts;
        if (Date.now() - parseInt(qrTimestamp) > 20000) {
            alert("Mã QR đã hết hạn! Vui lòng quét mã mới nhảy trên màn hình (Làm mới mỗi 15s).");
            qrReaderInterval = setInterval(scanFrame, 500);
            return;
        }

        try {
            // Check coi có Event đó ko trên Express local API DB
            const req = await fetch(`${API_BASE}/api/events/${eventId}`);
            if(!req.ok){
                alert("Sự kiện này không có thật hoặc bị xóa!");
                return closeScanner();
            }
            const evData = await req.json();

            // Xin quyền Location hiện hành để so với Data Event
            navigator.geolocation.getCurrentPosition((pos) => {
                const distance = getDistanceFromLatLonInM(pos.coords.latitude, pos.coords.longitude, evData.lat, evData.lng);

                if (distance > evData.radius) {
                    alert(`Phát hiện bạn đang ở quá xa! KC: ${Math.round(distance)}m (Yêu cầu <= ${evData.radius}m)`);
                    closeScanner();
                } else {
                    document.getElementById('location-status').style.display = 'block';
                    document.getElementById('location-status').innerHTML = `📍 Vị trí hợp lệ (~${Math.round(distance)}m)`;
                    document.getElementById('selfie-container').classList.remove('hidden');
                    
                    currentEventInfo = evData;
                    currentEventId = eventId;
                }
            }, () => {
                alert("Bạn tắt định vị. Chúng tôi cần nó để check gian lận GPS!");
                closeScanner();
            }, { enableHighAccuracy: true });

        } catch (e) {
            console.error(e);
            alert("Lỗi mạng API kiểm tra sự kiện.");
            closeScanner();
        }
    }

    // Nút Bấm Chụp và Điểm danh -> Gửi thẳng formData với Blob Tới Backend Multer Node
    document.getElementById('take-selfie-btn').addEventListener('click', async () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Biến thành file Blob Format
        canvas.toBlob(async (blob) => {
            if(!blob) return alert('Lỗi convert ảnh');
            if(!currentUser) return alert('Bug: Mất Session User');

            try {
                document.getElementById('take-selfie-btn').innerText = "⏳ Đang kết nối lên Backend...";
                document.getElementById('take-selfie-btn').disabled = true;

                // Chuẩn bị form dữ liệu (Đóng khung cho api /api/checkin)
                const formData = new FormData();
                formData.append('selfie', blob, 'selfie.jpg'); // Ảnh được lưu kèm thành file tên random
                formData.append('eventId', currentEventId);
                formData.append('userId', currentUser.id);
                formData.append('userName', currentUser.fullName);
                formData.append('phone', currentUser.phone);

                // Fetch Gủi POST không cần Header JSON để Browser báo cho Node là mảng multipart stream form
                const req = await fetch(`${API_BASE}/api/checkin`, {
                    method: 'POST',
                    body: formData
                });
                
                const result = await req.json();

                if(result.success) {
                    alert(`✅ HOÀN TẤT ĐIỂM DANH: ${currentEventInfo.name}`);
                    closeScanner();
                } else {
                    alert("Gặp lỗi do Server Backend " + result.error);
                }

            } catch (e) {
                console.error("Crashed Fetch", e);
                alert("Không thể upload. Chắc Backend ko chạy!");
            } finally {
                document.getElementById('take-selfie-btn').innerText = "📸 Chụp ảnh ngay";
                document.getElementById('take-selfie-btn').disabled = false;
            }
        }, 'image/jpeg', 0.8);
    });

});
