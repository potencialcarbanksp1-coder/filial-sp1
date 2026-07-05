import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Guarda o "Nome GCM" e a "Área" do mini-dashboard do painel Não Cadastradas
 * no Supabase (tabela config_nova_area, uma linha só), pra não se perderem
 * ao trocar de aba ou recarregar a página.
 */
export function useConfigNovaArea() {
  const [nomeGcm, setNomeGcm] = useState('')
  const [nomeArea, setNomeArea] = useState('')
  const [carregado, setCarregado] = useState(false)

  useEffect(() => {
    async function carregar() {
      const { data, error } = await supabase.from('config_nova_area').select('*').eq('id', true).maybeSingle()
      if (!error && data) {
        setNomeGcm(data.nome_gcm || '')
        setNomeArea(data.nome_area || '')
      }
      setCarregado(true)
    }
    carregar()
  }, [])

  /** Salva no banco os valores atuais (chamar ao sair do campo — onBlur). */
  async function salvar(valorNomeGcm, valorNomeArea) {
    await supabase.from('config_nova_area').upsert(
      { id: true, nome_gcm: valorNomeGcm, nome_area: valorNomeArea, atualizado_em: new Date().toISOString() },
      { onConflict: 'id' }
    )
  }

  return { nomeGcm, setNomeGcm, nomeArea, setNomeArea, salvar, carregado }
}
