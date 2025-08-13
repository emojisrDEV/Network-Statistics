#!/usr/bin/env python3
"""
Quick start script for NetMonitor Pro Python Flask application
Run this to start the network monitoring dashboard
"""

import subprocess
import sys
import os

def main():
    print("🚀 Starting NetMonitor Pro (Python Flask Version)")
    print("=" * 50)
    
    # Change to the project directory
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)
    
    try:
        # Start the Flask application
        print("Starting Flask server on http://0.0.0.0:3000")
        print("Dashboard will be available at: http://localhost:3000")
        print("Raspberry Pi setup: http://localhost:3000/raspberry-pi")
        print("\nPress Ctrl+C to stop the server")
        print("-" * 50)
        
        subprocess.run([sys.executable, "app.py"], check=True)
        
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped successfully")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error starting server: {e}")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main())