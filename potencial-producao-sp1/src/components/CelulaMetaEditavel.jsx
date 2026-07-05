import { useState } from 'react'

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
}

/**
 * Célula editável da Meta CDC Prem.
 * Sem valor definido: mostra um ícone "+" discreto.
 * Com valor definido: mostra o valor formatado como moeda; clicar nele reabre a edição.
 */
export default function CelulaMetaEditavel({ dn, valorAtual, aoSalvar }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const [salvando, setSalvando] = useState(false)

  function iniciarEdicao() {
    setRascunho(valorAtual != null ? String(valorAtual) : '')
    setEditando(true)
  }

  async function confirmar() {
    const numero = parseFloat(String(rascunho).replace(/\./g, '').replace(',', '.'))
    if (isNaN(numero)) {
      setEditando(false)
      return
    }
    setSalvando(true)
    try {
      await aoSalvar(dn, numero)
      setEditando(false)
    } finally {
      setSalvando(false)
    }
  }

  function aoTeclar(e) {
    if (e.key === 'Enter') confirmar()
    if (e.key === 'Escape') setEditando(false)
  }

  if (editando) {
    return (
      <input
        className="input-meta-editavel"
        type="text"
        autoFocus
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={confirmar}
        onKeyDown={aoTeclar}
        placeholder="0,00"
        disabled={salvando}
      />
    )
  }

  if (valorAtual === null || valorAtual === undefined) {
    return (
      <button className="btn-adicionar-meta" onClick={iniciarEdicao} title="Definir meta">
        +
      </button>
    )
  }

  return (
    <button className="valor-meta-definido" onClick={iniciarEdicao} title="Clique para editar a meta">
      {formatarMoeda(valorAtual)}
    </button>
  )
}
