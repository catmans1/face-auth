#!/bin/bash

# Simple HTTP server for testing the face comparison demo
# This script starts a local server to serve the demo application

echo "🚀 Starting Face Comparison Demo Server..."
echo ""
echo "The demo will be available at:"
echo "  http://localhost:8000/examples/face-comparison/"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

# Check if Python 3 is available
if command -v python3 &> /dev/null; then
    python3 -m http.server 8000
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer 8000
else
    echo "Error: Python is not installed"
    echo "Please install Python or use another HTTP server"
    exit 1
fi
