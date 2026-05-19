export function downloadSvg(svgString: string, filename: string): void {
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  // Sanitize filename: strip path separators and reserved chars that some
  // OSes silently rename. Keep it printable + safe.
  a.download = filename.replace(/[\\/:*?"<>|]/g, '_');
  a.click();
  // Revoking synchronously can race the download in iOS Safari and some
  // older Chromium builds (the URL becomes invalid before the download
  // actually starts). Defer past the current task.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
