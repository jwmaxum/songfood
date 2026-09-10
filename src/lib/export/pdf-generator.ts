/**
 * Client-side PDF / Print Generator for A4 Master Spec Sheet
 */

export function triggerPrintSpecSheet(documentTitle?: string): void {
  if (typeof window === 'undefined') return;

  const originalTitle = document.title;
  if (documentTitle) {
    document.title = documentTitle;
  }

  window.print();

  // Restore original title after print dialogue
  setTimeout(() => {
    document.title = originalTitle;
  }, 1000);
}
