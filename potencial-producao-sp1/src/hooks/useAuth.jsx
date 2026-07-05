import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [sessao, setSessao] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessao(session)
      if (session) buscarPerfil(session.user.id)
      else setCarregando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_evento, session) => {
      setSessao(session)
      if (session) buscarPerfil(session.user.id)
      else {
        setPerfil(null)
        setCarregando(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  async function buscarPerfil(userId) {
    const { data, error } = await supabase
      .from('perfis')
      .select('*')
      .eq('id', userId)
      .single()
    if (!error) setPerfil(data)
    setCarregando(false)
  }

  async function entrar(email, senha) {
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    return { error }
  }

  async function cadastrar(email, senha, nome) {
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome } },
    })
    return { error }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  const ehAdmin = perfil?.papel === 'admin'

  return (
    <AuthContext.Provider value={{ sessao, perfil, ehAdmin, carregando, entrar, cadastrar, sair }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
