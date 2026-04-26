import { useRef, useState, useCallback, useEffect } from 'react'
import {
  Mic, MicOff, Loader2, FileText, AlertCircle,
  CheckCircle2, XCircle, Edit3, Check, RefreshCw
} from 'lucide-react'
import Button from '../components/ui/Button'
import { aiClient, backendClient } from '../api/axios'
import { useAuthStore } from '../store/useAuthStore'
import toast from 'react-hot-toast'

const S = {
  IDLE:'idle', REQUESTING:'requesting', RECORDING:'recording',
  STOPPING:'stopping', TRANSCRIBING:'transcribing', NLP:'nlp',
  GENERATING:'generating', DONE:'done', ERROR:'error',
}

function getSupportedMime() {
  const types = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/ogg','audio/mp4']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || ''
}

export default function VoiceBilling() {
  const [state,       setState]       = useState(S.IDLE)
  const [transcript,  setTranscript]  = useState('')
  const [editingTx,   setEditingTx]   = useState(false)   // editing transcript?
  const [editedTx,    setEditedTx]    = useState('')       // textarea value
  const [nlpResult,   setNlpResult]   = useState(null)
  const [invoice,     setInvoice]     = useState(null)
  const [errorMsg,    setErrorMsg]    = useState('')
  const [level,       setLevel]       = useState(0)

  const recRef    = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)
  const animRef   = useRef(null)
  const mimeRef   = useRef('')
  const txAreaRef = useRef(null)

  const token = useAuthStore(s => s.token)

  useEffect(() => () => { stopStream(); cancelAnimationFrame(animRef.current) }, [])

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editingTx && txAreaRef.current) {
      txAreaRef.current.focus()
      const len = txAreaRef.current.value.length
      txAreaRef.current.setSelectionRange(len, len)
    }
  }, [editingTx])

  // ── Waveform ────────────────────────────────────────────────────────
  function startWaveform(stream) {
    const ctx = new AudioContext()
    const src = ctx.createMediaStreamSource(stream)
    const an  = ctx.createAnalyser(); an.fftSize = 256
    src.connect(an)
    const data = new Uint8Array(an.frequencyBinCount)
    const tick = () => {
      an.getByteFrequencyData(data)
      setLevel(data.reduce((a,b) => a+b, 0) / data.length / 255)
      animRef.current = requestAnimationFrame(tick)
    }; tick()
  }
  function stopWaveform() { cancelAnimationFrame(animRef.current); setLevel(0) }
  function stopStream()   { streamRef.current?.getTracks().forEach(t => t.stop()); streamRef.current = null }

  // ── Recording ────────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    if (!token) { toast.error('Please log in first.'); return }
    setErrorMsg(''); setTranscript(''); setNlpResult(null); setInvoice(null)
    setEditingTx(false); setEditedTx('')
    setState(S.REQUESTING)

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount:1, sampleRate:16000, echoCancellation:true, noiseSuppression:true },
      })
    } catch (err) {
      setErrorMsg(err.name === 'NotAllowedError'
        ? 'Microphone access denied. Allow in browser settings and retry.'
        : `Microphone error: ${err.message}`)
      setState(S.ERROR); return
    }

    streamRef.current = stream; chunksRef.current = []
    mimeRef.current   = getSupportedMime()
    const recorder    = new MediaRecorder(stream, mimeRef.current ? { mimeType: mimeRef.current } : {})
    recRef.current    = recorder

    recorder.ondataavailable = e => { if (e.data?.size > 0) chunksRef.current.push(e.data) }
    recorder.onstop = async () => {
      stopWaveform(); stopStream()
      const mime = mimeRef.current || 'audio/webm'
      const blob = new Blob(chunksRef.current, { type: mime })
      if (blob.size < 500) { setErrorMsg('Recording too short. Speak for at least 1 second.'); setState(S.ERROR); return }
      await runPipelineSTT(blob, mime)
    }
    recorder.onerror = e => { stopWaveform(); stopStream(); setErrorMsg(`Recording error: ${e.error?.message}`); setState(S.ERROR) }
    recorder.start(250); setState(S.RECORDING); startWaveform(stream)
  }, [token])

  const stopRecording = useCallback(() => {
    if (recRef.current?.state !== 'inactive') { setState(S.STOPPING); recRef.current.stop() }
  }, [])

  // ── Pipeline ─────────────────────────────────────────────────────────

  // Step 1: STT only
  async function runPipelineSTT(blob, mime) {
    setState(S.TRANSCRIBING)
    try {
      const form = new FormData()
      form.append('audio', blob, `recording.${mime.split('/')[1]?.split(';')[0] || 'webm'}`)
      form.append('mimeType', mime)
      const res  = await aiClient.post('/voice/transcribe-form', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      const text = res.data?.transcript?.trim()
      if (!text) throw new Error('Transcription returned empty. Please speak clearly.')
      setTranscript(text)
      setEditedTx(text)
      console.log('[VoiceBilling] TRANSCRIPT:', text)
      // Run NLP automatically on the fresh transcript
      await runNLP(text)
    } catch (err) {
      setErrorMsg(err.message); setState(S.ERROR)
    }
  }

  // Step 2: NLP
  async function runNLP(text) {
    setState(S.NLP)
    try {
      const res = await aiClient.post('/nlp/intent', { transcript: text })
      if (!res.data?.intent) throw new Error('NLP returned invalid response.')
      setNlpResult(res.data)
      console.log('[VoiceBilling] NLP RESULT:', res.data)
      setState(S.DONE)
    } catch (err) {
      setErrorMsg(err.message); setState(S.ERROR)
    }
  }

  // Step 3: Generate invoice
  async function handleGenerateInvoice() {
    const finalText = editingTx ? editedTx.trim() : transcript
    if (!finalText) return
    setState(S.GENERATING)
    try {
      const res = await backendClient.post('/ai/process-voice/generate-invoice', {
        transcript: finalText,
      })
      const inv = res.data?.data
      if (!inv?.invoiceNumber) throw new Error('No invoice returned from backend.')
      setInvoice(inv)
      setEditingTx(false)
      console.log('[VoiceBilling] INVOICE GENERATED:', inv)
      toast.success(`Invoice ${inv.invoiceNumber} created for ${inv.customer?.name}`)
      setState(S.DONE)
    } catch (err) {
      setErrorMsg(err.message); setState(S.ERROR)
    }
  }

  // Re-run NLP after user edits transcript
  async function handleRerunNLP() {
    const text = editedTx.trim()
    if (!text) return
    setTranscript(text)
    setNlpResult(null)
    setInvoice(null)
    setErrorMsg('')
    setEditingTx(false)
    await runNLP(text)
  }

  const handleReset = () => {
    setState(S.IDLE); setTranscript(''); setEditedTx(''); setNlpResult(null)
    setInvoice(null); setErrorMsg(''); setEditingTx(false)
    stopWaveform(); stopStream()
  }

  const isBusy     = [S.REQUESTING, S.STOPPING, S.TRANSCRIBING, S.NLP, S.GENERATING].includes(state)
  const isRecording = state === S.RECORDING
  const isDone      = state === S.DONE
  const isError     = state === S.ERROR
  const canStart    = state === S.IDLE || isError
  const showActions = isDone && !isBusy
  const showGenBtn  = showActions && nlpResult && !invoice

  const statusText = isRecording ? null
    : state === S.TRANSCRIBING ? 'Transcribing audio…'
    : state === S.NLP          ? 'Analysing intent…'
    : state === S.GENERATING   ? 'Generating invoice…'
    : state === S.REQUESTING   ? 'Requesting microphone…'
    : isDone && !invoice       ? 'Ready — review and generate invoice'
    : isDone && invoice        ? 'Invoice created!'
    : isError                  ? 'Error — tap mic to retry'
    : 'Tap the microphone to begin'

  return (
    <div className="space-y-6 font-dm max-w-3xl">
      <div>
        <h1 className="font-syne text-2xl font-bold text-white">Voice Billing</h1>
        <p className="text-sm text-slate-500 mt-0.5">Speak naturally — or type your instruction directly.</p>
      </div>

      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden">

        {/* ── Mic area ── */}
        <div className="relative flex flex-col items-center py-10 px-6 gap-5">
          {isRecording && (
            <>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-40 h-40 rounded-full border-2 border-cyan-500/30 animate-ping" style={{ animationDuration:'1.2s' }} />
              </div>
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-56 h-56 rounded-full border border-cyan-500/10 animate-ping" style={{ animationDuration:'1.8s' }} />
              </div>
            </>
          )}

          <button
            onClick={isRecording ? stopRecording : canStart ? startRecording : undefined}
            disabled={isBusy}
            className={`relative z-10 w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl
              ${isRecording ? 'bg-rose-500 hover:bg-rose-400 shadow-rose-500/40 scale-110'
                : isBusy    ? 'bg-slate-700 cursor-not-allowed'
                : isDone && invoice ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/30 hover:scale-105'
                : isDone    ? 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/30 hover:scale-105'
                : isError   ? 'bg-rose-900/60 hover:bg-rose-800 border border-rose-500/30'
                : 'bg-cyan-500 hover:bg-cyan-400 shadow-cyan-500/40 hover:scale-105 active:scale-95'}`}
          >
            {isBusy    ? <Loader2 size={28} className="text-white animate-spin" />
              : isRecording ? <MicOff size={28} className="text-white" />
              : isDone && invoice ? <CheckCircle2 size={28} className="text-white" />
              : isError   ? <XCircle size={28} className="text-rose-300" />
              : <Mic size={28} className="text-slate-950" />}
          </button>

          <div className="z-10 text-center">
            {isRecording
              ? <div className="flex items-center gap-2 justify-center">
                  <span className="w-2 h-2 rounded-full bg-rose-400 animate-pulse" />
                  <p className="text-rose-400 text-sm font-semibold">Recording — tap to stop</p>
                </div>
              : <p className={`text-sm font-medium ${isDone && invoice ? 'text-emerald-400' : isBusy ? 'text-cyan-400' : isError ? 'text-rose-400' : isDone ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {statusText}
                </p>}
          </div>

          {isRecording && (
            <div className="flex items-end gap-1 h-7 z-10">
              {Array.from({ length: 16 }).map((_, i) => (
                <div key={i} className="w-1.5 rounded-full bg-cyan-500/70 transition-all duration-75"
                  style={{ height: `${4 + level * 24 * (0.4 + 0.6 * Math.abs(Math.sin(i * 0.8)))}px` }} />
              ))}
            </div>
          )}
        </div>

        {/* ── Transcript (editable) ── */}
        <div className="border-t border-slate-800 p-5">
          <div className="flex items-center gap-2 mb-3">
            <Mic size={14} className="text-slate-500" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Live Transcript</p>
            {transcript && !isBusy && (
              <span className="ml-auto text-[10px] text-slate-600">
                {(editingTx ? editedTx : transcript).split(' ').filter(Boolean).length} words
              </span>
            )}
            {/* Edit / Confirm buttons */}
            {transcript && !isBusy && (
              editingTx ? (
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={handleRerunNLP}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold
                      bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 transition">
                    <RefreshCw size={10} /> Re-analyse
                  </button>
                  <button onClick={() => { setEditingTx(false); setEditedTx(transcript) }}
                    className="px-2 py-1 rounded-md text-[10px] font-semibold
                      bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 transition">
                    Cancel
                  </button>
                </div>
              ) : (
                <button onClick={() => { setEditingTx(true); setEditedTx(transcript) }}
                  className="flex items-center gap-1 ml-2 px-2 py-1 rounded-md text-[10px] font-semibold
                    bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700 hover:text-slate-200 transition">
                  <Edit3 size={10} /> Edit
                </button>
              )
            )}
          </div>

          {/* Editable textarea OR read-only display */}
          {editingTx ? (
            <div className="space-y-2">
              <textarea
                ref={txAreaRef}
                value={editedTx}
                onChange={e => setEditedTx(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleRerunNLP() }}
                rows={3}
                placeholder="Edit your transcript here, then click Re-analyse…"
                className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-cyan-500/40
                  text-sm text-slate-200 placeholder-slate-600 resize-none
                  focus:outline-none focus:ring-2 focus:ring-cyan-500/40 transition leading-relaxed"
              />
              <p className="text-[10px] text-slate-600">Tip: Ctrl+Enter to re-analyse</p>
            </div>
          ) : (
            <div className={`min-h-[72px] rounded-xl p-4 text-sm leading-relaxed transition-all
              ${transcript ? 'bg-slate-800/60 border border-slate-700 text-slate-200' : 'bg-slate-800/20 border border-slate-800 text-slate-600'}`}>
              {state === S.TRANSCRIBING
                ? <span className="flex items-center gap-2 text-cyan-400"><Loader2 size={14} className="animate-spin" />Transcribing…</span>
                : transcript ? <span>"{transcript}"</span>
                : <span className="italic">Transcript appears here after recording. You can also type directly.</span>}
            </div>
          )}

          {/* Manual type-in when no transcript yet */}
          {!transcript && state === S.IDLE && (
            <div className="mt-3">
              <p className="text-[10px] text-slate-600 mb-2">Or type your instruction manually:</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Create invoice for Padma 1 laptop and 2 iPads"
                  value={editedTx}
                  onChange={e => setEditedTx(e.target.value)}
                  onKeyDown={async e => {
                    if (e.key === 'Enter' && editedTx.trim()) {
                      setTranscript(editedTx.trim())
                      await runNLP(editedTx.trim())
                    }
                  }}
                  className="flex-1 px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-sm
                    text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2
                    focus:ring-cyan-500/40 focus:border-cyan-500/40 transition"
                />
                <Button
                  variant="secondary" size="md"
                  disabled={!editedTx.trim()}
                  onClick={async () => {
                    if (!editedTx.trim()) return
                    setTranscript(editedTx.trim())
                    await runNLP(editedTx.trim())
                  }}
                >
                  Analyse
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── NLP result ── */}
        {nlpResult && (
          <div className="border-t border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle size={14} className="text-violet-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detected Intent</p>
              <span className="ml-auto px-2 py-0.5 rounded-md text-[10px] font-bold
                bg-violet-500/10 text-violet-400 border border-violet-500/20">
                {nlpResult.intent}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Customer</p>
                <p className="text-sm font-semibold text-slate-200">
                  {nlpResult.customerName
                    ?? <span className="text-rose-400 italic text-xs">Not detected</span>}
                </p>
              </div>
              <div className="rounded-lg bg-slate-800/40 border border-slate-700/50 p-3">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-1">Confidence</p>
                <p className="text-sm font-semibold text-slate-200">
                  {nlpResult.confidence ? `${(nlpResult.confidence * 100).toFixed(0)}%` : '—'}
                </p>
              </div>
            </div>
            {nlpResult.items?.length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wide">Items Detected</p>
                {nlpResult.items.map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg
                    bg-slate-800/40 border border-slate-700/50 px-3 py-2">
                    <span className="text-sm text-slate-300 capitalize">{item.name}</span>
                    <span className="text-xs font-bold text-cyan-400">× {item.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Error ── */}
        {isError && errorMsg && (
          <div className="border-t border-rose-500/20 p-5">
            <div className="flex gap-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
              <XCircle size={16} className="text-rose-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-rose-300">{errorMsg}</p>
                {errorMsg.includes('No active products') && (
                  <p className="text-xs text-slate-500 mt-1">
                    Seed products in MySQL first — see the SQL script in the README.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Generated invoice ── */}
        {invoice && (
          <div className="border-t border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-emerald-400" />
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Generated Invoice</p>
            </div>
            <div className="rounded-xl bg-slate-800/60 border border-emerald-500/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm text-cyan-400 font-semibold">{invoice.invoiceNumber}</span>
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
                  <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Total (incl. GST)</p>
                  <p className="text-emerald-400 font-bold text-base">
                    ₹{Number(invoice.finalAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits:2 })}
                  </p>
                </div>
              </div>
              {invoice.items?.length > 0 && (
                <div className="border-t border-slate-700 pt-3 space-y-1.5">
                  {invoice.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">{item.description}</span>
                      <span className="text-slate-300 font-medium">
                        {item.quantity} × ₹{Number(item.price ?? 0).toLocaleString('en-IN')}
                        {item.gstPercentage > 0 &&
                          <span className="text-slate-500 ml-1">(+{item.gstPercentage}% GST)</span>}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Action bar ── */}
        <div className="border-t border-slate-800 px-5 py-4 flex items-center gap-3 flex-wrap min-h-[64px]">
          {state === S.GENERATING && (
            <div className="flex items-center gap-2 text-cyan-400 text-sm">
              <Loader2 size={14} className="animate-spin" /> Generating invoice…
            </div>
          )}
          {showGenBtn && (
            <Button variant="primary" size="md" icon={FileText} onClick={handleGenerateInvoice}>
              Generate Invoice
            </Button>
          )}
          {(isDone || isError) && (
            <Button variant="ghost" size="md" onClick={handleReset}>
              {invoice ? 'Record Another' : 'Record Again'}
            </Button>
          )}
          {isDone && invoice && (
            <Button variant="outline" size="md" icon={FileText}
              onClick={() => window.location.href = '/invoices'}>
              View Invoices
            </Button>
          )}
        </div>
      </div>

      {/* ── Tips ── */}
      <div className="flex gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
        <AlertCircle size={16} className="text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1.5">
          <p className="text-slate-200 font-semibold text-sm">Voice Tips</p>
          <p className="text-slate-500">Say customer name, then product and quantity. Or type directly in the box.</p>
          <div className="space-y-0.5">
            {[
              '"Create invoice for Padma one laptop and 3 iPads"',
              '"Generate bill for Ramesh 2 chairs and 1 desk"',
              '"Invoice for Kumar 5 mobile phones"',
            ].map(ex => <p key={ex} className="text-slate-600 italic">{ex}</p>)}
          </div>
        </div>
      </div>
    </div>
  )
}