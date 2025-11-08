<script>
  // @ts-nocheck
  // Minimal Svelte page: start/stop recording, upload WAV to proxy, fixed model/endpoint
  const API_BASE = `${location.protocol}//${location.hostname}:8001`; // proxy required
  const MODEL_ID = 'Systran/faster-distil-whisper-small.en';
  const ENDPOINT_PATH = '/v1/audio/transcriptions';

  let recording = false;
  let seconds = 0;
  let timerId = null;
  let busy = false;

  let transcript = "";
  let txtUrl = "";
  let errorMsg = "";

  // Internals for recording
  let ctx = null;
  let stream = null;
  let source = null;
  let processor = null;
  let chunks = [];
  let currentSampleRate = 44100;

  function mergeFloat32(arrays) {
    let length = 0;
    arrays.forEach(a => length += a.length);
    const result = new Float32Array(length);
    let offset = 0;
    arrays.forEach(a => { result.set(a, offset); offset += a.length; });
    return result;
  }

  function downsampleTo16k(float32, inRate) {
    const outRate = 16000;
    if (inRate === outRate) return float32;
    const ratio = inRate / outRate;
    const newLen = Math.floor(float32.length / ratio);
    const out = new Float32Array(newLen);
    for (let i = 0; i < newLen; i++) {
      const idx = i * ratio;
      const idx1 = Math.floor(idx);
      const idx2 = Math.min(idx1 + 1, float32.length - 1);
      const frac = idx - idx1;
      out[i] = float32[idx1] * (1 - frac) + float32[idx2] * frac;
    }
    return out;
  }

  function floatTo16BitPCM(float32) {
    const buf = new ArrayBuffer(float32.length * 2);
    const view = new DataView(buf);
    let offset = 0;
    for (let i = 0; i < float32.length; i++, offset += 2) {
      let s = Math.max(-1, Math.min(1, float32[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return new Uint8Array(buf);
  }

  function encodeWavPCM16(mono16, sampleRate) {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = mono16.length;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    function writeString(off, str) { for (let i=0; i<str.length; i++) view.setUint8(off+i, str.charCodeAt(i)); }
    let offset = 0;
    writeString(offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataSize, true); offset += 4;
    writeString(offset, 'WAVE'); offset += 4;
    writeString(offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4; // PCM chunk size
    view.setUint16(offset, 1, true); offset += 2; // PCM format
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, byteRate, true); offset += 4;
    view.setUint16(offset, blockAlign, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2; // bits per sample
    writeString(offset, 'data'); offset += 4;
    view.setUint32(offset, dataSize, true); offset += 4;
    new Uint8Array(buffer, 44).set(mono16);
    return new Blob([buffer], { type: 'audio/wav' });
  }

  async function startRecording() {
    errorMsg = "";
    transcript = "";
    if (txtUrl) { URL.revokeObjectURL(txtUrl); txtUrl = ""; }
    seconds = 0;
    chunks = [];
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      ctx = new AudioCtx();
      currentSampleRate = ctx.sampleRate || 44100;
      source = ctx.createMediaStreamSource(stream);
      processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        chunks.push(new Float32Array(input));
      };
      source.connect(processor);
      processor.connect(ctx.destination);
      recording = true;
      timerId = setInterval(() => seconds += 1, 1000);
    } catch (e) {
      stopRecordingInternals();
      errorMsg = e?.message || String(e);
    }
  }

  function stopRecordingInternals() {
    if (timerId) { clearInterval(timerId); timerId = null; }
    if (processor) { try { processor.disconnect(); } catch(_){} processor = null; }
    if (source) { try { source.disconnect(); } catch(_){} source = null; }
    if (ctx) { try { ctx.close(); } catch(_){} ctx = null; }
    if (stream) { try { stream.getTracks().forEach(t=>t.stop()); } catch(_){} stream = null; }
    recording = false;
  }

  async function stopAndTranscribe() {
    if (!recording) return;
    stopRecordingInternals();
    busy = true;
    errorMsg = "";
    try {
      const sampleRate = currentSampleRate || 44100;
      const merged = mergeFloat32(chunks);
      const resampled = downsampleTo16k(merged, sampleRate);
      const pcm16 = floatTo16BitPCM(resampled);
      const blob = encodeWavPCM16(pcm16, 16000);

      const form = new FormData();
      form.append('file', blob, 'speech.wav');
      form.append('model', MODEL_ID);
      const url = `${API_BASE}${ENDPOINT_PATH}`;
      const resp = await fetch(url, { method: 'POST', body: form });
      if (!resp.ok) {
        const text = await resp.text().catch(() => "");
        throw new Error(text || resp.statusText || `HTTP ${resp.status}`);
      }
      const ctype = resp.headers.get('content-type') || '';
      if (ctype.includes('application/json')) {
        const json = await resp.json();
        transcript = json.text || json.transcript || json?.data?.text || JSON.stringify(json);
      } else {
        transcript = await resp.text();
      }
      const txtBlob = new Blob([transcript], { type: 'text/plain' });
      if (txtUrl) URL.revokeObjectURL(txtUrl);
      txtUrl = URL.createObjectURL(txtBlob);
    } catch (e) {
      errorMsg = e?.message || String(e);
    } finally {
      busy = false;
    }
  }

  function resetAll() {
    stopRecordingInternals();
    errorMsg = "";
    transcript = "";
    if (txtUrl) { URL.revokeObjectURL(txtUrl); txtUrl = ""; }
    seconds = 0;
  }
</script>

<style>
  .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
</style>

<div class="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-800">
  <div class="max-w-2xl mx-auto px-4 py-8">
    <div class="mb-6">
      <h1 class="text-2xl font-semibold tracking-tight">Transcription Page (Svelte)</h1>
      <p class="text-slate-500">Start recording, then stop to transcribe via the local proxy.</p>
    </div>

    <div class="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl p-4 md:p-6 space-y-4">
      <div class="flex items-center gap-3">
        {#if !recording}
          <button class="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-sm disabled:opacity-50" on:click={startRecording} disabled={busy}>
            <span class="w-2 h-2 rounded-full bg-green-300 animate-pulse"></span>
            Start Recording
          </button>
        {:else}
          <button class="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg shadow-sm" on:click={stopAndTranscribe}>
            <span class="w-2 h-2 rounded-full bg-rose-300 animate-ping"></span>
            Stop & Transcribe
          </button>
        {/if}
        <div class="text-slate-500 text-sm">{recording ? `Recording… ${seconds}s` : (seconds ? `Recorded ${seconds}s` : `Idle`)}</div>
        {#if busy}
          <div class="text-slate-500 text-sm">Transcribing…</div>
        {/if}
        <button class="ml-auto text-sm text-slate-500 hover:text-slate-700" on:click={resetAll} title="Reset">Reset</button>
      </div>

      {#if errorMsg}
        <div class="text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3 text-sm whitespace-pre-wrap">{errorMsg}</div>
      {/if}

      {#if transcript}
        <div class="space-y-2">
          <div class="text-sm font-medium text-slate-700">Transcript</div>
          <pre class="mono bg-slate-50 border border-slate-200 rounded-lg p-3 whitespace-pre-wrap">{transcript}</pre>
          {#if txtUrl}
            <div class="flex gap-3">
              <a class="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 text-sm" href={txtUrl} download="transcript.txt">Download transcript.txt</a>
              <button class="text-sm text-slate-600 hover:text-slate-800" on:click={() => navigator.clipboard?.writeText(transcript)}>Copy</button>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <p class="text-xs text-slate-400 mt-4">Proxy: {API_BASE} (required). Endpoint: {ENDPOINT_PATH}. Model: {MODEL_ID}.</p>
  </div>
</div>

