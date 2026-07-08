import { useEffect, useMemo, useRef, useState } from 'react'
import FiltroListaColuna from './FiltroListaColuna.jsx'
import CelulaMetaEditavel from './CelulaMetaEditavel.jsx'
import IconeLmConsig from './IconeLmConsig.jsx'

function formatarMoeda(valor) {
  if (!valor) return <span className="num-vazio">—</span>
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
}

function formatarMoedaTexto(valor) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor || 0)
}

function formatarNumero(valor) {
  if (!valor) return <span className="num-vazio">0</span>
  return new Intl.NumberFormat('pt-BR').format(valor)
}

function formatarNumeroTexto(valor) {
  return new Intl.NumberFormat('pt-BR').format(valor || 0)
}

function formatarBooleanoTexto(valor) {
  return valor ? 'Sim' : 'Não'
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
// Todas têm filtro "tipo lista" no cabeçalho.
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

// Demais colunas com filtro (numéricas e indicadores), fora da tabela acima
// porque têm cabeçalhos/renderização especiais (mês, meta editável, ícones).
const CAMPOS_EXTRAS_FILTRAVEIS = [
  { campo: 'volume_mercado', formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'ctos_merc', formatarTexto: formatarNumeroTexto, comparador: (a, b) => a - b },
  { campo: 'producao_m3', formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'qtd_m3', formatarTexto: formatarNumeroTexto, comparador: (a, b) => a - b },
  { campo: 'producao_m2', formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'qtd_m2', formatarTexto: formatarNumeroTexto, comparador: (a, b) => a - b },
  { campo: 'producao_m1', formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'qtd_m1', formatarTexto: formatarNumeroTexto, comparador: (a, b) => a - b },
  { campo: 'mpl_valor', formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'mpl_ctos', formatarTexto: formatarNumeroTexto, comparador: (a, b) => a - b },
  { campo: 'meta_cdc_prem', formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'gap', formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'lm_consig_ativo', formatarTexto: formatarBooleanoTexto, comparador: (a, b) => (a === b ? 0 : a ? 1 : -1) },
  // "incluido_nova_area" continua existindo nos dados (ainda funciona por trás das
  // cenas), só a coluna dela fica oculta no Painel por enquanto — ver MOSTRAR_COLUNA_NOVA_AREA.
  { campo: 'incluido_nova_area', formatarTexto: formatarBooleanoTexto, comparador: (a, b) => (a === b ? 0 : a ? 1 : -1) },
]

// Deixe "true" pra reexibir a coluna "Nova Área" no Painel principal no futuro.
const MOSTRAR_COLUNA_NOVA_AREA = false

const LARGURA_VOLUME_MERCADO = 130
const LARGURA_CTOS_MERC = 90
const LARGURA_MES = 120
const LARGURA_CTOS = 70
const LARGURA_MPL = 120
const LARGURA_META = 120
const LARGURA_GAP = 120
const LARGURA_LM_CONSIG = 90
const LARGURA_NOVA_AREA = 90

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

// Extrai os valores distintos (não vazios/nulos) de uma coluna, ordenados.
function valoresDistintos(linhas, campo, comparador) {
  const vistos = new Set()
  const resultado = []
  for (const l of linhas) {
    const v = l[campo]
    if (v === null || v === undefined || v === '') continue
    if (!vistos.has(v)) {
      vistos.add(v)
      resultado.push(v)
    }
  }
  return comparador ? resultado.sort(comparador) : resultado.sort((a, b) => String(a).localeCompare(String(b), 'pt-BR'))
}

export default function TabelaPainel({ linhas, metaMeses, salvarMeta, salvarMpl, alternarLmConsig, alternarNovaArea }) {
  const refScrollSuperior = useRef(null)
  const refScrollTabela = useRef(null)
  const refTabela = useRef(null)
  const sincronizando = useRef(false)
  const [larguraTabela, setLarguraTabela] = useState(0)

  // O filtro fica de dentro da tabela (não do componente pai): assim, as
  // OPÇÕES de cada dropdown sempre vêm do conjunto COMPLETO de linhas, nunca
  // do resultado já filtrado — isso evita a "trava" de zerar um filtro e não
  // sobrar nenhum valor pra escolher de novo.
  const [filtros, setFiltros] = useState({}) // { campo: Set(valores) | undefined (undefined = todos) }

  function definirFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }))
  }

  const camposTexto = COLUNAS_FIXAS.map((c) => c.campo)
  const camposExtras = CAMPOS_EXTRAS_FILTRAVEIS.map((c) => c.campo)

  // Valores distintos de cada coluna filtrável, calculados a partir de TODAS
  // as linhas (não das já filtradas), pra manter as opções do dropdown estáveis.
  const valoresPorCampo = useMemo(() => {
    const mapa = {}
    for (const campo of camposTexto) mapa[campo] = valoresDistintos(linhas, campo)
    for (const { campo, comparador } of CAMPOS_EXTRAS_FILTRAVEIS) mapa[campo] = valoresDistintos(linhas, campo, comparador)
    return mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas])

  const valoresFormatadosPorCampo = useMemo(() => {
    const mapa = {}
    for (const { campo, formatarTexto } of CAMPOS_EXTRAS_FILTRAVEIS) {
      mapa[campo] = valoresPorCampo[campo].map(formatarTexto)
    }
    return mapa
  }, [valoresPorCampo])

  function renderFiltro(campo, valoresFormatados) {
    return (
      <FiltroListaColuna
        valores={valoresPorCampo[campo]}
        valoresFormatados={valoresFormatados}
        selecionados={filtros[campo] ?? null}
        aoAlterar={(v) => definirFiltro(campo, v)}
      />
    )
  }

  // Aplica os filtros sobre o conjunto completo de linhas — só pra decidir
  // o que É EXIBIDO. As opções dos dropdowns (valoresPorCampo, acima) usam
  // sempre "linhas" (o conjunto completo), nunca este resultado filtrado.
  const linhasFiltradas = useMemo(() => {
    const camposComFiltro = [...camposTexto, ...camposExtras]
    return linhas.filter((linha) =>
      camposComFiltro.every((campo) => {
        const selecionados = filtros[campo]
        return !selecionados || selecionados.has(linha[campo])
      })
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas, filtros])

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
  }, [linhasFiltradas])

  // Só esconde a tabela inteira quando NÃO HÁ DADO NENHUM (nada foi subido ainda).
  // Se o filtro é que zerou tudo, a tabela continua aparecendo (com cabeçalho e
  // filtros funcionando), só a lista de linhas fica vazia — assim dá pra
  // reabrir qualquer filtro e escolher outro valor, mesmo depois de "Limpar".
  if (linhas.length === 0) {
    return <div className="vazio-estado">Nenhum dado encontrado. Use os botões de upload acima.</div>
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
            <col style={{ width: LARGURA_MPL }} />
            <col style={{ width: LARGURA_MPL }} />
            <col style={{ width: LARGURA_META }} />
            <col style={{ width: LARGURA_GAP }} />
            <col style={{ width: LARGURA_LM_CONSIG }} />
            {MOSTRAR_COLUNA_NOVA_AREA && <col style={{ width: LARGURA_NOVA_AREA }} />}
          </colgroup>
          <thead>
            <tr>
              {COLUNAS_FIXAS.map(({ campo, rotulo, congelada, truncar }, indice) => (
                <th
                  key={campo}
                  className={`${congelada ? 'celula-congelada' : ''} ${truncar ? 'celula-truncar' : ''}`}
                  style={estiloColuna(COLUNAS_FIXAS[indice], indice, true)}
                >
                  <div className="cabecalho-com-filtro">
                    <span>{rotulo}</span>
                    {renderFiltro(campo)}
                  </div>
                </th>
              ))}
              <th className="th-grupo-mercado">
                <div className="cabecalho-com-filtro">
                  <div className="cabecalho-coluna">
                    <span>Volume</span>
                    <span>Mercado</span>
                  </div>
                  {renderFiltro('volume_mercado', valoresFormatadosPorCampo.volume_mercado)}
                </div>
              </th>
              <th className="th-grupo-mercado">
                <div className="cabecalho-com-filtro">
                  <div className="cabecalho-coluna">
                    <span>Ctos</span>
                    <span>Mercado</span>
                  </div>
                  {renderFiltro('ctos_merc', valoresFormatadosPorCampo.ctos_merc)}
                </div>
              </th>
              <th className="th-grupo-producao">
                <div className="cabecalho-com-filtro">
                  <CabecalhoMes rotuloFixo="M3" mesReferencia={metaMeses.M3} />
                  {renderFiltro('producao_m3', valoresFormatadosPorCampo.producao_m3)}
                </div>
              </th>
              <th className="th-grupo-producao">
                <div className="cabecalho-com-filtro">
                  <span>Ctos</span>
                  {renderFiltro('qtd_m3', valoresFormatadosPorCampo.qtd_m3)}
                </div>
              </th>
              <th className="th-grupo-producao">
                <div className="cabecalho-com-filtro">
                  <CabecalhoMes rotuloFixo="M2" mesReferencia={metaMeses.M2} />
                  {renderFiltro('producao_m2', valoresFormatadosPorCampo.producao_m2)}
                </div>
              </th>
              <th className="th-grupo-producao">
                <div className="cabecalho-com-filtro">
                  <span>Ctos</span>
                  {renderFiltro('qtd_m2', valoresFormatadosPorCampo.qtd_m2)}
                </div>
              </th>
              <th className="th-grupo-producao">
                <div className="cabecalho-com-filtro">
                  <CabecalhoMes rotuloFixo="M1" mesReferencia={metaMeses.M1} />
                  {renderFiltro('producao_m1', valoresFormatadosPorCampo.producao_m1)}
                </div>
              </th>
              <th className="th-grupo-producao">
                <div className="cabecalho-com-filtro">
                  <span>Ctos</span>
                  {renderFiltro('qtd_m1', valoresFormatadosPorCampo.qtd_m1)}
                </div>
              </th>
              <th className="th-grupo-mpl">
                <div className="cabecalho-com-filtro">
                  <div className="cabecalho-coluna">
                    <span>Meta - Loja</span>
                    <span className="sub-rotulo-mes">Valor</span>
                  </div>
                  {renderFiltro('mpl_valor', valoresFormatadosPorCampo.mpl_valor)}
                </div>
              </th>
              <th className="th-grupo-mpl">
                <div className="cabecalho-com-filtro">
                  <div className="cabecalho-coluna">
                    <span>Meta - Loja</span>
                    <span className="sub-rotulo-mes">Ctos</span>
                  </div>
                  {renderFiltro('mpl_ctos', valoresFormatadosPorCampo.mpl_ctos)}
                </div>
              </th>
              <th>
                <div className="cabecalho-com-filtro">
                  <span>Meta CDC Prem</span>
                  {renderFiltro('meta_cdc_prem', valoresFormatadosPorCampo.meta_cdc_prem)}
                </div>
              </th>
              <th>
                <div className="cabecalho-com-filtro">
                  <span>GAP</span>
                  {renderFiltro('gap', valoresFormatadosPorCampo.gap)}
                </div>
              </th>
              <th>
                <div className="cabecalho-com-filtro">
                  <span>LM Consig</span>
                  {renderFiltro('lm_consig_ativo', valoresFormatadosPorCampo.lm_consig_ativo)}
                </div>
              </th>
              {MOSTRAR_COLUNA_NOVA_AREA && (
                <th>
                  <div className="cabecalho-com-filtro">
                    <span>Nova Área</span>
                    {renderFiltro('incluido_nova_area', valoresFormatadosPorCampo.incluido_nova_area)}
                  </div>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.length === 0 && (
              <tr>
                <td colSpan={COLUNAS_FIXAS.length + 13 + (MOSTRAR_COLUNA_NOVA_AREA ? 1 : 0)} className="vazio-estado-linha">
                  Nenhuma loja bate com os filtros atuais. Ajuste ou limpe os filtros no cabeçalho acima.
                </td>
              </tr>
            )}
            {linhasFiltradas.map((l) => {
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
                    <CelulaMetaEditavel dn={l.codigo} valorAtual={l.mpl_valor} aoSalvar={(dn, v) => salvarMpl(dn, 'mpl_valor', v)} />
                  </td>
                  <td>
                    <CelulaMetaEditavel dn={l.codigo} valorAtual={l.mpl_ctos} aoSalvar={(dn, v) => salvarMpl(dn, 'mpl_ctos', v)} tipo="numero" />
                  </td>
                  <td>
                    <CelulaMetaEditavel dn={l.codigo} valorAtual={l.meta_cdc_prem} aoSalvar={salvarMeta} />
                  </td>
                  <td className={l.gap !== null && l.gap > 0 ? 'gap-nao-atingido' : ''}>
                    {l.gap === null ? <span className="num-vazio">—</span> : formatarMoeda(l.gap)}
                  </td>
                  <td>
                    <IconeLmConsig dn={l.codigo} ativo={l.lm_consig_ativo} aoAlternar={alternarLmConsig} />
                  </td>
                  {MOSTRAR_COLUNA_NOVA_AREA && (
                    <td style={{ textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        checked={!!l.incluido_nova_area}
                        onChange={() => alternarNovaArea(l.codigo, l)}
                        title="Marcar esta loja para a análise de Nova Área"
                      />
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
