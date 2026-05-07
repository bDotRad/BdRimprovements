import { useState } from 'react'
import { X, ZoomIn, ChevronLeft, ChevronRight, Upload, Trash2, Image as ImageIcon } from 'lucide-react'
import { supabase, getImageUrl } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function ImageGallery({ images = [], onRefresh, parentId, parentType = 'problem' }) {
  const [lightboxIdx, setLightboxIdx] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadData, setUploadData] = useState({ title: '', description: '', file: null })

  const openLightbox = (idx) => setLightboxIdx(idx)
  const closeLightbox = () => setLightboxIdx(null)
  const prevImage = () => setLightboxIdx(i => (i > 0 ? i - 1 : images.length - 1))
  const nextImage = () => setLightboxIdx(i => (i < images.length - 1 ? i + 1 : 0))

  const handleUpload = async (e) => {
    e.preventDefault()
    if (!uploadData.file || !uploadData.title) {
      toast.error('Title and image file are required')
      return
    }
    setUploading(true)
    try {
      const ext = uploadData.file.name.split('.').pop()
      const fileName = `${parentType}-${parentId}-${Date.now()}.${ext}`
      const { error: storageErr } = await supabase.storage
        .from('problem-images')
        .upload(fileName, uploadData.file)
      if (storageErr) throw storageErr

      const nextNum = images.length + 1
      const row = {
        image_number: nextNum,
        title: uploadData.title,
        description: uploadData.description || null,
        storage_path: fileName,
        ...(parentType === 'problem' ? { t00_problems_id: parentId } : { t02_solutions_id: parentId }),
      }
      const { error: dbErr } = await supabase.from('t_images').insert(row)
      if (dbErr) throw dbErr

      toast.success('Image uploaded')
      setUploadData({ title: '', description: '', file: null })
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (img) => {
    if (!confirm(`Delete image "${img.title}"?`)) return
    try {
      await supabase.storage.from('problem-images').remove([img.storage_path])
      await supabase.from('t_images').delete().eq('id', img.id)
      toast.success('Image deleted')
      onRefresh?.()
    } catch (err) {
      toast.error(err.message || 'Delete failed')
    }
  }

  return (
    <div className="space-y-4">
      {/* Image grid */}
      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">
          <ImageIcon className="h-10 w-10 mb-2" />
          <p className="text-sm">No images yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <div key={img.id} className="group relative rounded-lg overflow-hidden border border-gray-200 bg-white shadow-sm">
              <div className="relative aspect-video bg-gray-100 cursor-pointer" onClick={() => openLightbox(idx)}>
                <img
                  src={getImageUrl(img.storage_path)}
                  alt={img.title}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <span className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                  #{img.image_number}
                </span>
              </div>
              <div className="p-2">
                <p className="text-xs font-semibold text-gray-800 truncate">{img.title}</p>
                {img.description && <p className="text-xs text-gray-500 truncate mt-0.5">{img.description}</p>}
              </div>
              <button
                onClick={() => handleDelete(img)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload form */}
      <form onSubmit={handleUpload} className="border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
        <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <Upload className="h-4 w-4" /> Add Image
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            placeholder="Image title *"
            value={uploadData.title}
            onChange={e => setUploadData(d => ({ ...d, title: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            value={uploadData.description}
            onChange={e => setUploadData(d => ({ ...d, description: e.target.value }))}
            className="border border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <input
            type="file"
            accept="image/*"
            onChange={e => setUploadData(d => ({ ...d, file: e.target.files[0] }))}
            className="text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button
            type="submit"
            disabled={uploading}
            className="ml-auto px-4 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </form>

      {/* Lightbox */}
      {lightboxIdx !== null && images[lightboxIdx] && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4" onClick={closeLightbox}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <button onClick={closeLightbox} className="absolute -top-10 right-0 text-white hover:text-gray-300 z-10">
              <X className="h-7 w-7" />
            </button>
            {images.length > 1 && (
              <>
                <button onClick={prevImage} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-12 text-white hover:text-gray-300">
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button onClick={nextImage} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-12 text-white hover:text-gray-300">
                  <ChevronRight className="h-8 w-8" />
                </button>
              </>
            )}
            <img
              src={getImageUrl(images[lightboxIdx].storage_path)}
              alt={images[lightboxIdx].title}
              className="max-h-[75vh] mx-auto rounded-lg object-contain"
            />
            <div className="mt-4 text-center text-white">
              <p className="font-semibold text-lg">
                #{images[lightboxIdx].image_number} — {images[lightboxIdx].title}
              </p>
              {images[lightboxIdx].description && (
                <p className="text-gray-300 text-sm mt-1">{images[lightboxIdx].description}</p>
              )}
              {images.length > 1 && (
                <p className="text-gray-500 text-xs mt-2">{lightboxIdx + 1} / {images.length}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
