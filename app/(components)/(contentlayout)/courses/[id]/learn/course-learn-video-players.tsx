"use client"

import React, { useEffect, useRef, useState } from "react"
import { formatTime, SPEED_OPTIONS, WATCH_THRESHOLD } from "./course-learn-helpers"
import { CompletionToggle } from "./course-learn-complete-toggle"

declare global {
  interface Window {
    YT?: { Player: new (el: HTMLElement | string, opts: unknown) => YTPlayer; PlayerState?: { ENDED: number; PLAYING: number; PAUSED: number } }
    onYouTubeIframeAPIReady?: () => void
  }
}
interface YTPlayer {
  playVideo: () => void
  pauseVideo: () => void
  seekTo: (seconds: number, allowSeek: boolean) => void
  getCurrentTime: () => number
  getDuration: () => number
  getPlayerState: () => number
  setPlaybackRate: (rate: number) => void
  getPlaybackRate: () => number
  getVolume: () => number
  setVolume: (vol: number) => void
  mute: () => void
  unMute: () => void
  destroy?: () => void
}

interface PlayerChromeProps {
  title: string
  isCompleted: boolean
  completing: boolean
  onMarkComplete: () => void
  onMarkIncomplete: () => void
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  playbackRate: number
  isFullscreen: boolean
  showSpeedMenu: boolean
  setShowSpeedMenu: (v: boolean | ((s: boolean) => boolean)) => void
  onTogglePlay: () => void
  onSeek: (e: React.ChangeEvent<HTMLInputElement>) => void
  onToggleMute: () => void
  onVolume: (e: React.ChangeEvent<HTMLInputElement>) => void
  onSpeed: (s: number) => void
  onFullscreen: () => void
}

/** Shared seek / volume / complete chrome for HTML5 and YouTube players. */
function PlayerChrome(props: PlayerChromeProps) {
  const {
    title, isCompleted, completing, onMarkComplete, onMarkIncomplete,
    isPlaying, currentTime, duration, volume, playbackRate, isFullscreen,
    showSpeedMenu, setShowSpeedMenu, onTogglePlay, onSeek, onToggleMute, onVolume, onSpeed, onFullscreen,
  } = props
  return (
    <div className="flex flex-col shrink-0 bg-black/80 text-white">
      <input type="range" min={0} max={duration || 100} value={currentTime} step={0.1} onChange={onSeek} className="w-full h-1.5 accent-primary cursor-pointer" aria-label="Seek" />
      <div className="flex items-center gap-2 px-3 py-2">
        <button type="button" onClick={onTogglePlay} className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label={isPlaying ? "Pause" : "Play"}>
          <i className={`ti ti-${isPlaying ? "player-pause" : "player-play"} text-[1.25rem]`} />
        </button>
        <span className="text-[0.75rem] tabular-nums min-w-[4.5rem]">{formatTime(currentTime)} / {formatTime(duration)}</span>
        <div className="flex items-center gap-1 w-20">
          <button type="button" onClick={onToggleMute} className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label={volume > 0 ? "Mute" : "Unmute"}>
            <i className={`ti ti-${volume > 0 ? "volume" : "volume-off"} text-[1rem]`} />
          </button>
          <input type="range" min={0} max={1} step={0.05} value={volume > 1 ? volume / 100 : volume} onChange={onVolume} className="flex-1 h-1 accent-primary cursor-pointer" aria-label="Volume" />
        </div>
        <div className="flex-1 min-w-0" />
        <div className="relative">
          <button type="button" onClick={() => setShowSpeedMenu((s) => !s)} className="px-2.5 py-2 min-h-11 text-[0.75rem] font-medium rounded-lg hover:bg-white/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="Playback speed">{playbackRate}x</button>
          {showSpeedMenu && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setShowSpeedMenu(false)} />
              <div className="absolute bottom-full left-0 mb-1 py-1 bg-[#1c1d1f] rounded shadow-lg z-20 min-w-[4rem]">
                {SPEED_OPTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => { onSpeed(s); setShowSpeedMenu(false) }} className={`block w-full text-left px-3 py-2 min-h-11 text-[0.75rem] hover:bg-white/10 transition-colors ${playbackRate === s ? "bg-primary/30" : ""}`}>{s}x</button>
                ))}
              </div>
            </>
          )}
        </div>
        <button type="button" onClick={onFullscreen} className="p-2 min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
          <i className={`ti ti-${isFullscreen ? "arrows-minimize" : "arrows-maximize"} text-[1rem]`} />
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
        <span className="text-[0.8125rem] font-medium truncate">
          <span className="text-white/50 font-normal mr-1.5 hidden sm:inline">Now playing</span>
          {title}
        </span>
        <CompletionToggle
          isCompleted={isCompleted}
          completing={completing}
          onComplete={onMarkComplete}
          onIncomplete={onMarkIncomplete}
          completeLabel="Mark as watched"
          incompleteLabel="Mark as unwatched"
          compact
        />
      </div>
    </div>
  )
}

interface VideoPlayerProps {
  src?: string
  videoId?: string
  title: string
  isCompleted: boolean
  onComplete: () => void
  onMarkComplete: () => void
  onMarkIncomplete: () => void
  completing: boolean
}

export function UploadVideoPlayer({
  src, title, isCompleted, onComplete, onMarkComplete, onMarkIncomplete, completing,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const accumulatedPlayedRef = useRef(0)
  const lastTickRef = useRef(0)
  const completionReportedRef = useRef(false)

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    v.volume = volume
    v.playbackRate = playbackRate
  }, [volume, playbackRate])

  useEffect(() => {
    if (isCompleted || completionReportedRef.current) return
    if (!isPlaying || duration <= 0) {
      lastTickRef.current = 0
      return
    }
    lastTickRef.current = lastTickRef.current || Date.now()
    const id = setInterval(() => {
      const now = Date.now()
      accumulatedPlayedRef.current += (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      if (duration > 0 && accumulatedPlayedRef.current >= WATCH_THRESHOLD * duration) {
        completionReportedRef.current = true
        onComplete()
      }
    }, 1000)
    return () => clearInterval(id)
  }, [isPlaying, duration, isCompleted, onComplete])

  const togglePlay = () => {
    const v = videoRef.current
    if (!v) return
    if (v.paused) v.play().catch(() => undefined)
    else v.pause()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current
    const t = parseFloat(e.target.value)
    if (v && Number.isFinite(t)) {
      v.currentTime = t
      setCurrentTime(t)
    }
  }

  const toggleFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => undefined)
    else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => undefined)
  }

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  return (
    <div ref={containerRef} className="relative w-full h-full bg-black flex flex-col">
      <video
        ref={videoRef}
        src={src}
        className="w-full flex-1 object-contain"
        playsInline
        onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime ?? 0)}
        onDurationChange={() => setDuration(videoRef.current?.duration ?? 0)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          if (!completionReportedRef.current) {
            completionReportedRef.current = true
            onComplete()
          }
        }}
        onClick={togglePlay}
      />
      <PlayerChrome
        title={title}
        isCompleted={isCompleted}
        completing={completing}
        onMarkComplete={onMarkComplete}
        onMarkIncomplete={onMarkIncomplete}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        playbackRate={playbackRate}
        isFullscreen={isFullscreen}
        showSpeedMenu={showSpeedMenu}
        setShowSpeedMenu={setShowSpeedMenu}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onToggleMute={() => {
          const v = videoRef.current
          if (!v) return
          if (volume > 0) { v.volume = 0; setVolume(0) } else { v.volume = 1; setVolume(1) }
        }}
        onVolume={(e) => {
          const val = parseFloat(e.target.value)
          setVolume(val)
          if (videoRef.current) videoRef.current.volume = val
        }}
        onSpeed={(s) => {
          setPlaybackRate(s)
          if (videoRef.current) videoRef.current.playbackRate = s
        }}
        onFullscreen={toggleFullscreen}
      />
    </div>
  )
}

export function YouTubeVideoPlayer({
  videoId, title, isCompleted, onComplete, onMarkComplete, onMarkIncomplete, completing,
}: VideoPlayerProps) {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const playerContainerRef = useRef<HTMLDivElement>(null)
  const playerRef = useRef<YTPlayer | null>(null)
  const [apiReady, setApiReady] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(100)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSpeedMenu, setShowSpeedMenu] = useState(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const accumulatedPlayedRef = useRef(0)
  const lastTickRef = useRef(0)
  const completionReportedRef = useRef(false)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.YT?.Player) {
      setApiReady(true)
      return
    }
    const prev = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      setApiReady(true)
      prev?.()
    }
    if (document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) return
    const script = document.createElement("script")
    script.src = "https://www.youtube.com/iframe_api"
    script.async = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (!apiReady || !videoId || !playerContainerRef.current) return
    const el = playerContainerRef.current
    const player = new window.YT!.Player(el, {
      videoId,
      width: "100%",
      height: "100%",
      playerVars: { autoplay: 1, enablejsapi: 1, rel: 0, modestbranding: 1, controls: 0, iv_load_policy: 3 },
      events: {
        onReady: (e: { target: YTPlayer }) => { playerRef.current = e.target },
        onStateChange: (e: { data: number }) => {
          const YT = window.YT
          if (!YT?.PlayerState) return
          if (e.data === YT.PlayerState.PLAYING) setIsPlaying(true)
          if (e.data === YT.PlayerState.PAUSED) setIsPlaying(false)
          if (e.data === YT.PlayerState.ENDED && !completionReportedRef.current) {
            completionReportedRef.current = true
            onCompleteRef.current()
          }
        },
      },
    })
    return () => {
      try {
        playerRef.current?.destroy?.()
      } catch {
        playerRef.current = null
      }
      playerRef.current = null
      void player
    }
  }, [apiReady, videoId])

  useEffect(() => {
    if (!playerRef.current) return
    const tick = () => {
      const p = playerRef.current
      if (!p) return
      try {
        const t = p.getCurrentTime()
        const d = p.getDuration()
        if (Number.isFinite(t)) setCurrentTime(t)
        if (Number.isFinite(d) && d > 0) setDuration(d)
        if (isPlaying && d > 0) {
          const now = Date.now()
          if (lastTickRef.current > 0) accumulatedPlayedRef.current += (now - lastTickRef.current) / 1000
          lastTickRef.current = now
          if (accumulatedPlayedRef.current >= WATCH_THRESHOLD * d && !completionReportedRef.current) {
            completionReportedRef.current = true
            onCompleteRef.current()
          }
        } else {
          lastTickRef.current = 0
        }
      } catch {
        return
      }
    }
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [apiReady, videoId, isPlaying])

  const togglePlay = () => {
    const p = playerRef.current
    if (!p) return
    if (isPlaying) p.pauseVideo()
    else p.playVideo()
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const p = playerRef.current
    const t = parseFloat(e.target.value)
    if (p && Number.isFinite(t)) {
      p.seekTo(t, true)
      setCurrentTime(t)
    }
  }

  const toggleFullscreen = () => {
    const el = wrapperRef.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => undefined)
    else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => undefined)
  }

  useEffect(() => {
    const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  return (
    <div ref={wrapperRef} className="relative w-full h-full bg-black flex flex-col">
      <div className="relative flex-1 min-h-0 w-full">
        <div ref={playerContainerRef} className="absolute inset-0 w-full h-full" />
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-black pointer-events-auto z-10" aria-hidden />
      </div>
      <PlayerChrome
        title={title}
        isCompleted={isCompleted}
        completing={completing}
        onMarkComplete={onMarkComplete}
        onMarkIncomplete={onMarkIncomplete}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        playbackRate={playbackRate}
        isFullscreen={isFullscreen}
        showSpeedMenu={showSpeedMenu}
        setShowSpeedMenu={setShowSpeedMenu}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onToggleMute={() => {
          const p = playerRef.current
          if (!p) return
          if (volume > 0) { p.mute(); setVolume(0) } else { p.unMute(); setVolume(100) }
        }}
        onVolume={(e) => {
          const val = Math.round(parseFloat(e.target.value) * 100)
          setVolume(val)
          playerRef.current?.setVolume(val)
        }}
        onSpeed={(s) => {
          setPlaybackRate(s)
          playerRef.current?.setPlaybackRate(s)
        }}
        onFullscreen={toggleFullscreen}
      />
    </div>
  )
}
