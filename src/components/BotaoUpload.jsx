import { useRef, useState } from 'react'

/**
 * Botão discreto de upload. Só aparece funcional para admins;
 * para visualizadores, o componente não deve nem ser renderizado (controlado pelo pai).
 */
export default function BotaoUpload({ rotulo, aoSelecionar, processando, ultimaAtualizacao }) {
  const inputRef = useRef(null)
  const [nomeArquivo, setNomeArquivo] = useState('')

  function aoClicar() {
    inputRef.current?.click()
  }

  async function aoMudarArquivo(e) {
    const arquivo = e.target.files?.[0]
    if (!arquivo) return
    setNomeArquivo(arquivo.name)
    await aoSelecionar(arquivo)
    e.target.value = '' // permite selecionar o mesmo arquivo de novo depois
  }

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
      <button
        type="button"
        className={`btn-upload-discreto ${processando ? 'enviando' : ''}`}
        onClick={aoClicar}
        disabled={processando}
        title={`Upload de ${rotulo}`}
      >
        ↑ {processando ? 'Enviando…' : rotulo}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={aoMudarArquivo}
      />
      {ultimaAtualizacao && !processando && (
        <span style={{ fontSize: '0.7rem', color: 'var(--texto-suave)' }}>
          atualizado {ultimaAtualizacao}
        </span>
      )}
    </span>
  )
}
