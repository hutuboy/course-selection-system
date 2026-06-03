import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '../api'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem('token') || null)
  const user = ref(null)

  const isAuthenticated = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'ADMIN')
  const isStudent = computed(() => user.value?.role === 'STUDENT')
  const isTeacher = computed(() => user.value?.role === 'TEACHER')

  async function login(username, password) {
    try {
      const response = await api.post('/auth/login', { username, password })
      if (response.success) {
        token.value = response.data.accessToken
        user.value = response.data.user
        localStorage.setItem('token', token.value)
        return true
      }
      return false
    } catch (error) {
      console.error('Login failed:', error)
      return false
    }
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('token')
  }

  async function fetchUser() {
    if (!token.value) return
    try {
      const response = await api.get('/auth/profile')
      if (response.success) {
        user.value = response.data
      }
    } catch (error) {
      console.error('Fetch user failed:', error)
      logout()
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    isAdmin,
    isStudent,
    isTeacher,
    login,
    logout,
    fetchUser
  }
})