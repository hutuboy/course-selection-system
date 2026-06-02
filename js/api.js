// ==================== API 配置 ====================
const API_BASE = 'https://knenakrvlkyikwnwsxgm.supabase.co/functions/v1/api-v9';

// ==================== 请求封装 ====================
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem('accessToken');
    const defaultHeaders = { 'Content-Type': 'application/json' };
    if (token) { defaultHeaders['Authorization'] = `Bearer ${token}`; }
    const config = { ...options, headers: { ...defaultHeaders, ...options.headers } };

    try {
        const response = await fetch(url, config);
        const data = await response.json();
        if (!response.ok) { throw new Error(data.message || '请求失败'); }
        return data;
    } catch (error) {
        if (error.message === '无效的访问令牌' || error.message === '访问令牌已过期') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            updateAuthUI();
            showToast('登录已过期，请重新登录', 'warning');
        }
        throw error;
    }
}

async function get(endpoint) { return apiRequest(endpoint, { method: 'GET' }); }
async function post(endpoint, body) { return apiRequest(endpoint, { method: 'POST', body: JSON.stringify(body) }); }
async function put(endpoint, body) { return apiRequest(endpoint, { method: 'PUT', body: JSON.stringify(body) }); }
async function del(endpoint) { return apiRequest(endpoint, { method: 'DELETE' }); }

// ==================== 认证 ====================
async function login(username, password) {
    const result = await post('/auth/login', { username, password });
    if (result.success) {
        localStorage.setItem('accessToken', result.data.accessToken);
        localStorage.setItem('user', JSON.stringify(result.data.user));
    }
    return result;
}

async function register(data) { return post('/auth/register', data); }

function logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    updateAuthUI();
    showToast('已退出登录', 'success');
    loadCourses();
}

function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function isLoggedIn() { return !!localStorage.getItem('accessToken'); }

// ==================== UI 更新 ====================
function updateAuthUI() {
    const user = getCurrentUser();
    const authButtons = document.getElementById('authButtons');
    const userMenu = document.getElementById('userMenu');
    const myCoursesLink = document.getElementById('myCoursesLink');
    const adminLink = document.getElementById('adminLink');
    if (user) {
        authButtons.style.display = 'none';
        userMenu.style.display = 'flex';
        document.getElementById('userName').textContent = user.realName || user.username;
        if (user.role === 'STUDENT') myCoursesLink.style.display = 'inline-block';
        if (user.role === 'ADMIN') adminLink.style.display = 'inline-block';
    } else {
        authButtons.style.display = 'flex';
        userMenu.style.display = 'none';
        myCoursesLink.style.display = 'none';
        adminLink.style.display = 'none';
    }
}

// ==================== 模态框 ====================
function showLoginModal() { document.getElementById('loginModal').classList.add('active'); }
function showRegisterModal() { document.getElementById('registerModal').classList.add('active'); }
function showCourseDetail(courseId) { loadCourseDetail(courseId); document.getElementById('courseDetailModal').classList.add('active'); }
function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }

document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) e.target.classList.remove('active');
});

// ==================== Toast ====================
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = 'all 0.3s ease-in';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==================== 表单 ====================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    try {
        const result = await login(username, password);
        if (result.success) {
            closeModal('loginModal');
            updateAuthUI();
            showToast(`欢迎回来，${result.data.user.realName}！`, 'success');
            loadCourses();
            if (result.data.user.role === 'STUDENT') loadMyCourses();
        }
    } catch (error) { showToast(error.message, 'error'); }
}

async function handleRegister(e) {
    e.preventDefault();
    const data = {
        username: document.getElementById('regUsername').value,
        password: document.getElementById('regPassword').value,
        realName: document.getElementById('regRealName').value,
        email: document.getElementById('regEmail').value || undefined,
        role: document.getElementById('regRole').value,
    };
    try {
        const result = await register(data);
        if (result.success) {
            closeModal('registerModal');
            showToast('注册成功！请登录', 'success');
            showLoginModal();
        } else { showToast(result.message, 'error'); }
    } catch (error) { showToast(error.message, 'error'); }
}

// ==================== 课程 ====================
let currentPage = 1;
let currentKeyword = '';
let currentCategory = '';

async function loadCourses(page = 1) {
    const courseList = document.getElementById('courseList');
    courseList.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const params = new URLSearchParams({ page, limit: 12 });
        if (currentKeyword) params.set('keyword', currentKeyword);
        if (currentCategory) params.set('category', currentCategory);
        const result = await get(`/courses?${params}`);
        if (result.success) {
            renderCourses(result.data);
            updatePagination(result.pagination);
            currentPage = result.pagination.page;
        }
    } catch (error) {
        courseList.innerHTML = '<div class="empty-state"><p>加载失败，请重试</p></div>';
    }
}

function renderCourses(courses) {
    const courseList = document.getElementById('courseList');
    if (courses.length === 0) {
        courseList.innerHTML = '<div class="empty-state"><p>暂无可选课程</p></div>';
        return;
    }
    courseList.innerHTML = courses.map(course => `
        <div class="course-card" onclick="showCourseDetail(${course.id})">
            <h3>${escapeHtml(course.name)}</h3>
            <div class="course-meta">
                <span>\ud83d\udc68\u200d\ud83c\udfeb ${escapeHtml(course.teacher_name || '待分配')}</span>
                <span>\ud83d\udcda 学分: ${course.credit}</span>
                <span>\ud83d\udd50 ${escapeHtml(course.time_slot || '待定')}</span>
                <span>\ud83d\udccd ${escapeHtml(course.location || '待定')}</span>
            </div>
            <div class="course-footer">
                <span class="enrollment-count">${course.current_students || 0}/${course.capacity}</span>
                <span class="status-badge ${getStatusClass(course.status)}">${getStatusText(course.status)}</span>
            </div>
        </div>
    `).join('');
}

function updatePagination(pagination) {
    document.getElementById('pageInfo').textContent = `第 ${pagination.page} / ${pagination.totalPages || 1} 页 (共 ${pagination.total} 条)`;
    document.getElementById('prevPage').disabled = pagination.page <= 1;
    document.getElementById('nextPage').disabled = pagination.page >= pagination.totalPages;
}

function changePage(delta) { loadCourses(currentPage + delta); }

function searchCourses() {
    currentKeyword = document.getElementById('searchInput').value.trim();
    currentPage = 1;
    loadCourses(1);
}

function filterCourses() {
    currentCategory = document.getElementById('categoryFilter').value;
    currentPage = 1;
    loadCourses(1);
}

async function loadCourseDetail(courseId) {
    const content = document.getElementById('courseDetailContent');
    content.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const result = await get(`/courses/${courseId}`);
        if (result.success) {
            const course = result.data;
            const user = getCurrentUser();
            const isStudent = user && user.role === 'STUDENT';
            content.innerHTML = `
                <h2>${escapeHtml(course.name)}</h2>
                <div class="detail-grid">
                    <div class="detail-item"><label>授课教师</label><span>${escapeHtml(course.teacher_name || '待分配')}</span></div>
                    <div class="detail-item"><label>学分</label><span>${course.credit}</span></div>
                    <div class="detail-item"><label>上课时间</label><span>${escapeHtml(course.time_slot || '待定')}</span></div>
                    <div class="detail-item"><label>上课地点</label><span>${escapeHtml(course.location || '待定')}</span></div>
                    <div class="detail-item"><label>课程容量</label><span>${course.current_students || 0} / ${course.capacity}</span></div>
                    <div class="detail-item"><label>课程类别</label><span>${escapeHtml(course.category || '未分类')}</span></div>
                </div>
                <div class="detail-section"><h4>课程描述</h4><p>${escapeHtml(course.description || '暂无描述')}</p></div>
                <div class="detail-section" style="margin-top:24px;display:flex;gap:12px;">
                    ${isStudent ? `<button class="btn btn-primary" onclick="enrollCourse(${course.id})">选择此课程</button>` : ''}
                    <button class="btn btn-outline" onclick="closeModal('courseDetailModal')">关闭</button>
                </div>
            `;
        }
    } catch (error) { content.innerHTML = '<div class="empty-state"><p>加载失败</p></div>'; }
}

// ==================== 选课 ====================
async function enrollCourse(courseId) {
    if (!isLoggedIn()) { showToast('请先登录', 'warning'); showLoginModal(); return; }
    try {
        const result = await post(`/enrollments/${courseId}`);
        if (result.success) {
            showToast(result.message, 'success');
            closeModal('courseDetailModal');
            loadCourses(currentPage);
            loadMyCourses();
        } else { showToast(result.message, 'error'); }
    } catch (error) { showToast(error.message, 'error'); }
}

async function dropCourse(courseId) {
    if (!confirm('确定要退选这门课程吗？')) return;
    try {
        const result = await del(`/enrollments/${courseId}`);
        if (result.success) {
            showToast(result.message, 'success');
            loadMyCourses();
            loadCourses(currentPage);
        } else { showToast(result.message, 'error'); }
    } catch (error) { showToast(error.message, 'error'); }
}

async function loadMyCourses() {
    const section = document.getElementById('my-courses-section');
    const list = document.getElementById('myCourseList');
    if (!isLoggedIn()) { section.style.display = 'none'; return; }
    const user = getCurrentUser();
    if (user.role !== 'STUDENT') { section.style.display = 'none'; return; }
    section.style.display = 'block';
    list.innerHTML = '<div class="loading">加载中...</div>';
    try {
        const result = await get('/enrollments/my');
        if (result.success && result.data.length > 0) {
            list.innerHTML = result.data.filter(e => e.status === 1).map(enrollment => `
                <div class="course-card">
                    <h3>${escapeHtml(enrollment.course_name)}</h3>
                    <div class="course-meta">
                        <span>\ud83d\udc68\u200d\ud83c\udfeb ${escapeHtml(enrollment.teacher_name || '待分配')}</span>
                        <span>\ud83d\udcda 学分: ${enrollment.credit}</span>
                        <span>\ud83d\udd50 ${escapeHtml(enrollment.time_slot || '待定')}</span>
                        <span>\ud83d\udccd ${escapeHtml(enrollment.location || '待定')}</span>
                    </div>
                    <div class="course-footer">
                        <span class="status-badge status-active">已选</span>
                        <button class="btn btn-danger" onclick="dropCourse(${enrollment.course_id})">退课</button>
                    </div>
                </div>
            `).join('');
        } else {
            list.innerHTML = '<div class="empty-state"><p>您还没有选择任何课程</p></div>';
        }
    } catch (error) { list.innerHTML = '<div class="empty-state"><p>加载失败</p></div>'; }
}

// ==================== 工具 ====================
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getStatusClass(status) {
    switch (status) { case 1: return 'status-active'; case 2: return 'status-closed'; default: return 'status-closed'; }
}

function getStatusText(status) {
    switch (status) { case 1: return '开放选课'; case 2: return '未开放'; default: return '未知'; }
}

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    loadCourses();
    if (isLoggedIn()) loadMyCourses();
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchCourses();
    });
});
