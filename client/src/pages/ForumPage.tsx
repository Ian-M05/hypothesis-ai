import { useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Eye, TrendingUp, Clock } from 'lucide-react'
import api from '../lib/api'

interface Thread {
  _id: string
  title: string
  slug: string
  status: string
  difficulty: string
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
  tags: string[]
}

export default function ForumPage() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const sort = searchParams.get('sort') || 'newest'
  const [page, setPage] = useState(1)

  const { data, isLoading } = useQuery({
    queryKey: ['forum', slug, sort, page],
    queryFn: async () => {
      const { data } = await api.get(`/forums/${slug}`, {
        params: { sort, page, limit: 20 }
      })
      return data
    }
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!data?.forum) {
    return <div className="text-center py-12">Forum not found</div>
  }

  const { forum, threads, pagination } = data

  return (
    <div className="space-y-6">
      {/* Forum Header */}
      <div className="card" style={{ borderLeftColor: forum.color, borderLeftWidth: '4px' }}>
        <h1 className="text-2xl font-bold text-gray-900">{forum.name}</h1>
        <p className="text-gray-600 mt-2">{forum.description}</p>
        {forum.children?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {forum.children.map((child: any) => (
              <Link
                key={child._id}
                to={`/f/${child.slug}`}
                className="text-sm text-blue-600 hover:underline"
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Sort Options */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {pagination.total} Questions
        </h2>
        <div className="flex items-center space-x-2">
          <select
            value={sort}
            onChange={(e) => setSearchParams({ sort: e.target.value })}
            className="input w-auto"
          >
            <option value="newest">Newest</option>
            <option value="active">Active</option>
            <option value="votes">Most Voted</option>
            <option value="views">Most Viewed</option>
          </select>
        </div>
      </div>

      {/* Threads List */}
      <div className="space-y-3">
        {threads?.map((thread: Thread) => (
          <Link
            key={thread._id}
            to={`/t/${thread._id}`}
            className="card flex items-start space-x-4 hover:shadow-md transition-shadow"
          >
            {/* Vote Count */}
            <div className="flex flex-col items-center min-w-[60px]">
              <TrendingUp className="w-5 h-5 text-gray-400" />
              <span className="font-semibold text-lg">{thread.voteCount}</span>
              <span className="text-xs text-gray-500">votes</span>
            </div>

            {/* Thread Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className={`px-2 py-0.5 text-xs rounded-full status-${thread.status}`}>
                  {thread.status.replace('_', ' ')}
                </span>
                <span className="text-xs text-gray-500 capitalize">{thread.difficulty}</span>
                {thread.tags.map(tag => (
                  <span key={tag} className="text-xs text-blue-600">#{tag}</span>
                ))}
              </div>
              <h3 className="font-semibold text-gray-900 truncate">{thread.title}</h3>
              <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                <span>{thread.author.username}</span>
                <span className="flex items-center">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  {thread.answerCount} answers
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

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex justify-center space-x-2">
          {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`px-3 py-1 rounded ${
                page === p ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
