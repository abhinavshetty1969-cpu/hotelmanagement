# Here are your Instructions

## Run Backend (FastAPI + Uvicorn)

From `backend/` folder:

```bash
cd c:\Users\Kaustubh\Desktop\cater-pro2\hotelmanagement\backend
python -m uvicorn server:app --reload --host 0.0.0.0 --port 8000 --log-level debug
```

- `--reload`: auto restart on code changes (DEV only)
- `--host 0.0.0.0`: bind all interfaces
- `--port 8000`: change if needed
- `--log-level debug`: more verbose logs for troubleshooting

