import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Filtros from './Filtros'
import TablaPnL from './TablaPnL'

const TOKEN_VALIDO = import.meta.env.VITE_ACCESS_TOKEN

function tokenEnURL() {
  const params = new URLSearchParams(window.location.search)
  return params.get('key')
}

export default function App() {
  const [opciones, setOpciones] = useState({ anos: [], meses: [], instituciones: [], escenarios: [] })
  const [filtros, setFiltros] = useState(null)
  const [acceso, setAcceso] = useState(false)

  useEffect(() => {
    const key = tokenEnURL()
    if (key === TOKEN_VALIDO) {
      setAcceso(true)
      cargarOpciones()
    }
  }, [])

  async function cargarOpciones() {
    const { data, error } = await supabase.rpc('get_distinct_values')
    if (error) { console.error(error); return }
    const d = Array.isArray(data) ? data[0] : data
    const ops = {
      anos: d.anos || [],
      meses: (d.meses || []).map(m => ({ num: m.num, desc: m.desc })),
      instituciones: d.instituciones || [],
      escenarios: (d.escenarios || []).map(e => e.trim()),
    }
    setOpciones(ops)
    setFiltros({
      ano: ops.anos.includes(2026) ? 2026 : ops.anos[0],
      mes: 1,
      instituciones: [],
      escenarioBase: ops.escenarios.includes('REAL') ? 'REAL' : ops.escenarios[0],
      comparaciones: [],
    })
  }

  if (!acceso) return (
    <div style={{
      fontFamily: 'Inter, system-ui, sans-serif',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#f8f9fa',
      color: '#666',
      fontSize: '14px'
    }}>
      Acceso no autorizado.
    </div>
  )

  if (!filtros) return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '32px', textAlign: 'center' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#fff' }}>
      <div style={{
        background: '#305496',
        color: '#fff',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <img src="/logo_nacer.png" alt="Nacer Global" style={{ height: '36px', objectFit: 'contain' }} />
        <div style={{ fontWeight: 700, fontSize: '18px', letterSpacing: '0.5px' }}>
          Estado de Resultados
        </div>
        <div style={{ width: '120px' }} />
      </div>
      <Filtros filtros={filtros} setFiltros={setFiltros} opciones={opciones} />
      <TablaPnL filtros={filtros} />
    </div>
  )
}