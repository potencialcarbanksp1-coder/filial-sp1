import TabelaPainel from '../components/TabelaPainel.jsx'

export default function PaginaPainel({ linhas, metaMeses, filtrosColuna, definirFiltroColuna, salvarMeta, alternarLmConsig, alternarNovaArea }) {
  return (
    <div className="bloco bloco-tabela-principal">
      <TabelaPainel
        linhas={linhas}
        metaMeses={metaMeses}
        filtrosColuna={filtrosColuna}
        definirFiltroColuna={definirFiltroColuna}
        salvarMeta={salvarMeta}
        alternarLmConsig={alternarLmConsig}
        alternarNovaArea={alternarNovaArea}
      />
    </div>
  )
}
