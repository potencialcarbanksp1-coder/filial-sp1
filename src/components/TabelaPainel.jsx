import { useEffect, useRef, useState } from 'react'
import FiltroColuna from './FiltroColuna.jsx'
import CelulaMetaEditavel from './CelulaMetaEditavel.jsx'
import IconeLmConsig from './IconeLmConsig.jsx'

function formatarMoeda(valor) {
  if (!valor) return <span className="num-vazio">—</span>
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
}

function formatarNumero(valor) {
  if (!valor) return <span className="num-vazio">0</span>
  return new Intl.NumberFormat('pt-BR').format(valor)
}

// Cores de fundo para cada faixa de potencial, parecido com a planilha original.
// Caso apareça uma faixa não prevista aqui, cai no estilo neutro (sem cor).
const CORES_POTENCIAL = {
  'A. 1 GRAVAME': { fundo: '#FBE5D6', texto: '#7A4A1E' },
  'B. 2-5 GRAVAMES': { fundo: '#F4C56B', texto: '#5A3D00' },
  'C. 6-10 GRAVAMES': { fundo: '#D9D9D9', texto: '#3D3D3D' },
  'D. 11-20 GRAVAMES': { fundo: '#9DC3E6', texto: '#1A3D5C' },
  'E. 21-30 GRAVAMES': { fundo: '#A9D18E', texto: '#274E13' },
  'F. > 30 GRAVAMES': { fundo: '#2E75B6', texto: '#FFFFFF' },
}

function BadgePotencial({ valor }) {
  if (!valor) return <span className="num-vazio">—</span>
  const cor = CORES_POTENCIAL[valor.toUpperCase().trim()]
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: '0.72rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: cor?.fundo || '#EEE',
        color: cor?.texto || '#444',
      }}
    >
      {valor}
    </span>
  )
}

// Cabeçalho de uma coluna de mês: mantém o rótulo fixo (M1/M2/M3) e mostra
// o mês de referência (ex: "Junho/2026") como sub-rótulo, calculado a partir
// da data de PAGAMENTO dos próprios lançamentos daquela posição.
function CabecalhoMes({ rotuloFixo, mesReferencia }) {
  return (
    <div className="cabecalho-coluna">
      <span>{rotuloFixo}</span>
      {mesReferencia && <span className="sub-rotulo-mes">{mesReferencia}</span>}
    </div>
  )
}

// Define as colunas fixas (não-mês) da tabela: rótulo exibido + campo de dados correspondente.
// "congelada" marca quais colunas ficam fixas ao rolar a tabela horizontalmente.
// "truncar" marca quais colunas devem cortar o texto (com "...") em vez de quebrar linha ou expandir.
// "largura" é OBRIGATÓRIA em todas as colunas aqui porque a tabela usa table-layout: fixed
// (necessário para o cálculo de "left" das colunas congeladas ser sempre exato).
const COLUNAS_FIXAS = [
  { campo: 'codigo', rotulo: 'DN', congelada: true, truncar: true, largura: 70 },
  { campo: 'razao_social', rotulo: 'Razão social', congelada: true, truncar: true, largura: 200 },
  { campo: 'endereco', rotulo: 'Endereço', truncar: true, largura: 160 },
  { campo: 'numero', rotulo: 'Nº', truncar: true, largura: 60 },
  { campo: 'bairro', rotulo: 'Bairro', truncar: true, largura: 140 },
  { campo: 'cep', rotulo: 'CEP', truncar: true, largura: 90 },
  { campo: 'zona', rotulo: 'Zona', truncar: true, largura: 120 },
  { campo: 'gcm', rotulo: 'GCM', truncar: true, largura: 190 },
  { campo: 'potencial_categoria', rotulo: 'Potencial', truncar: true, largura: 140 },
]

const LARGURA_VOLUME_MERCADO = 130
const LARGURA_CTOS_MERC = 90
const LARGURA_MES = 120
const LARGURA_CTOS = 70
const LARGURA_META = 120
const LARGURA_GAP = 120
const LARGURA_LM_CONSIG = 90

// Soma a largura de todas as colunas congeladas ANTES da coluna informada,
// para calcular a posição "left" correta de cada uma (efeito empilhado, como no Sheets).
function calcularLeft(indiceColuna) {
  let soma = 0
  for (let i = 0; i < indiceColuna; i++) {
    if (COLUNAS_FIXAS[i].congelada) soma += COLUNAS_FIXAS[i].largura
  }
  return soma
}

function estiloColuna({ largura, congelada }, indiceColuna, ehCabecalho = false) {
  const base = { width: largura, minWidth: largura, maxWidth: largura }
  if (!congelada) return base
  return {
    ...base,
    position: 'sticky',
    left: calcularLeft(indiceColuna),
    // Células de canto (congeladas + dentro do cabeçalho) precisam também
    // de "top: 0" e do z-index mais alto, para ficarem por cima tanto das
    // colunas comuns quanto das linhas comuns ao rolar nos dois sentidos.
    top: ehCabecalho ? 0 : undefined,
    zIndex: ehCabecalho ? 4 : 2,
  }
}

// Calcula um alerta visual baseado na produção dos últimos 3 meses (M1, M2, M3):
// - "sem-producao": os 3 meses estão zerados (loja parada há 3 meses)
// - "producao-baixa": produziu em apenas 1 dos 3 meses
// - null: produziu em 2 ou 3 meses (sem alerta)
function calcularAlertaProducao(linha) {
  const mesesComProducao = [linha.producao_m1, linha.producao_m2, linha.producao_m3].filter(
    (valor) => Number(valor) > 0
  ).length

  if (mesesComProducao === 0) return 'sem-producao'
  if (mesesComProducao === 1) return 'producao-baixa'
  return null
}

export default function TabelaPainel({ linhas, metaMeses, filtrosColuna, definirFiltroColuna, salvarMeta, alternarLmConsig }) {
  const refScrollSuperior = useRef(null)
  const refScrollTabela = useRef(null)
  const refTabela = useRef(null)
  const sincronizando = useRef(false)
  const [larguraTabela, setLarguraTabela] = useState(0)

  // Sincroniza a barra de rolagem extra (entre cabeçalho e primeira linha)
  // com a rolagem horizontal real da tabela, nos dois sentidos.
  useEffect(() => {
    const elSuperior = refScrollSuperior.current
    const elTabela = refScrollTabela.current
    if (!elSuperior || !elTabela) return

    function aoRolarSuperior() {
      if (sincronizando.current) return
      sincronizando.current = true
      elTabela.scrollLeft = elSuperior.scrollLeft
      sincronizando.current = false
    }
    function aoRolarTabela() {
      if (sincronizando.current) return
      sincronizando.current = true
      elSuperior.scrollLeft = elTabela.scrollLeft
      sincronizando.current = false
    }

    elSuperior.addEventListener('scroll', aoRolarSuperior)
    elTabela.addEventListener('scroll', aoRolarTabela)
    return () => {
      elSuperior.removeEventListener('scroll', aoRolarSuperior)
      elTabela.removeEventListener('scroll', aoRolarTabela)
    }
  }, [])

  // Mede a largura real da tabela (para a barra de rolagem extra ter o
  // mesmo "comprimento" de conteúdo), recalculando quando os dados ou o
  // tamanho da janela mudarem.
  useEffect(() => {
    function medir() {
      if (refTabela.current) setLarguraTabela(refTabela.current.offsetWidth)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [linhas])

  if (linhas.length === 0) {
    return <div className="vazio-estado">Nenhum dado encontrado. Use os botões de upload acima, ou ajuste os filtros.</div>
  }

  return (
    <div className="wrapper-tabela-painel">
      {/* Barra de rolagem horizontal extra, logo abaixo do cabeçalho */}
      <div className="scroll-horizontal-extra" ref={refScrollSuperior}>
        <div style={{ width: larguraTabela || '100%', height: 1 }} />
      </div>

      <div className="tabela-scroll" ref={refScrollTabela}>
        <table className="tabela-dados tabela-layout-fixo" ref={refTabela}>
          <colgroup>
            {COLUNAS_FIXAS.map(({ campo, largura }) => (
              <col key={campo} style={{ width: largura }} />
            ))}
            <col style={{ width: LARGURA_VOLUME_MERCADO }} />
            <col style={{ width: LARGURA_CTOS_MERC }} />
            <col style={{ width: LARGURA_MES }} />
            <col style={{ width: LARGURA_CTOS }} />
            <col style={{ width: LARGURA_MES }} />
            <col style={{ width: LARGURA_CTOS }} />
            <col style={{ width: LARGURA_MES }} />
            <col style={{ width: LARGURA_CTOS }} />
            <col style={{ width: LARGURA_META }} />
            <col style={{ width: LARGURA_GAP }} />
            <col style={{ width: LARGURA_LM_CONSIG }} />
          </colgroup>
          <thead>
            <tr>
              {COLUNAS_FIXAS.map(({ campo, rotulo, congelada, truncar }, indice) => (
                <th
                  key={campo}
                  className={`${congelada ? 'celula-congelada' : ''} ${truncar ? 'celula-truncar' : ''}`}
                  style={estiloColuna(COLUNAS_FIXAS[indice], indice, true)}
                >
                  <div className="cabecalho-coluna">
                    <span>{rotulo}</span>
                    <FiltroColuna
                      campo={campo}
                      linhas={linhas}
                      valorAtual={filtrosColuna[campo]}
                      onMudar={definirFiltroColuna}
                    />
                  </div>
                </th>
              ))}
              <th>Volume Mercado</th>
              <th>Ctos Merc</th>
              <th><CabecalhoMes rotuloFixo="M3" mesReferencia={metaMeses.M3} /></th>
              <th>Ctos</th>
              <th><CabecalhoMes rotuloFixo="M2" mesReferencia={metaMeses.M2} /></th>
              <th>Ctos</th>
              <th><CabecalhoMes rotuloFixo="M1" mesReferencia={metaMeses.M1} /></th>
              <th>Ctos</th>
              <th>Meta CDC Prem</th>
              <th>GAP</th>
              <th>LM Consig</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => {
              const alerta = calcularAlertaProducao(l)
              return (
                <tr key={l.codigo} className={alerta ? `linha-alerta-${alerta}` : ''}>
                  <td className="celula-congelada celula-truncar" style={estiloColuna(COLUNAS_FIXAS[0], 0)} title={l.codigo}>{l.codigo}</td>
                  <td className="celula-congelada celula-truncar" style={estiloColuna(COLUNAS_FIXAS[1], 1)} title={l.razao_social}>{l.razao_social}</td>
                  <td className="celula-truncar" title={l.endereco}>{l.endereco}</td>
                  <td className="celula-truncar" title={l.numero}>{l.numero}</td>
                  <td className="celula-truncar" title={l.bairro}>{l.bairro}</td>
                  <td className="celula-truncar" title={l.cep}>{l.cep}</td>
                  <td className="celula-truncar" title={l.zona}>{l.zona}</td>
                  <td className="celula-truncar" title={l.gcm}>{l.gcm}</td>
                  <td><BadgePotencial valor={l.potencial_categoria} /></td>
                  <td>{formatarMoeda(l.volume_mercado)}</td>
                  <td>{formatarNumero(l.ctos_merc)}</td>
                  <td>{formatarMoeda(l.producao_m3)}</td>
                  <td>{formatarNumero(l.qtd_m3)}</td>
                  <td>{formatarMoeda(l.producao_m2)}</td>
                  <td>{formatarNumero(l.qtd_m2)}</td>
                  <td>{formatarMoeda(l.producao_m1)}</td>
                  <td>{formatarNumero(l.qtd_m1)}</td>
                  <td>
                    <CelulaMetaEditavel dn={l.codigo} valorAtual={l.meta_cdc_prem} aoSalvar={salvarMeta} />
                  </td>
                  <td className={l.gap !== null && l.gap > 0 ? 'gap-nao-atingido' : ''}>
                    {l.gap === null ? <span className="num-vazio">—</span> : formatarMoeda(l.gap)}
                  </td>
                  <td>
                    <IconeLmConsig dn={l.codigo} ativo={l.lm_consig_ativo} aoAlternar={alternarLmConsig} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
