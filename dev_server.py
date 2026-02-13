#!/usr/bin/env python3
"""
Simple dev server to preview generated HTML pages.
"""
import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        super().end_headers()

if __name__ == "__main__":
    # Change to project root
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    Handler = MyHTTPRequestHandler

    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"\n{'='*60}")
        print(f"🚀 Dev Server Running!")
        print(f"{'='*60}")
        print(f"\n📍 Local:    http://localhost:{PORT}")
        print(f"\n📄 View your pages:")
        print(f"   Test page:  http://localhost:{PORT}/output/test-2026-02-13.html")
        print(f"   Logo:       http://localhost:{PORT}/d1-picks-logo.png")
        print(f"\n💡 Press Ctrl+C to stop\n")

        httpd.serve_forever()
