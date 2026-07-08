import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { lerArquivoPlanilha, mapearLinha, paraNumero, paraDataISO } from '../lib/planilha'
import {
  MAPA_POTENCIAL, MAPA_LOJAS, MAPA_PRODUCAO, MAPA_NAO_CADASTRADAS, separarDealer,
  CAMPOS_NUMERICOS_POTENCIAL, CAMPOS_NUMERICOS_PRODUCAO, CAMPOS_NUMERICOS_NAO_CADASTRADAS,
} from '../lib/mapaColunas'

const TAMANHO_LOTE = 500 // insere em lotes para não sobrecarregar a requisição

function somenteDigitos(texto) {
  return String(texto || '').replace(/\D/g, '')
}

async function inserirEmLotes(tabela, linhas) {
  for (let i = 0; i < linhas.length; i += TAMANHO_LOTE) {
    const lote = linhas.slice(i, i + TAMANHO_LOTE)
    const { error } = await supabase.from(tabela).insert(lote)
    if (error) throw error
  }
}

/**
 * Depois de subir o Potencial, copia a Filial/Regional (colunas T e S do
 * arquivo) para dentro da própria tabela "lojas", casando pelo CNPJ.
 * Isso é o que permite os perfis de visualização por Filial/Regional
 * funcionarem: a política de segurança do banco confere direto em
 * "lojas.filial"/"lojas.regional", sem precisar cruzar tabelas toda hora.
 */
async function sincronizarFilialRegional(linhasPotencial) {
  const mapaPorCnpj = new Map()
  for (const p of linhasPotencial) {
    const chave = somenteDigitos(p.cnpj_loja)
    if (!chave) continue
    if (!mapaPorCnpj.has(chave) && (p.filial || p.regional)) {
      mapaPorCnpj.set(chave, { filial: p.filial || null, regional: p.regional || null })
    }
  }
  if (mapaPorCnpj.size === 0) return

  const { data: lojas, error: erroLojas } = await supabase.from('lojas').select('dn, cnpj')
  if (erroLojas) throw erroLojas

  const atualizacoes = []
  for (const loja of lojas || []) {
    const info = mapaPorCnpj.get(somenteDigitos(loja.cnpj))
    if (info) atualizacoes.push({ dn: loja.dn, filial: info.filial, regional: info.regional })
  }
  if (atualizacoes.length === 0) return

  for (let i = 0; i < atualizacoes.length; i += TAMANHO_LOTE) {
    const lote = atualizacoes.slice(i, i + TAMANHO_LOTE)
    const { error } = await supabase.from('lojas').upsert(lote, { onConflict: 'dn' })
    if (error) throw error
  }
}

export function useUploads({ aoConcluir }) {
  const [processando, setProcessando] = useState(null) // qual upload está rodando: 'potencial' | 'lojas' | 'M1' | etc

  async function uploadLojas(arquivo) {
    setProcessando('lojas')
    try {
      const linhasBrutas = await lerArquivoPlanilha(arquivo)
      const linhas = linhasBrutas
        .map((linha) => {
          const mapeada = mapearLinha(linha, MAPA_LOJAS)
          if (!mapeada.dn) return null // ignora linhas sem código de loja
          return mapeada
        })
        .filter(Boolean)

      if (linhas.length === 0) {
        throw new Error('Nenhuma linha válida encontrada no arquivo (verifique se a coluna DN está preenchida).')
      }

      const { error: erroDelete } = await supabase.from('lojas').delete().neq('id', 0)
      if (erroDelete) throw erroDelete
      await inserirEmLotes('lojas', linhas)

      aoConcluir?.(`Lojas atualizadas: ${linhas.length} registros carregados.`)
    } catch (e) {
      aoConcluir?.(`Erro ao subir Lojas: ${e.message}`, true)
    } finally {
      setProcessando(null)
    }
  }

  async function uploadPotencial(arquivo) {
    setProcessando('potencial')
    try {
      const linhasBrutas = await lerArquivoPlanilha(arquivo)
      const linhas = linhasBrutas
        .map((linha) => {
          const mapeada = mapearLinha(linha, MAPA_POTENCIAL)
          if (!mapeada.cnpj_loja) return null // ignora linhas sem CNPJ (chave de ligação)
          for (const campo of CAMPOS_NUMERICOS_POTENCIAL) {
            mapeada[campo] = paraNumero(mapeada[campo])
          }
          return mapeada
        })
        .filter(Boolean)

      if (linhas.length === 0) {
        throw new Error('Nenhuma linha válida encontrada no arquivo (verifique se a coluna CNPJ_LOJA está preenchida).')
      }

      const { error: erroDelete } = await supabase.from('potencial').delete().neq('id', 0)
      if (erroDelete) throw erroDelete
      await inserirEmLotes('potencial', linhas)
      await sincronizarFilialRegional(linhas)

      aoConcluir?.(`Potencial atualizado: ${linhas.length} registros carregados.`)
    } catch (e) {
      aoConcluir?.(`Erro ao subir Potencial: ${e.message}`, true)
    } finally {
      setProcessando(null)
    }
  }

  /**
   * Sobe um arquivo de Produção em uma posição específica (M1, M2 ou M3),
   * SUBSTITUINDO apenas o conteúdo daquela posição — sem empurrar nada.
   * Use isto para corrigir/atualizar um mês já existente.
   */
  async function uploadProducao(arquivo, posicaoMes) {
    setProcessando(posicaoMes)
    try {
      const linhas = await prepararLinhasProducao(arquivo, posicaoMes)

      const { error: erroDelete } = await supabase.from('producao').delete().eq('mes_posicao', posicaoMes)
      if (erroDelete) throw erroDelete
      await inserirEmLotes('producao', linhas)

      const { error: erroRecalc } = await supabase.rpc('recalcular_rotulo_mes', { p_mes_posicao: posicaoMes })
      if (erroRecalc) throw erroRecalc

      aoConcluir?.(`Produção (${posicaoMes}) atualizada: ${linhas.length} lançamentos carregados.`)
    } catch (e) {
      aoConcluir?.(`Erro ao subir Produção ${posicaoMes}: ${e.message}`, true)
    } finally {
      setProcessando(null)
    }
  }

  /**
   * Sobe um arquivo de Produção como o NOVO mês mais recente: primeiro
   * empurra a esteira (M1 atual -> M2, M2 atual -> M3, M3 antigo é
   * descartado), e então insere o arquivo novo na posição M1.
   */
  async function uploadNovoMes(arquivo) {
    setProcessando('NOVO_MES')
    try {
      const linhas = await prepararLinhasProducao(arquivo, 'M1')

      const { error: erroRotacao } = await supabase.rpc('rotacionar_producao')
      if (erroRotacao) throw erroRotacao

      await inserirEmLotes('producao', linhas)

      const { error: erroRecalc } = await supabase.rpc('recalcular_rotulo_mes', { p_mes_posicao: 'M1' })
      if (erroRecalc) throw erroRecalc

      aoConcluir?.(`Novo mês carregado em M1: ${linhas.length} lançamentos. A esteira foi avançada (M1→M2→M3).`)
    } catch (e) {
      aoConcluir?.(`Erro ao subir Novo mês: ${e.message}`, true)
    } finally {
      setProcessando(null)
    }
  }

  /**
   * Sobe a planilha de Lojas Não Cadastradas (candidatas para uma nova área).
   * Apaga e substitui só as linhas que vieram de upload (origem = 'upload'),
   * preservando as linhas copiadas manualmente do Painel principal
   * (origem = 'painel'), que não vêm desse arquivo.
   */
  async function uploadNaoCadastradas(arquivo) {
    setProcessando('nao_cadastradas')
    try {
      const linhasBrutas = await lerArquivoPlanilha(arquivo)
      const linhas = linhasBrutas
        .map((linha) => {
          const mapeada = mapearLinha(linha, MAPA_NAO_CADASTRADAS)
          if (!mapeada.cnpj_loja && !mapeada.razao_social) return null // ignora linhas vazias
          for (const campo of CAMPOS_NUMERICOS_NAO_CADASTRADAS) {
            mapeada[campo] = paraNumero(mapeada[campo])
          }
          mapeada.origem = 'upload'
          mapeada.nova_area = false
          return mapeada
        })
        .filter(Boolean)

      if (linhas.length === 0) {
        throw new Error('Nenhuma linha válida encontrada no arquivo (verifique se há CNPJ_LOJA ou RAZAO_SOCIAL preenchidos).')
      }

      const { error: erroDelete } = await supabase.from('lojas_nao_cadastradas').delete().eq('origem', 'upload')
      if (erroDelete) throw erroDelete
      await inserirEmLotes('lojas_nao_cadastradas', linhas)

      aoConcluir?.(`Lojas não cadastradas atualizadas: ${linhas.length} registros carregados.`)
    } catch (e) {
      aoConcluir?.(`Erro ao subir Lojas não cadastradas: ${e.message}`, true)
    } finally {
      setProcessando(null)
    }
  }

  /** Lê e prepara as linhas do arquivo de Produção (lógica compartilhada pelos dois uploads acima). */
  async function prepararLinhasProducao(arquivo, posicaoMes) {
    const linhasBrutas = await lerArquivoPlanilha(arquivo)
    const linhas = linhasBrutas
      .map((linha) => {
        const mapeada = mapearLinha(linha, MAPA_PRODUCAO)
        if (!mapeada.dealer) return null

        // Separa o campo DEALER bruto ("60441-NOME DA LOJA") em código + nome,
        // equivalente ao "Texto por colunas" do Excel usando "-" como delimitador.
        const { dn, dealer_nome } = separarDealer(mapeada.dealer)
        mapeada.dn = dn
        mapeada.dealer_nome = dealer_nome
        delete mapeada.dealer // não existe essa coluna na tabela; guardamos dn e dealer_nome

        mapeada.pagamento = paraDataISO(mapeada.pagamento)
        for (const campo of CAMPOS_NUMERICOS_PRODUCAO) {
          mapeada[campo] = paraNumero(mapeada[campo])
        }
        mapeada.mes_posicao = posicaoMes
        return mapeada
      })
      .filter(Boolean)

    if (linhas.length === 0) {
      throw new Error('Nenhuma linha válida encontrada no arquivo (verifique se a coluna DEALER está preenchida).')
    }
    return linhas
  }

  return { processando, uploadPotencial, uploadLojas, uploadProducao, uploadNovoMes, uploadNaoCadastradas }
}
