import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth.jsx'
import { useDadosPainel } from '../hooks/useDadosPainel.js'
import { useUploads } from '../hooks/useUploads.js'
import { useLojasNaoCadastradas } from '../hooks/useLojasNaoCadastradas.js'
import { useConfigNovaArea } from '../hooks/useConfigNovaArea.js'
import MenuLateral from '../components/MenuLateral.jsx'
import PaginaPainel from './PaginaPainel.jsx'
import PaginaDashboard from './PaginaDashboard.jsx'
import PaginaUpload from './PaginaUpload.jsx'
import PaginaNaoCadastradas from './PaginaNaoCadastradas.jsx'

export default function Painel() {
  const { perfil, ehAdmin, sair } = useAuth()
  const { linhasConsolidadas, metaMeses, carregando, recarregar, salvarMeta, alternarLmConsig, alternarNovaArea } = useDadosPainel()
  const naoCadastradas = useLojasNaoCadastradas()
  const configNovaArea = useConfigNovaArea()
  const [mensagem, setMensagem] = useState(null) // { texto, ehErro }
  const [confirmandoNovoMes, setConfirmandoNovoMes] = useState(null) // arquivo aguardando confirmação
  const [filtrosColuna, setFiltrosColuna] = useState({}) // { nomeCampo: valorFiltro }
  const [secaoAtiva, setSecaoAtiva] = useState('painel') // 'painel' | 'dashboard' | 'upload'
  const [menuExpandido, setMenuExpandido] = useState(true)

  function aoConcluirUpload(texto, ehErro = false) {
    setMensagem({ texto, ehErro })
    recarregar()
    naoCadastradas.recarregar()
    setTimeout(() => setMensagem(null), 6000)
  }

  const { processando, uploadPotencial, uploadLojas, uploadProducao, uploadNovoMes, uploadNaoCadastradas } = useUploads({ aoConcluir: aoConcluirUpload })

  function aoEscolherArquivoNovoMes(arquivo) {
    // Pede confirmação antes de rotacionar a esteira; o upload de fato
    // só roda depois que o usuário confirmar no modal.
    setConfirmandoNovoMes(arquivo)
    return Promise.resolve()
  }

  function confirmarNovoMes() {
    const arquivo = confirmandoNovoMes
    setConfirmandoNovoMes(null)
    uploadNovoMes(arquivo)
  }

  async function aoAlternarNovaArea(dn, dadosLinha) {
    await alternarNovaArea(dn, dadosLinha)
    naoCadastradas.recarregar()
  }

  function definirFiltroColuna(campo, valor) {
    setFiltrosColuna((atual) => ({ ...atual, [campo]: valor }))
  }

  // Visualizadores não têm acesso à seção de Upload nem à de Não cadastradas —
  // se por algum motivo a seção ativa for uma dessas e o usuário não for admin, volta para o Painel.
  const secaoEfetiva = !ehAdmin && (secaoAtiva === 'upload' || secaoAtiva === 'nao_cadastradas') ? 'painel' : secaoAtiva

  const linhasFiltradas = useMemo(() => {
    return linhasConsolidadas.filter((linha) =>
      Object.entries(filtrosColuna).every(([campo, valorFiltro]) => {
        if (!valorFiltro) return true
        const valorLinha = String(linha[campo] ?? '').toLowerCase()
        return valorLinha.includes(String(valorFiltro).toLowerCase())
      })
    )
  }, [linhasConsolidadas, filtrosColuna])

  return (
    <div className="app-shell">
      <header className="topo">
        <div className="marca">Painel <span className="x">×</span> Produção</div>
        <div className="usuario">
          <span>{perfil?.nome || perfil?.email}</span>
          <span className={`badge-papel ${ehAdmin ? 'admin' : 'visualizador'}`}>
            {ehAdmin ? 'Admin' : 'Visualizador'}
          </span>
          <button className="btn-sair" onClick={sair}>Sair</button>
        </div>
      </header>

      <div className="corpo-com-menu">
        <MenuLateral
          secaoAtiva={secaoEfetiva}
          definirSecaoAtiva={setSecaoAtiva}
          expandido={menuExpandido}
          alternarExpandido={() => setMenuExpandido((v) => !v)}
          ehAdmin={ehAdmin}
        />

        <main className="conteudo">
          {mensagem && (
            <div className={mensagem.ehErro ? 'erro-form' : 'aviso-sucesso'}>{mensagem.texto}</div>
          )}

          {carregando ? (
            <div className="status-carregando">Carregando dados…</div>
          ) : secaoEfetiva === 'dashboard' ? (
            <PaginaDashboard linhas={linhasConsolidadas} metaMeses={metaMeses} />
          ) : secaoEfetiva === 'upload' ? (
            <PaginaUpload
              metaMeses={metaMeses}
              processando={processando}
              uploadPotencial={uploadPotencial}
              uploadLojas={uploadLojas}
              uploadProducao={uploadProducao}
              aoEscolherArquivoNovoMes={aoEscolherArquivoNovoMes}
              uploadNaoCadastradas={uploadNaoCadastradas}
            />
          ) : secaoEfetiva === 'nao_cadastradas' ? (
            <PaginaNaoCadastradas
              linhas={naoCadastradas.linhas}
              carregando={naoCadastradas.carregando}
              alternarNovaAreaLinha={naoCadastradas.alternarNovaAreaLinha}
              removerLinha={naoCadastradas.removerLinha}
              potencialTotalNovaArea={naoCadastradas.potencialTotalNovaArea}
              ctosMercTotalNovaArea={naoCadastradas.ctosMercTotalNovaArea}
              linhasSelecionadas={naoCadastradas.linhasSelecionadas}
              nomeGcm={configNovaArea.nomeGcm}
              setNomeGcm={configNovaArea.setNomeGcm}
              nomeArea={configNovaArea.nomeArea}
              setNomeArea={configNovaArea.setNomeArea}
              salvarConfigNovaArea={configNovaArea.salvar}
            />
          ) : (
            <PaginaPainel
              linhas={linhasFiltradas}
              metaMeses={metaMeses}
              filtrosColuna={filtrosColuna}
              definirFiltroColuna={definirFiltroColuna}
              salvarMeta={salvarMeta}
              alternarLmConsig={alternarLmConsig}
              alternarNovaArea={aoAlternarNovaArea}
            />
          )}
        </main>
      </div>

      {confirmandoNovoMes && (
        <div className="modal-fundo" role="dialog" aria-modal="true">
          <div className="modal-caixa">
            <h3>Avançar a esteira de meses?</h3>
            <p>
              O conteúdo atual de M1 ({metaMeses.M1 || 'sem dados'}) será movido para M2,
              o conteúdo de M2 será movido para M3, e o M3 atual será descartado.
              O arquivo selecionado entra como o novo M1.
            </p>
            <div className="modal-acoes">
              <button className="btn-secundario" onClick={() => setConfirmandoNovoMes(null)}>Cancelar</button>
              <button className="btn-primario" style={{ width: 'auto', padding: '8px 16px' }} onClick={confirmarNovoMes}>
                Confirmar e avançar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
