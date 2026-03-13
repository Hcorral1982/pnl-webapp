import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Filtros from './Filtros'
import TablaPnL from './TablaPnL'

export default function App() {
  const [opciones, setOpciones] = useState({ anos: [], meses: [], instituciones: [], escenarios: [] })
  const [filtros, setFiltros] = useState(null)

  useEffect(() => {
    cargarOpciones()
  }, [])

  async function cargarOpciones() {
    const { data, error } = await supabase.rpc('get_distinct_values')
    if (error) { console.error(error); return }
    const d = Array.isArray(data) ? data[0] : data
    const ops = {
      anos: d.anos || [],
      meses: (d.meses || []).map(m => ({ num: m.num, desc: m.desc })),
      instituciones: d.instituciones || [],
      escenarios: d.escenarios || [],
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

  if (!filtros) return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', padding: '32px', textAlign: 'center' }}>
      Cargando...
    </div>
  )

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', background: '#fff' }}>
      <div style={{ background: '#1a1a2e', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: '16px', textAlign: 'center' }}>
        P&L Financiero
      </div>
      <Filtros filtros={filtros} setFiltros={setFiltros} opciones={opciones} />
      <TablaPnL filtros={filtros} />
    </div>
  )
}
