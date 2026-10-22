import { onlyDigits, formatPhone } from './format'

// Consulta pública e gratuita da BrasilAPI (dados da Receita Federal)
export async function lookupCNPJ(cnpj) {
  const digits = onlyDigits(cnpj)
  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`)
  if (res.status === 404) throw new Error('CNPJ não encontrado na Receita Federal.')
  if (!res.ok) throw new Error('Não foi possível consultar o CNPJ agora. Tente novamente.')
  const data = await res.json()
  return {
    name: data.nome_fantasia?.trim() || data.razao_social?.trim() || '',
    legalName: data.razao_social?.trim() || '',
    phone: data.ddd_telefone_1 ? formatPhone(data.ddd_telefone_1) : '',
    email: (data.email || '').toLowerCase(),
    city: data.municipio ? `${data.municipio}/${data.uf}` : '',
    situation: data.descricao_situacao_cadastral || '',
  }
}
