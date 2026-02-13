'use client';

import { useState } from 'react';

export function EmailCapture() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    try {
      const res = await fetch('https://buttondown.com/api/emails/embed-subscribe/d1baseballpicks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          email: email,
        }),
      });

      if (res.ok) {
        setStatus('success');
        setEmail('');
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-6 my-8 border border-green-200">
      <div className="text-center">
        <h3 className="text-xl font-bold text-gray-900 mb-2">
          Get free +EV picks in your inbox daily
        </h3>
        <p className="text-gray-600 mb-4">
          No BS, just data. We find the edges, you make the call.
        </p>

        {status === 'success' ? (
          <div className="bg-green-100 text-green-800 p-4 rounded-lg">
            You're in! Check your inbox to confirm.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
            />
            <button
              type="submit"
              disabled={status === 'loading'}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === 'loading' ? 'Subscribing...' : 'Subscribe'}
            </button>
          </form>
        )}

        {status === 'error' && (
          <p className="text-red-600 mt-2 text-sm">
            Something went wrong. Try again or email us directly.
          </p>
        )}

        <p className="text-xs text-gray-500 mt-3">
          Free forever. Unsubscribe anytime. We hate spam too.
        </p>
      </div>
    </div>
  );
}
