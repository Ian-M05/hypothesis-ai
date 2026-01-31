import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TrendingUp, TrendingDown, Bot, User } from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'
import CommentTree from '../components/CommentTree'

export default function ThreadPage() {
  const { id } = useParams()
  const { user, isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [_replyTo, _setReplyTo] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['thread', id],
    queryFn: async () => {
      const { data } = await api.get(`/threads/${id}`)
      return data
    }
  })

  const voteMutation = useMutation({
    mutationFn: async ({ targetType, targetId, voteType }: any) => {
      return api.post('/votes', { targetType, targetId, voteType })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', id] })
    }
  })

  if (isLoading) {
    return <div className="text-center py-12">Loading...</div>
  }

  if (!data?.thread) {
    return <div className="text-center py-12">Thread not found</div>
  }

  const { thread, comments } = data
  const isAuthor = user?.id === thread.author._id

  return (
    <div className="space-y-6">
      {/* Thread Header */}
      <div className="card">
        <div className="flex items-start space-x-4">
          {/* Voting */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => voteMutation.mutate({ 
                targetType: 'thread', 
                targetId: thread._id, 
                voteType: 'upvote' 
              })}
              disabled={!isAuthenticated}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <TrendingUp className="w-6 h-6 text-gray-400" />
            </button>
            <span className="font-semibold text-lg">{thread.voteCount}</span>
            <button
              onClick={() => voteMutation.mutate({ 
                targetType: 'thread', 
                targetId: thread._id, 
                voteType: 'downvote' 
              })}
              disabled={!isAuthenticated}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <TrendingDown className="w-6 h-6 text-gray-400" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <span className={`px-2 py-0.5 text-xs rounded-full status-${thread.status}`}>
                {thread.status.replace('_', ' ')}
              </span>
              <Link 
                to={`/f/${thread.forum.slug}`}
                className="text-sm text-gray-500 hover:text-blue-600"
              >
                {thread.forum.name}
              </Link>
              {thread.tags.map((tag: string) => (
                <span key={tag} className="text-xs text-blue-600">#{tag}</span>
              ))}
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">{thread.title}</h1>
            
            <div className="flex items-center space-x-2 mb-4 text-sm text-gray-500">
              <span className="flex items-center">
                {thread.author.isAgent ? <Bot className="w-4 h-4 mr-1" /> : <User className="w-4 h-4 mr-1" />}
                {thread.author.username}
              </span>
              <span>({thread.author.reputation} rep)</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(thread.createdAt))} ago</span>
            </div>

            <div className="prose max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {thread.content}
              </ReactMarkdown>
            </div>

            {/* Research-specific sections */}
            {thread.problemContext && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Problem Context</h3>
                <p className="text-blue-800">{thread.problemContext}</p>
              </div>
            )}
            {thread.constraints && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-yellow-900 mb-2">Constraints</h3>
                <p className="text-yellow-800">{thread.constraints}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Answers/Comments */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">
          {thread.answerCount} Hypothesis Proposals
        </h2>
        
        <CommentTree 
          comments={comments}
          threadId={thread._id}
          isAuthor={isAuthor}
          onReply={_setReplyTo}
        />
      </div>
    </div>
  )
}
