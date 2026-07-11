/**
 * Calcula a Produção dos últimos 3 meses (M1, M2, M3) de uma loja: em quantos
 * desses meses ela teve produção — só faz sentido para lojas que JÁ SÃO
 * CLIENTES e estão com status "ATIVO". Para lojas com outro status (ex:
 * "NAO CADASTRADA", ainda não é cliente), retorna null — sem informação
 * de produção possível.
 *
 * Cruza primeiro pelo DN (quando a linha veio de uma cópia do Painel
 * principal, que já traz o DN) e, se não achar, cai para o CNPJ (caso de
 * uma linha vinda de upload direto da planilha de Mercado Potencial, que
 * não tem DN, mas pode já ser uma loja cliente reconhecível pelo CNPJ).
 *
 * `producaoPorDn` e `producaoPorCnpj` são Maps: chave -> { m1, m2, m3 }
 * (valores de produção de cada mês), construídos a partir das linhas
 * consolidadas do Painel principal.
 */
export function calcularPositivacao(linha, producaoPorDn, producaoPorCnpj) {
  const status = String(linha.status_loja || '').toUpperCase().trim()
  if (status !== 'ATIVO') return null

  let producao = linha.dn ? producaoPorDn?.get(String(linha.dn)) : null
  if (!producao) {
    const cnpjChave = String(linha.cnpj_loja || '').replace(/\D/g, '')
    if (cnpjChave) producao = producaoPorCnpj?.get(cnpjChave)
  }
  if (!producao) return null

  let contagem = 0
  if (Number(producao.m1) > 0) contagem++
  if (Number(producao.m2) > 0) contagem++
  if (Number(producao.m3) > 0) contagem++
  return contagem
}
