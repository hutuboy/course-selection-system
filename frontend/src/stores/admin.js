import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api'

export const useAdminStore = defineStore('admin', () => {
  const users = ref([])
  const courses = ref([])
  const enrollments = ref([])

  async function loadUsers() {
    try {
      const response = await api.get('/admin/users')
      if (response.success) {
        users.value = response.data
      }
    } catch (error) {
      console.error('Load users failed:', error)
    }
  }

  async function loadCourses() {
    try {
      const response = await api.get('/admin/courses')
      if (response.success) {
        courses.value = response.data
      }
    } catch (error) {
      console.error('Load courses failed:', error)
    }
  }

  async function loadEnrollments() {
    try {
      const response = await api.get('/admin/enrollments')
      if (response.success) {
        enrollments.value = response.data
      }
    } catch (error) {
      console.error('Load enrollments failed:', error)
    }
  }

  async function createUser(data) {
    try {
      const response = await api.post('/admin/users', data)
      if (response.success) {
        await loadUsers()
        return true
      }
      return false
    } catch (error) {
      console.error('Create user failed:', error)
      return false
    }
  }

  async function updateUser(userId, data) {
    try {
      const response = await api.put(`/admin/users/${userId}`, data)
      if (response.success) {
        await loadUsers()
        return true
      }
      return false
    } catch (error) {
      console.error('Update user failed:', error)
      return false
    }
  }

  async function deleteUser(userId) {
    try {
      const response = await api.delete(`/admin/users/${userId}`)
      if (response.success) {
        await loadUsers()
        return true
      }
      return false
    } catch (error) {
      console.error('Delete user failed:', error)
      return false
    }
  }

  async function createCourse(data) {
    try {
      const response = await api.post('/admin/courses', data)
      if (response.success) {
        await loadCourses()
        return true
      }
      return false
    } catch (error) {
      console.error('Create course failed:', error)
      return false
    }
  }

  async function updateCourse(courseId, data) {
    try {
      const response = await api.put(`/admin/courses/${courseId}`, data)
      if (response.success) {
        await loadCourses()
        return true
      }
      return false
    } catch (error) {
      console.error('Update course failed:', error)
      return false
    }
  }

  async function deleteCourse(courseId) {
    try {
      const response = await api.delete(`/admin/courses/${courseId}`)
      if (response.success) {
        await loadCourses()
        return true
      }
      return false
    } catch (error) {
      console.error('Delete course failed:', error)
      return false
    }
  }

  return {
    users,
    courses,
    enrollments,
    loadUsers,
    loadCourses,
    loadEnrollments,
    createUser,
    updateUser,
    deleteUser,
    createCourse,
    updateCourse,
    deleteCourse
  }
})