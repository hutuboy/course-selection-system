<template>
  <div class="enrollments-container">
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
      <div class="section-header">
        <h2>我的选课</h2>
        <p class="total-credits">已选学分：{{ totalCredits }}学分</p>
      </div>
      
      <div class="enrollment-list" v-if="courseStore.enrolledCourses.length > 0">
        <el-card 
          v-for="enrollment in courseStore.enrolledCourses" 
          :key="enrollment.id"
          class="enrollment-card"
        >
          <div class="enrollment-info">
            <h3>{{ enrollment.course_name }}</h3>
            <p class="course-teacher">授课教师：{{ enrollment.teacher_name }}</p>
            <p class="course-meta">
              <span>{{ enrollment.category }}</span>
              <span>{{ enrollment.credit }}学分</span>
              <span>状态：{{ getStatusText(enrollment.status) }}</span>
            </p>
            <p class="enroll-time">选课时间：{{ formatDate(enrollment.create_time) }}</p>
          </div>
          <div class="enrollment-actions">
            <el-button 
              v-if="canDrop(enrollment)"
              type="danger" 
              @click="handleDrop(enrollment.course_id)"
            >
              退课
            </el-button>
            <el-button 
              v-else
              type="default"
              disabled
            >
              {{ enrollment.status === 'COMPLETED' ? '已结课' : '不可退课' }}
            </el-button>
          </div>
        </el-card>
      </div>
      
      <div v-else class="empty-state">
        <div class="empty-icon">📝</div>
        <p>暂无选课记录</p>
        <el-button type="primary" @click="navigate('/courses')">去选课</el-button>
      </div>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCourseStore } from '../stores/course'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const courseStore = useCourseStore()

const currentPath = computed(() => route.path)

const totalCredits = computed(() => {
  return courseStore.enrolledCourses.reduce((sum, e) => sum + (e.credit || 0), 0)
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

function getStatusText(status) {
  const statusMap = {
    ENROLLED: '学习中',
    COMPLETED: '已结课',
    DROPPED: '已退课'
  }
  return statusMap[status] || status
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN')
}

function canDrop(enrollment) {
  return enrollment.status === 'ENROLLED'
}

async function handleDrop(enrollmentId) {
  if (!confirm('确定要退课吗？')) return
  
  const success = await courseStore.dropCourse(enrollmentId)
  if (success) {
    alert('退课成功')
  } else {
    alert('退课失败，请重试')
  }
}

onMounted(async () => {
  await courseStore.loadEnrolledCourses()
})
</script>

<style scoped>
.enrollments-container {
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
  max-width: 900px;
  margin: 0 auto;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.section-header h2 {
  font-size: 24px;
  color: #333;
}

.total-credits {
  color: #1890ff;
  font-size: 16px;
  font-weight: bold;
}

.enrollment-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.enrollment-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.enrollment-info h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: #333;
}

.course-teacher {
  color: #666;
  font-size: 14px;
  margin-bottom: 10px;
}

.course-meta {
  display: flex;
  gap: 20px;
  margin-bottom: 10px;
}

.course-meta span {
  color: #999;
  font-size: 13px;
}

.enroll-time {
  color: #999;
  font-size: 13px;
}

.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.empty-icon {
  font-size: 60px;
  margin-bottom: 20px;
}

.empty-state p {
  color: #999;
  margin-bottom: 20px;
}
</style>