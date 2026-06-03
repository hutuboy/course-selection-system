<template>
  <div class="admin-container">
    <nav class="navbar">
      <div class="navbar-brand">公选课选课系统 - 管理中心</div>
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
      <el-tabs v-model="activeTab" class="admin-tabs">
        <el-tab-pane label="用户管理" name="users">
          <div class="tab-content">
            <div class="toolbar">
              <el-input 
                v-model="searchKeyword" 
                placeholder="搜索用户名或姓名..."
                class="search-input"
                @keyup.enter="loadUsers"
              />
              <el-button type="primary" @click="openUserModal">添加用户</el-button>
            </div>
            
            <el-table :data="adminStore.users" border>
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="username" label="用户名" />
              <el-table-column prop="real_name" label="真实姓名" />
              <el-table-column prop="role" label="角色" width="100">
                <template #default="scope">
                  <el-tag :type="getRoleTagType(scope.row.role)">
                    {{ getRoleText(scope.row.role) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="email" label="邮箱" />
              <el-table-column prop="status" label="状态" width="80">
                <template #default="scope">
                  <el-tag :type="scope.row.status === 1 ? 'success' : 'danger'">
                    {{ scope.row.status === 1 ? '启用' : '禁用' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button size="small" @click="editUser(scope.row)">编辑</el-button>
                  <el-button 
                    size="small" 
                    type="danger" 
                    @click="deleteUser(scope.row.id)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="课程管理" name="courses">
          <div class="tab-content">
            <div class="toolbar">
              <el-input 
                v-model="courseSearchKeyword" 
                placeholder="搜索课程名称..."
                class="search-input"
                @keyup.enter="loadCourses"
              />
              <el-button type="primary" @click="openCourseModal">添加课程</el-button>
            </div>
            
            <el-table :data="adminStore.allCourses" border>
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="name" label="课程名称" />
              <el-table-column prop="teacher_name" label="授课教师" />
              <el-table-column prop="category" label="分类" />
              <el-table-column prop="credit" label="学分" width="80" />
              <el-table-column prop="max_capacity" label="最大容量" width="100" />
              <el-table-column prop="current_enrollment" label="当前人数" width="100" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="scope.row.status === 1 ? 'success' : 'warning'">
                    {{ scope.row.status === 1 ? '开放' : '关闭' }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="200">
                <template #default="scope">
                  <el-button size="small" @click="editCourse(scope.row)">编辑</el-button>
                  <el-button 
                    size="small" 
                    type="danger" 
                    @click="deleteCourse(scope.row.id)"
                  >
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>
        
        <el-tab-pane label="选课管理" name="enrollments">
          <div class="tab-content">
            <el-table :data="adminStore.allEnrollments" border>
              <el-table-column prop="id" label="ID" width="80" />
              <el-table-column prop="course_name" label="课程名称" />
              <el-table-column prop="student_name" label="学生姓名" />
              <el-table-column prop="student_username" label="用户名" />
              <el-table-column prop="status" label="状态" width="100">
                <template #default="scope">
                  <el-tag :type="getStatusTagType(scope.row.status)">
                    {{ getEnrollmentStatusText(scope.row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="create_time" label="选课时间" />
              <el-table-column prop="update_time" label="更新时间" />
            </el-table>
          </div>
        </el-tab-pane>
      </el-tabs>
    </main>
    
    <el-dialog :title="userModalTitle" :visible.sync="showUserModal">
      <el-form :model="userForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="userForm.username" />
        </el-form-item>
        <el-form-item label="真实姓名">
          <el-input v-model="userForm.real_name" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="userForm.password" type="password" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="userForm.role">
            <el-option label="学生" value="STUDENT" />
            <el-option label="教师" value="TEACHER" />
            <el-option label="管理员" value="ADMIN" />
          </el-select>
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="userForm.email" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="userForm.status">
            <el-option label="启用" :value="1" />
            <el-option label="禁用" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showUserModal = false">取消</el-button>
        <el-button type="primary" @click="saveUser">保存</el-button>
      </template>
    </el-dialog>
    
    <el-dialog :title="courseModalTitle" :visible.sync="showCourseModal">
      <el-form :model="courseForm" label-width="100px">
        <el-form-item label="课程名称">
          <el-input v-model="courseForm.name" />
        </el-form-item>
        <el-form-item label="授课教师">
          <el-input v-model="courseForm.teacher_name" />
        </el-form-item>
        <el-form-item label="分类">
          <el-input v-model="courseForm.category" />
        </el-form-item>
        <el-form-item label="学分">
          <el-input v-model="courseForm.credit" type="number" />
        </el-form-item>
        <el-form-item label="最大容量">
          <el-input v-model="courseForm.max_capacity" type="number" />
        </el-form-item>
        <el-form-item label="课程描述">
          <el-textarea v-model="courseForm.description" rows="3" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="courseForm.status">
            <el-option label="开放" :value="1" />
            <el-option label="关闭" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCourseModal = false">取消</el-button>
        <el-button type="primary" @click="saveCourse">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAdminStore } from '../stores/admin'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const adminStore = useAdminStore()

const currentPath = computed(() => route.path)
const activeTab = ref('users')

const searchKeyword = ref('')
const courseSearchKeyword = ref('')

const showUserModal = ref(false)
const showCourseModal = ref(false)
const editingUserId = ref(null)
const editingCourseId = ref(null)

const userModalTitle = computed(() => editingUserId.value ? '编辑用户' : '添加用户')
const courseModalTitle = computed(() => editingCourseId.value ? '编辑课程' : '添加课程')

const userForm = reactive({
  username: '',
  real_name: '',
  password: '',
  role: 'STUDENT',
  email: '',
  status: 1
})

const courseForm = reactive({
  name: '',
  teacher_name: '',
  category: '',
  credit: 2,
  max_capacity: 30,
  description: '',
  status: 1
})

const navItems = computed(() => {
  return [
    { path: '/', label: '首页' },
    { path: '/courses', label: '课程列表' },
    { path: '/enrollments', label: '我的选课' },
    { path: '/admin', label: '管理中心' }
  ]
})

function navigate(path) {
  router.push(path)
}

async function handleLogout() {
  authStore.logout()
  router.push('/login')
}

function getRoleText(role) {
  const map = { STUDENT: '学生', TEACHER: '教师', ADMIN: '管理员' }
  return map[role] || role
}

function getRoleTagType(role) {
  const map = { STUDENT: 'primary', TEACHER: 'success', ADMIN: 'warning' }
  return map[role] || 'default'
}

function getEnrollmentStatusText(status) {
  const map = { ENROLLED: '学习中', COMPLETED: '已结课', DROPPED: '已退课' }
  return map[status] || status
}

function getStatusTagType(status) {
  const map = { ENROLLED: 'primary', COMPLETED: 'success', DROPPED: 'danger' }
  return map[status] || 'default'
}

function openUserModal() {
  editingUserId.value = null
  Object.assign(userForm, {
    username: '',
    real_name: '',
    password: '',
    role: 'STUDENT',
    email: '',
    status: 1
  })
  showUserModal.value = true
}

function editUser(user) {
  editingUserId.value = user.id
  Object.assign(userForm, {
    username: user.username,
    real_name: user.real_name,
    password: '',
    role: user.role,
    email: user.email || '',
    status: user.status
  })
  showUserModal.value = true
}

async function saveUser() {
  const data = { ...userForm }
  if (!data.password) delete data.password
  
  let success = false
  if (editingUserId.value) {
    success = await adminStore.updateUser(editingUserId.value, data)
  } else {
    success = await adminStore.createUser(data)
  }
  
  if (success) {
    showUserModal.value = false
    await loadUsers()
    alert(editingUserId.value ? '更新成功' : '创建成功')
  } else {
    alert('操作失败')
  }
}

async function deleteUser(userId) {
  if (!confirm('确定要删除该用户吗？')) return
  
  const success = await adminStore.deleteUser(userId)
  if (success) {
    await loadUsers()
    alert('删除成功')
  } else {
    alert('删除失败')
  }
}

function openCourseModal() {
  editingCourseId.value = null
  Object.assign(courseForm, {
    name: '',
    teacher_name: '',
    category: '',
    credit: 2,
    max_capacity: 30,
    description: '',
    status: 1
  })
  showCourseModal.value = true
}

function editCourse(course) {
  editingCourseId.value = course.id
  Object.assign(courseForm, {
    name: course.name,
    teacher_name: course.teacher_name,
    category: course.category,
    credit: course.credit,
    max_capacity: course.max_capacity,
    description: course.description || '',
    status: course.status
  })
  showCourseModal.value = true
}

async function saveCourse() {
  let success = false
  if (editingCourseId.value) {
    success = await adminStore.updateCourse(editingCourseId.value, courseForm)
  } else {
    success = await adminStore.createCourse(courseForm)
  }
  
  if (success) {
    showCourseModal.value = false
    await loadCourses()
    alert(editingCourseId.value ? '更新成功' : '创建成功')
  } else {
    alert('操作失败')
  }
}

async function deleteCourse(courseId) {
  if (!confirm('确定要删除该课程吗？')) return
  
  const success = await adminStore.deleteCourse(courseId)
  if (success) {
    await loadCourses()
    alert('删除成功')
  } else {
    alert('删除失败')
  }
}

async function loadUsers() {
  const params = {}
  if (searchKeyword.value) params.keyword = searchKeyword.value
  await adminStore.loadUsers(params)
}

async function loadCourses() {
  const params = {}
  if (courseSearchKeyword.value) params.keyword = courseSearchKeyword.value
  await adminStore.loadAllCourses(params)
}

async function loadEnrollments() {
  await adminStore.loadAllEnrollments()
}

watch(activeTab, (val) => {
  if (val === 'users') loadUsers()
  else if (val === 'courses') loadCourses()
  else if (val === 'enrollments') loadEnrollments()
})

onMounted(async () => {
  await loadUsers()
})
</script>

<style scoped>
.admin-container {
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

.admin-tabs {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
}

.tab-content {
  padding: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.search-input {
  width: 300px;
}
</style>