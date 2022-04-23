export function cancelTextSelection() {
  if (window.getSelection) {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  }
}
