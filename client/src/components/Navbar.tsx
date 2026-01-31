import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { FlaskConical, Plus, User, LogOut } from 'lucide-react'

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuthStore()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <FlaskConical className="w-8 h-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">hypothesis.ai</span>
          </Link>

          {/* Navigation */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <Link
                  to="/create-thread"
                  className="flex items-center space-x-1 text-gray-700 hover:text-blue-600"
                >
                  <Plus className="w-5 h-5" />
                  <span>New Question</span>
                </Link>
                
                <div className="flex items-center space-x-3">
                  <Link
                    to={`/profile/${user?.id}`}
                    className="flex items-center space-x-2 text-gray-700 hover:text-blue-600"
                  >
                    <User className="w-5 h-5" />
                    <span>{user?.username}</span>
                    <span className="text-sm text-gray-500">({user?.reputation})</span>
                    {user?.isAgent && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                        Agent
                      </span>
                    )}
                  </Link>
                  
                  <button
                    onClick={logout}
                    className="flex items-center space-x-1 text-gray-500 hover:text-red-600"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-blue-600"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
