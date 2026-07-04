// Cada chave é o nome da coluna no banco (Supabase).
// Cada valor é uma lista de possíveis nomes que essa coluna pode ter
// na planilha que você for subir (o sistema tenta casar com qualquer um deles).
// Se sua planilha usar um nome de coluna diferente, basta adicionar na lista.

// LOJAS — arquivo Lojas.xlsx (parte esquerda da planilha):
// DN | CNPJ | RAZÃO SOCIAL | GCM | ENDERECO | Nº | BAIRRO | CEP | ZONA
export const MAPA_LOJAS = {
  dn: ['DN'],
  cnpj: ['CNPJ'],
  razao_social: ['RAZÃO SOCIAL', 'RAZAO SOCIAL', 'RAZAO_SOCIAL'],
  gcm: ['GCM'],
  endereco: ['ENDERECO', 'Endereço'],
  numero: ['Nº', 'N°', 'No', 'Numero'],
  bairro: ['BAIRRO'],
  cep: ['CEP'],
  zona: ['ZONA'],
}

// POTENCIAL — arquivo Potencial.xlsx (aba "sp1"):
// ANO_MES, CNPJ_LOJA, RAZAO_LOJA, NOME_FANTASIA, CNAE, CNAE_PRIMARIO, TIPO_LOJA_B3,
// ENDERECO, NUM_LOJA, COMPLEMENTO, BAIRRO, CIDADE, UF, CEP, MESORREGIAO, MICRORREGIAO,
// REGIAO, DIVISAO, REGIONAL, FILIAL, STATUS_LOJA, EXPURGO_RJ, PORTE_LOJA,
// QT_FINANCIAMENTOS, VOL_FINANCIAMENTOS, e as métricas QT_LEVES* / VOL_LEVES*.
export const MAPA_POTENCIAL = {
  ano_mes: ['ANO_MES'],
  cnpj_loja: ['CNPJ_LOJA'],
  razao_loja: ['RAZAO_LOJA', 'RAZÃO_LOJA'],
  nome_fantasia: ['NOME_FANTASIA'],
  cnae: ['CNAE'],
  cnae_primario: ['CNAE_PRIMARIO'],
  tipo_loja_b3: ['TIPO_LOJA_B3'],
  endereco: ['ENDERECO'],
  num_loja: ['NUM_LOJA'],
  complemento: ['COMPLEMENTO'],
  bairro: ['BAIRRO'],
  cidade: ['CIDADE'],
  uf: ['UF'],
  cep: ['CEP'],
  mesorregiao: ['MESORREGIAO'],
  microrregiao: ['MICRORREGIAO'],
  regiao: ['REGIAO'],
  divisao: ['DIVISAO'],
  regional: ['REGIONAL'],
  filial: ['FILIAL'],
  status_loja: ['STATUS_LOJA'],
  expurgo_rj: ['EXPURGO_RJ'],
  porte_loja: ['PORTE_LOJA'],
  qt_financiamentos: ['QT_FINANCIAMENTOS'],
  vol_financiamentos: ['VOL_FINANCIAMENTOS'],
  qt_leves: ['QT_LEVES'],
  qt_leves_perfil_cb: ['QT_LEVES_PERFIL_CB'],
  qt_leves_novos: ['QT_LEVES_NOVOS'],
  qt_leves_semi_i: ['QT_LEVES_SEMI_I'],
  qt_leves_semi_ii: ['QT_LEVES_SEMI_II'],
  qt_leves_semi_iii: ['QT_LEVES_SEMI_III'],
  qt_leves_usados_1: ['QT_LEVES_USADOS_1'],
  qt_leves_usados_2: ['QT_LEVES_USADOS_2'],
  qt_leves_usados_3: ['QT_LEVES_USADOS_3'],
  vol_leves: ['VOL_LEVES'],
  vol_leves_perfil_cb: ['VOL_LEVES_PERFIL_CB'],
  vol_leves_novos: ['VOL_LEVES_NOVOS'],
  vol_leves_semi_i: ['VOL_LEVES_SEMI_I'],
  vol_leves_semi_ii: ['VOL_LEVES_SEMI_II'],
  vol_leves_semi_iii: ['VOL_LEVES_SEMI_III'],
  vol_leves_usados_1: ['VOL_LEVES_USADOS_1'],
  vol_leves_usados_2: ['VOL_LEVES_USADOS_2'],
  vol_leves_usados_3: ['VOL_LEVES_USADOS_3'],
  qt_leves_cb: ['QT_LEVES_CB'],
  qt_leves_novos_cb: ['QT_LEVES_NOVOS_CB'],
  qt_leves_semi_i_cb: ['QT_LEVES_SEMI_I_CB'],
  qt_leves_semi_ii_cb: ['QT_LEVES_SEMI_II_CB'],
  qt_leves_semi_iii_cb: ['QT_LEVES_SEMI_III_CB'],
  vol_leves_cb: ['VOL_LEVES_CB'],
  vol_leves_novos_cb: ['VOL_LEVES_NOVOS_CB'],
  vol_leves_semi_i_cb: ['VOL_LEVES_SEMI_I_CB'],
  vol_leves_semi_ii_cb: ['VOL_LEVES_SEMI_II_CB'],
  vol_leves_semi_iii_cb: ['VOL_LEVES_SEMI_III_CB'],
  qt_leves_usados_perfil_cb: ['QT_LEVES_USADOS_PERFIL_CB'],
  qt_leves_usados_cb: ['QT_LEVES_USADOS_CB'],
}

// PRODUÇÃO — arquivos mensais (ex: producao_abril26.xlsx):
// PAGAMENTO, CONTRATO, PROPOSTA, PESSOA, DEALER, GRUPO, PLANO SPF,
// AUTO REPARO, DECISAO, APROV, VLR FINANCIADO, GCM.
// O DEALER vem como "60441-EMILIO EDMOND TEBCHERANI AUTOMOVEIS" e é
// separado em dn (código) + dealer_nome (texto) durante o upload.
export const MAPA_PRODUCAO = {
  pagamento: ['PAGAMENTO'],
  dealer: ['DEALER'], // campo bruto, ainda "código-nome" colado — separado depois
  vlr_financiado: ['VLR FINANCIADO', 'VLR_FINANCIADO'],
  gcm: ['GCM'],
}

// Campos que devem ser tratados como número (em vez de texto) ao importar
export const CAMPOS_NUMERICOS_LOJAS = []

export const CAMPOS_NUMERICOS_POTENCIAL = [
  'qt_financiamentos', 'vol_financiamentos', 'qt_leves', 'qt_leves_perfil_cb',
  'qt_leves_novos', 'qt_leves_semi_i', 'qt_leves_semi_ii', 'qt_leves_semi_iii',
  'qt_leves_usados_1', 'qt_leves_usados_2', 'qt_leves_usados_3', 'vol_leves',
  'vol_leves_perfil_cb', 'vol_leves_novos', 'vol_leves_semi_i', 'vol_leves_semi_ii',
  'vol_leves_semi_iii', 'vol_leves_usados_1', 'vol_leves_usados_2', 'vol_leves_usados_3',
  'qt_leves_cb', 'qt_leves_novos_cb', 'qt_leves_semi_i_cb', 'qt_leves_semi_ii_cb',
  'qt_leves_semi_iii_cb', 'vol_leves_cb', 'vol_leves_novos_cb', 'vol_leves_semi_i_cb',
  'vol_leves_semi_ii_cb', 'vol_leves_semi_iii_cb', 'qt_leves_usados_perfil_cb', 'qt_leves_usados_cb',
]

export const CAMPOS_NUMERICOS_PRODUCAO = ['vlr_financiado']

/**
 * Separa o campo DEALER bruto (ex: "60441-EMILIO EDMOND TEBCHERANI AUTOMOVEIS")
 * em código (dn) e nome da loja (dealer_nome), usando o primeiro "-" como separador.
 * Equivalente ao "Texto por colunas" do Excel usando "-" como delimitador.
 */
export function separarDealer(dealerBruto) {
  const texto = String(dealerBruto || '').trim()
  const indice = texto.indexOf('-')
  if (indice === -1) {
    return { dn: texto, dealer_nome: '' }
  }
  const dn = texto.slice(0, indice).trim()
  const dealer_nome = texto.slice(indice + 1).trim()
  return { dn, dealer_nome }
}
