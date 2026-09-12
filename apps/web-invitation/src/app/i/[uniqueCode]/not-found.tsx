export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Invitation Not Found</h1>
        <p className="text-gray-600">The invitation you are looking for is unavailable, expired, or does not exist.</p>
      </div>
    </div>
  );
}
