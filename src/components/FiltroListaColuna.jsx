import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Filtro "tipo lista" (igual ao autofiltro do Excel/Sheets): um dropdown com
 * checkbox para cada valor distinto encontrado na coluna. `selecionados` é
 * `null` quando todos os valores estão ativos (estado padrão, sem filtro).
 *
 * O dropdown é renderizado via portal direto no <body>, posicionado por
 * coordenadas (getBoundingClientRect), pra não ficar cortado/escondido pelo
 * "overflow" da área de rolagem da tabela.
 */
export default function FiltroListaColuna({ valores, valoresFormatados, selecionados, aoAlterar }) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState({ top: 0, left: 0 })
  const refBotao = useRef(null)
  const refDropdown = useRef(null)

  function abrir() {
    const retangulo = refBotao.current?.getBoundingClientRect()
    if (retangulo) {
      setPosicao({ top: retangulo.bottom + 4, left: retangulo.left })
    }
    setAberto(true)
  }

  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(e) {
      if (refDropdown.current && refDropdown.current.contains(e.target)) return
      if (refBotao.current && refBotao.current.contains(e.target)) return
      setAberto(false)
    }
    // Fecha ao rolar (a posição calculada por coordenadas ficaria desatualizada).
    function aoRolar() {
      setAberto(false)
    }

    document.addEventListener('mousedown', aoClicarFora)
    window.addEventListener('scroll', aoRolar, true)
    window.addEventListener('resize', aoRolar)
    return () => {
      document.removeEventListener('mousedown', aoClicarFora)
      window.removeEventListener('scroll', aoRolar, true)
      window.removeEventListener('resize', aoRolar)
    }
  }, [aberto])

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
    <div className="filtro-lista-coluna">
      <button
        ref={refBotao}
        type="button"
        className={`filtro-lista-botao ${filtroAtivo ? 'filtro-lista-ativo' : ''}`}
        onClick={() => (aberto ? setAberto(false) : abrir())}
        title="Filtrar por valores desta coluna"
      >
        ▾{filtroAtivo && <span className="filtro-lista-contador">{quantidadeAtiva}</span>}
      </button>

      {aberto && createPortal(
        <div
          ref={refDropdown}
          className="filtro-lista-dropdown"
          style={{ position: 'fixed', top: posicao.top, left: posicao.left }}
        >
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
        </div>,
        document.body
      )}
    </div>
  )
}
