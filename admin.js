import { API_BASE } from "./app.js";

// Xác thực Quyền Admin độc lập
if (!sessionStorage.getItem('admin_token')) {
    window.location.href = 'admin-login.html';
}

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

    // --- LOGIC QUẢN LÝ LỚP HỌC ---
    const loadClasses = async () => {
        try {
            const req = await fetch(`${API_BASE}/api/classes`);
            const classes = await req.json();
            const ul = document.getElementById('class-list-ul');
            ul.innerHTML = '';
            if (classes.length === 0) return ul.innerHTML = '<li>Chưa có lớp nào</li>';
            classes.forEach(c => {
                const li = document.createElement('li');
                li.innerText = `🏷️ ${c.name}`;
                ul.appendChild(li);
            });
        } catch (e) {
            console.error(e);
        }
    };
    setTimeout(loadClasses, 100);

    document.getElementById('create-class-btn').addEventListener('click', async () => {
        const name = document.getElementById('class-name').value;
        if (!name) return;
        
        document.getElementById('create-class-btn').disabled = true;
        try {
            const req = await fetch(`${API_BASE}/api/classes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            if (req.ok) {
                document.getElementById('class-message').innerHTML = `<span style="color: var(--success-color);">Thành công!</span>`;
                document.getElementById('class-name').value = '';
                loadClasses();
            }
        } catch(e) {
            alert("Lỗi Server");
        } finally {
            document.getElementById('create-class-btn').disabled = false;
        }
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
                document.getElementById('event-message').innerHTML = `<span style="color: var(--success-color);">Tạo thành công: ${name}</span>
                <br><a href="projector.html?id=${await req.json().then(d => d.id)}" target="_blank" style="color: var(--primary-color); font-weight: bold; margin-top: 10px; display: inline-block;">👉 [MỞ MÁY CHIẾU MÃ QR CHO SỰ KIỆN NÀY]</a>`;
                document.getElementById('event-name').value = '';
                loadEvents(); // Reload ds
            }
        } catch(error) {
            console.error(error);
            alert("Lỗi khi kết nối Nodejs tạo sự kiện. Bạn đã cấu hình Supabase đúng chưa?");
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

    // 4. Liên kết nút Mở máy chiếu QR với sự kiện đang chọn
    const projectorBtn = document.getElementById('projector-link-btn');

    document.getElementById('active-event-select').addEventListener('change', (e) => {
        const eventId = e.target.value;
        if (!eventId) {
            projectorBtn.style.display = 'none';
            if (pollingInterval) clearInterval(pollingInterval);
            return;
        }
        
        projectorBtn.href = `projector.html?id=${eventId}`;
        projectorBtn.style.display = 'flex';
        
        listenToAttendance(eventId);
    });

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
