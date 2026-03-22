import { useRef, useState, useCallback, useEffect } from 'react'
import { Mic, MicOff, Loader2, FileText, AlertCircle, CheckCircle2, XCircle } from 'lucide-react'
import Button from '../components/ui/Button'
import { aiClient, backendClient } from '../api/axios'
import toast from 'react-hot-toast'

// ── Recording state machine ───────────────────────────────────────────────────
const STATE = {
  IDLE:          'idle',
  REQUESTING:    'requesting',   // asking for mic permission
  RECORDING:     'recording',
  STOPPING:      'stopping',
  TRANSCRIBING:  'transcribing', // calling Flask STT
  NLP:           'nlp',          // calling Flask NLP
  GENERATING:    'generating',   // calling Spring Boot
  DONE:          'done',
  ERROR:         'error',
}

const STATE_LABEL = {
  [STATE.IDLE]:         'Tap the microphone to begin',
  [STATE.REQUESTING]:   'Requesting microphone access…',
  [STATE.RECORDING]:    'Recording — tap again to stop',
  [STATE.STOPPING]:     'Stopping…',
  [STATE.TRANSCRIBING]: 'Transcribing audio…',
  [STATE.NLP]:          'Analysing intent…',
  [STATE.GENERATING]:   'Generating invoice…',
  [STATE.DONE]:         'Invoice generated',
  [STATE.ERROR]:        'An error occurred',
}

// Supported MIME types — pick the first the browser supports
function getSupportedMimeType() {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/ogg',
    'audio/mp4',
  ]
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime
  }
  return ''   // let the browser decide
}

export default function VoiceBilling() {
  const [recState,    setRecState]    = useState(STATE.IDLE)
  const [transcript,  setTranscript]  = useState('')
  const [nlpResult,   setNlpResult]   = useState(null)   // raw AI JSON
  const [invoice,     setInvoice]     = useState(null)   // generated invoice
  const [errorMsg,    setErrorMsg]    = useState('')
  const [audioLevel,  setAudioLevel]  = useState(0)      // 0-1 for waveform

  const mediaRecorderRef = useRef(null)
  const chunksRef        = useRef([])
  const streamRef        = useRef(null)
  const analyserRef      = useRef(null)
  const animFrameRef     = useRef(null)
  const mimeTypeRef      = useRef('')
  // ── Waveform animation ──────────────────────────────────────────────
  function startWaveform(stream) {
    const ctx      = new AudioContext()
    const source   = ctx.createMediaStreamSource(stream)
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    analyserRef.current = analyser

    const data = new Uint8Array(analyser.frequencyBinCount)
    function tick() {
      analyser.getByteFrequencyData(data)
      const avg = data.reduce((a, b) => a + b, 0) / data.length
      setAudioLevel(avg / 255)
      animFrameRef.current = requestAnimationFrame(tick)
    }
    tick()
  }

  function stopWaveform() {
    cancelAnimationFrame(animFrameRef.current)
    setAudioLevel(0)
  }

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }
  // ── Clean up on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      stopStream()
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])
  // ── Step 1: STT ─────────────────────────────────────────────────────
  async function transcribeAudio(blob, mimeType) {
    const form = new FormData()
    form.append('audio', blob, `recording.${mimeType.split('/')[1]?.split(';')[0] || 'webm'}`)
    form.append('mimeType', mimeType)

    console.log('[VoiceBilling] AUDIO SENT to Flask /voice/transcribe —', blob.size, 'bytes')

    const res = await aiClient.post('/voice/transcribe-form', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })

    const text = res.data?.transcript
    if (!text || text.trim() === '') {
      throw new Error('Transcription returned empty text. Please speak clearly and try again.')
    }
    return text.trim()
  }
  // ── Step 2: NLP ─────────────────────────────────────────────────────
  async function detectIntent(text) {
    const res = await aiClient.post('/nlp/intent', { transcript: text })
    const data = res.data
    if (!data?.intent) {
      throw new Error('NLP service returned an invalid response.')
    }
    return data
  }

  // ── Step 3: Invoice ─────────────────────────────────────────────────
  async function generateInvoice(transcriptText) {
    const res = await backendClient.post('/ai/process-voice/generate-invoice', {
      transcript: transcriptText,
    })
    const inv = res.data?.data
    if (!inv?.invoiceNumber) {
      throw new Error('Invoice generation failed — no invoice returned from backend.')
    }
    return inv
  }

// ── Full pipeline ───────────────────────────────────────────────────
  async function runPipeline(blob, mimeType) {
    // Step 1 ── Transcribe via Flask
    setRecState(STATE.TRANSCRIBING)
    let transcriptText
    try {
      transcriptText = await transcribeAudio(blob, mimeType)
    } catch (err) {
      setErrorMsg(err.message)
      setRecState(STATE.ERROR)
      return
    }

    setTranscript(transcriptText)
    console.log('[VoiceBilling] TRANSCRIPT:', transcriptText)

    // Step 2 ── NLP intent via Flask
    setRecState(STATE.NLP)
    let nlpData
    try {
      nlpData = await detectIntent(transcriptText)
    } catch (err) {
      setErrorMsg(err.message)
      setRecState(STATE.ERROR)
      return
    }

    setNlpResult(nlpData)
    console.log('[VoiceBilling] NLP RESULT:', nlpData)

    // Step 3 ── Generate invoice via Spring Boot
    setRecState(STATE.GENERATING)
    try {
      const inv = await generateInvoice(transcriptText)
      setInvoice(inv)
      console.log('[VoiceBilling] INVOICE GENERATED:', inv)
      setRecState(STATE.DONE)
      toast.success(`Invoice ${inv.invoiceNumber} created for ${inv.customer?.name}`)
    } catch (err) {
      setErrorMsg(err.message)
      setRecState(STATE.ERROR)
    }
  }
  // ── Start recording ─────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    setErrorMsg('')
    setTranscript('')
    setNlpResult(null)
    setInvoice(null)
    setRecState(STATE.REQUESTING)

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount:     1,
          sampleRate:       16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      })
    } catch (err) {
      console.error('[VoiceBilling] Mic permission denied:', err)
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow microphone access in your browser settings.'
          : `Microphone error: ${err.message}`
      )
      setRecState(STATE.ERROR)
      return
    }

    streamRef.current  = stream
    chunksRef.current  = []
    mimeTypeRef.current = getSupportedMimeType()

    console.log('[VoiceBilling] RECORDING STARTED — mimeType:', mimeTypeRef.current || '(browser default)')

    const recorder = new MediaRecorder(
      stream,
      mimeTypeRef.current ? { mimeType: mimeTypeRef.current } : {}
    )
    mediaRecorderRef.current = recorder

    recorder.ondataavailable = e => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      stopWaveform()
      stopStream()

      const mimeType = mimeTypeRef.current || 'audio/webm'
      const blob     = new Blob(chunksRef.current, { type: mimeType })
      console.log('[VoiceBilling] AUDIO BLOB — size:', blob.size, 'bytes  type:', blob.type)

      if (blob.size < 1000) {
        setErrorMsg('Recording was too short or empty. Please try again.')
        setRecState(STATE.ERROR)
        return
      }

      await runPipeline(blob, mimeType)
    }

    recorder.onerror = e => {
      console.error('[VoiceBilling] MediaRecorder error:', e.error)
      setErrorMsg(`Recording error: ${e.error?.message ?? 'unknown'}`)
      setRecState(STATE.ERROR)
      stopWaveform()
      stopStream()
    }

    recorder.start(250)   // collect chunks every 250 ms
    setRecState(STATE.RECORDING)
    startWaveform(stream)
  }, [])

  // ── Stop recording ──────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      setRecState(STATE.STOPPING)
      mediaRecorderRef.current.stop()
    }
  }, [])

  




  // ── Helpers ──────────────────────────────────────────────────────────
  const handleReset = () => {
    setRecState(STATE.IDLE)
    setTranscript('')
    setNlpResult(null)
    setInvoice(null)
    setErrorMsg('')
    stopWaveform()
    stopStream()
  }

  const isRecording   = recState === STATE.RECORDING
  const isBusy        = [STATE.REQUESTING, STATE.STOPPING, STATE.TRANSCRIBING,
                         STATE.NLP, STATE.GENERATING].includes(recState)
  const isDone        = recState === STATE.DONE
  const isError       = recState === STATE.ERROR
  const canStart      = recState === STATE.IDLE || isError || isDone

  return (
    <div className="space-y-6 font-dm max-w-3xl">

      {/* ── Header ── */}
      <div>
        <h1 className="font-syne text-2xl font-bold text-white">Voice Billing</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Speak naturally — your voice is transcribed in real time and turned into an invoice.
        </p>
      </div>

      {/* ── Recorder Card ── */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">

        {/* Mic area */}
        <div className="relative flex flex-col items-center py-12 px-6 gap-6">

          {/* Ripple rings while recording */}
          {isRecording && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-40 h-40 rounded-full border-2 border-cyan-500/30 animate-ping"
                  style={{ animationDuration: '1.2s' }}
                />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div
                  className="w-56 h-56 rounded-full border border-cyan-500/10 animate-ping"
                  style={{ animationDuration: '1.8s' }}
                />
              </div>
            </>
          )}

          {/* Mic button */}
          <button
            onClick={isRecording ? stopRecording : canStart ? startRecording : undefined}
            disabled={isBusy}
            className={`
              relative z-10 w-24 h-24 rounded-full flex items-center justify-center
              transition-all duration-300 shadow-2xl
              ${isRecording
                ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/40 scale-110'
                : isBusy
                ? 'bg-slate-700 cursor-not-allowed'
                : isError
                ? 'bg-rose-900/60 hover:bg-rose-800/60 border border-rose-500/30'
                : isDone
                ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30 hover:scale-105'
                : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/40 hover:scale-105 active:scale-95'}
            `}
          >
            {isBusy ? (
              <Loader2 size={32} className="text-white animate-spin" />
            ) : isRecording ? (
              <MicOff size={32} className="text-white" />
            ) : isDone ? (
              <CheckCircle2 size={32} className="text-white" />
            ) : isError ? (
              <XCircle size={32} className="text-rose-300" />
            ) : (
              <Mic size={32} className="text-slate-950" />
            )}
          </button>

          {/* Status label */}
          <div className="z-10 text-center space-y-1">
            {isRecording ? (
              <div className="flex items-center gap-2 justify-center">
                <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                <p className="text-rose-400 text-sm font-semibold">Recording…</p>
              </div>
            ) : isBusy ? (
              <p className="text-cyan-400 text-sm font-medium">{STATE_LABEL[recState]}</p>
            ) : isDone ? (
              <div className="flex items-center gap-2 justify-center">
                <CheckCircle2 size={15} className="text-emerald-400" />
                <p className="text-emerald-400 text-sm font-semibold">Done</p>
              </div>
            ) : isError ? (
              <p className="text-rose-400 text-sm font-medium">Error — tap to retry</p>
            ) : (
              <p className="text-slate-400 text-sm">{STATE_LABEL[STATE.IDLE]}</p>
            )}
            {!isRecording && !isBusy && !isDone && !isError && (
              <p className="text-slate-600 text-xs">Microphone required</p>
            )}
          </div>

          {/* Live waveform bars */}
          {isRecording && (
            <div className="flex items-end gap-1 h-8 z-10">
              {Array.from({ length: 16 }).map((_, i) => {
                const height = 4 + audioLevel * 28 * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.8)))
                return (
                  <div
                    key={i}
                    className="w-1.5 rounded-full bg-cyan-500/70 transition-all duration-75"
                    style={{ height: `${height}px` }}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* ── Transcript box ── */}
        <div className="border-t border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mic size={14} className="text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Live Transcript
            </p>
            {transcript && (
              <span className="ml-auto text-[10px] text-slate-600">
                {transcript.split(' ').length} words
              </span>
            )}
          </div>
          <div
            className={`
              min-h-[80px] rounded-xl p-4 text-sm leading-relaxed transition-all
              ${transcript
                ? 'bg-slate-800/60 border border-slate-700 text-slate-200'
                : 'bg-slate-800/20 border border-slate-800 text-slate-600'}
            `}
          >
            {recState === STATE.TRANSCRIBING ? (
              <span className="flex items-center gap-2 text-cyan-400">
                <Loader2 size={14} className="animate-spin" />
                Transcribing…
              </span>
            ) : transcript ? (
              <span>"{transcript}"</span>
            ) : (
              <span className="italic">Transcript will appear here after recording…</span>
            )}
          </div>
        </div>

        {/* ── NLP result ── */}
        {nlpResult && (
          <div className="border-t border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-violet-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Detected Intent
              </p>
              <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold
                bg-violet-500/10 text-violet-400 border border-violet-500/20">
                {nlpResult.intent}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Customer</p>
                <p className="text-sm font-semibold text-slate-200">
                  {nlpResult.customerName || <span className="text-slate-500 italic">Not detected</span>}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">
                  Confidence
                </p>
                <p className="text-sm font-semibold text-slate-200">
                  {nlpResult.confidence
                    ? `${(nlpResult.confidence * 100).toFixed(0)}%`
                    : '—'}
                </p>
              </div>
            </div>
            {nlpResult.items?.length > 0 && (
              <div className="mt-3 space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Items Detected</p>
                {nlpResult.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg
                      bg-slate-800/40 border border-slate-700/50 px-3 py-2"
                  >
                    <span className="text-sm text-slate-300 capitalize">{item.name}</span>
                    <span className="text-xs font-bold text-cyan-400">
                      × {item.quantity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Error box ── */}
        {isError && errorMsg && (
          <div className="border-t border-rose-500/20 p-5">
            <div className="flex gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <p className="text-sm text-rose-300">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* ── Generated Invoice ── */}
        {invoice && (
          <div className="border-t border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-emerald-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Generated Invoice
              </p>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-emerald-500/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-cyan-400 font-semibold">
                  {invoice.invoiceNumber}
                </span>
                <span className="px-2.5 py-1 rounded-md text-xs font-semibold
                  bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {invoice.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Customer</p>
                  <p className="text-slate-200 font-medium">{invoice.customer?.name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Total</p>
                  <p className="text-emerald-400 font-bold text-base">
                    ₹{Number(invoice.finalAmount).toLocaleString('en-IN', {
                      minimumFractionDigits: 2, maximumFractionDigits: 2,
                    })}
                  </p>
                </div>
              </div>
              {invoice.items?.length > 0 && (
                <div className="border-t border-slate-700 pt-3 space-y-1.5">
                  {invoice.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{item.description}</span>
                      <span className="text-slate-300 font-medium">
                        {item.quantity} × ₹{Number(item.price).toLocaleString('en-IN')}
                        {item.gstPercentage > 0 &&
                          <span className="text-slate-500 ml-1">
                            (+{item.gstPercentage}% GST)
                          </span>
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Action bar ── */}
        {(isDone || isError) && (
          <div className="border-t border-slate-800 px-5 py-4 flex gap-3">
            <Button variant="ghost" size="md" onClick={handleReset}>
              Record Again
            </Button>
            {isDone && invoice && (
              <Button
                variant="outline"
                size="md"
                icon={FileText}
                onClick={() => window.location.href = '/invoices'}
              >
                View All Invoices
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Tips card ── */}
      <div className="flex gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1.5">
          <p className="text-slate-200 font-semibold text-sm">Voice Tips</p>
          <p className="text-slate-500">
            Say the <span className="text-slate-300">customer name</span>, the{' '}
            <span className="text-slate-300">product names</span> and{' '}
            <span className="text-slate-300">quantities</span> clearly.
          </p>
          <p className="text-slate-600 italic">
            Example: "Create invoice for Arun, 2 laptops and 3 mobile phones"
          </p>
        </div>
      </div>
    </div>
  )
}