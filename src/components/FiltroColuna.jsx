import { useMemo } from 'react'

const LIMITE_PARA_LISTA_SUSPENSA = 25

/**
 * Filtro embutido no cabeçalho de uma coluna, estilo planilha.
 * Se a coluna tem poucos valores distintos (≤ LIMITE_PARA_LISTA_SUSPENSA),
 * mostra uma lista suspensa; caso contrário, mostra um campo de texto livre.
 */
export default function FiltroColuna({ campo, linhas, valorAtual, onMudar }) {
  const valoresDistintos = useMemo(() => {
    const conjunto = new Set(
      linhas.map((linha) => String(linha[campo] ?? '').trim()).filter(Boolean)
    )
    return Array.from(conjunto).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [linhas, campo])

  if (valoresDistintos.length > 0 && valoresDistintos.length <= LIMITE_PARA_LISTA_SUSPENSA) {
    return (
      <select
        className="filtro-coluna"
        value={valorAtual || ''}
        onChange={(e) => onMudar(campo, e.target.value)}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="">Todos</option>
        {valoresDistintos.map((v) => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>
    )
  }

  return (
    <input
      className="filtro-coluna"
      type="text"
      placeholder="Filtrar…"
      value={valorAtual || ''}
      onChange={(e) => onMudar(campo, e.target.value)}
      onClick={(e) => e.stopPropagation()}
    />
  )
}
