import { useEffect, useMemo, useRef, useState } from 'react'
import FiltroListaColuna from './FiltroListaColuna.jsx'

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
        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
        fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
        background: cor?.fundo || '#EEE', color: cor?.texto || '#444',
      }}
    >
      {valor}
    </span>
  )
}

/**
 * Célula de texto livre editável (usada na coluna "Atendimento"): clique
 * pra editar, Enter ou clicar fora salva, Esc cancela. Fica em branco se
 * não vier nada da planilha, e o usuário pode preencher/trocar na mão.
 */
function CelulaTextoEditavel({ id, valorAtual, aoSalvar }) {
  const [editando, setEditando] = useState(false)
  const [rascunho, setRascunho] = useState('')
  const [salvando, setSalvando] = useState(false)

  function iniciarEdicao() {
    setRascunho(valorAtual || '')
    setEditando(true)
  }

  async function confirmar() {
    setSalvando(true)
    try {
      await aoSalvar(id, rascunho.trim())
      setEditando(false)
    } finally {
      setSalvando(false)
    }
  }

  function aoTeclar(e) {
    if (e.key === 'Enter') confirmar()
    if (e.key === 'Escape') setEditando(false)
  }

  if (editando) {
    return (
      <input
        className="input-meta-editavel"
        type="text"
        autoFocus
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onBlur={confirmar}
        onKeyDown={aoTeclar}
        placeholder="Nome do GCM"
        disabled={salvando}
      />
    )
  }

  if (!valorAtual) {
    return (
      <button className="btn-adicionar-meta" onClick={iniciarEdicao} title="Definir atendimento (GCM)">
        +
      </button>
    )
  }

  return (
    <button className="valor-meta-definido" onClick={iniciarEdicao} title={`${valorAtual} (clique para editar)`}>
      {valorAtual}
    </button>
  )
}

// Colunas fixas (não-numéricas) desta tabela: as duas primeiras (CNPJ, Razão
// social) ficam congeladas ao rolar horizontalmente, igual ao Painel principal.
// "largura" é obrigatória aqui porque a tabela usa table-layout: fixed
// (necessário para o cálculo de "left" das colunas congeladas ser exato).
// Todas têm filtro "tipo lista" no cabeçalho.
const COLUNAS_FIXAS = [
  { campo: 'cnpj_loja', rotulo: 'CNPJ', congelada: true, truncar: true, largura: 130 },
  { campo: 'razao_social', rotulo: 'Razão social', congelada: true, truncar: true, largura: 190 },
  { campo: 'atendimento', rotulo: 'Atendimento', truncar: true, largura: 150 },
  { campo: 'endereco', rotulo: 'Endereço', truncar: true, largura: 160 },
  { campo: 'numero', rotulo: 'Nº', truncar: true, largura: 60 },
  { campo: 'bairro', rotulo: 'Bairro', truncar: true, largura: 140 },
  { campo: 'cidade', rotulo: 'Cidade', truncar: true, largura: 130 },
  { campo: 'cep', rotulo: 'CEP', truncar: true, largura: 90 },
  { campo: 'zona', rotulo: 'Zona', truncar: true, largura: 130 },
  { campo: 'status_loja', rotulo: 'Status', truncar: true, largura: 130 },
  { campo: 'potencial_categoria', rotulo: 'Potencial', truncar: true, largura: 140 },
]

// Colunas numéricas, fora do array acima (ficam depois, antes de Nova Área).
const COLUNAS_NUMERICAS = [
  { campo: 'volume_mercado', rotulo: 'Volume Mercado', largura: 130, formatarCelula: formatarMoeda, formatarTexto: formatarMoedaTexto, comparador: (a, b) => a - b },
  { campo: 'ctos_merc', rotulo: 'Ctos Merc (usados)', largura: 110, formatarCelula: formatarNumero, formatarTexto: formatarNumeroTexto, comparador: (a, b) => a - b },
]

const LARGURA_NOVA_AREA = 150

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
    top: ehCabecalho ? 0 : undefined,
    zIndex: ehCabecalho ? 4 : 2,
  }
}

// Extrai os valores distintos (não vazios) de uma coluna, ordenados.
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
  return comparador ? resultado.sort(comparador) : resultado.sort()
}

/**
 * Tabela do painel "Mercado Potencial": lojas candidatas para uma nova área.
 * CNPJ e Razão social ficam congelados ao rolar (igual ao Painel principal),
 * assim como o cabeçalho. A coluna "Atendimento" (GCM) é editável na mão.
 * A coluna "Nova Área" tem checkbox por linha, com um botão pra desmarcar
 * todas de uma vez. TODAS as colunas de dados têm filtro "tipo lista" no
 * cabeçalho (dropdown com checkbox por valor, igual ao autofiltro do Excel).
 */
export default function TabelaNaoCadastradas({
  linhas, carregando, alternarNovaAreaLinha, desmarcarTodas, salvarAtendimento, quantidadeSelecionada,
}) {
  const refScrollSuperior = useRef(null)
  const refScrollTabela = useRef(null)
  const refTabela = useRef(null)
  const sincronizando = useRef(false)
  const [larguraTabela, setLarguraTabela] = useState(0)

  // Um único estado guarda os filtros de TODAS as colunas: { campo: Set(valores) | undefined }.
  // Campo ausente (ou undefined) = todos os valores ativos, sem filtro.
  const [filtros, setFiltros] = useState({})

  function definirFiltro(campo, valor) {
    setFiltros((atual) => ({ ...atual, [campo]: valor }))
  }

  const camposTexto = COLUNAS_FIXAS.map((c) => c.campo)
  const camposNumericos = COLUNAS_NUMERICAS.map((c) => c.campo)

  const valoresPorCampo = useMemo(() => {
    const mapa = {}
    for (const campo of camposTexto) mapa[campo] = valoresDistintos(linhas, campo)
    for (const { campo, comparador } of COLUNAS_NUMERICAS) mapa[campo] = valoresDistintos(linhas, campo, comparador)
    return mapa
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linhas])

  const valoresFormatadosPorCampo = useMemo(() => {
    const mapa = {}
    for (const { campo, formatarTexto } of COLUNAS_NUMERICAS) {
      mapa[campo] = valoresPorCampo[campo].map(formatarTexto)
    }
    return mapa
  }, [valoresPorCampo])

  const linhasFiltradas = useMemo(
    () => linhas.filter((l) =>
      [...camposTexto, ...camposNumericos].every((campo) => {
        const selecionados = filtros[campo]
        return !selecionados || selecionados.has(l[campo])
      })
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [linhas, filtros]
  )

  // Sincroniza a barra de rolagem extra (entre cabeçalho e primeira linha)
  // com a rolagem horizontal real da tabela, nos dois sentidos — mesma
  // lógica usada no Painel principal.
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
  // mesmo "comprimento" de conteúdo), recalculando quando os dados mudarem.
  useEffect(() => {
    function medir() {
      if (refTabela.current) setLarguraTabela(refTabela.current.offsetWidth)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [linhas])

  if (carregando) {
    return <div className="status-carregando">Carregando…</div>
  }

  if (linhas.length === 0) {
    return (
      <div className="vazio-estado">
        Nenhuma loja candidata ainda. Use o upload de "Lojas não cadastradas" na aba Upload,
        ou marque "Nova Área" em alguma loja do Painel principal.
      </div>
    )
  }

  return (
    <div className="wrapper-tabela-painel tabela-nao-cadastradas">
      {/* Barra de rolagem horizontal extra, logo abaixo do cabeçalho — igual ao Painel principal */}
      <div className="scroll-horizontal-extra" ref={refScrollSuperior}>
        <div style={{ width: larguraTabela || '100%', height: 1 }} />
      </div>

      <div className="tabela-scroll" ref={refScrollTabela}>
        <table className="tabela-dados tabela-layout-fixo" ref={refTabela}>
          <colgroup>
            {COLUNAS_FIXAS.map(({ campo, largura }) => (
              <col key={campo} style={{ width: largura }} />
            ))}
            {COLUNAS_NUMERICAS.map(({ campo, largura }) => (
              <col key={campo} style={{ width: largura }} />
            ))}
            <col style={{ width: LARGURA_NOVA_AREA }} />
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
                    <FiltroListaColuna
                      valores={valoresPorCampo[campo]}
                      selecionados={filtros[campo] ?? null}
                      aoAlterar={(v) => definirFiltro(campo, v)}
                    />
                  </div>
                </th>
              ))}
              {COLUNAS_NUMERICAS.map(({ campo, rotulo }) => (
                <th key={campo}>
                  <div className="cabecalho-com-filtro">
                    <span>{rotulo}</span>
                    <FiltroListaColuna
                      valores={valoresPorCampo[campo]}
                      valoresFormatados={valoresFormatadosPorCampo[campo]}
                      selecionados={filtros[campo] ?? null}
                      aoAlterar={(v) => definirFiltro(campo, v)}
                    />
                  </div>
                </th>
              ))}
              <th>
                <div className="cabecalho-nova-area">
                  <span>Nova Área</span>
                  {quantidadeSelecionada > 0 && (
                    <button
                      type="button"
                      className="btn-desmarcar-todas"
                      onClick={desmarcarTodas}
                      title="Desmarca a caixinha 'Nova Área' de todas as lojas de uma vez"
                    >
                      Desmarcar todas
                    </button>
                  )}
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {linhasFiltradas.map((l) => (
              <tr key={l.id} className={l.nova_area ? 'linha-selecionada-nova-area' : ''}>
                <td className="celula-congelada celula-truncar" style={estiloColuna(COLUNAS_FIXAS[0], 0)} title={l.cnpj_loja}>
                  {l.cnpj_loja}
                </td>
                <td className="celula-congelada celula-truncar" style={estiloColuna(COLUNAS_FIXAS[1], 1)} title={l.razao_social}>
                  {l.razao_social}
                  {l.origem === 'painel' && (
                    <span className="badge-origem badge-origem-painel" title={`Copiada do Painel principal (DN ${l.dn})`}>
                      Painel {l.dn}
                    </span>
                  )}
                </td>
                <td className="celula-truncar">
                  <CelulaTextoEditavel id={l.id} valorAtual={l.atendimento} aoSalvar={salvarAtendimento} />
                </td>
                <td className="celula-truncar" title={l.endereco}>{l.endereco}</td>
                <td className="celula-truncar" title={l.numero}>{l.numero}</td>
                <td className="celula-truncar" title={l.bairro}>{l.bairro}</td>
                <td className="celula-truncar" title={l.cidade}>{l.cidade}</td>
                <td className="celula-truncar" title={l.cep}>{l.cep}</td>
                <td className="celula-truncar" title={l.zona}>{l.zona}</td>
                <td className="celula-truncar" title={l.status_loja}>{l.status_loja}</td>
                <td><BadgePotencial valor={l.potencial_categoria} /></td>
                <td>{formatarMoeda(l.volume_mercado)}</td>
                <td>{formatarNumero(l.ctos_merc)}</td>
                <td style={{ textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={!!l.nova_area}
                    onChange={() => alternarNovaAreaLinha(l.id, l.nova_area)}
                    title="Incluir esta loja no somatório da Nova Área"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
