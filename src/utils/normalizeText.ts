export function normalizeText(input: string): string {
  if (!input) return '';

  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  try {
    return trimmed
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch {
    return trimmed
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
