/**
 * Sanitize Module — Prevencao de XSS
 * Escapa caracteres perigosos antes de injetar no DOM via innerHTML.
 */
function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Sanitize URL — Prevencao de XSS via javascript: URIs
 * Valida protocolos seguros antes de inserir em atributos href/src.
 */
function sanitizeUrl(url) {
    if (!url) return '#';
    const str = String(url).trim();
    // Bloqueia javascript:, data:, vbscript: impedindo payload execution
    if (/^(javascript|data|vbscript):/i.test(str)) {
        console.warn('Blocked malicious URL scheme:', str);
        return '#';
    }
    return escapeHtml(str);
}
