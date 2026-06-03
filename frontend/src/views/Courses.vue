<template>
  <div class="courses-container">
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
      <div class="search-section">
        <el-input 
          v-model="searchKeyword" 
          placeholder="搜索课程名称..."
          class="search-input"
          @keyup.enter="handleSearch"
        />
        <el-select 
          v-model="selectedCategory" 
          placeholder="选择分类"
          class="category-select"
        >
          <el-option label="全部" value="" />
          <el-option 
            v-for="cat in courseStore.categories" 
            :key="cat" 
            :label="cat" 
            :value="cat" 
          />
        </el-select>
        <el-button type="primary" @click="handleSearch">搜索</el-button>
        <el-button @click="resetFilters">重置</el-button>
      </div>
      
      <div class="course-grid">
        <el-card 
          v-for="course in courseStore.courses" 
          :key="course.id"
          class="course-card"
        >
          <div class="course-image">
            <img 
              :src="`https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=education%20course%20illustration%20${encodeURIComponent(course.name)}&image_size=landscape_16_9`" 
              :alt="course.name"
            />
          </div>
          <div class="course-content">
            <h3>{{ course.name }}</h3>
            <p class="course-teacher">授课教师：{{ course.teacher_name }}</p>
            <p class="course-category">{{ course.category }}</p>
            <p class="course-description">{{ course.description }}</p>
            <div class="course-footer">
              <span class="course-credit">{{ course.credit }}学分</span>
              <span class="course-capacity">
                {{ course.current_enrollment }}/{{ course.max_capacity }}人
              </span>
            </div>
            <div class="course-actions">
              <el-button 
                v-if="canEnroll(course)"
                type="primary" 
                @click="handleEnroll(course.id)"
              >
                选课
              </el-button>
              <el-button 
                v-else-if="isEnrolled(course.id)"
                type="success"
                disabled
              >
                已选课
              </el-button>
              <el-button 
                v-else
                type="default"
                disabled
              >
                已满员
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
      
      <div v-if="courseStore.courses.length === 0" class="empty-state">
        <p>暂无符合条件的课程</p>
      </div>
      
      <div class="pagination" v-if="pagination.total > 1">
        <el-pagination
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
          :current-page="pagination.page"
          :page-sizes="[12, 24, 36]"
          :page-size="pagination.limit"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useCourseStore } from '../stores/course'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const courseStore = useCourseStore()

const currentPath = computed(() => route.path)

const searchKeyword = ref('')
const selectedCategory = ref('')
const pagination = ref({
  page: 1,
  limit: 12,
  total: 0
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

function isEnrolled(courseId) {
  return courseStore.enrolledCourses.some(e => e.course_id === courseId)
}

function canEnroll(course) {
  return !isEnrolled(course.id) && course.current_enrollment < course.max_capacity
}

async function handleSearch() {
  pagination.value.page = 1
  await loadCourses()
}

function resetFilters() {
  searchKeyword.value = ''
  selectedCategory.value = ''
  pagination.value.page = 1
  loadCourses()
}

async function loadCourses() {
  const params = {
    page: pagination.value.page,
    limit: pagination.value.limit
  }
  if (searchKeyword.value) params.keyword = searchKeyword.value
  if (selectedCategory.value) params.category = selectedCategory.value
  
  const result = await courseStore.loadCourses(params)
  if (result) {
    pagination.value = result.pagination || pagination.value
  }
}

async function handleEnroll(courseId) {
  const success = await courseStore.enrollCourse(courseId)
  if (success) {
    alert('选课成功')
    await loadCourses()
  } else {
    alert('选课失败，请重试')
  }
}

function handleSizeChange(val) {
  pagination.value.limit = val
  pagination.value.page = 1
  loadCourses()
}

function handlePageChange(val) {
  pagination.value.page = val
  loadCourses()
}

onMounted(async () => {
  await courseStore.loadCategories()
  await courseStore.loadEnrolledCourses()
  await loadCourses()
})
</script>

<style scoped>
.courses-container {
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
  max-width: 1400px;
  margin: 0 auto;
}

.search-section {
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  flex-wrap: wrap;
}

.search-input {
  width: 300px;
}

.category-select {
  width: 150px;
}

.course-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
  gap: 25px;
  margin-bottom: 30px;
}

.course-card {
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.08);
}

.course-image {
  height: 180px;
  overflow: hidden;
}

.course-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-content {
  padding: 20px;
}

.course-content h3 {
  font-size: 18px;
  margin-bottom: 10px;
  color: #333;
}

.course-teacher {
  color: #666;
  font-size: 14px;
  margin-bottom: 5px;
}

.course-category {
  display: inline-block;
  background: #e8f4fd;
  color: #1890ff;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  margin-bottom: 10px;
}

.course-description {
  color: #999;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 15px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.course-footer {
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
}

.course-credit {
  color: #1890ff;
  font-weight: bold;
}

.course-capacity {
  color: #999;
  font-size: 13px;
}

.course-actions {
  text-align: right;
}

.empty-state {
  text-align: center;
  padding: 60px;
  color: #999;
}

.pagination {
  text-align: center;
}
</style>