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

  return { metasPorDn, carregando, salvarMeta, alternarLmConsig }
}
