'use client'

import { useState } from 'react'
import * as fabric from 'fabric'
import { trpc } from '@/lib/trpc'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { History, RotateCcw, Clock, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface VersionHistoryProps {
  canvas: fabric.Canvas | null
  designId: string
  isOpen: boolean
  onClose: () => void
}

export default function VersionHistory({
  canvas,
  designId,
  isOpen,
  onClose,
}: VersionHistoryProps) {
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)

  const { data: versions, isLoading } = trpc.design.getVersionHistory.useQuery(
    { designId },
    { enabled: isOpen && !!designId }
  )

  const restoreVersionMutation = trpc.design.restoreVersion.useMutation({
    onSuccess: (restoredData) => {
      if (canvas && restoredData) {
        canvas.loadFromJSON(restoredData, () => {
          canvas.requestRenderAll()
          onClose()
        })
      }
    },
  })

  const handleRestoreVersion = (versionId: string) => {
    if (confirm('Are you sure you want to restore this version? Current changes will be saved as a new version.')) {
      restoreVersionMutation.mutate({ versionId })
    }
  }

  const handlePreview = (versionData: any) => {
    if (!canvas) return

    // Save current state
    const currentState = canvas.toJSON()

    // Load version for preview
    canvas.loadFromJSON(versionData, () => {
      canvas.requestRenderAll()
    })

    setSelectedVersion(versionData.id)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Version History
          </DialogTitle>
          <DialogDescription>
            Browse and restore previous versions of your design
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] pr-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Loading versions...</div>
            </div>
          )}

          {!isLoading && (!versions || versions.length === 0) && (
            <div className="flex flex-col items-center justify-center py-8">
              <History className="h-12 w-12 text-gray-300 mb-3" />
              <div className="text-sm text-gray-500">No version history available</div>
              <p className="text-xs text-gray-400 mt-1">
                Versions are created when you save your design
              </p>
            </div>
          )}

          {!isLoading && versions && versions.length > 0 && (
            <div className="space-y-2">
              {versions.map((version, index) => (
                <div
                  key={version.id}
                  className={`flex items-start gap-4 rounded-lg border p-4 transition-all ${
                    selectedVersion === version.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Version Number Badge */}
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-600">
                    v{version.versionNumber}
                  </div>

                  {/* Version Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {index === 0 && (
                        <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          Current
                        </span>
                      )}
                      {version.changeDescription && (
                        <h4 className="font-medium text-gray-900 truncate">
                          {version.changeDescription}
                        </h4>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(version.createdAt), { addSuffix: true })}
                      </div>
                      {version.createdBy && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {version.createdBy.name || version.createdBy.email}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {index !== 0 && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handlePreview(version.designData)}
                        >
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleRestoreVersion(version.id)}
                          disabled={restoreVersionMutation.isPending}
                        >
                          <RotateCcw className="mr-1 h-3 w-3" />
                          Restore
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-between border-t pt-4">
          <p className="text-sm text-gray-500">
            {versions?.length || 0} version{versions?.length !== 1 ? 's' : ''} saved
          </p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
