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
  const { linhasConsolidadas, metaMeses, carregando, recarregar, salvarMeta, salvarMpl, alternarLmConsig, alternarNovaArea } = useDadosPainel()
  const naoCadastradas = useLojasNaoCadastradas()
  const configNovaArea = useConfigNovaArea()

  // Mapa DN -> produção de M1/M2/M3, e também CNPJ -> produção, usados pela
  // coluna "Produção 3 meses" do Mercado Potencial. O cruzamento por CNPJ é o
  // que importa: a planilha de Mercado Potencial não traz o DN, então é pelo
  // CNPJ que conseguimos identificar se aquela loja já é cliente e achar a
  // produção dela no Painel principal.
  const producaoPorDn = useMemo(() => {
    const mapa = new Map()
    for (const l of linhasConsolidadas) {
      mapa.set(String(l.codigo), { m1: l.producao_m1, m2: l.producao_m2, m3: l.producao_m3 })
    }
    return mapa
  }, [linhasConsolidadas])

  const producaoPorCnpj = useMemo(() => {
    const mapa = new Map()
    for (const l of linhasConsolidadas) {
      const chave = String(l.cnpj || '').replace(/\D/g, '')
      if (chave) mapa.set(chave, { m1: l.producao_m1, m2: l.producao_m2, m3: l.producao_m3 })
    }
    return mapa
  }, [linhasConsolidadas])
  const [mensagem, setMensagem] = useState(null) // { texto, ehErro }
  const [confirmandoNovoMes, setConfirmandoNovoMes] = useState(null) // arquivo aguardando confirmação
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

  async function aoDesmarcarTodas() {
    await naoCadastradas.desmarcarTodas()
    recarregar() // atualiza os checkboxes "Nova Área" do Painel principal também
  }

  // Visualizadores não têm acesso à seção de Upload nem à de Não cadastradas —
  // se por algum motivo a seção ativa for uma dessas e o usuário não for admin, volta para o Painel.
  const secaoEfetiva = !ehAdmin && (secaoAtiva === 'upload' || secaoAtiva === 'nao_cadastradas') ? 'painel' : secaoAtiva

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
              producaoPorDn={producaoPorDn}
              producaoPorCnpj={producaoPorCnpj}
              carregando={naoCadastradas.carregando}
              alternarNovaAreaLocal={naoCadastradas.alternarNovaAreaLocal}
              confirmarSelecao={naoCadastradas.confirmarSelecao}
              quantidadeAlteracoesPendentes={naoCadastradas.quantidadeAlteracoesPendentes}
              salvandoSelecao={naoCadastradas.salvandoSelecao}
              salvarAtendimento={naoCadastradas.salvarAtendimento}
              desmarcarTodas={aoDesmarcarTodas}
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
              linhas={linhasConsolidadas}
              metaMeses={metaMeses}
              salvarMeta={salvarMeta}
              salvarMpl={salvarMpl}
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
