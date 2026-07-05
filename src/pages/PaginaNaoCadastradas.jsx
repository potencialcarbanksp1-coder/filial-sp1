import TabelaNaoCadastradas from '../components/TabelaNaoCadastradas.jsx'
import DashboardNovaArea from '../components/DashboardNovaArea.jsx'

export default function PaginaNaoCadastradas({
  linhas, carregando, alternarNovaAreaLinha, removerLinha,
  potencialTotalNovaArea, ctosMercTotalNovaArea, linhasSelecionadas,
  nomeGcm, setNomeGcm, nomeArea, setNomeArea, salvarConfigNovaArea,
}) {
  return (
    <div className="pagina-secao">
      <h1 className="titulo-pagina">Não cadastradas</h1>

      <DashboardNovaArea
        potencialTotal={potencialTotalNovaArea}
        ctosMercTotal={ctosMercTotalNovaArea}
        linhasSelecionadas={linhasSelecionadas}
        nomeGcm={nomeGcm}
        setNomeGcm={setNomeGcm}
        nomeArea={nomeArea}
        setNomeArea={setNomeArea}
        salvarConfig={salvarConfigNovaArea}
      />

      <div className="bloco bloco-tabela-principal">
        <TabelaNaoCadastradas
          linhas={linhas}
          carregando={carregando}
          alternarNovaAreaLinha={alternarNovaAreaLinha}
          removerLinha={removerLinha}
          potencialTotalNovaArea={potencialTotalNovaArea}
          quantidadeSelecionada={linhasSelecionadas.length}
        />
      </div>
    </div>
  )
}
