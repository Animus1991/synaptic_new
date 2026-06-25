/** Export whiteboard canvas to PNG download. */
export function downloadWhiteboardPng(canvas: HTMLCanvasElement, filename: string): void {
  const safe = filename.replace(/[^\w.-]+/g, '-').slice(0, 48) || 'whiteboard';
  const link = document.createElement('a');
  link.download = `${safe}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}
