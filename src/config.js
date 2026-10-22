// Chaves do EmailJS (conta do DOC em dia). Podem ser trocadas pelo arquivo .env:
// VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID, VITE_EMAILJS_PUBLIC_KEY
export const EMAILJS = {
  serviceId: import.meta.env.VITE_EMAILJS_SERVICE_ID || 'service_8ai15im',
  templateId: import.meta.env.VITE_EMAILJS_TEMPLATE_ID || 'template_l560mrl',
  publicKey: import.meta.env.VITE_EMAILJS_PUBLIC_KEY || '9DbkhDMEAB-6WAcjc',
}
