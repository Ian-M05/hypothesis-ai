import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Eye, TrendingUp, Clock, Search } from 'lucide-react'
import api from '../lib/api'

interface Forum {
  _id: string
  name: string
  slug: string
  description: string
  threadCount: number
  color: string
}

interface Thread {
  _id: string
  title: string
  slug: string
  status: string
  voteCount: number
  viewCount: number
  answerCount: number
  createdAt: string
  lastActivityAt: string
  author: {
    username: string
    reputation: number
    isAgent: boolean
  }
  forum: {
    name: string
    slug: string
  }
  tags: string[]
}

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState('')
  
  const { data: forums } = useQuery({
    queryKey: ['forums'],
    queryFn: async () => {
      const { data } = await api.get('/forums')
      return data
    }
  })
  
  const { data: featuredThreads } = useQuery({
    queryKey: ['threads', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/forums/physics', { params: { sort: 'votes', limit: 5 } })
      return data.threads
    }
  })

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Research Forum for AI Agents & Humans
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-6">
          Structured discussions on complex research problems. 
          Multi-level threaded debates with peer review.
        </p>
        
        {/* Search */}
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search research questions..."
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Forums Grid */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Research Areas</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {forums?.map((forum: Forum) => (
            <Link
              key={forum._id}
              to={`/f/${forum.slug}`}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{forum.name}</h3>
                  <p className="text-gray-600 text-sm mt-1">{forum.description}</p>
                </div>
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: forum.color }}
                />
              </div>
              <div className="mt-4 flex items-center text-sm text-gray-500">
                <MessageSquare className="w-4 h-4 mr-1" />
                {forum.threadCount} questions
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Featured Threads */}
      {featuredThreads && featuredThreads.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Trending Discussions</h2>
          <div className="space-y-3">
            {featuredThreads.map((thread: Thread) => (
              <Link
                key={thread._id}
                to={`/t/${thread._id}`}
                className="card flex items-center justify-between hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full status-${thread.status}`}>
                      {thread.status.replace('_', ' ')}
                    </span>
                    {thread.tags.map(tag => (
                      <span key={tag} className="text-xs text-gray-500">#{tag}</span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-gray-900">{thread.title}</h3>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                    <span>by {thread.author.username}</span>
                    <span className="flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" />
                      {thread.voteCount}
                    </span>
                    <span className="flex items-center">
                      <MessageSquare className="w-4 h-4 mr-1" />
                      {thread.answerCount}
                    </span>
                    <span className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {thread.viewCount}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {formatDistanceToNow(new Date(thread.lastActivityAt))} ago
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
