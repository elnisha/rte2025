import { Button } from '@/components/ui/button'
import type { Template } from '@/types/template'
import { useRef, useState, useEffect } from 'react'

import templatesData from "@/db/db.json"

// Fixed config: proxy is required and assumed to run on the same host
const API_BASE = `${location.protocol}//${location.hostname}:8001`
const ENDPOINT_PATH = '/v1/audio/transcriptions'
const MODEL_ID = 'Systran/faster-distil-whisper-small.en'

// Helpers to build 16kHz mono WAV
function mergeFloat32(arrays: Float32Array[]) {
  let length = 0
  arrays.forEach(a => length += a.length)
  const result = new Float32Array(length)
  let offset = 0
  arrays.forEach(a => { result.set(a, offset); offset += a.length })
  return result
}
function downsampleTo16k(float32: Float32Array, inRate: number) {
  const outRate = 16000
  if (inRate === outRate) return float32
  const ratio = inRate / outRate
  const newLen = Math.floor(float32.length / ratio)
  const out = new Float32Array(newLen)
  for (let i = 0; i < newLen; i++) {
    const idx = i * ratio
    const idx1 = Math.floor(idx)
    const idx2 = Math.min(idx1 + 1, float32.length - 1)
    const frac = idx - idx1
    out[i] = float32[idx1] * (1 - frac) + float32[idx2] * frac
  }
  return out
}
function floatTo16BitPCM(float32: Float32Array) {
  const buf = new ArrayBuffer(float32.length * 2)
  const view = new DataView(buf)
  let offset = 0
  for (let i = 0; i < float32.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, float32[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
  return new Uint8Array(buf)
}
function encodeWavPCM16(mono16: Uint8Array, sampleRate: number) {
  const numChannels = 1
  const bytesPerSample = 2
  const blockAlign = numChannels * bytesPerSample
  const byteRate = sampleRate * blockAlign
  const dataSize = mono16.length
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeString = (off: number, str: string) => { for (let i=0;i<str.length;i++) view.setUint8(off+i, str.charCodeAt(i)) }
  let offset = 0
  writeString(offset, 'RIFF'); offset += 4
  view.setUint32(offset, 36 + dataSize, true); offset += 4
  writeString(offset, 'WAVE'); offset += 4
  writeString(offset, 'fmt '); offset += 4
  view.setUint32(offset, 16, true); offset += 4 // PCM chunk size
  view.setUint16(offset, 1, true); offset += 2 // PCM format
  view.setUint16(offset, numChannels, true); offset += 2
  view.setUint32(offset, sampleRate, true); offset += 4
  view.setUint32(offset, byteRate, true); offset += 4
  view.setUint16(offset, blockAlign, true); offset += 2
  view.setUint16(offset, 16, true); offset += 2 // bits per sample
  writeString(offset, 'data'); offset += 4
  view.setUint32(offset, dataSize, true); offset += 4
  new Uint8Array(buffer, 44).set(mono16)
  return new Blob([buffer], { type: 'audio/wav' })
}

export default function Transcription() {
  const [recording, setRecording] = useState(false)
  const [seconds, setSeconds] = useState(0)
  const timerRef = useRef<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [transcript, setTranscript] = useState('')
  const [txtUrl, setTxtUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedPath, setSavedPath] = useState<string>('')
  const [latestPath, setLatestPath] = useState<string>('')
  const [saveError, setSaveError] = useState<string>('')

  // Audio internals
  const ctxRef = useRef<AudioContext | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const sampleRateRef = useRef<number>(44100)

  const [templates, setTemplates] = useState<Template[]>([])

  async function startRecording() {
    setErrorMsg('')
    setTranscript('')
    setSavedPath(''); setLatestPath(''); setSaveError(''); setSaving(false)
    if (txtUrl) { URL.revokeObjectURL(txtUrl); setTxtUrl('') }
    setSeconds(0)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext
      const ctx = new AudioCtx()
      ctxRef.current = ctx
      sampleRateRef.current = ctx.sampleRate || 44100
      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0)
        chunksRef.current.push(new Float32Array(input))
      }
      source.connect(processor)
      processor.connect(ctx.destination)
      setRecording(true)
      timerRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch (e: any) {
      stopRecordingInternals()
      setErrorMsg(e?.message || String(e))
    }
  }

  function stopRecordingInternals() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    try { processorRef.current && processorRef.current.disconnect() } catch {}
    try { sourceRef.current && sourceRef.current.disconnect() } catch {}
    try { ctxRef.current && ctxRef.current.close() } catch {}
    try { streamRef.current && streamRef.current.getTracks().forEach(t => t.stop()) } catch {}
    processorRef.current = null; sourceRef.current = null; ctxRef.current = null; streamRef.current = null
    setRecording(false)
  }

  async function stopAndTranscribe() {
    if (!recording) return
    stopRecordingInternals()
    setBusy(true)
    setErrorMsg('')
    try {
      const inRate = sampleRateRef.current || 44100
      const merged = mergeFloat32(chunksRef.current)
      const resampled = downsampleTo16k(merged, inRate)
      const pcm16 = floatTo16BitPCM(resampled)
      const blob = encodeWavPCM16(pcm16, 16000)

      const form = new FormData()
      form.append('file', blob, 'speech.wav')
      form.append('model', MODEL_ID)
      const url = `${API_BASE}${ENDPOINT_PATH}`
      const resp = await fetch(url, { method: 'POST', body: form })
      if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(text || resp.statusText || `HTTP ${resp.status}`)
      }
      const ctype = resp.headers.get('content-type') || ''
      let finalText = ''
      if (ctype.includes('application/json')) {
        const json = await resp.json()
        finalText = json.text || json.transcript || (json.data && json.data.text) || JSON.stringify(json)
      } else {
        finalText = await resp.text()
      }
      setTranscript(finalText)

      // Persist via proxy: timestamped + latest
      setSaving(true); setSavedPath(''); setLatestPath(''); setSaveError('')
      try {
        const stamp = new Date().toISOString().replace(/[:.]/g, '-')
        const r = await fetch(`${API_BASE}/save-transcript`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: finalText, filename: `transcript-${stamp}.txt` })
        })
        const j = await r.json().catch(() => ({} as any))
        if (!r.ok || j.ok === false) throw new Error(j.error || `HTTP ${r.status}`)
        setSavedPath(j.path || '')
        setLatestPath(j.latest || '')
      } catch (e: any) {
        setSaveError(e?.message || String(e))
      } finally {
        setSaving(false)
      }

      const txtBlob = new Blob([finalText], { type: 'text/plain' })
      const urlTxt = URL.createObjectURL(txtBlob)
      if (txtUrl) URL.revokeObjectURL(txtUrl)
      setTxtUrl(urlTxt)
    } catch (e: any) {
      setErrorMsg(e?.message || String(e))
    } finally {
      setBusy(false)
    }
  }

  function resetAll() {
    stopRecordingInternals()
    setErrorMsg('')
    setTranscript('')
    if (txtUrl) { URL.revokeObjectURL(txtUrl); setTxtUrl('') }
    setSeconds(0)
    setSavedPath(''); setLatestPath(''); setSaveError(''); setSaving(false)
  }

  useEffect(() => {
    setTemplates(templatesData)
  }, [])

  function generateReport() {
    alert('Generate Report clicked! (not implemented)')
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">Transcription</h1>
        <p className="text-slate-500">Record as long as you want. WAV uploads via local proxy.</p>
      </div>

      <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-3">
          {!recording ? (
            <button className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm disabled:opacity-50" onClick={startRecording} disabled={busy}>
              <span className="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
              Start Recording
            </button>
          ) : (
            <button className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg shadow-sm" onClick={stopAndTranscribe}>
              <span className="w-2 h-2 rounded-full bg-rose-300 animate-ping"></span>
              Stop & Transcribe
            </button>
          )}
          <div className="text-slate-500 text-sm">{recording ? `Recording… ${seconds}s` : (seconds ? `Recorded ${seconds}s` : 'Idle')}</div>
          {busy && <div className="text-slate-500 text-sm">Transcribing…</div>}
          <button className="ml-auto text-sm text-slate-500 hover:text-slate-700" onClick={resetAll} title="Reset">Reset</button>
        </div>

        {errorMsg && (
          <div className="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm whitespace-pre-wrap">{errorMsg}</div>
        )}

        {transcript && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-slate-700">Transcript</div>
            <pre className="bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap font-mono text-sm">{transcript}</pre>
            {txtUrl && (
              <div className="flex gap-3">
                <a className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm" href={txtUrl} download="transcript.txt">Download transcript.txt</a>
                <button className="text-sm text-slate-600 hover:text-slate-800" onClick={() => navigator.clipboard && navigator.clipboard.writeText(transcript)}>Copy</button>
              </div>
            )}
            <div className="text-xs text-slate-500">
              {saving ? 'Saving transcript to disk…' : savedPath ? (
                <>
                  Saved: <code>{savedPath}</code> · Latest: <code>{latestPath || 'data/transcripts/transcript.txt'}</code>
                </>
              ) : saveError ? (
                <span className="text-rose-600">Save failed: {saveError}</span>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-slate-400 mt-4">Proxy: {API_BASE} (required). Endpoint: {ENDPOINT_PATH}. Model: {MODEL_ID}.</p>


      <div>
      {templates.length === 0 ? (
        <div className="text-sm text-slate-500 mt-4">No templates available.</div>
      ) : (
        <div className="mt-6">
          <h2 className="text-lg font-medium mb-2">Templates (select one or more)</h2>
          <label className="text-xs text-slate-500 mb-2 block">Hold Ctrl/Cmd (or Shift) to select multiple</label>
          <select
        multiple
        className="w-full border rounded-lg p-3 bg-white text-sm h-40 overflow-auto"
        aria-label="Select templates"
          >
        {templates.map((t, i) => (
          <option key={i} value={(t as any).id ?? i} title={(t as any).description || ''}>
            {(t as any).title || (t as any).name || `Template ${i + 1}`}
          </option>
        ))}
          </select>
        </div>
      )}
      </div>

      <Button className="mt-6" onClick={generateReport}>Generate Report</Button>
    </div>
  )
}
