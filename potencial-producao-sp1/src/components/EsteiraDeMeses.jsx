export default function EsteiraDeMeses({ metaMeses }) {
  return (
    <div className="esteira-meses">
      <span className="pill-mes">{metaMeses.M3 || 'M3 — vazio'}</span>
      <span className="seta">→</span>
      <span className="pill-mes">{metaMeses.M2 || 'M2 — vazio'}</span>
      <span className="seta">→</span>
      <span className="pill-mes atual">{metaMeses.M1 || 'M1 — mês atual'}</span>
    </div>
  )
}
