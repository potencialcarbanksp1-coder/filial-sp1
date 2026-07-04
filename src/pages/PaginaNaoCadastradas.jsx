import TabelaNaoCadastradas from '../components/TabelaNaoCadastradas.jsx'

export default function PaginaNaoCadastradas({
  linhas, carregando, alternarNovaAreaLinha, removerLinha, potencialTotalNovaArea, quantidadeSelecionada,
}) {
  return (
    <div className="pagina-secao">
      <h1 className="titulo-pagina">Não cadastradas</h1>
      <p className="subtitulo-pagina">
        Lojas candidatas (ainda não clientes, ou marcadas manualmente no Painel principal) para
        avaliar o potencial de uma nova área — use a coluna "Nova Área" para montar o somatório
        que embasa a decisão de contratar um novo GCM para a região.
      </p>
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
