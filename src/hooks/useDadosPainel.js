import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useMetasLoja } from './useMetasLoja.js'

// O Supabase/PostgREST limita cada requisição a no máximo 1000 linhas por padrão.
// Tabelas maiores que isso (como "producao") ficavam truncadas silenciosamente,
// fazendo os totais do painel divergirem dos totais reais no banco.
// Esta função busca todas as páginas até não haver mais linhas.
async function buscarTodasAsLinhas(nomeTabela) {
  const TAMANHO_PAGINA = 1000
  let todasAsLinhas = []
  let pagina = 0
  let temMaisLinhas = true

  while (temMaisLinhas) {
    const inicio = pagina * TAMANHO_PAGINA
    const fim = inicio + TAMANHO_PAGINA - 1
    const { data, error } = await supabase
      .from(nomeTabela)
      .select('*')
      .range(inicio, fim)

    if (error) {
      console.error(`Erro ao buscar "${nomeTabela}" (página ${pagina}):`, error)
      throw error
    }

    const linhas = data || []
    todasAsLinhas = todasAsLinhas.concat(linhas)
    temMaisLinhas = linhas.length === TAMANHO_PAGINA
    pagina++
  }

  return todasAsLinhas
}

export function useDadosPainel() {
  const [potencial, setPotencial] = useState([])
  const [lojas, setLojas] = useState([])
  const [producao, setProducao] = useState([])
  const [metaMeses, setMetaMeses] = useState({ M1: null, M2: null, M3: null })
  const [carregando, setCarregando] = useState(true)
  const { metasPorDn, salvarMeta, alternarLmConsig } = useMetasLoja()

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [dadosPotencial, dadosLojas, dadosProducao, dadosMeta] = await Promise.all([
      buscarTodasAsLinhas('potencial'),
      buscarTodasAsLinhas('lojas'),
      buscarTodasAsLinhas('producao'),
      buscarTodasAsLinhas('producao_meta'),
    ])

    setPotencial(dadosPotencial)
    setLojas(dadosLojas)
    setProducao(dadosProducao)

    const meta = { M1: null, M2: null, M3: null }
    for (const linha of dadosMeta) {
      meta[linha.mes_posicao] = linha.rotulo_mes
    }
    setMetaMeses(meta)
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Consolida a partir de Lojas (cadastro base), cruzando com Potencial pelo
  // CNPJ, com Produção pelo código DN, e com Metas/LM Consig (também por DN).
  const linhasConsolidadas = consolidar(lojas, potencial, producao, metasPorDn)

  return {
    potencial, lojas, producao, metaMeses, linhasConsolidadas, carregando,
    recarregar: carregar,
    salvarMeta, alternarLmConsig,
  }
}

function somenteDigitos(texto) {
  return String(texto || '').replace(/\D/g, '')
}

function consolidar(lojas, potencial, producao, metasPorDn) {
  // Mapa de Potencial por CNPJ (somente dígitos, para evitar diferenças de formatação).
  // PORTE_LOJA é a categoria de potencial (ex: "D. 11-20 GRAVAMES").
  // VOL_LEVES_PERFIL_CB é o Volume Mercado, QT_LEVES_PERFIL_CB é Ctos Merc.
  const mapaPotencialPorCnpj = new Map()
  for (const p of potencial) {
    const chave = somenteDigitos(p.cnpj_loja)
    if (!chave) continue
    const atual = mapaPotencialPorCnpj.get(chave) || {
      potencial_categoria: p.porte_loja || '',
      volume_mercado: 0,
      ctos_merc: 0,
    }
    atual.volume_mercado += Number(p.vol_leves_perfil_cb) || 0
    atual.ctos_merc += Number(p.qt_leves_perfil_cb) || 0
    if (!atual.potencial_categoria) atual.potencial_categoria = p.porte_loja || ''
    mapaPotencialPorCnpj.set(chave, atual)
  }

  // Agrega Produção por DN e por posição de mês: soma do valor financiado
  // e contagem de linhas (contratos) como "quantidade".
  const producaoPorDnEMes = new Map() // chave: dn|mesPosicao -> { valor, quantidade }
  for (const p of producao) {
    const chave = `${p.dn}|${p.mes_posicao}`
    const atual = producaoPorDnEMes.get(chave) || { valor: 0, quantidade: 0 }
    atual.valor += Number(p.vlr_financiado) || 0
    atual.quantidade += 1 // cada linha é um contrato
    producaoPorDnEMes.set(chave, atual)
  }

  return lojas.map((loja) => {
    const cnpjChave = somenteDigitos(loja.cnpj)
    const dn = String(loja.dn || '')
    const potencialLoja = mapaPotencialPorCnpj.get(cnpjChave) || {
      potencial_categoria: '',
      volume_mercado: 0,
      ctos_merc: 0,
    }
    const m1 = producaoPorDnEMes.get(`${dn}|M1`) || { valor: 0, quantidade: 0 }
    const m2 = producaoPorDnEMes.get(`${dn}|M2`) || { valor: 0, quantidade: 0 }
    const m3 = producaoPorDnEMes.get(`${dn}|M3`) || { valor: 0, quantidade: 0 }

    const metaLoja = metasPorDn?.get(dn)
    const metaCdcPrem = metaLoja?.meta_cdc_prem ?? null
    const lmConsigAtivo = metaLoja?.lm_consig_ativo ?? false
    // GAP = Meta - Produção do mês atual (M1). Só calculado quando há meta definida.
    const gap = metaCdcPrem !== null ? metaCdcPrem - m1.valor : null

    return {
      codigo: dn,
      razao_social: loja.razao_social || '',
      endereco: loja.endereco || '',
      numero: loja.numero || '',
      bairro: loja.bairro || '',
      cep: loja.cep || '',
      zona: loja.zona || '',
      gcm: loja.gcm || '',
      potencial_categoria: potencialLoja.potencial_categoria,
      volume_mercado: potencialLoja.volume_mercado,
      ctos_merc: potencialLoja.ctos_merc,
      producao_m1: m1.valor,
      qtd_m1: m1.quantidade,
      producao_m2: m2.valor,
      qtd_m2: m2.quantidade,
      producao_m3: m3.valor,
      qtd_m3: m3.quantidade,
      meta_cdc_prem: metaCdcPrem,
      gap,
      lm_consig_ativo: lmConsigAtivo,
    }
  })
}
