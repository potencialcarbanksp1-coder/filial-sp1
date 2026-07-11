import { useState } from 'react'
import TabelaNaoCadastradas from '../components/TabelaNaoCadastradas.jsx'
import DashboardNovaArea from '../components/DashboardNovaArea.jsx'

export default function PaginaNaoCadastradas({
  linhas, producaoPorDn, producaoPorCnpj, carregando,
  alternarNovaAreaLocal, confirmarSelecao, quantidadeAlteracoesPendentes, salvandoSelecao,
  salvarAtendimento, desmarcarTodas,
  potencialTotalNovaArea, ctosMercTotalNovaArea, linhasSelecionadas,
  nomeGcm, setNomeGcm, nomeArea, setNomeArea, salvarConfigNovaArea,
}) {
  // Filtro "ver só selecionadas": mostra na tabela apenas as lojas marcadas
  // (ou pendentes de marcação) como "Nova Área" — vive aqui porque tanto o
  // botão (no mini-dashboard) quanto a tabela precisam desse mesmo estado.
  const [mostrarApenasSelecionadas, setMostrarApenasSelecionadas] = useState(false)

  return (
    <div className="pagina-secao">
      <h1 className="titulo-pagina">Mercado Potencial</h1>

      <DashboardNovaArea
        potencialTotal={potencialTotalNovaArea}
        ctosMercTotal={ctosMercTotalNovaArea}
        linhasSelecionadas={linhasSelecionadas}
        nomeGcm={nomeGcm}
        setNomeGcm={setNomeGcm}
        nomeArea={nomeArea}
        setNomeArea={setNomeArea}
        salvarConfig={salvarConfigNovaArea}
        mostrarApenasSelecionadas={mostrarApenasSelecionadas}
        setMostrarApenasSelecionadas={setMostrarApenasSelecionadas}
      />

      <div className="bloco bloco-tabela-principal">
        <TabelaNaoCadastradas
          linhas={linhas}
          producaoPorDn={producaoPorDn}
          producaoPorCnpj={producaoPorCnpj}
          carregando={carregando}
          alternarNovaAreaLocal={alternarNovaAreaLocal}
          confirmarSelecao={confirmarSelecao}
          quantidadeAlteracoesPendentes={quantidadeAlteracoesPendentes}
          salvandoSelecao={salvandoSelecao}
          salvarAtendimento={salvarAtendimento}
          desmarcarTodas={desmarcarTodas}
          potencialTotalNovaArea={potencialTotalNovaArea}
          quantidadeSelecionada={linhasSelecionadas.length}
          mostrarApenasSelecionadas={mostrarApenasSelecionadas}
        />
      </div>
    </div>
  )
}
