export function hasBlobField(body: unknown): boolean {
  if (typeof body !== 'object' || body === null) return false;

  for (const val of Object.values(body)) {
    if ((typeof Blob !== 'undefined' && val instanceof Blob) || (typeof File !== 'undefined' && val instanceof File)) {
      return true;
    }
  }

  return false;
}
