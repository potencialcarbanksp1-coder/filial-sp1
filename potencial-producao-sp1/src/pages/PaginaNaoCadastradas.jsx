import TabelaNaoCadastradas from '../components/TabelaNaoCadastradas.jsx'

export default function PaginaNaoCadastradas({
  linhas, carregando, alternarNovaAreaLinha, removerLinha, potencialTotalNovaArea, quantidadeSelecionada,
}) {
  return (
    <div className="pagina-secao">
      <h1 className="titulo-pagina">Não cadastradas</h1>
      <div className="bloco bloco-tabela-principal">
        <TabelaNaoCadastradas
          linhas={linhas}
          carregando={carregando}
          alternarNovaAreaLinha={alternarNovaAreaLinha}
          removerLinha={removerLinha}
          potencialTotalNovaArea={potencialTotalNovaArea}
          quantidadeSelecionada={quantidadeSelecionada}
        />
      </div>
    </div>
  )
}
