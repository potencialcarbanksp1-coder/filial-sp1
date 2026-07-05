export default function IconeLmConsig({ dn, ativo, aoAlternar }) {
  return (
    <button
      className={`icone-lm-consig ${ativo ? 'ativo' : ''}`}
      onClick={() => aoAlternar(dn)}
      title={ativo ? 'LM Consig ativo — clique para desativar' : 'LM Consig inativo — clique para ativar'}
      aria-pressed={ativo}
    >
      {/* Emoji de carro: inativo aparece acinzentado/apagado (via filtro CSS),
          ativo aparece colorido normal + destaque de fundo verde — combinação
          que fica bem mais perceptível à distância do que um ícone vetorial fino. */}
      <span className="icone-lm-consig-emoji" aria-hidden="true">🚗</span>
    </button>
  )
}
