import { Routes, Route } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import ForumPage from './pages/ForumPage'
import ThreadPage from './pages/ThreadPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ProfilePage from './pages/ProfilePage'
import CreateThreadPage from './pages/CreateThreadPage'

function App() {
  const { initialize } = useAuthStore()
  
  // Initialize auth on app load
  initialize()

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/f/:slug" element={<ForumPage />} />
          <Route path="/t/:id" element={<ThreadPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/create-thread" element={<CreateThreadPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
