"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { useActionState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { UploadCloud, Trash2, Loader2, FileCheck2, AlertCircle } from "lucide-react"
import { uploadCustomAd, deleteCustomAd } from "@/app/actions"
import type { Advertisement } from "@/lib/types"
import { cn } from "@/lib/utils"

interface AdManagerProps {
  initialAd: Advertisement | null
}

const initialState = {
  success: false,
  error: "",
  message: "",
}

export function AdManager({ initialAd }: AdManagerProps) {
  const { publicKey } = useWallet()
  const [ad, setAd] = useState(initialAd)
  const [isDeleting, setIsDeleting] = useState(false)
  const [uploadState, uploadAction, isUploading] = useActionState(uploadCustomAd, initialState)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)

  useEffect(() => {
    setAd(initialAd)
  }, [initialAd])

  useEffect(() => {
    if (uploadState.success) {
      toast.success(uploadState.message)
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
      // The parent component will refetch and update the initialAd prop,
      // which will then update the local `ad` state via the other useEffect.
    } else if (uploadState.error) {
      toast.error("Upload Failed", { description: uploadState.error })
    }
  }, [uploadState])

  const handleDelete = async () => {
    if (!publicKey) return
    setIsDeleting(true)
    const result = await deleteCustomAd(publicKey.toBase58())
    if (result.success) {
      toast.success(result.message)
      setAd(null)
    } else {
      toast.error("Deletion Failed", { description: result.error })
    }
    setIsDeleting(false)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setValidationError(null)
    setSelectedFile(null)

    if (!file) return

    if (!file.type.startsWith("video/mp4") && !file.type.startsWith("image/")) {
      setValidationError("Invalid file type. Please upload an MP4, GIF, PNG, or JPG.")
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setValidationError("File size exceeds 50MB limit.")
      return
    }

    if (file.type === "video/mp4") {
      const video = document.createElement("video")
      video.preload = "metadata"
      video.onloadedmetadata = () => {
        window.URL.revokeObjectURL(video.src)
        if (video.duration > 15.5) {
          setValidationError(`Video is too long (${Math.round(video.duration)}s). Max 15 seconds.`)
          if (fileInputRef.current) fileInputRef.current.value = ""
        } else {
          setSelectedFile(file)
        }
      }
      video.onerror = () => {
        setValidationError("Could not read video file. It may be corrupt.")
        if (fileInputRef.current) fileInputRef.current.value = ""
      }
      video.src = URL.createObjectURL(file)
    } else {
      setSelectedFile(file)
    }
  }

  return (
    <Card className="border-border/20 bg-white/5">
      <CardHeader>
        <CardTitle className="text-white">Custom Advertisement</CardTitle>
        <CardDescription>
          Upload a short video (MP4, max 15s), GIF, or image (PNG/JPG) to display during your sessions.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6">
        {ad ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Current Ad:</p>
            <div className="rounded-lg border border-border/20 bg-black/20 p-4 space-y-2">
              {ad.fileType === "mp4" ? (
                <video src={ad.filePath} controls className="w-full max-w-sm rounded-md" />
              ) : (
                <img
                  src={ad.filePath || "/placeholder.svg"}
                  alt="Custom Ad Preview"
                  className="w-full max-w-sm rounded-md"
                />
              )}
              <p className="text-xs text-muted-foreground truncate">File: {ad.fileName}</p>
            </div>
            <Button onClick={handleDelete} variant="destructive" disabled={isDeleting}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Remove Custom Ad
            </Button>
          </div>
        ) : (
          <form action={uploadAction} className="space-y-4">
            <input type="hidden" name="streamerWallet" value={publicKey?.toBase58() ?? ""} />
            <div>
              <Label htmlFor="adFile" className="text-white">
                Upload Ad File
              </Label>
              <div className="mt-2">
                <label
                  htmlFor="adFile"
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-black/20",
                    "hover:bg-black/30",
                    validationError && "border-red-500/50",
                    selectedFile && "border-green-500/50",
                  )}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {validationError ? (
                      <AlertCircle className="w-8 h-8 mb-4 text-red-500" />
                    ) : selectedFile ? (
                      <FileCheck2 className="w-8 h-8 mb-4 text-green-500" />
                    ) : (
                      <UploadCloud className="w-8 h-8 mb-4 text-muted-foreground" />
                    )}
                    <p className="mb-2 text-sm text-center text-muted-foreground">
                      {validationError ? (
                        <span className="text-red-500">{validationError}</span>
                      ) : selectedFile ? (
                        <span className="font-semibold text-green-500">{selectedFile.name}</span>
                      ) : (
                        <>
                          <span className="font-semibold">Click to upload</span> or drag and drop
                        </>
                      )}
                    </p>
                    {!selectedFile && !validationError && (
                      <p className="text-xs text-muted-foreground">MP4 (max 15s), GIF, PNG, JPG (max 50MB)</p>
                    )}
                  </div>
                  <Input
                    id="adFile"
                    name="adFile"
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="video/mp4,image/gif,image/png,image/jpeg"
                    required
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>
            <Button type="submit" disabled={isUploading || !publicKey || !selectedFile || !!validationError}>
              {isUploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upload Ad
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
