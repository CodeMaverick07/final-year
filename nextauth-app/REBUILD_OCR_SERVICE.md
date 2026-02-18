# OCR Service Runbook (Standalone)

The project no longer uses a Dockerized `nextauth-app/ocr-service` directory.
OCR now runs from `/Users/hemantjatal/Desktop/final/ocr/app.py` on port `8001`.

## Start OCR service

```bash
cd /Users/hemantjatal/Desktop/final/ocr
pip install -r requirements.txt
export GOOGLE_APPLICATION_CREDENTIALS="/absolute/path/to/service-account.json"
python app.py
```

## Verify endpoints

```bash
curl http://localhost:8001/health
curl -X POST http://localhost:8001/pdf-to-images -F "file=@/absolute/path/to/test.pdf"
```

## Next.js app dependency

Ensure `/Users/hemantjatal/Desktop/final/nextauth-app/.env.local` has:

```env
OCR_SERVICE_URL=http://localhost:8001
```
