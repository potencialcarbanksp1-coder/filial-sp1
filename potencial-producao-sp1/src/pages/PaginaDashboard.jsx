import Kpis from '../components/Kpis.jsx'
import EsteiraDeMeses from '../components/EsteiraDeMeses.jsx'

export default function PaginaDashboard({ linhas, metaMeses }) {
  return (
    <div className="pagina-secao">
      <h1 className="titulo-pagina">Dashboard</h1>
      <EsteiraDeMeses metaMeses={metaMeses} />
      <Kpis linhas={linhas} metaMeses={metaMeses} />
    </div>
  )
}
