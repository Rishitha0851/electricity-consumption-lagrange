import subprocess
import sys
import time
import os
import signal

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

def run():
    print("=" * 65)
    print(" Electricity Consumption Estimation Using Lagrange Interpolation")
    print("=" * 65)
    print("Starting backend API server (FastAPI on http://127.0.0.1:8000)...")
    
    backend_proc = subprocess.Popen(
        [sys.executable, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"],
        cwd=BACKEND_DIR
    )
    
    time.sleep(1.5)
    
    print("Starting frontend Vite server (http://localhost:5173)...")
    frontend_proc = subprocess.Popen(
        "npm run dev",
        cwd=FRONTEND_DIR,
        shell=True
    )
    
    print("\n✓ Both servers are running!")
    print("→ Web Dashboard: http://localhost:5173")
    print("→ Backend Docs:  http://127.0.0.1:8000/docs")
    print("\nPress Ctrl+C to terminate both servers.")
    
    try:
        backend_proc.wait()
        frontend_proc.wait()
    except KeyboardInterrupt:
        print("\nStopping servers...")
        backend_proc.terminate()
        frontend_proc.terminate()
        sys.exit(0)

if __name__ == "__main__":
    run()
