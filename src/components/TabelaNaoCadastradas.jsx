import { useEffect, useRef, useState } from 'react'

function formatarMoeda(valor) {
  if (!valor) return <span className="num-vazio">—</span>
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(valor)
}

function formatarNumero(valor) {
  if (!valor) return <span className="num-vazio">0</span>
  return new Intl.NumberFormat('pt-BR').format(valor)
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

// Colunas fixas (não-mês) desta tabela: as duas primeiras (CNPJ, Razão social)
// ficam congeladas ao rolar horizontalmente, igual ao Painel principal.
// "largura" é obrigatória aqui porque a tabela usa table-layout: fixed
// (necessário para o cálculo de "left" das colunas congeladas ser exato).
const COLUNAS_FIXAS = [
  { campo: 'cnpj_loja', rotulo: 'CNPJ', congelada: true, truncar: true, largura: 130 },
  { campo: 'razao_social', rotulo: 'Razão social', congelada: true, truncar: true, largura: 190 },
  { campo: 'endereco', rotulo: 'Endereço', truncar: true, largura: 160 },
  { campo: 'numero', rotulo: 'Nº', truncar: true, largura: 60 },
  { campo: 'bairro', rotulo: 'Bairro', truncar: true, largura: 140 },
  { campo: 'cidade', rotulo: 'Cidade', truncar: true, largura: 130 },
  { campo: 'cep', rotulo: 'CEP', truncar: true, largura: 90 },
  { campo: 'microrregiao', rotulo: 'Microrregião', truncar: true, largura: 130 },
  { campo: 'status_loja', rotulo: 'Status', truncar: true, largura: 130 },
  { campo: 'potencial_categoria', rotulo: 'Potencial', truncar: true, largura: 140 },
]

const LARGURA_VOLUME_MERCADO = 130
const LARGURA_CTOS_MERC = 110
const LARGURA_NOVA_AREA = 150
const LARGURA_REMOVER = 50

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

/**
 * Tabela do painel "Não Cadastradas": lojas candidatas para uma nova área.
 * CNPJ e Razão social ficam congelados ao rolar (igual ao Painel principal),
 * assim como o cabeçalho. A coluna "Nova Área" tem checkbox por linha, e o
 * cabeçalho dela mostra o somatório acumulado do potencial das marcadas.
 */
export default function TabelaNaoCadastradas({
  linhas, carregando, alternarNovaAreaLinha, removerLinha, potencialTotalNovaArea, quantidadeSelecionada,
}) {
  const refScrollSuperior = useRef(null)
  const refScrollTabela = useRef(null)
  const refTabela = useRef(null)
  const sincronizando = useRef(false)
  const [larguraTabela, setLarguraTabela] = useState(0)

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
            <col style={{ width: LARGURA_VOLUME_MERCADO }} />
            <col style={{ width: LARGURA_CTOS_MERC }} />
            <col style={{ width: LARGURA_NOVA_AREA }} />
            <col style={{ width: LARGURA_REMOVER }} />
          </colgroup>
          <thead>
            <tr>
              {COLUNAS_FIXAS.map(({ campo, rotulo, congelada, truncar }, indice) => (
                <th
                  key={campo}
                  className={`${congelada ? 'celula-congelada' : ''} ${truncar ? 'celula-truncar' : ''}`}
                  style={estiloColuna(COLUNAS_FIXAS[indice], indice, true)}
                >
                  {rotulo}
                </th>
              ))}
              <th>Volume Mercado</th>
              <th>Ctos Merc (usados)</th>
              <th>
                <div className="cabecalho-nova-area">
                  <span>Nova Área</span>
                  <span className="cabecalho-nova-area-total">
                    {quantidadeSelecionada} loja{quantidadeSelecionada === 1 ? '' : 's'} · {formatarMoeda(potencialTotalNovaArea)}
                  </span>
                </div>
              </th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
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
                <td className="celula-truncar" title={l.endereco}>{l.endereco}</td>
                <td className="celula-truncar" title={l.numero}>{l.numero}</td>
                <td className="celula-truncar" title={l.bairro}>{l.bairro}</td>
                <td className="celula-truncar" title={l.cidade}>{l.cidade}</td>
                <td className="celula-truncar" title={l.cep}>{l.cep}</td>
                <td className="celula-truncar" title={l.microrregiao}>{l.microrregiao}</td>
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
                <td>
                  <button
                    type="button"
                    className="btn-remover-linha"
                    onClick={() => removerLinha(l.id)}
                    title="Remover esta loja da lista de candidatas"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
