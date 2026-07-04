import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import Login from './pages/Login.jsx'
import Painel from './pages/Painel.jsx'

function Conteudo() {
  const { sessao, carregando } = useAuth()

  if (carregando) {
    return <div className="status-carregando">Carregando…</div>
  }

  if (!sessao) {
    return <Login />
  }

  return <Painel />
}

export default function App() {
  return (
    <AuthProvider>
      <Conteudo />
    </AuthProvider>
  )
}
