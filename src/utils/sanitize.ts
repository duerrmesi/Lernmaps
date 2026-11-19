/**
 * sanitize.ts – Bereinigt HTML-Strings vor der Darstellung im DOM.
 * 
 * Verhindert Cross-Site Scripting (XSS), wenn dynamischer HTML-Inhalt
 * (z. B. aus generierten Lernkarten, Notizen oder importierten Daten)
 * per dangerouslySetInnerHTML gerendert wird.
 */

const DISALLOWED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'frame',
  'object',
  'embed',
  'applet',
  'form',
  'input',
  'button',
  'textarea',
  'select',
  'meta',
  'link',
  'base',
]);

const DANGEROUS_PROTOCOLS = /^(javascript|vbscript|data:text\/html):/i;

/**
 * Entfernt gefährliche HTML-Elemente, Event-Handler (onerror, onclick etc.)
 * sowie bösartige Link-Protokolle (javascript:).
 *
 * @param dirty Unsicherer HTML-String
 * @returns Sicherer, bereinigter HTML-String
 */
export function sanitizeHtml(dirty: string): string {
  if (!dirty || typeof dirty !== 'string') return '';

  // Wenn keine HTML-Tags vorhanden sind, String direkt unverändert lassen
  if (!dirty.includes('<') && !dirty.includes('>')) {
    return dirty;
  }

  // Im Browser-Kontext via DOMParser sicher parsen
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return dirty.replace(/<[^>]*>/g, '');
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(dirty, 'text/html');

  // Rekursiv alle Elemente prüfen und säubern
  const elements = Array.from(doc.body.querySelectorAll('*'));
  for (const el of elements) {
    const tagName = el.tagName.toLowerCase();

    // 1. Verbotene Tags komplett entfernen
    if (DISALLOWED_TAGS.has(tagName)) {
      el.remove();
      continue;
    }

    // 2. Attribute prüfen
    const attrs = Array.from(el.attributes);
    for (const attr of attrs) {
      const attrName = attr.name.toLowerCase();
      const attrVal = attr.value.trim();

      // Inline Event-Handler entfernen (on*)
      if (attrName.startsWith('on')) {
        el.removeAttribute(attr.name);
        continue;
      }

      // Gefährliche URIs in Links/Quellen entfernen
      if (attrName === 'href' || attrName === 'src' || attrName === 'action') {
        if (DANGEROUS_PROTOCOLS.test(attrVal)) {
          el.removeAttribute(attr.name);
          continue;
        }
      }
    }

    // 3. Externe Links mit noopener noreferrer absichern
    if (tagName === 'a' && el.getAttribute('target') === '_blank') {
      el.setAttribute('rel', 'noopener noreferrer');
    }
  }

  return doc.body.innerHTML;
}
