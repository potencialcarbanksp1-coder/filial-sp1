import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * Filtro "tipo lista" (igual ao autofiltro do Excel/Sheets): um dropdown com
 * checkbox para cada valor distinto encontrado na coluna, mais um campo de
 * busca no topo pra encontrar rápido um valor específico em listas longas.
 * `selecionados` é `null` quando todos os valores estão ativos (padrão, sem filtro).
 *
 * O dropdown é renderizado via portal direto no <body>, posicionado por
 * coordenadas (getBoundingClientRect), pra não ficar cortado/escondido pelo
 * "overflow" da área de rolagem da tabela.
 */
export default function FiltroListaColuna({ valores, valoresFormatados, selecionados, aoAlterar }) {
  const [aberto, setAberto] = useState(false)
  const [posicao, setPosicao] = useState({ top: 0, left: 0 })
  const [busca, setBusca] = useState('')
  const refBotao = useRef(null)
  const refDropdown = useRef(null)
  const refBusca = useRef(null)

  function abrir() {
    const retangulo = refBotao.current?.getBoundingClientRect()
    if (retangulo) {
      setPosicao({ top: retangulo.bottom + 4, left: retangulo.left })
    }
    setBusca('')
    setAberto(true)
  }

  // Foca automaticamente o campo de busca assim que o dropdown abre.
  useEffect(() => {
    if (aberto) {
      const id = setTimeout(() => refBusca.current?.focus(), 0)
      return () => clearTimeout(id)
    }
  }, [aberto])

  useEffect(() => {
    if (!aberto) return

    function aoClicarFora(e) {
      if (refDropdown.current && refDropdown.current.contains(e.target)) return
      if (refBotao.current && refBotao.current.contains(e.target)) return
      setAberto(false)
    }
    // Fecha ao rolar a PÁGINA/tabela (a posição calculada por coordenadas ficaria
    // desatualizada) — mas ignora rolagem que aconteça dentro do próprio dropdown
    // (ex: rolando a lista de opções), senão ele fecha sozinho ao tentar escolher.
    function aoRolar(e) {
      if (refDropdown.current && refDropdown.current.contains(e.target)) return
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

  // Índices dos valores que batem com o texto de busca (ou todos, se a busca estiver vazia).
  const indicesVisiveis = useMemo(() => {
    if (!busca.trim()) return valores.map((_, i) => i)
    const termo = busca.trim().toLowerCase()
    return valores
      .map((v, i) => ({ i, texto: String(valoresFormatados ? valoresFormatados[i] : v).toLowerCase() }))
      .filter(({ texto }) => texto.includes(termo))
      .map(({ i }) => i)
  }, [valores, valoresFormatados, busca])

  function alternarValor(v) {
    const atual = todosAtivos ? new Set(valores) : new Set(selecionados)
    if (atual.has(v)) atual.delete(v)
    else atual.add(v)
    aoAlterar(atual.size === valores.length ? null : atual)
  }

  // "Marcar todos" e "Limpar" agem só sobre os itens que estão visíveis no
  // momento (considerando a busca atual) — igual ao autofiltro do Excel:
  // buscar, marcar/desmarcar só o que apareceu, sem perder o resto da seleção.
  function marcarTodosVisiveis() {
    const atual = todosAtivos ? new Set(valores) : new Set(selecionados)
    for (const i of indicesVisiveis) atual.add(valores[i])
    aoAlterar(atual.size === valores.length ? null : atual)
  }

  function limparVisiveis() {
    const atual = todosAtivos ? new Set(valores) : new Set(selecionados)
    for (const i of indicesVisiveis) atual.delete(valores[i])
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
          <input
            ref={refBusca}
            type="text"
            className="filtro-lista-busca"
            placeholder="Buscar..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="filtro-lista-acoes">
            <button type="button" onClick={marcarTodosVisiveis}>Marcar {busca.trim() ? 'visíveis' : 'todos'}</button>
            <button type="button" onClick={limparVisiveis}>Limpar {busca.trim() ? 'visíveis' : ''}</button>
          </div>
          <div className="filtro-lista-itens">
            {indicesVisiveis.map((i) => {
              const v = valores[i]
              return (
                <label key={String(v)} className="filtro-lista-item">
                  <input
                    type="checkbox"
                    checked={todosAtivos || selecionados.has(v)}
                    onChange={() => alternarValor(v)}
                  />
                  <span>{valoresFormatados ? valoresFormatados[i] : String(v)}</span>
                </label>
              )
            })}
            {indicesVisiveis.length === 0 && (
              <div className="filtro-lista-vazio">{valores.length === 0 ? 'Sem valores' : 'Nenhum resultado para a busca'}</div>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
