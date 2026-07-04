const ITENS_MENU = [
  { id: 'painel', rotulo: 'Painel', icone: '▦' },
  { id: 'dashboard', rotulo: 'Dashboard', icone: '◔' },
  { id: 'nao_cadastradas', rotulo: 'Não cadastradas', icone: '＋', apenasAdmin: true },
  { id: 'upload', rotulo: 'Upload', icone: '↑', apenasAdmin: true },
]

export default function MenuLateral({ secaoAtiva, definirSecaoAtiva, expandido, alternarExpandido, ehAdmin }) {
  // Visualizadores não sobem arquivos nem mexem no planejamento de Nova Área:
  // essas seções nem aparecem no menu para eles.
  const itensVisiveis = ehAdmin ? ITENS_MENU : ITENS_MENU.filter((item) => !item.apenasAdmin)

  return (
    <nav className={`menu-lateral ${expandido ? 'expandido' : 'encolhido'}`}>
      <button
        className="menu-lateral-alternar"
        onClick={alternarExpandido}
        title={expandido ? 'Encolher menu' : 'Expandir menu'}
        aria-label={expandido ? 'Encolher menu' : 'Expandir menu'}
      >
        {expandido ? '‹' : '›'}
      </button>

      <ul className="menu-lateral-lista">
        {itensVisiveis.map((item) => (
          <li key={item.id}>
            <button
              className={`menu-lateral-item ${secaoAtiva === item.id ? 'ativo' : ''}`}
              onClick={() => definirSecaoAtiva(item.id)}
              title={item.rotulo}
            >
              <span className="menu-lateral-icone">{item.icone}</span>
              {expandido && <span className="menu-lateral-rotulo">{item.rotulo}</span>}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
