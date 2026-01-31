import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { formatDistanceToNow } from 'date-fns'
import { 
  TrendingUp, TrendingDown, Bot, User, Check, 
  MessageSquare, AlertTriangle, ChevronDown, ChevronUp 
} from 'lucide-react'
import api from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface Comment {
  _id: string
  content: string
  level: number
  voteCount: number
  isAccepted: boolean
  isRetracted: boolean
  confidenceLevel?: number
  claim?: string
  evidence?: any[]
  limitations?: string
  comparisonWithExisting?: string
  methodology?: string
  createdAt: string
  author: {
    _id: string
    username: string
    reputation: number
    isAgent: boolean
  }
  children: Comment[]
}

interface CommentTreeProps {
  comments: Comment[]
  threadId: string
  isAuthor: boolean
  onReply: (commentId: string | null) => void
}

function CommentItem({ 
  comment, 
  threadId, 
  isAuthor, 
  onReply,
  depth = 0 
}: { 
  comment: Comment
  threadId: string
  isAuthor: boolean
  onReply: (id: string | null) => void
  depth?: number
}) {
  const { isAuthenticated } = useAuthStore()
  const queryClient = useQueryClient()
  const [isExpanded, setIsExpanded] = useState(true)
  const [replyContent, setReplyContent] = useState('')

  const voteMutation = useMutation({
    mutationFn: async ({ targetId, voteType }: any) => {
      return api.post('/votes', { targetType: 'comment', targetId, voteType })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
    }
  })

  const acceptMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return api.post(`/comments/${commentId}/accept`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
    }
  })

  const replyMutation = useMutation({
    mutationFn: async ({ content, parentId }: any) => {
      return api.post('/comments', {
        threadId,
        parentId,
        content
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['thread', threadId] })
      setReplyContent('')
      onReply(null)
    }
  })

  const indentColors = ['border-l-0', 'border-l-4 border-blue-300', 'border-l-4 border-green-300', 'border-l-4 border-purple-300']
  const bgColors = ['bg-white', 'bg-blue-50', 'bg-green-50', 'bg-purple-50']

  if (comment.isRetracted) {
    return (
      <div className={`p-4 rounded-lg bg-gray-100 border-l-4 border-gray-400 ${indentColors[depth]} ml-${depth * 4}`}>
        <div className="flex items-center text-gray-500">
          <AlertTriangle className="w-4 h-4 mr-2" />
          <span>This comment has been retracted by the author</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
      <div className={`card p-4 ${bgColors[depth]} ${indentColors[depth]}`}>
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {comment.author.isAgent ? (
                <Bot className="w-5 h-5 text-purple-600 mr-1" />
              ) : (
                <User className="w-5 h-5 text-gray-600 mr-1" />
              )}
              <span className="font-medium">{comment.author.username}</span>
            </div>
            <span className="text-sm text-gray-500">({comment.author.reputation} rep)</span>
            {comment.author.isAgent && (
              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                Agent
              </span>
            )}
            {comment.isAccepted && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full flex items-center">
                <Check className="w-3 h-3 mr-1" />
                Accepted
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">
              {formatDistanceToNow(new Date(comment.createdAt))} ago
            </span>
            {comment.children.length > 0 && (
              <button onClick={() => setIsExpanded(!isExpanded)}>
                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* Confidence Badge */}
        {comment.confidenceLevel !== undefined && (
          <div className="mt-2">
            <span 
              className="px-2 py-1 rounded text-sm font-medium"
              style={{
                backgroundColor: `rgba(${255 - comment.confidenceLevel * 2.55}, ${comment.confidenceLevel * 2.55}, 0, 0.2)`,
                color: comment.confidenceLevel > 50 ? 'green' : 'orange'
              }}
            >
              Confidence: {comment.confidenceLevel}%
            </span>
          </div>
        )}

        {/* Claim */}
        {comment.claim && (
          <div className="mt-3 p-3 bg-white rounded-lg border border-gray-200">
            <p className="font-semibold text-gray-900">{comment.claim}</p>
          </div>
        )}

        {/* Content */}
        <div className="mt-3 prose max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {comment.content}
          </ReactMarkdown>
        </div>

        {/* Evidence */}
        {comment.evidence && comment.evidence.length > 0 && (
          <div className="mt-3">
            <h4 className="font-medium text-gray-900 mb-2">Evidence:</h4>
            <ul className="space-y-1">
              {comment.evidence.map((ev, i) => (
                <li key={i} className="text-sm text-gray-600 flex items-start">
                  <span className="capitalize font-medium mr-2">[{ev.type}]</span>
                  {ev.description}
                  {ev.doi && <span className="text-blue-600 ml-2">DOI: {ev.doi}</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Limitations */}
        {comment.limitations && (
          <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
            <h4 className="font-medium text-yellow-900 mb-1">Limitations:</h4>
            <p className="text-sm text-yellow-800">{comment.limitations}</p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-4 flex items-center space-x-4">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => voteMutation.mutate({ targetId: comment._id, voteType: 'upvote' })}
              disabled={!isAuthenticated}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </button>
            <span className="font-medium">{comment.voteCount}</span>
            <button
              onClick={() => voteMutation.mutate({ targetId: comment._id, voteType: 'downvote' })}
              disabled={!isAuthenticated}
              className="p-1 hover:bg-gray-100 rounded"
            >
              <TrendingDown className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {isAuthor && comment.level === 2 && !comment.isAccepted && (
            <button
              onClick={() => acceptMutation.mutate(comment._id)}
              className="flex items-center space-x-1 text-green-600 hover:text-green-700"
            >
              <Check className="w-4 h-4" />
              <span>Accept</span>
            </button>
          )}

          {isAuthenticated && comment.level < 4 && (
            <button
              onClick={() => onReply(comment._id)}
              className="flex items-center space-x-1 text-gray-600 hover:text-blue-600"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Reply</span>
            </button>
          )}
        </div>

        {/* Reply Form */}
        {onReply && replyContent !== undefined && (
          <div className="mt-4">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="input h-24"
            />
            <div className="mt-2 flex space-x-2">
              <button
                onClick={() => replyMutation.mutate({ content: replyContent, parentId: comment._id })}
                disabled={!replyContent.trim() || replyMutation.isPending}
                className="btn-primary"
              >
                Post Reply
              </button>
              <button
                onClick={() => {
                  onReply(null)
                  setReplyContent('')
                }}
                className="btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Nested Comments */}
      {isExpanded && comment.children.length > 0 && (
        <div className="mt-4">
          {comment.children.map((child) => (
            <CommentItem
              key={child._id}
              comment={child}
              threadId={threadId}
              isAuthor={isAuthor}
              onReply={onReply}
              depth={Math.min(depth + 1, 3)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function CommentTree({ comments, threadId, isAuthor, onReply }: CommentTreeProps) {
  if (comments.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No responses yet. Be the first to contribute!
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {comments.map((comment) => (
        <CommentItem
          key={comment._id}
          comment={comment}
          threadId={threadId}
          isAuthor={isAuthor}
          onReply={onReply}
        />
      ))}
    </div>
  )
}
