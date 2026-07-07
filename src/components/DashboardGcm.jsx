import { useMemo, useState } from 'react'

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor || 0)
}

function formatarNumero(valor) {
  return new Intl.NumberFormat('pt-BR').format(valor || 0)
}

/**
 * Mini-dashboard no topo do Painel principal: um seletor de GCM e 4 caixinhas
 * (Nome, Potencial, Produção Atual M1, Ctos).
 *
 * - Com "Todos os GCMs" selecionado: mostra "Filial" e os totais gerais.
 * - Com um GCM específico selecionado: mostra o nome dele e os totais só
 *   das lojas dele — e, nesse caso, o Potencial e os Ctos já vêm DESCONTANDO
 *   as lojas que estiverem marcadas como "Nova Área" (simulando quanto
 *   sobraria pro GCM se essas lojas saíssem pra uma nova área/GCM novo).
 *   A Produção Atual (M1) não é afetada por essa marcação.
 */
export default function DashboardGcm({ linhas }) {
  const [gcmSelecionado, setGcmSelecionado] = useState('') // '' = Todos os GCMs

  const listaGcms = useMemo(() => {
    const vistos = new Set()
    for (const l of linhas) {
      if (l.gcm) vistos.add(l.gcm)
    }
    return Array.from(vistos).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [linhas])

  const { nomeExibido, potencialTotal, producaoAtualTotal, ctosTotal } = useMemo(() => {
    const linhasDoEscopo = gcmSelecionado ? linhas.filter((l) => l.gcm === gcmSelecionado) : linhas

    // Produção Atual (M1): soma direta, sempre — não é afetada pela marcação "Nova Área".
    const producao = linhasDoEscopo.reduce((soma, l) => soma + (Number(l.producao_m1) || 0), 0)

    let potencial, ctos
    if (gcmSelecionado) {
      // Com um GCM específico: desconta as lojas já marcadas "Nova Área" —
      // simula quanto sobra de potencial/contratos pro GCM atual.
      const linhasRestantes = linhasDoEscopo.filter((l) => !l.incluido_nova_area)
      potencial = linhasRestantes.reduce((soma, l) => soma + (Number(l.volume_mercado) || 0), 0)
      ctos = linhasRestantes.reduce((soma, l) => soma + (Number(l.qtd_m1) || 0), 0)
    } else {
      // "Todos os GCMs": total geral da Filial, sem desconto (as lojas
      // continuam dentro da Filial, só mudam de dono entre GCMs).
      potencial = linhasDoEscopo.reduce((soma, l) => soma + (Number(l.volume_mercado) || 0), 0)
      ctos = linhasDoEscopo.reduce((soma, l) => soma + (Number(l.qtd_m1) || 0), 0)
    }

    return {
      nomeExibido: gcmSelecionado || 'Filial',
      potencialTotal: potencial,
      producaoAtualTotal: producao,
      ctosTotal: ctos,
    }
  }, [linhas, gcmSelecionado])

  return (
    <div className="dashboard-gcm">
      <div className="card-gcm">
        <label htmlFor="select-gcm">GCM</label>
        <select id="select-gcm" value={gcmSelecionado} onChange={(e) => setGcmSelecionado(e.target.value)}>
          <option value="">Todos os GCMs</option>
          {listaGcms.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
      </div>

      <div className="card-gcm card-gcm-numero">
        <span className="card-gcm-rotulo">Nome</span>
        <span className="card-gcm-valor">{nomeExibido}</span>
      </div>

      <div className="card-gcm card-gcm-numero">
        <span className="card-gcm-rotulo">Potencial</span>
        <span className="card-gcm-valor">{formatarMoeda(potencialTotal)}</span>
      </div>

      <div className="card-gcm card-gcm-numero">
        <span className="card-gcm-rotulo">Produção Atual (M1)</span>
        <span className="card-gcm-valor">{formatarMoeda(producaoAtualTotal)}</span>
      </div>

      <div className="card-gcm card-gcm-numero">
        <span className="card-gcm-rotulo">Ctos</span>
        <span className="card-gcm-valor">{formatarNumero(ctosTotal)}</span>
      </div>
    </div>
  )
}
