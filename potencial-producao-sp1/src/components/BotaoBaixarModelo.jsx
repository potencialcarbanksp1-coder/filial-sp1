import { baixarArquivoBase64 } from '../lib/baixarArquivo.js'

export default function BotaoBaixarModelo({ base64, nomeArquivo }) {
  function aoClicar() {
    baixarArquivoBase64(base64, nomeArquivo)
  }

  return (
    <button type="button" className="btn-baixar-modelo" onClick={aoClicar} title="Baixar planilha modelo">
      ↓ Baixar modelo
    </button>
  )
}
