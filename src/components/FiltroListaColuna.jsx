import { useEffect, useRef, useState } from 'react'

/**
 * Filtro "tipo lista" (igual ao autofiltro do Excel/Sheets): um dropdown com
 * checkbox para cada valor distinto encontrado na coluna. `selecionados` é
 * `null` quando todos os valores estão ativos (estado padrão, sem filtro).
 */
export default function FiltroListaColuna({ valores, valoresFormatados, selecionados, aoAlterar }) {
  const [aberto, setAberto] = useState(false)
  const refContainer = useRef(null)

  useEffect(() => {
    function aoClicarFora(e) {
      if (refContainer.current && !refContainer.current.contains(e.target)) setAberto(false)
    }
    document.addEventListener('mousedown', aoClicarFora)
    return () => document.removeEventListener('mousedown', aoClicarFora)
  }, [])

  const todosAtivos = selecionados === null
  const quantidadeAtiva = todosAtivos ? valores.length : selecionados.size
  const filtroAtivo = quantidadeAtiva < valores.length

  function alternarValor(v) {
    const atual = todosAtivos ? new Set(valores) : new Set(selecionados)
    if (atual.has(v)) atual.delete(v)
    else atual.add(v)
    aoAlterar(atual.size === valores.length ? null : atual)
  }

  return (
    <div className="filtro-lista-coluna" ref={refContainer} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={`filtro-lista-botao ${filtroActivo(filtroAtivo)}`}
        onClick={() => setAberto((a) => !a)}
        title="Filtrar por valores desta coluna"
      >
        ▾{filtroAtivo && <span className="filtro-lista-contador">{quantidadeAtiva}</span>}
      </button>
      {aberto && (
        <div className="filtro-lista-dropdown">
          <div className="filtro-lista-acoes">
            <button type="button" onClick={() => aoAlterar(null)}>Marcar todos</button>
            <button type="button" onClick={() => aoAlterar(new Set())}>Limpar</button>
          </div>
          <div className="filtro-lista-itens">
            {valores.map((v, i) => (
              <label key={String(v)} className="filtro-lista-item">
                <input
                  type="checkbox"
                  checked={todosAtivos || selecionados.has(v)}
                  onChange={() => alternarValor(v)}
                />
                <span>{valoresFormatados ? valoresFormatados[i] : String(v)}</span>
              </label>
            ))}
            {valores.length === 0 && <div className="filtro-lista-vazio">Sem valores</div>}
          </div>
        </div>
      )}
    </div>
  )
}

function filtroActivo(ativo) {
  return ativo ? 'filtro-lista-ativo' : ''
}
