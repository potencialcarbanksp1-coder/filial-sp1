import TabelaPainel from '../components/TabelaPainel.jsx'

export default function PaginaPainel({ linhas, metaMeses, salvarMeta, alternarLmConsig, alternarNovaArea }) {
  return (
    <div className="bloco bloco-tabela-principal">
      <TabelaPainel
        linhas={linhas}
        metaMeses={metaMeses}
        salvarMeta={salvarMeta}
        alternarLmConsig={alternarLmConsig}
        alternarNovaArea={alternarNovaArea}
      />
    </div>
  )
}
