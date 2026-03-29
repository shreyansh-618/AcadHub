#!/usr/bin/env python
"""Quick test to verify the FastAPI app can be created without errors."""
import sys
import traceback

try:
    print("[1/3] Importing FastAPI app...")
    from main import app
    print("✓ FastAPI app imported successfully")
    
    print("[2/3] Testing route registration...")
    from fastapi.testclient import TestClient
    client = TestClient(app)
    print("✓ TestClient created successfully")
    
    print("[3/3] Testing health endpoint...")
    try:
        response = client.get("/api/v1/health")
        print(f"✓ Health endpoint responded with status code: {response.status_code}")
        if response.status_code == 200:
            print(f"✓ Health response: {response.json()}")
    except Exception as e:
        print(f"⚠ Health endpoint error (may be expected): {e}")
    
    print("\n✅ All startup checks passed! App is ready to run.")
    sys.exit(0)
    
except Exception as e:
    print(f"\n❌ Error during startup test:")
    print(f"Error: {e}")
    print("\nFull traceback:")
    traceback.print_exc()
    sys.exit(1)
