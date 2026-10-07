export default function PageLoading() {
  return (
    <div role="status" aria-live="polite" aria-busy="true" style={{ padding: '2rem', color: 'var(--text-secondary)' }}>
      Memuat halaman…
    </div>
  );
}
