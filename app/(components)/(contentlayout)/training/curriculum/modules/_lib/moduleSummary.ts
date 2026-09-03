import type { PlaylistItem } from '@/shared/lib/api/training-modules'

export interface ModuleSummary {
  videos: number
  pdfs: number
  blogs: number
  quiz: number
  essays: number
}

/**
 * Count playlist content types for card/detail badges.
 */
export function calculateSummary(playlist: PlaylistItem[]): ModuleSummary {
  let videos = 0
  let pdfs = 0
  let blogs = 0
  let quiz = 0
  let essays = 0
  for (const item of playlist) {
    if (item.contentType === 'upload-video' || item.contentType === 'youtube-link') videos += 1
    else if (item.contentType === 'pdf-document') pdfs += 1
    else if (item.contentType === 'blog') blogs += 1
    else if (item.contentType === 'quiz') quiz += 1
    else if (item.contentType === 'essay') essays += 1
  }
  return { videos, pdfs, blogs, quiz, essays }
}
