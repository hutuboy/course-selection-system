import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../api'

export const useCourseStore = defineStore('course', () => {
  const courses = ref([])
  const enrolledCourses = ref([])

  async function loadCourses(params = {}) {
    try {
      const response = await api.get('/courses', { params })
      if (response.success) {
        courses.value = response.data
      }
    } catch (error) {
      console.error('Load courses failed:', error)
    }
  }

  async function loadEnrolledCourses() {
    try {
      const response = await api.get('/enrollments/my')
      if (response.success) {
        enrolledCourses.value = response.data
      }
    } catch (error) {
      console.error('Load enrolled courses failed:', error)
    }
  }

  async function enrollCourse(courseId) {
    try {
      const response = await api.post(`/enrollments/${courseId}`)
      if (response.success) {
        await loadEnrolledCourses()
        return true
      }
      return false
    } catch (error) {
      console.error('Enroll course failed:', error)
      return false
    }
  }

  async function dropCourse(courseId) {
    try {
      const response = await api.delete(`/enrollments/${courseId}`)
      if (response.success) {
        await loadEnrolledCourses()
        return true
      }
      return false
    } catch (error) {
      console.error('Drop course failed:', error)
      return false
    }
  }

  return {
    courses,
    enrolledCourses,
    loadCourses,
    loadEnrolledCourses,
    enrollCourse,
    dropCourse
  }
})