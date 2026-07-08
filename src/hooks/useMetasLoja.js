import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useMetasLoja() {
  const [metasPorDn, setMetasPorDn] = useState(new Map())
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase.from('metas_loja').select('*')
    const mapa = new Map((data || []).map((linha) => [String(linha.dn), linha]))
    setMetasPorDn(mapa)
    setCarregando(false)
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  /** Salva (cria ou atualiza) a Meta CDC Prem de uma loja. */
  async function salvarMeta(dn, valorMeta) {
    const { data: sessao } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('metas_loja')
      .upsert(
        {
          dn: String(dn),
          meta_cdc_prem: valorMeta,
          atualizado_em: new Date().toISOString(),
          atualizado_por: sessao?.user?.id || null,
        },
        { onConflict: 'dn' }
      )
    if (error) throw error
    await carregar()
  }

  /** Salva (cria ou atualiza) a MPL - Valor ou a MPL - Ctos de uma loja. */
  async function salvarMpl(dn, campo, valor) {
    const { data: sessao } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('metas_loja')
      .upsert(
        {
          dn: String(dn),
          [campo]: valor,
          atualizado_em: new Date().toISOString(),
          atualizado_por: sessao?.user?.id || null,
        },
        { onConflict: 'dn' }
      )
    if (error) throw error
    await carregar()
  }

  /** Alterna o status ativo/inativo do LM Consig de uma loja. */
  async function alternarLmConsig(dn) {
    const atual = metasPorDn.get(String(dn))
    const novoStatus = !atual?.lm_consig_ativo
    const { data: sessao } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('metas_loja')
      .upsert(
        {
          dn: String(dn),
          lm_consig_ativo: novoStatus,
          meta_cdc_prem: atual?.meta_cdc_prem ?? null,
          atualizado_em: new Date().toISOString(),
          atualizado_por: sessao?.user?.id || null,
        },
        { onConflict: 'dn' }
      )
    if (error) throw error
    await carregar()
  }

  /**
   * Alterna a marcação "Nova Área" de uma loja do Painel principal.
   * Ao marcar: grava o status em metas_loja E copia a linha inteira para
   * a tabela lojas_nao_cadastradas (origem = 'painel'), pra ela aparecer
   * também no painel "Não cadastradas" já com a caixinha "Nova Área" marcada.
   * Ao desmarcar: reverte os dois lados (some do painel "Não cadastradas").
   * `dadosLinha` é a linha já consolidada do Painel (vinda de useDadosPainel),
   * usada só para preencher a cópia — precisa de razao_social, endereco, etc.
   */
  async function alternarNovaArea(dn, dadosLinha = {}) {
    const atual = metasPorDn.get(String(dn))
    const novoStatus = !atual?.incluido_nova_area
    const { data: sessao } = await supabase.auth.getUser()

    const { error: erroMeta } = await supabase
      .from('metas_loja')
      .upsert(
        {
          dn: String(dn),
          incluido_nova_area: novoStatus,
          meta_cdc_prem: atual?.meta_cdc_prem ?? null,
          lm_consig_ativo: atual?.lm_consig_ativo ?? false,
          atualizado_em: new Date().toISOString(),
          atualizado_por: sessao?.user?.id || null,
        },
        { onConflict: 'dn' }
      )
    if (erroMeta) throw erroMeta

    if (novoStatus) {
      const { error: erroCopia } = await supabase
        .from('lojas_nao_cadastradas')
        .upsert(
          {
            origem: 'painel',
            dn: String(dn),
            razao_social: dadosLinha.razao_social || '',
            endereco: dadosLinha.endereco || '',
            numero: dadosLinha.numero || '',
            bairro: dadosLinha.bairro || '',
            cep: dadosLinha.cep || '',
            zona: dadosLinha.zona || '',
            potencial_categoria: dadosLinha.potencial_categoria || '',
            volume_mercado: dadosLinha.volume_mercado || 0,
            ctos_merc: dadosLinha.ctos_merc || 0,
            nova_area: true,
            atualizado_em: new Date().toISOString(),
          },
          { onConflict: 'origem,dn' }
        )
      if (erroCopia) throw erroCopia
    } else {
      const { error: erroRemover } = await supabase
        .from('lojas_nao_cadastradas')
        .delete()
        .eq('origem', 'painel')
        .eq('dn', String(dn))
      if (erroRemover) throw erroRemover
    }

    await carregar()
  }

  return { metasPorDn, carregando, salvarMeta, salvarMpl, alternarLmConsig, alternarNovaArea }
}
