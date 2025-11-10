# Notes:
Ideas for Inputs:
- Radio transcript in text of the incident (we assume it's already transcribed).
- Radio input directly from the user (firefighter).
    - initially this input will be in text.
- Initial input will be in __text__ -> to be scaled to voice later. 


To build the docker image we used for this project run this:
```docker run \
  --rm \
  --detach \
  --publish 8000:8000 \
  --name speaches \
  --volume hf-hub-cache:/home/ubuntu/.cache/huggingface/hub \
  ghcr.io/speaches-ai/speaches:latest-cpu```

Once running, the API will be available at http://localhost:8000.

For more details on configuration and advanced usage, see the official Speaches-AI installation guide:
https://speaches.ai/installation/￼

## Transcription Frontend + Proxy

This repo includes a React-based transcription page and a small Node proxy that handles CORS and saving transcripts.

Run the proxy (root directory):
- `npm run proxy`
- Env overrides if needed:
  - `TARGET=http://localhost:8000 PROXY_PORT=8001 ALLOW_ORIGIN=http://localhost:5173 npm run proxy`

Run the frontend (Vite, inside `frontend/`):
- `cd frontend && npm install`
- `npm run dev`
- Open: `http://localhost:5173/transcription`
- If your proxy is not on 8001, pass query params to override:
  - `http://localhost:5173/transcription?proxyPort=8010` (and optionally `&proxyHost=<host>`)

Persistence
- After each successful transcription, the proxy writes two files under `data/transcripts/`:
  - `transcript-YYYY-MM-DDTHH-mm-SS-sssZ.txt` (timestamped)
  - `transcript.txt` (always the latest)

