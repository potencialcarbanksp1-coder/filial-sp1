import { useState } from 'react'

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor || 0)
}

function formatarNumero(valor) {
  return new Intl.NumberFormat('pt-BR').format(valor || 0)
}

const CORES_POSITIVACAO = { 3: '#000080', 2: '#008000', 1: '#FF8C00', 0: '#FF0000' }

function PontoPositivacao({ valor }) {
  if (valor === null || valor === undefined) return null
  return (
    <span
      style={{
        display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
        background: CORES_POSITIVACAO[valor], marginRight: 6, flexShrink: 0,
      }}
      title={`Produziu em ${valor} de 3 meses`}
    />
  )
}

/** Um card de região candidata: resumo + lista expansível das lojas que a compõem. */
function CardRegiao({ grupo, limiarPotencial, composto, alternarComposicao }) {
  const [expandido, setExpandido] = useState(false)
  const atingeMeta = grupo.totalCtos >= limiarPotencial

  return (
    <div className={`card-regiao ${atingeMeta ? 'card-regiao-atinge-meta' : ''} ${composto ? 'card-regiao-composta' : ''}`}>
      <button type="button" className="card-regiao-cabecalho" onClick={() => setExpandido((e) => !e)}>
        <div className="card-regiao-titulo">
          <span className="card-regiao-cep">CEP {grupo.chave === '(Sem CEP)' ? grupo.chave : `${grupo.chave}***`}</span>
          {atingeMeta && <span className="badge-atinge-meta">✓ Atinge a meta</span>}
        </div>
        <span className="card-regiao-seta">{expandido ? '▾' : '▸'}</span>
      </button>

      <label className="card-regiao-compor" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={composto} onChange={() => alternarComposicao(grupo.chave)} />
        Compor Área
      </label>

      <div className="card-regiao-metricas">
        <div>
          <span className="card-regiao-metrica-rotulo">Lojas</span>
          <span className="card-regiao-metrica-valor">{grupo.lojas.length}</span>
        </div>
        <div>
          <span className="card-regiao-metrica-rotulo">Potencial</span>
          <span className="card-regiao-metrica-valor">{formatarMoeda(grupo.totalVolume)}</span>
        </div>
        <div>
          <span className="card-regiao-metrica-rotulo">Ctos Merc</span>
          <span className="card-regiao-metrica-valor card-regiao-metrica-destaque">{formatarNumero(grupo.totalCtos)}</span>
        </div>
      </div>

      {expandido && (
        <div className="card-regiao-lista">
          {grupo.lojas.map((l) => (
            <div key={l.id} className="card-regiao-loja">
              <PontoPositivacao valor={l.positivacao} />
              <div className="card-regiao-loja-info">
                <span className="card-regiao-loja-nome">{l.razao_social}</span>
                <span className="card-regiao-loja-endereco">
                  {l.endereco}{l.numero ? `, ${l.numero}` : ''} — {l.bairro} · CEP {l.cep}
                </span>
              </div>
              <span className="card-regiao-loja-status">{l.status_loja || '—'}</span>
              <span className="card-regiao-loja-valor">{formatarMoeda(l.volume_mercado)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function DashboardAnaliseRegional({
  gruposExibidos, totalGrupos, candidatas,
  incluirZeradas, setIncluirZeradas,
  digitosCep, setDigitosCep,
  limiarPotencial, setLimiarPotencial,
  apenasAcimaDoLimiar, setApenasAcimaDoLimiar,
  gruposCompostos, alternarComposicao, composicao,
  confirmarSelecao, quantidadeAlteracoesPendentes, salvandoSelecao,
}) {
  return (
    <div>
      <div className="controles-analise-regional">
        <div className="card-gcm">
          <label htmlFor="input-limiar">Meta de Ctos (contratos)</label>
          <input
            id="input-limiar"
            type="number"
            step="10"
            value={limiarPotencial}
            onChange={(e) => setLimiarPotencial(Number(e.target.value) || 0)}
          />
        </div>

        <div className="card-gcm">
          <label htmlFor="input-digitos-cep">Agrupar por dígitos do CEP</label>
          <input
            id="input-digitos-cep"
            type="number"
            min="1"
            max="8"
            value={digitosCep}
            onChange={(e) => setDigitosCep(Math.min(8, Math.max(1, Number(e.target.value) || 1)))}
          />
        </div>

        <label className="checkbox-analise-regional">
          <input type="checkbox" checked={apenasAcimaDoLimiar} onChange={(e) => setApenasAcimaDoLimiar(e.target.checked)} />
          Só mostrar acima da meta
        </label>

        <button
          type="button"
          className={`btn-primario btn-puxar-zeradas ${incluirZeradas ? 'btn-puxar-zeradas-ativo' : ''}`}
          onClick={() => setIncluirZeradas((v) => !v)}
        >
          {incluirZeradas ? '✓ Lojas zeradas incluídas' : '⬇ Puxar lojas zeradas'}
        </button>
      </div>

      <p className="resumo-analise-regional">
        {candidatas.length} loja{candidatas.length === 1 ? '' : 's'} candidata{candidatas.length === 1 ? '' : 's'} analisada{candidatas.length === 1 ? '' : 's'}
        {' '}({incluirZeradas ? 'sem GCM + zeradas nas mesmas regiões' : 'sem GCM ainda'}) · {totalGrupos} região{totalGrupos === 1 ? '' : 'ões'} encontrada{totalGrupos === 1 ? '' : 's'}
        {' '}· {gruposExibidos.length} exibida{gruposExibidos.length === 1 ? '' : 's'}
      </p>

      {composicao.quantidadeRegioes > 0 && (
        <div className="resumo-composicao">
          <div className="resumo-composicao-metricas">
            <span><strong>{composicao.quantidadeRegioes}</strong> região{composicao.quantidadeRegioes === 1 ? '' : 'ões'} composta{composicao.quantidadeRegioes === 1 ? '' : 's'}</span>
            <span><strong>{composicao.quantidadeLojas}</strong> loja{composicao.quantidadeLojas === 1 ? '' : 's'}</span>
            <span>Potencial somado: <strong>{formatarMoeda(composicao.totalVolume)}</strong></span>
            <span>Ctos somados: <strong>{formatarNumero(composicao.totalCtos)}</strong></span>
          </div>
          {quantidadeAlteracoesPendentes > 0 && (
            <button type="button" className="btn-primario btn-confirmar-selecao" onClick={confirmarSelecao} disabled={salvandoSelecao}>
              {salvandoSelecao ? 'Salvando…' : `Confirmar seleção (${quantidadeAlteracoesPendentes})`}
            </button>
          )}
        </div>
      )}

      {gruposExibidos.length === 0 ? (
        <div className="vazio-estado">
          Nenhuma região encontrada com os critérios atuais. Ajuste a meta de Ctos, os dígitos do CEP,
          ou ative "Puxar lojas zeradas" para ampliar a análise.
        </div>
      ) : (
        <div className="grade-regioes">
          {gruposExibidos.map((g) => (
            <CardRegiao
              key={g.chave}
              grupo={g}
              limiarPotencial={limiarPotencial}
              composto={gruposCompostos.has(g.chave)}
              alternarComposicao={alternarComposicao}
            />
          ))}
        </div>
      )}
    </div>
  )
}
