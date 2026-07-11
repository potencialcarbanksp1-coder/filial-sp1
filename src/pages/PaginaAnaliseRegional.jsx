import DashboardAnaliseRegional from '../components/DashboardAnaliseRegional.jsx'
import { useAnaliseRegional } from '../hooks/useAnaliseRegional.js'

export default function PaginaAnaliseRegional({
  linhas, producaoPorDn, producaoPorCnpj,
  definirNovaAreaEmLote, confirmarSelecao, quantidadeAlteracoesPendentes, salvandoSelecao,
}) {
  const analise = useAnaliseRegional(linhas, producaoPorDn, producaoPorCnpj, definirNovaAreaEmLote)

  return (
    <div className="pagina-secao">
      <h1 className="titulo-pagina">Análise Regional</h1>
      <p className="subtitulo-pagina">
        Agrupa lojas candidatas (sem GCM definido, ou já clientes com zero produção) por proximidade de CEP,
        para identificar regiões com potencial suficiente para justificar uma nova área/contratação. Marque
        "Compor Área" em dois ou mais cards para somar o potencial deles e já marcar essas lojas como
        "Nova Área" no Mercado Potencial.
      </p>
      <div className="bloco">
        <DashboardAnaliseRegional
          gruposExibidos={analise.gruposExibidos}
          totalGrupos={analise.grupos.length}
          candidatas={analise.candidatas}
          incluirZeradas={analise.incluirZeradas}
          setIncluirZeradas={analise.setIncluirZeradas}
          digitosCep={analise.digitosCep}
          setDigitosCep={analise.setDigitosCep}
          limiarPotencial={analise.limiarPotencial}
          setLimiarPotencial={analise.setLimiarPotencial}
          apenasAcimaDoLimiar={analise.apenasAcimaDoLimiar}
          setApenasAcimaDoLimiar={analise.setApenasAcimaDoLimiar}
          gruposCompostos={analise.gruposCompostos}
          alternarComposicao={analise.alternarComposicao}
          composicao={analise.composicao}
          confirmarSelecao={confirmarSelecao}
          quantidadeAlteracoesPendentes={quantidadeAlteracoesPendentes}
          salvandoSelecao={salvandoSelecao}
        />
      </div>
    </div>
  )
}
