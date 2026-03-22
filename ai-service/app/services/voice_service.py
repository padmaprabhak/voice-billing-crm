"""
VoiceService — multi-provider STT.

Provider chain (tries in order):
  1. Deepgram   — requires DEEPGRAM_API_KEY env var
  2. Google SR  — free, no key, requires: pip install SpeechRecognition
  3. Whisper    — offline,       requires: pip install openai-whisper

Audio: browser sends audio/webm — we write to a temp file and try
to convert to WAV using pydub+ffmpeg, then raw ffmpeg, then pass
the original file directly if both fail.

NEVER returns a stub transcript.
"""
from __future__ import annotations

import base64
import logging
import os
import subprocess
import tempfile
import traceback
from io import BytesIO

logger = logging.getLogger(__name__)


class VoiceService:

    def __init__(self) -> None:
        self._deepgram_key = os.getenv("DEEPGRAM_API_KEY", "").strip()

    # ── Public ──────────────────────────────────────────────────────────

    def transcribe_file(self, file_path: str, mime_type: str = "audio/webm") -> dict:
        """
        Convert audio → WAV (best effort) then run through provider chain.
        Raises RuntimeError if every provider fails.
        """
        wav_path = None
        errors   = []

        try:
            wav_path = self._to_wav(file_path, mime_type)
            logger.info("[VoiceService] Using audio file: %s (wav=%s)", file_path, wav_path)

            for name, fn in self._chain():
                try:
                    logger.info("[VoiceService] Trying provider: %s", name)
                    result = fn(wav_path)
                    transcript = result.get("transcript", "").strip()
                    if not transcript:
                        raise RuntimeError("Provider returned empty transcript")
                    print(f"[VoiceService] TRANSCRIBED via {name}: {transcript!r}")
                    logger.info("[VoiceService] SUCCESS — provider=%s transcript=%r", name, transcript)
                    return result
                except Exception as exc:
                    msg = f"{name}: {exc}"
                    errors.append(msg)
                    logger.warning("[VoiceService] Provider failed — %s", msg)

            detail = "\n".join(errors)
            raise RuntimeError(
                f"All STT providers failed:\n{detail}\n\n"
                "QUICK FIX — run in your venv:\n"
                "  pip install SpeechRecognition pydub\n"
                "  and install ffmpeg:\n"
                "    Windows: winget install ffmpeg\n"
                "    Linux:   sudo apt install ffmpeg\n"
                "    macOS:   brew install ffmpeg"
            )
        finally:
            if wav_path and wav_path != file_path and os.path.exists(wav_path):
                try:
                    os.unlink(wav_path)
                except OSError:
                    pass

    def synthesize(self, text: str) -> dict:
        if not text or not text.strip():
            raise ValueError("Text cannot be empty")
        try:
            from gtts import gTTS
        except ImportError:
            raise RuntimeError("pip install gTTS")
        buf = BytesIO()
        gTTS(text=text.strip(), lang="en", slow=False).write_to_fp(buf)
        return {
            "audio":    base64.b64encode(buf.getvalue()).decode(),
            "mimeType": "audio/mp3",
            "text":     text,
        }

    # ── Provider chain ───────────────────────────────────────────────────

    def _chain(self) -> list:
        chain = []
        if self._deepgram_key:
            chain.append(("Deepgram",            self._deepgram))
        chain.append(("Google-SpeechRecognition", self._google_sr))
        chain.append(("Whisper-local",            self._whisper))
        return chain

    # ── Provider: Deepgram ───────────────────────────────────────────────

    def _deepgram(self, wav_path: str) -> dict:
        try:
            from deepgram import DeepgramClient, PrerecordedOptions
        except ImportError:
            raise RuntimeError("pip install deepgram-sdk")

        client = DeepgramClient(self._deepgram_key)
        opts   = PrerecordedOptions(model="nova-2", language="en-US",
                                    smart_format=True, punctuate=True)
        with open(wav_path, "rb") as f:
            audio = f.read()

        resp = client.listen.prerecorded.v("1").transcribe_file(
            {"buffer": audio, "mimetype": "audio/wav"}, opts
        )
        alt = resp["results"]["channels"][0]["alternatives"][0]
        return {
            "transcript": alt.get("transcript", "").strip(),
            "confidence": round(float(alt.get("confidence", 0)), 4),
            "duration":   round(float(resp["metadata"].get("duration", 0)), 2),
            "language":   "en-US",
            "provider":   "deepgram",
        }

    # ── Provider: Google SR (free, no key) ───────────────────────────────

    def _google_sr(self, wav_path: str) -> dict:
        try:
            import speech_recognition as sr
        except ImportError:
            raise RuntimeError("pip install SpeechRecognition")

        r = sr.Recognizer()
        r.energy_threshold         = 200
        r.dynamic_energy_threshold = True

        with sr.AudioFile(wav_path) as src:
            r.adjust_for_ambient_noise(src, duration=0.2)
            audio = r.record(src)

        try:
            text = r.recognize_google(audio, language="en-US")
        except sr.UnknownValueError:
            raise RuntimeError(
                "Speech not recognised — please speak clearly and try again."
            )
        except sr.RequestError as e:
            raise RuntimeError(f"Google STT request error: {e}")

        return {
            "transcript": text.strip(),
            "confidence": 0.85,
            "duration":   0.0,
            "language":   "en-US",
            "provider":   "google-sr",
        }

    # ── Provider: Whisper ────────────────────────────────────────────────

    def _whisper(self, wav_path: str) -> dict:
        try:
            import whisper  # type: ignore
        except ImportError:
            raise RuntimeError("pip install openai-whisper")

        model = whisper.load_model("base")
        res   = model.transcribe(wav_path, language="en", fp16=False)
        return {
            "transcript": res.get("text", "").strip(),
            "confidence": 0.90,
            "duration":   0.0,
            "language":   "en",
            "provider":   "whisper",
        }

    # ── Audio conversion ─────────────────────────────────────────────────

    def _to_wav(self, src: str, mime_type: str) -> str:
        """
        Convert src audio to 16kHz mono WAV.
        Returns src unchanged if it is already WAV.
        Falls through gracefully if no converter is available.
        """
        base = mime_type.split(";")[0].strip().lower()
        if base in ("audio/wav", "audio/wave", "audio/x-wav"):
            return src

        dst = src + "_converted.wav"

        # Try pydub (needs ffmpeg on PATH)
        try:
            return self._pydub_convert(src, base, dst)
        except Exception as e:
            logger.warning("[VoiceService] pydub failed: %s", e)

        # Try raw ffmpeg
        try:
            return self._ffmpeg_convert(src, dst)
        except Exception as e:
            logger.warning("[VoiceService] ffmpeg failed: %s", e)

        # Pass original — Google SR can sometimes decode webm directly
        logger.warning("[VoiceService] No converter available — using original file")
        return src

    def _pydub_convert(self, src: str, mime_base: str, dst: str) -> str:
        from pydub import AudioSegment

        fmt = {
            "audio/webm": "webm", "audio/ogg": "ogg",
            "audio/mp4":  "mp4",  "audio/mpeg": "mp3",
            "audio/flac": "flac", "audio/x-m4a": "m4a",
        }.get(mime_base, "webm")

        seg = AudioSegment.from_file(src, format=fmt)
        seg = seg.set_channels(1).set_frame_rate(16000)
        seg.export(dst, format="wav")
        logger.info("[VoiceService] pydub: %s → %s", src, dst)
        return dst

    def _ffmpeg_convert(self, src: str, dst: str) -> str:
        r = subprocess.run(
            ["ffmpeg", "-y", "-i", src, "-ac", "1", "-ar", "16000", "-f", "wav", dst],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=30,
        )
        if r.returncode != 0:
            raise RuntimeError(r.stderr.decode(errors="replace")[:300])
        logger.info("[VoiceService] ffmpeg: %s → %s", src, dst)
        return dst