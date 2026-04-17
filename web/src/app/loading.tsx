export default function Loading() {
  return (
    <div className="page-loading-screen" aria-live="polite" aria-busy="true">
      <div className="page-loading-card">
        <div className="page-loading-spinner" aria-hidden="true" />
        <div className="page-loading-title">Loading</div>
        <div className="page-loading-text">Please wait while the page is being prepared.</div>
      </div>
    </div>
  );
}
