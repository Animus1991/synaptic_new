/** Client-side limits — keep in sync with server/src/lib/submissionAttachments.ts */
export const CLIENT_MAX_ATTACHMENTS = 5;
export const CLIENT_MAX_ATTACHMENT_BYTES = 4 * 1024 * 1024;

export async function fileToBase64Payload(file: File): Promise<{
  name: string;
  mime: string;
  contentBase64: string;
}> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return {
    name: file.name,
    mime: file.type || 'application/octet-stream',
    contentBase64: btoa(binary),
  };
}
