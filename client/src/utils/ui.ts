export function cancelTextSelection() {
  if ('getSelection' in window) {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  }
}
