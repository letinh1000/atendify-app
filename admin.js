import { API_BASE } from "./app.js";

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Phím tắt Lấy vị trí GPS cho Admin
    document.getElementById('get-location-btn').addEventListener('click', () => {
        if (!navigator.geolocation) {
            alert('Trình duyệt của bạn không hỗ trợ định vị vị trí.');
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                document.getElementById('event-lat').value = position.coords.latitude;
                document.getElementById('event-lng').value = position.coords.longitude;
            },
            (error) => {
                console.error(error);
                alert("Không thể lấy vị trí. Xin cấp quyền.");
            },
            { enableHighAccuracy: true }
        );
    });

    // 2. Nút Tạo sự kiện mới gửi Request xuống Nodejs
    document.getElementById('create-event-btn').addEventListener('click', async () => {
        
        const name = document.getElementById('event-name').value;
        const lat = parseFloat(document.getElementById('event-lat').value);
        const lng = parseFloat(document.getElementById('event-lng').value);
        const radius = parseInt(document.getElementById('event-radius').value);
        
        if (!name || isNaN(lat) || isNaN(lng)) return alert("Vui lòng điền đầy đủ tên và vị trí!");

        try {
            document.getElementById('create-event-btn').disabled = true;
            document.getElementById('create-event-btn').innerText = "Đang tạo...";
            
            const req = await fetch(`${API_BASE}/api/events`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, lat, lng, radius })
            });

            if(req.ok) {
                document.getElementById('event-message').innerHTML = `<span style="color: var(--success-color);">Tạo thành công: ${name}</span>`;
                document.getElementById('event-name').value = '';
                loadEvents(); // Reload ds
            }
        } catch(error) {
            console.error(error);
            alert("Lỗi khi kết nối Nodejs tạo sự kiện. Bạn đã chạy node server.js chưa?");
        } finally {
            document.getElementById('create-event-btn').disabled = false;
            document.getElementById('create-event-btn').innerText = "Tạo Sự kiện";
        }
    });

    // 3. Tải danh sách sự kiện thông thường GET Request
    async function loadEvents() {
        try {
            const req = await fetch(`${API_BASE}/api/events`);
            const events = await req.json();

            const selectEvent = document.getElementById('active-event-select');
            selectEvent.innerHTML = '<option value="">-- Chọn sự kiện --</option>';

            events.forEach((data) => {
                const option = document.createElement('option');
                option.value = data.id;
                option.textContent = data.name;
                selectEvent.appendChild(option);
            });
        } catch (e) { console.error("Load EV Error", e); }
    }

    setTimeout(() => loadEvents(), 400); 

    // 4. Logic sinh mã QR Động javascript
    let qrGenerator = null;
    let qrRefreshInterval = null;
    let qrSecondsLeft = 15;

    document.getElementById('active-event-select').addEventListener('change', (e) => {
        const eventId = e.target.value;
        if (!eventId) {
            stopDynamicQR();
            return;
        }
        startDynamicQR(eventId);
        listenToAttendance(eventId);
    });

    function startDynamicQR(eventId) {
        stopDynamicQR(); 
        const container = document.getElementById('qr-container');
        container.innerHTML = ''; 
        qrGenerator = new QRCode(container, {
            width: 200, height: 200, colorDark : "#0a0a0a", colorLight : "#ffffff", correctLevel : QRCode.CorrectLevel.H
        });

        const refreshQR = () => {
            const timestamp = Date.now();
            const token = `${eventId}|${timestamp}`;
            qrGenerator.makeCode(token);
            
            qrSecondsLeft = 15;
            document.getElementById('qr-refresh-timer').innerText = `Làm mới sau ${qrSecondsLeft}s`;
        };

        refreshQR();
        qrRefreshInterval = setInterval(() => {
            qrSecondsLeft--;
            document.getElementById('qr-refresh-timer').innerText = `Làm mới sau ${qrSecondsLeft}s`;
            if (qrSecondsLeft <= 0) refreshQR();
        }, 1000);
    }

    function stopDynamicQR() {
        if (qrRefreshInterval) clearInterval(qrRefreshInterval);
        document.getElementById('qr-container').innerHTML = '<span style="color: #666; text-align: center; font-size: 0.9rem;">Vui lòng chọn sự kiện bên dưới để bắt đầu</span>';
        document.getElementById('qr-refresh-timer').innerText = '--';
        if (eventSource) { eventSource.close(); eventSource = null; }
    }

    // 5. Polling HTTP thay cho SSE (Server-Sent Events) để tương thích Vercel Serverless
    let pollingInterval = null;
    let accumulatedHTML = '';
    let lastKnownTimestamp = null;
    
    function listenToAttendance(eventId) {
        if (pollingInterval) clearInterval(pollingInterval);
        
        const listDiv = document.getElementById('attendance-list');
        listDiv.innerHTML = '<p class="text-secondary text-center">Đang kết nối Server Polling...</p>';
        accumulatedHTML = '';
        lastKnownTimestamp = null;

        const fetchData = async () => {
            try {
                let url = `${API_BASE}/api/events/live?id=${eventId}`;
                if (lastKnownTimestamp) {
                    url += `&lastTimestamp=${encodeURIComponent(lastKnownTimestamp)}`;
                }
                
                const req = await fetch(url);
                if (!req.ok) return;
                
                const dataArr = await req.json();
                
                if (dataArr.length === 0 && accumulatedHTML === '') {
                    listDiv.innerHTML = '<p class="text-secondary text-center" style="margin-top: 1rem;">Chưa có ai điểm danh!</p>';
                    return;
                }
                
                if (accumulatedHTML === '' && listDiv.innerHTML.includes('Đang kết nối')) {
                    listDiv.innerHTML = '';
                }

                // Render in reverse so the newest is top if backend sorted DESC
                dataArr.reverse().forEach(data => {
                    const timeStr = new Date(data.timestamp).toLocaleTimeString();
                    const rowHTML = `
                        <div class="attendance-item fade-in">
                            <img src="${data.selfieUrl}" alt="Selfie" onerror="this.src='https://via.placeholder.com/48'">
                            <div class="attendance-info">
                                <strong>${data.userName}</strong>
                                <span class="attendance-time">🕒 Lúc ${timeStr} | ${data.phone}</span>
                            </div>
                            <div style="color: var(--success-color)">✓</div>
                        </div>
                    `;
                    accumulatedHTML = rowHTML + accumulatedHTML;
                    // Keep track of the latest so we only poll for new items next tick
                    if (!lastKnownTimestamp || new Date(data.timestamp) > new Date(lastKnownTimestamp)) {
                        lastKnownTimestamp = data.timestamp;
                    }
                });

                if(dataArr.length > 0) {
                    listDiv.innerHTML = accumulatedHTML;
                }
            } catch (e) {
                console.error("Lỗi Polling Live:", e);
            }
        };

        // Fetch immediately and then every 3 seconds
        fetchData();
        pollingInterval = setInterval(fetchData, 3000);
    }
    
    // Patch stopDynamicQR to also stop polling
    const originalStopQR = stopDynamicQR;
    stopDynamicQR = function() {
        originalStopQR();
        if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
        }
    };
});
