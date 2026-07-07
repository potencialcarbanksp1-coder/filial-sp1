import TabelaPainel from '../components/TabelaPainel.jsx'
import DashboardGcm from '../components/DashboardGcm.jsx'

export default function PaginaPainel({ linhas, metaMeses, salvarMeta, alternarLmConsig, alternarNovaArea }) {
  return (
    <>
      <DashboardGcm linhas={linhas} />
      <div className="bloco bloco-tabela-principal">
        <TabelaPainel
          linhas={linhas}
          metaMeses={metaMeses}
          salvarMeta={salvarMeta}
          alternarLmConsig={alternarLmConsig}
          alternarNovaArea={alternarNovaArea}
        />
      </div>
    </>
  )
}
