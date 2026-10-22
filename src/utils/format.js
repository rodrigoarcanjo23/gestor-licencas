export const onlyDigits = (v = '') => String(v).replace(/\D/g, '')

export function formatCNPJ(v = '') {
  const d = onlyDigits(v).slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

export function isValidCNPJ(v = '') {
  const c = onlyDigits(v)
  if (c.length !== 14 || /^(\d)\1+$/.test(c)) return false
  const calc = (len) => {
    let sum = 0
    let pos = len - 7
    for (let i = len; i >= 1; i--) {
      sum += Number(c.charAt(len - i)) * pos--
      if (pos < 2) pos = 9
    }
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === Number(c.charAt(12)) && calc(13) === Number(c.charAt(13))
}

export function formatPhone(v = '') {
  let d = onlyDigits(v)
  if (d.startsWith('55') && d.length > 11) d = d.slice(2)
  d = d.slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return d.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

// Número no formato internacional para o wa.me (assume Brasil se faltar o 55)
export function toWhatsappNumber(v = '') {
  const d = onlyDigits(v)
  if (!d) return ''
  if (d.length <= 11) return `55${d}`
  return d
}

export function whatsappLink(phone, text) {
  const n = toWhatsappNumber(phone)
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`
}

export function normalizeText(v = '') {
  return String(v).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}

// Abre link externo (no Android, abre no app/navegador do sistema)
export function openExternal(url) {
  window.open(url, '_system')
}
