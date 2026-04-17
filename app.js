// Gọi API tương đối trên Vercel
const API_BASE = "";

let currentUser = JSON.parse(localStorage.getItem('atendify_user'));

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('auth-section')) {
        const authSection = document.getElementById('auth-section');
        const userDashboard = document.getElementById('user-dashboard');
        const phoneContainer = document.getElementById('phone-container');
        const otpContainer = document.getElementById('otp-container');
        const profileContainer = document.getElementById('profile-container');
        const adminLinkContainer = document.getElementById('admin-link-container');
        const recaptchaContainer = document.getElementById('recaptcha-container');
        
        // Ẩn recaptcha hoàn toàn (do đã bỏ Firebase)
        if(recaptchaContainer) recaptchaContainer.style.display = 'none';

        let currentPhone = "";

        const switchDashboard = (user) => {
            authSection.classList.add('hidden');
            userDashboard.classList.remove('hidden');
            
            document.getElementById('user-greeting').innerText = `Xin chào, ${user.fullName}!`;
            document.getElementById('user-role-text').innerText = `Vai trò: ${user.role === 'admin' ? 'Quản trị viên' : 'Người tham dự'}`;
            
            if (user.role === 'admin') {
                adminLinkContainer.classList.remove('hidden');
            }
        };

        if (currentUser) {
            // Đã đăng nhập trước đó
            switchDashboard(currentUser);
        }

        // Bắt đầu Login bằng SĐT
        document.getElementById('send-code-btn').addEventListener('click', async () => {
            const phone = document.getElementById('phone-input').value;
            if(!phone) return alert("Vui lòng nhập số điện thoại!");
            
            try {
                // Call API gửi OTP (Nodejs local)
                document.getElementById('send-code-btn').innerText = "...";
                const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone })
                });
                const data = await res.json();
                
                if(data.success) {
                    currentPhone = phone;
                    phoneContainer.classList.add('hidden');
                    otpContainer.classList.remove('hidden');
                    // Gợi ý luôn OTP (Vì đây là hệ thống tự build ko kết nối nhà mạng)
                    document.getElementById('otp-input').placeholder = "Mã bí mật là 123456";
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối tới Backend! Đảm bảo lệnh node server.js đang chạy trên cổng 3000.");
            } finally {
                document.getElementById('send-code-btn').innerText = "Tiếp tục bằng SMS";
            }
        });

        // Xác thực mã OTP
        document.getElementById('verify-code-btn').addEventListener('click', async () => {
            const code = document.getElementById('otp-input').value;
            if(!code || !currentPhone) return;

            try {
                const res = await fetch(`${API_BASE}/api/auth/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentPhone, code })
                });
                const data = await res.json();
                
                if (data.requireProfile) {
                    // Cần thiết lập tên vì là account mới chưa có trong db
                    otpContainer.classList.add('hidden');
                    profileContainer.classList.remove('hidden');
                } else if (data.success) {
                    // Thành công
                    currentUser = data.user;
                    localStorage.setItem('atendify_user', JSON.stringify(currentUser));
                    switchDashboard(currentUser);
                } else {
                    alert(data.error || "Có lỗi xảy ra");
                }
            } catch (err) {
                alert("Lỗi xác thực!");
            }
        });

        // Setup Name (Tài khoản mới)
        document.getElementById('save-profile-btn').addEventListener('click', async () => {
            const fullName = document.getElementById('fullname-input').value;
            if (!fullName) return alert("Vui lòng nhập họ tên!");
            
            try {
                const res = await fetch(`${API_BASE}/api/auth/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentPhone, code: '123456', fullName })
                });
                const data = await res.json();
                
                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem('atendify_user', JSON.stringify(currentUser));
                    profileContainer.classList.add('hidden');
                    switchDashboard(currentUser);
                }
            } catch (err) {
                alert("Lỗi lưu thông tin!");
            }
        });

        // Đăng xuất (xóa cache token)
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('atendify_user');
            window.location.reload();
        });
        
        // Nút Quay Lại
        document.getElementById('back-to-phone-btn').addEventListener('click', () => {
            otpContainer.classList.add('hidden');
            phoneContainer.classList.remove('hidden');
        });
    }

    // Auth Access control lỏng lẻo cho Admin Html
    if(window.location.pathname.includes('admin.html')) {
        if(!currentUser || currentUser.role !== 'admin') {
           // Mẹo dành cho Test Local, nếu cần cứ xoá dòng alert này.
            // alert("Bạn chưa đăng nhập Admin hoặc không có quyền Admin!");
        }
    }
});

// Export để 2 script kia tái sử dụng
export { API_BASE, currentUser };
