'use client';

export default function Error() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600">We could not load this invitation. Please try again later.</p>
      </div>
    </div>
  );
}
