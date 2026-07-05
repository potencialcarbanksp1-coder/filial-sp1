function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor || 0)
}

export default function Kpis({ linhas, metaMeses }) {
  const totalVolumeMercado = linhas.reduce((soma, l) => soma + l.volume_mercado, 0)
  const totalM1 = linhas.reduce((soma, l) => soma + l.producao_m1, 0)
  const totalM2 = linhas.reduce((soma, l) => soma + l.producao_m2, 0)
  const totalLojas = linhas.length

  const variacao = totalM2 > 0 ? ((totalM1 - totalM2) / totalM2) * 100 : null
  const aderencia = totalVolumeMercado > 0 ? (totalM1 / totalVolumeMercado) * 100 : null

  return (
    <div className="kpis">
      <div className="kpi">
        <div className="rotulo">Volume Mercado total</div>
        <div className="valor">{formatarMoeda(totalVolumeMercado)}</div>
      </div>
      <div className="kpi">
        <div className="rotulo">Produção {metaMeses.M1 || 'M1'}</div>
        <div className="valor">{formatarMoeda(totalM1)}</div>
      </div>
      <div className="kpi">
        <div className="rotulo">Produção {metaMeses.M2 || 'M2'}</div>
        <div className="valor">{formatarMoeda(totalM2)}</div>
      </div>
      <div className="kpi">
        <div className="rotulo">Variação M1 vs M2</div>
        <div className={`valor ${variacao > 0 ? 'positivo' : variacao < 0 ? 'negativo' : ''}`}>
          {variacao === null ? '—' : `${variacao > 0 ? '+' : ''}${variacao.toFixed(1)}%`}
        </div>
      </div>
      <div className="kpi">
        <div className="rotulo">Aderência ao mercado</div>
        <div className="valor">{aderencia === null ? '—' : `${aderencia.toFixed(1)}%`}</div>
      </div>
      <div className="kpi">
        <div className="rotulo">Lojas cadastradas</div>
        <div className="valor">{totalLojas}</div>
      </div>
    </div>
  )
}
