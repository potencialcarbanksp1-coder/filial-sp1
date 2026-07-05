function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor || 0)
}

function formatarNumero(valor) {
  return new Intl.NumberFormat('pt-BR').format(valor || 0)
}

/**
 * Mini-dashboard no topo do painel "Não Cadastradas": nome do GCM e da área
 * (ficam gravados no banco — não somem ao trocar de aba ou recarregar),
 * os totais acumulados das lojas marcadas como "Nova Área", e um botão
 * pra baixar tudo em Excel.
 */
export default function DashboardNovaArea({
  potencialTotal, ctosMercTotal, linhasSelecionadas,
  nomeGcm, setNomeGcm, nomeArea, setNomeArea, salvarConfig,
}) {
  const quantidadeSelecionada = linhasSelecionadas.length

  async function baixarRelatorio() {
    const XLSX = await import('xlsx')
    const dataHoje = new Date().toLocaleDateString('pt-BR')

    const cabecalhoResumo = [
      ['Relatório de Potencial — Nova Área'],
      [],
      ['GCM sugerido', nomeGcm || '(não informado)'],
      ['Área', nomeArea || '(não informado)'],
      ['Data de geração', dataHoje],
      ['Quantidade de lojas selecionadas', quantidadeSelecionada],
      ['Potencial total (Volume Mercado)', potencialTotal],
      ['Total Ctos Merc (usados)', ctosMercTotal],
      [],
    ]

    const colunasLojas = [
      'CNPJ', 'Razão social', 'Endereço', 'Nº', 'Bairro', 'Cidade', 'CEP',
      'Microrregião', 'Status', 'Potencial', 'Volume Mercado', 'Ctos Merc (usados)',
    ]
    const linhasLojas = linhasSelecionadas.map((l) => [
      l.cnpj_loja, l.razao_social, l.endereco, l.numero, l.bairro, l.cidade, l.cep,
      l.microrregiao, l.status_loja, l.potencial_categoria, l.volume_mercado, l.ctos_merc,
    ])

    const planilha = XLSX.utils.aoa_to_sheet([...cabecalhoResumo, colunasLojas, ...linhasLojas])
    planilha['!cols'] = colunasLojas.map(() => ({ wch: 18 }))

    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, planilha, 'Nova Área')

    const nomeArquivo = `Relatorio_Nova_Area${nomeArea ? '_' + nomeArea.replace(/\s+/g, '_') : ''}.xlsx`
    XLSX.writeFile(livro, nomeArquivo)
  }

  return (
    <div className="dashboard-nova-area">
      <div className="card-nova-area">
        <label htmlFor="input-nome-gcm">Nome GCM</label>
        <input
          id="input-nome-gcm"
          type="text"
          placeholder="Ex: João da Silva"
          value={nomeGcm}
          onChange={(e) => setNomeGcm(e.target.value)}
          onBlur={() => salvarConfig(nomeGcm, nomeArea)}
        />
      </div>

      <div className="card-nova-area card-nova-area-numero">
        <span className="card-nova-area-rotulo">Potencial selecionado</span>
        <span className="card-nova-area-valor">{formatarMoeda(potencialTotal)}</span>
      </div>

      <div className="card-nova-area card-nova-area-numero">
        <span className="card-nova-area-rotulo">Ctos Merc (usados)</span>
        <span className="card-nova-area-valor">{formatarNumero(ctosMercTotal)}</span>
      </div>

      <div className="card-nova-area">
        <label htmlFor="input-nome-area">Área</label>
        <input
          id="input-nome-area"
          type="text"
          placeholder="Ex: Zona Leste 2"
          value={nomeArea}
          onChange={(e) => setNomeArea(e.target.value)}
          onBlur={() => salvarConfig(nomeGcm, nomeArea)}
        />
      </div>

      <button type="button" className="btn-primario btn-baixar-relatorio" onClick={baixarRelatorio}>
        ⬇ Relatório Excel
      </button>
    </div>
  )
}
