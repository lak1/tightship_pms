'use client'

import { useState, useEffect } from 'react'
import * as fabric from 'fabric'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquare, Send, Check, X, Trash2 } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface DesignCommentsProps {
  canvas: fabric.Canvas | null
  designId: string
}

interface CommentMarker {
  id: string
  x: number
  y: number
  fabricObject: fabric.Circle
}

export default function DesignComments({ canvas, designId }: DesignCommentsProps) {
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newComment, setNewComment] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; y: number } | null>(null)
  const [commentMarkers, setCommentMarkers] = useState<CommentMarker[]>([])
  const [showPanel, setShowPanel] = useState(false)

  const { data: comments, refetch } = trpc.design.getComments.useQuery(
    { designId },
    { enabled: !!designId }
  )

  const createCommentMutation = trpc.design.createComment.useMutation({
    onSuccess: () => {
      refetch()
      setNewComment('')
      setIsAddingComment(false)
      setSelectedPosition(null)
    },
  })

  const resolveCommentMutation = trpc.design.resolveComment.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  const deleteCommentMutation = trpc.design.deleteComment.useMutation({
    onSuccess: () => {
      refetch()
    },
  })

  // Add comment markers to canvas
  useEffect(() => {
    if (!canvas || !comments) return

    // Remove existing markers
    commentMarkers.forEach(marker => {
      canvas.remove(marker.fabricObject)
    })

    // Add new markers
    const newMarkers: CommentMarker[] = []

    comments
      .filter(comment => !comment.resolved && comment.x && comment.y)
      .forEach(comment => {
        const marker = new fabric.Circle({
          left: comment.x,
          top: comment.y,
          radius: 10,
          fill: '#ef4444',
          stroke: '#dc2626',
          strokeWidth: 2,
          selectable: false,
          evented: true,
          hasControls: false,
          hasBorders: false,
          originX: 'center',
          originY: 'center',
        })

        // Add click handler to show comment
        marker.on('mousedown', () => {
          setShowPanel(true)
        })

        canvas.add(marker)
        newMarkers.push({
          id: comment.id,
          x: comment.x,
          y: comment.y,
          fabricObject: marker,
        })
      })

    setCommentMarkers(newMarkers)
    canvas.requestRenderAll()

    return () => {
      newMarkers.forEach(marker => {
        canvas.remove(marker.fabricObject)
      })
    }
  }, [canvas, comments])

  // Handle canvas click for adding comments
  useEffect(() => {
    if (!canvas || !isAddingComment) return

    const handleCanvasClick = (e: fabric.IEvent<MouseEvent>) => {
      const pointer = canvas.getPointer(e.e)
      setSelectedPosition({ x: pointer.x, y: pointer.y })

      // Add temporary marker
      const tempMarker = new fabric.Circle({
        left: pointer.x,
        top: pointer.y,
        radius: 10,
        fill: '#3b82f6',
        stroke: '#2563eb',
        strokeWidth: 2,
        selectable: false,
        evented: false,
        originX: 'center',
        originY: 'center',
      })

      canvas.add(tempMarker)
      canvas.requestRenderAll()

      // Remove temporary marker after comment is added or cancelled
      const cleanup = () => {
        canvas.remove(tempMarker)
        canvas.requestRenderAll()
      }

      setTimeout(cleanup, 100)
    }

    canvas.on('mouse:down', handleCanvasClick)

    return () => {
      canvas.off('mouse:down', handleCanvasClick)
    }
  }, [canvas, isAddingComment])

  const handleAddComment = () => {
    if (!newComment.trim() || !selectedPosition) return

    createCommentMutation.mutate({
      designId,
      comment: newComment,
      x: selectedPosition.x,
      y: selectedPosition.y,
    })
  }

  const handleResolveComment = (commentId: string) => {
    resolveCommentMutation.mutate({ commentId })
  }

  const handleDeleteComment = (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      deleteCommentMutation.mutate({ commentId })
    }
  }

  return (
    <>
      {/* Comments Toggle Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          onClick={() => setShowPanel(!showPanel)}
          className="rounded-full shadow-lg"
          size="lg"
        >
          <MessageSquare className="mr-2 h-5 w-5" />
          Comments
          {comments && comments.filter(c => !c.resolved).length > 0 && (
            <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-xs text-blue-600">
              {comments.filter(c => !c.resolved).length}
            </span>
          )}
        </Button>
      </div>

      {/* Comments Panel */}
      {showPanel && (
        <div className="fixed right-0 top-0 z-50 flex h-full w-96 flex-col border-l border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowPanel(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Add Comment Section */}
          <div className="border-b border-gray-200 p-4">
            {!isAddingComment ? (
              <Button
                onClick={() => setIsAddingComment(true)}
                className="w-full"
                variant="outline"
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Add Comment on Canvas
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  {selectedPosition ? 'Click Send to add comment' : 'Click anywhere on the canvas to place comment'}
                </p>
                <Textarea
                  placeholder="Enter your comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  disabled={!selectedPosition}
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleAddComment}
                    disabled={!newComment.trim() || !selectedPosition || createCommentMutation.isPending}
                    className="flex-1"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </Button>
                  <Button
                    onClick={() => {
                      setIsAddingComment(false)
                      setNewComment('')
                      setSelectedPosition(null)
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4">
            {!comments || comments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="mb-3 h-12 w-12 text-gray-300" />
                <p className="text-sm text-gray-500">No comments yet</p>
                <p className="mt-1 text-xs text-gray-400">
                  Click "Add Comment" to start a discussion
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className={`rounded-lg border p-3 ${
                      comment.resolved
                        ? 'border-gray-200 bg-gray-50'
                        : 'border-blue-200 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {comment.user.name || comment.user.email}
                          </span>
                          {comment.resolved && (
                            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                              <Check className="h-3 w-3" />
                              Resolved
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{comment.comment}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                        </p>
                      </div>

                      {!comment.resolved && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleResolveComment(comment.id)}
                            disabled={resolveCommentMutation.isPending}
                            title="Resolve"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteComment(comment.id)}
                            disabled={deleteCommentMutation.isPending}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
