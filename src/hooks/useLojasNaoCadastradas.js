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
 * Hook do painel "Mercado Potencial": lojas candidatas para uma nova área
 * (vindas de upload direto ou copiadas do Painel principal), com a
 * marcação "Nova Área" por linha e o somatório de potencial das marcadas.
 *
 * IMPORTANTE sobre performance/usabilidade: marcar/desmarcar o checkbox
 * "Nova Área" de uma linha NÃO grava no banco na hora — fica só guardado
 * localmente (em `alteracoesPendentes`), pra marcar várias lojas seguidas
 * ser instantâneo. Só quando o usuário clica em "Confirmar seleção" é que
 * tudo é enviado ao Supabase de uma vez (em no máximo 2 chamadas, uma para
 * quem virou marcado e outra para quem virou desmarcado), e a lista é
 * recarregada uma única vez no final.
 */
export function useLojasNaoCadastradas() {
  const [linhas, setLinhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [salvandoSelecao, setSalvandoSelecao] = useState(false)
  // Map<id, boolean>: mudanças de "Nova Área" feitas na tela mas ainda não salvas.
  const [alteracoesPendentes, setAlteracoesPendentes] = useState(new Map())

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

  // "linhas", mas já refletindo as marcações feitas na tela que ainda não
  // foram salvas — é isso que a tabela e os totais do dashboard usam, para
  // o usuário ver a soma atualizar na hora, sem esperar o servidor.
  const linhasComPendencias = useMemo(() => {
    if (alteracoesPendentes.size === 0) return linhas
    return linhas.map((l) => (alteracoesPendentes.has(l.id) ? { ...l, nova_area: alteracoesPendentes.get(l.id) } : l))
  }, [linhas, alteracoesPendentes])

  /** Marca/desmarca a caixinha "Nova Área" de uma linha — só localmente, sem tocar no banco ainda. */
  function alternarNovaAreaLocal(id, valorAtual) {
    setAlteracoesPendentes((atual) => {
      const novo = new Map(atual)
      novo.set(id, !valorAtual)
      return novo
    })
  }

  /**
   * Define diretamente (sem alternar) a marcação "Nova Área" de várias linhas
   * de uma vez — só localmente, sem tocar no banco ainda (mesma lógica de
   * pendência do toggle individual). Usado pela "Compor Área" da Análise
   * Regional: ao marcar um card, todas as lojas daquele grupo entram como
   * pendentes de "Nova Área = true"; ao desmarcar, voltam para "false".
   */
  function definirNovaAreaEmLote(ids, valor) {
    setAlteracoesPendentes((atual) => {
      const novo = new Map(atual)
      for (const id of ids) novo.set(id, valor)
      return novo
    })
  }

  /**
   * Envia para o Supabase todas as marcações pendentes de uma vez (batch):
   * uma chamada para quem virou marcado, outra para quem virou desmarcado.
   * Para linhas que vieram do Painel principal (origem = 'painel'), também
   * sincroniza o checkbox lá (metas_loja.incluido_nova_area), pra os dois
   * painéis não ficarem mostrando estados diferentes.
   */
  async function confirmarSelecao() {
    if (alteracoesPendentes.size === 0) return
    setSalvandoSelecao(true)
    try {
      const idsParaMarcar = []
      const idsParaDesmarcar = []
      const dnsParaMarcar = []
      const dnsParaDesmarcar = []

      for (const linha of linhas) {
        if (!alteracoesPendentes.has(linha.id)) continue
        const novoValor = alteracoesPendentes.get(linha.id)
        if (novoValor === linha.nova_area) continue // não mudou de fato, ignora
        if (novoValor) {
          idsParaMarcar.push(linha.id)
          if (linha.origem === 'painel' && linha.dn) dnsParaMarcar.push(linha.dn)
        } else {
          idsParaDesmarcar.push(linha.id)
          if (linha.origem === 'painel' && linha.dn) dnsParaDesmarcar.push(linha.dn)
        }
      }

      const agora = new Date().toISOString()

      if (idsParaMarcar.length > 0) {
        const { error } = await supabase
          .from('lojas_nao_cadastradas')
          .update({ nova_area: true, atualizado_em: agora })
          .in('id', idsParaMarcar)
        if (error) throw error
      }
      if (idsParaDesmarcar.length > 0) {
        const { error } = await supabase
          .from('lojas_nao_cadastradas')
          .update({ nova_area: false, atualizado_em: agora })
          .in('id', idsParaDesmarcar)
        if (error) throw error
      }
      if (dnsParaMarcar.length > 0) {
        const { error } = await supabase
          .from('metas_loja')
          .update({ incluido_nova_area: true, atualizado_em: agora })
          .in('dn', dnsParaMarcar)
        if (error) throw error
      }
      if (dnsParaDesmarcar.length > 0) {
        const { error } = await supabase
          .from('metas_loja')
          .update({ incluido_nova_area: false, atualizado_em: agora })
          .in('dn', dnsParaDesmarcar)
        if (error) throw error
      }

      setAlteracoesPendentes(new Map())
      await carregar()
    } finally {
      setSalvandoSelecao(false)
    }
  }

  /** Descarta as marcações feitas na tela que ainda não foram salvas. */
  function descartarSelecaoPendente() {
    setAlteracoesPendentes(new Map())
  }

  /** Remove uma linha (ex: candidata que não faz mais sentido analisar). */
  async function removerLinha(id) {
    const { error } = await supabase.from('lojas_nao_cadastradas').delete().eq('id', id)
    if (error) throw error
    await carregar()
  }

  /** Salva (ou edita) o nome do GCM responsável pelo atendimento daquela linha. */
  async function salvarAtendimento(id, valor) {
    const { error } = await supabase
      .from('lojas_nao_cadastradas')
      .update({ atendimento: valor || null, atualizado_em: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    await carregar()
  }

  /**
   * Desmarca TODAS as lojas marcadas como "Nova Área" de uma vez (incluindo
   * qualquer marcação pendente ainda não confirmada). Para as que vieram
   * copiadas do Painel principal (origem = 'painel'), também desmarca lá o
   * checkbox correspondente (metas_loja), pra não ficar com o Painel
   * principal e este painel mostrando estados diferentes.
   */
  async function desmarcarTodas() {
    const dnsDoPainel = linhasComPendencias.filter((l) => l.nova_area && l.origem === 'painel').map((l) => l.dn)

    const { error: erroNaoCadastradas } = await supabase
      .from('lojas_nao_cadastradas')
      .update({ nova_area: false, atualizado_em: new Date().toISOString() })
      .eq('nova_area', true)
    if (erroNaoCadastradas) throw erroNaoCadastradas

    if (dnsDoPainel.length > 0) {
      const { error: erroMetas } = await supabase
        .from('metas_loja')
        .update({ incluido_nova_area: false, atualizado_em: new Date().toISOString() })
        .in('dn', dnsDoPainel)
      if (erroMetas) throw erroMetas
    }

    setAlteracoesPendentes(new Map())
    await carregar()
  }

  // Soma o potencial (Volume Mercado) e os Ctos Merc de todas as linhas marcadas
  // como "Nova Área" — já considerando marcações feitas na tela mas ainda não salvas.
  const potencialTotalNovaArea = useMemo(
    () => linhasComPendencias.filter((l) => l.nova_area).reduce((soma, l) => soma + (Number(l.volume_mercado) || 0), 0),
    [linhasComPendencias]
  )
  const ctosMercTotalNovaArea = useMemo(
    () => linhasComPendencias.filter((l) => l.nova_area).reduce((soma, l) => soma + (Number(l.ctos_merc) || 0), 0),
    [linhasComPendencias]
  )
  const quantidadeSelecionada = useMemo(() => linhasComPendencias.filter((l) => l.nova_area).length, [linhasComPendencias])
  const linhasSelecionadas = useMemo(() => linhasComPendencias.filter((l) => l.nova_area), [linhasComPendencias])

  return {
    linhas: linhasComPendencias,
    carregando,
    recarregar: carregar,
    alternarNovaAreaLocal,
    definirNovaAreaEmLote,
    confirmarSelecao,
    descartarSelecaoPendente,
    quantidadeAlteracoesPendentes: alteracoesPendentes.size,
    salvandoSelecao,
    removerLinha,
    salvarAtendimento,
    desmarcarTodas,
    potencialTotalNovaArea,
    ctosMercTotalNovaArea,
    quantidadeSelecionada,
    linhasSelecionadas,
  }
}
