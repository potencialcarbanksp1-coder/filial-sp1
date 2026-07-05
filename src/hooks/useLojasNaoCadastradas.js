import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

// Mesma lógica de paginação usada em useDadosPainel.js: o Supabase limita
// cada requisição a 1000 linhas por padrão, então buscamos em páginas.
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

    if (error) throw error
    const linhas = data || []
    todasAsLinhas = todasAsLinhas.concat(linhas)
    temMaisLinhas = linhas.length === TAMANHO_PAGINA
    pagina++
  }

  return todasAsLinhas
}

/**
 * Hook do painel "Não Cadastradas": lojas candidatas para uma nova área
 * (vindas de upload direto ou copiadas do Painel principal), com a
 * marcação "Nova Área" por linha e o somatório de potencial das marcadas.
 */
export function useLojasNaoCadastradas() {
  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const dados = await buscarTodasAsLinhas('lojas_nao_cadastradas')
    // Mais recentes primeiro, pra quem acabou de subir/copiar ver no topo.
    dados.sort((a, b) => new Date(b.criado_em) - new Date(a.criado_em))
    setLinhas(dados)
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  /** Marca/desmarca a caixinha "Nova Área" de uma linha deste painel. */
  async function alternarNovaAreaLinha(id, valorAtual) {
    const { error } = await supabase
      .from('lojas_nao_cadastradas')
      .update({ nova_area: !valorAtual, atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await carregar()
  }

  /** Remove uma linha (ex: candidata que não faz mais sentido analisar). */
  async function removerLinha(id) {
    const { error } = await supabase.from('lojas_nao_cadastradas').delete().eq('id', id)
    if (error) throw error
    await carregar()
  }

  // Soma o potencial (Volume Mercado) e os Ctos Merc de todas as linhas marcadas como "Nova Área".
  const potencialTotalNovaArea = useMemo(
    () => linhas.filter((l) => l.nova_area).reduce((soma, l) => soma + (Number(l.volume_mercado) || 0), 0),
    [linhas]
  )
  const ctosMercTotalNovaArea = useMemo(
    () => linhas.filter((l) => l.nova_area).reduce((soma, l) => soma + (Number(l.ctos_merc) || 0), 0),
    [linhas]
  )
  const quantidadeSelecionada = useMemo(() => linhas.filter((l) => l.nova_area).length, [linhas])
  const linhasSelecionadas = useMemo(() => linhas.filter((l) => l.nova_area), [linhas])

  return {
    linhas,
    carregando,
    recarregar: carregar,
    alternarNovaAreaLinha,
    removerLinha,
    potencialTotalNovaArea,
    ctosMercTotalNovaArea,
    quantidadeSelecionada,
    linhasSelecionadas,
  }
}
