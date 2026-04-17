// Gọi API tương đối trên Vercel
const API_BASE = "";

let currentUser = JSON.parse(localStorage.getItem('atendify_user'));

document.addEventListener('DOMContentLoaded', () => {
    const loadClassesForRegister = async () => {
        try {
            const req = await fetch(`${API_BASE}/api/classes`);
            const classes = await req.json();
            const select = document.getElementById('class-select');
            select.innerHTML = '<option value="">-- Chọn Lớp Học --</option>';
            classes.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.id;
                opt.textContent = c.name;
                select.appendChild(opt);
            });
        } catch(e) {}
    };

    if (document.getElementById('auth-section')) {
        loadClassesForRegister();
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
            document.getElementById('user-role-text').innerHTML = `Email: ${user.email || 'Chưa có'}<br>Lớp: ${user.className || 'Chưa phân lớp'}<br>Trạng thái: Sẵn sàng điểm danh`;
            
            // Xóa đoạn ẩn hiện admin-link-container dưa thừa ở đây.
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
                document.getElementById('send-code-btn').innerText = "...";

                // Tự động bỏ qua OTP đối với sinh viên điểm danh
                currentPhone = phone;
                const res = await fetch(`${API_BASE}/api/auth/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentPhone, code: '123456' })
                });
                const data = await res.json();
                
                if (data.requireProfile) {
                    phoneContainer.classList.add('hidden');
                    profileContainer.classList.remove('hidden');
                } else if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem('atendify_user', JSON.stringify(currentUser));
                    switchDashboard(currentUser);
                } else {
                    alert(data.error || "Có lỗi kết nối Server");
                }

            } catch (err) {
                console.error(err);
                alert("Lỗi kết nối tới Backend!");
            } finally {
                document.getElementById('send-code-btn').innerText = "Tiếp tục";
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
            const email = document.getElementById('email-input').value;
            const classSelect = document.getElementById('class-select');
            const classId = classSelect.value;
            const className = classSelect.options[classSelect.selectedIndex]?.text;
            
            if(!fullName || !email || !classId) return alert("Vui lòng điền đầy đủ Tên, Email và Chọn Lớp học!");
            
            try {
                document.getElementById('save-profile-btn').innerText = "...";
                const res = await fetch(`${API_BASE}/api/auth/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phone: currentPhone, code: '123456', fullName, email, classId, className })
                });
                const data = await res.json();
                
                if (data.success) {
                    currentUser = data.user;
                    localStorage.setItem('atendify_user', JSON.stringify(currentUser));
                    profileContainer.classList.add('hidden');
                    switchDashboard(currentUser);
                } else {
                    alert(data.error || "Có lỗi xảy ra");
                }
            } catch (err) {
                console.error(err);
                alert("Lỗi lưu thông tin thiết lập!");
            } finally {
                document.getElementById('save-profile-btn').innerText = "Hoàn tất thiết lập";
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
