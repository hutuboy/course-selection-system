<template>
  <div class="home-container">
    <nav class="navbar">
      <div class="navbar-brand">公选课选课系统</div>
      <div class="navbar-menu">
        <el-button 
          v-for="item in navItems" 
          :key="item.path"
          :type="currentPath === item.path ? 'primary' : 'default'"
          @click="navigate(item.path)"
        >
          {{ item.label }}
        </el-button>
        <el-button type="danger" @click="handleLogout">退出登录</el-button>
      </div>
    </nav>
    
    <main class="main-content">
      <div class="welcome-section">
        <h1>欢迎回来，{{ authStore.user?.real_name }}</h1>
        <p class="role-info">您的身份：{{ roleText }}</p>
      </div>
      
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon courses-icon">📚</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalCourses }}</div>
            <div class="stat-label">可选课程</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon enrolled-icon">✅</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.enrolledCourses }}</div>
            <div class="stat-label">已选课程</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon credit-icon">🎓</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalCredits }}</div>
            <div class="stat-label">已修学分</div>
          </div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon progress-icon">📊</div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.progress }}%</div>
            <div class="stat-label">完成进度</div>
          </div>
        </div>
      </div>
      
      <div class="quick-actions">
        <h3>快速操作</h3>
        <div class="action-buttons">
          <el-button 
            type="primary" 
            size="large" 
            @click="navigate('/courses')"
          >
            <span class="action-icon">🔍</span>
            浏览课程
          </el-button>
          <el-button 
            type="success" 
            size="large" 
            @click="navigate('/enrollments')"
          >
            <span class="action-icon">📝</span>
            我的选课
          </el-button>
          <el-button 
            v-if="authStore.isAdmin"
            type="warning" 
            size="large" 
            @click="navigate('/admin')"
          >
            <span class="action-icon">⚙️</span>
            管理中心
          </el-button>
        </div>
      </div>
      
      <div class="recent-courses" v-if="recentCourses.length > 0">
        <h3>最近关注的课程</h3>
        <div class="course-list">
          <el-card 
            v-for="course in recentCourses" 
            :key="course.id"
            class="course-card"
          >
            <div class="course-info">
              <h4>{{ course.name }}</h4>
              <p class="course-teacher">{{ course.teacher_name }}</p>
              <p class="course-meta">{{ course.credit }}学分 · {{ course.category }}</p>
            </div>
            <el-button 
              size="small" 
              @click="navigate('/courses')"
            >
              查看详情
            </el-button>
          </el-card>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCourseStore } from '../stores/course'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const courseStore = useCourseStore()

const currentPath = computed(() => route.path)

const stats = ref({
  totalCourses: 0,
  enrolledCourses: 0,
  totalCredits: 0,
  progress: 0
})

const recentCourses = ref([])

const roleText = computed(() => {
  const roles = {
    STUDENT: '学生',
    TEACHER: '教师',
    ADMIN: '管理员'
  }
  return roles[authStore.user?.role] || '未知'
})

const navItems = computed(() => {
  const items = [
    { path: '/', label: '首页' },
    { path: '/courses', label: '课程列表' },
    { path: '/enrollments', label: '我的选课' }
  ]
  if (authStore.isAdmin) {
    items.push({ path: '/admin', label: '管理中心' })
  }
  return items
})

function navigate(path) {
  router.push(path)
}

async function handleLogout() {
  authStore.logout()
  router.push('/login')
}

async function loadData() {
  await courseStore.loadCourses({ limit: 5 })
  await courseStore.loadEnrolledCourses()
  
  stats.value = {
    totalCourses: courseStore.courses.length,
    enrolledCourses: courseStore.enrolledCourses.length,
    totalCredits: courseStore.enrolledCourses.reduce((sum, c) => sum + (c.credit || 0), 0),
    progress: courseStore.enrolledCourses.length * 25
  }
  
  recentCourses.value = courseStore.courses.slice(0, 3)
}

onMounted(async () => {
  await loadData()
})
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: #f5f7fa;
}

.navbar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 0 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 60px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.navbar-brand {
  color: white;
  font-size: 20px;
  font-weight: bold;
}

.navbar-menu {
  display: flex;
  gap: 10px;
}

.navbar-menu .el-button {
  color: white;
  border-color: rgba(255, 255, 255, 0.3);
}

.navbar-menu .el-button--primary {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
}

.main-content {
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.welcome-section {
  background: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.welcome-section h1 {
  font-size: 28px;
  color: #333;
  margin-bottom: 10px;
}

.role-info {
  color: #666;
  font-size: 16px;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: white;
  padding: 25px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 20px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.courses-icon {
  background: #e8f4fd;
}

.enrolled-icon {
  background: #e8f8f0;
}

.credit-icon {
  background: #fef3e2;
}

.progress-icon {
  background: #f3e8fd;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #333;
}

.stat-label {
  color: #999;
  font-size: 14px;
}

.quick-actions {
  background: white;
  padding: 30px;
  border-radius: 12px;
  margin-bottom: 30px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.quick-actions h3 {
  margin-bottom: 20px;
  color: #333;
}

.action-buttons {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.action-icon {
  margin-right: 8px;
}

.recent-courses {
  background: white;
  padding: 30px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.recent-courses h3 {
  margin-bottom: 20px;
  color: #333;
}

.course-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.course-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.course-info h4 {
  margin-bottom: 5px;
  color: #333;
}

.course-teacher {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.course-meta {
  color: #999;
  font-size: 13px;
}
</style>