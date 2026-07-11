import { useMemo, useState } from 'react'
import { calcularPositivacao } from '../lib/positivacao.js'

const LIMIAR_PADRAO = 400 // meta de Ctos Merc (quantidade de contratos), não mais valor em R$
const DIGITOS_CEP_PADRAO = 3 // agrupa lojas cujo CEP compartilha os 3 primeiros dígitos

function somenteDigitos(texto) {
  return String(texto || '').replace(/\D/g, '')
}

/**
 * Analisa as lojas do Mercado Potencial e as agrupa por região (usando o
 * prefixo do CEP, já que no Brasil os primeiros dígitos do CEP já indicam
 * a região/bairro — não precisa de nenhuma API de mapa para isso).
 *
 * Por padrão ("análise nativa"), só entram na análise as lojas sem GCM
 * definido ainda (Atendimento = "Novo GCM") — são elas que definem quais
 * regiões existem. Com `incluirZeradas` ativado (botão "Puxar lojas
 * zeradas"), lojas que JÁ SÃO clientes, estão "ATIVO", mas tiveram zero
 * produção nos últimos 3 meses (M1/M2/M3) também entram — mas SÓ para
 * reforçar uma região que já tem alguma loja "Novo GCM" por perto (mesmo
 * prefixo de CEP); uma loja zerada nunca cria uma região nova sozinha.
 *
 * Cada grupo resultante mostra: quantidade de lojas, soma do Volume Mercado
 * e soma dos Ctos Merc — para o gestor identificar regiões com contratos
 * (Ctos Merc) suficientes (por padrão, a partir de 400) para justificar a
 * criação de uma nova área/contratação de um novo GCM.
 */
export function useAnaliseRegional(linhas, producaoPorDn, producaoPorCnpj, definirNovaAreaEmLote) {
  const [incluirZeradas, setIncluirZeradas] = useState(false)
  const [digitosCep, setDigitosCep] = useState(DIGITOS_CEP_PADRAO)
  const [limiarPotencial, setLimiarPotencial] = useState(LIMIAR_PADRAO)
  const [apenasAcimaDoLimiar, setApenasAcimaDoLimiar] = useState(true)
  // Chaves (prefixo de CEP) dos cards marcados com "Compor Área".
  const [gruposCompostos, setGruposCompostos] = useState(new Set())

  // Enriquece cada linha com a Positivação (só relevante para decidir quem
  // entra no pool quando "Puxar lojas zeradas" estiver ativado).
  const linhasComPositivacao = useMemo(
    () => linhas.map((l) => ({ ...l, positivacao: calcularPositivacao(l, producaoPorDn, producaoPorCnpj) })),
    [linhas, producaoPorDn, producaoPorCnpj]
  )

  // Base da análise: sempre as lojas sem GCM definido ("Novo GCM"). São elas
  // que definem quais regiões (prefixos de CEP) entram na análise.
  const candidatasBase = useMemo(
    () => linhasComPositivacao.filter((l) => (l.atendimento || '').trim() === 'Novo GCM'),
    [linhasComPositivacao]
  )

  // Conjunto de prefixos de CEP que já têm ao menos uma loja "Novo GCM" —
  // usado para decidir em quais regiões as lojas zeradas podem entrar.
  const chavesComCandidataBase = useMemo(() => {
    const chaves = new Set()
    for (const l of candidatasBase) {
      const digitos = somenteDigitos(l.cep)
      chaves.add(digitos.length >= digitosCep ? digitos.slice(0, digitosCep) : '(Sem CEP)')
    }
    return chaves
  }, [candidatasBase, digitosCep])

  /**
   * Lojas ativas com zero produção nos 3 meses SÓ entram na análise quando
   * "Puxar lojas zeradas" está ativado, e mesmo assim SÓ para reforçar uma
   * região que já tem alguma loja "Novo GCM" por perto (mesmo prefixo de
   * CEP) — elas nunca formam uma região nova sozinhas, sem nenhuma loja sem
   * atendimento ali perto.
   */
  const candidatas = useMemo(() => {
    if (!incluirZeradas) return candidatasBase

    const zeradasDaRegiao = linhasComPositivacao.filter((l) => {
      const semAtendimento = (l.atendimento || '').trim() === 'Novo GCM'
      if (semAtendimento) return false // já está em candidatasBase, evita duplicar
      if (l.positivacao !== 0) return false
      const digitos = somenteDigitos(l.cep)
      const chave = digitos.length >= digitosCep ? digitos.slice(0, digitosCep) : '(Sem CEP)'
      return chavesComCandidataBase.has(chave)
    })

    return [...candidatasBase, ...zeradasDaRegiao]
  }, [candidatasBase, linhasComPositivacao, incluirZeradas, chavesComCandidataBase, digitosCep])

  const grupos = useMemo(() => {
    const mapa = new Map()
    for (const l of candidatas) {
      const digitos = somenteDigitos(l.cep)
      const chave = digitos.length >= digitosCep ? digitos.slice(0, digitosCep) : '(Sem CEP)'
      if (!mapa.has(chave)) {
        mapa.set(chave, { chave, lojas: [], totalVolume: 0, totalCtos: 0 })
      }
      const grupo = mapa.get(chave)
      grupo.lojas.push(l)
      grupo.totalVolume += Number(l.volume_mercado) || 0
      grupo.totalCtos += Number(l.ctos_merc) || 0
    }
    return Array.from(mapa.values()).sort((a, b) => b.totalVolume - a.totalVolume)
  }, [candidatas, digitosCep])

  const gruposExibidos = useMemo(
    () => (apenasAcimaDoLimiar ? grupos.filter((g) => g.totalCtos >= limiarPotencial) : grupos),
    [grupos, apenasAcimaDoLimiar, limiarPotencial]
  )

  /**
   * Marca/desmarca um card (região) para "Compor Área": além de acumular no
   * resumo desta página, já marca (ou desmarca) todas as lojas daquele grupo
   * como "Nova Área" no Mercado Potencial — usando a mesma pendência local
   * de lá, então o usuário confirma tudo de uma vez com "Confirmar seleção".
   */
  function alternarComposicao(chave) {
    setGruposCompostos((atual) => {
      const novo = new Set(atual)
      const grupo = grupos.find((g) => g.chave === chave)
      const vaiComporAgora = !novo.has(chave)

      if (vaiComporAgora) novo.add(chave)
      else novo.delete(chave)

      if (grupo && definirNovaAreaEmLote) {
        definirNovaAreaEmLote(grupo.lojas.map((l) => l.id), vaiComporAgora)
      }

      return novo
    })
  }

  const gruposComPostosSelecionados = useMemo(
    () => grupos.filter((g) => gruposCompostos.has(g.chave)),
    [grupos, gruposCompostos]
  )

  const composicao = useMemo(() => {
    const lojas = gruposComPostosSelecionados.flatMap((g) => g.lojas)
    return {
      quantidadeRegioes: gruposComPostosSelecionados.length,
      quantidadeLojas: lojas.length,
      totalVolume: gruposComPostosSelecionados.reduce((soma, g) => soma + g.totalVolume, 0),
      totalCtos: gruposComPostosSelecionados.reduce((soma, g) => soma + g.totalCtos, 0),
      lojas,
    }
  }, [gruposComPostosSelecionados])

  return {
    candidatas,
    grupos,
    gruposExibidos,
    incluirZeradas,
    setIncluirZeradas,
    digitosCep,
    setDigitosCep,
    limiarPotencial,
    setLimiarPotencial,
    apenasAcimaDoLimiar,
    setApenasAcimaDoLimiar,
    gruposCompostos,
    alternarComposicao,
    composicao,
  }
}
