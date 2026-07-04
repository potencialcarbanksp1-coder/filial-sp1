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

/**
 * Tabela do painel "Não Cadastradas": lojas candidatas para uma nova área.
 * A coluna "Nova Área" tem checkbox por linha, e o cabeçalho dela mostra
 * o somatório acumulado do potencial (Volume Mercado) de todas as marcadas.
 */
export default function TabelaNaoCadastradas({
  linhas, carregando, alternarNovaAreaLinha, removerLinha, potencialTotalNovaArea, quantidadeSelecionada,
}) {
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
    <div className="wrapper-tabela-painel">
      <div className="tabela-scroll">
        <table className="tabela-dados">
          <thead>
            <tr>
              <th>Origem</th>
              <th>DN</th>
              <th>Razão social</th>
              <th>Endereço</th>
              <th>Nº</th>
              <th>Bairro</th>
              <th>Cidade</th>
              <th>CEP</th>
              <th>Microrregião</th>
              <th>Status</th>
              <th>Potencial</th>
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
                <td>
                  <span className={`badge-origem ${l.origem === 'painel' ? 'badge-origem-painel' : 'badge-origem-upload'}`}>
                    {l.origem === 'painel' ? 'Painel' : 'Upload'}
                  </span>
                </td>
                <td>{l.dn || <span className="num-vazio">—</span>}</td>
                <td className="celula-truncar" title={l.razao_social}>{l.razao_social}</td>
                <td className="celula-truncar" title={l.endereco}>{l.endereco}</td>
                <td>{l.numero}</td>
                <td className="celula-truncar" title={l.bairro}>{l.bairro}</td>
                <td className="celula-truncar" title={l.cidade}>{l.cidade}</td>
                <td>{l.cep}</td>
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
