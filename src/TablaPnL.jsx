import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const SUBTOTALES = ['INGRESOS', 'COSTOS', 'GASTOS', 'EBITDA PROFORMA', 'EBITDA CONTABLE', 'FLUJO']
const COSTOS_GASTOS = ['COSTOS', 'GASTOS']
const KPIS = ['NI', 'MT']

function colorVar(valor, cta1) {
  if (!valor || valor === 0) return '#333'
  if (KPIS.includes(cta1)) return '#333'
  const esInvertido = COSTOS_GASTOS.includes(cta1)
  const esBueno = esInvertido ? valor < 0 : valor > 0
  return esBueno ? '#1a7f37' : '#cf222e'
}

function fmt(n, esKpi) {
  if (n === null || n === undefined) return '-'
  if (esKpi) return Math.round(n).toLocaleString('es-MX')
  return (n / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

export default function TablaPnL({ filtros }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [abiertos, setAbiertos] = useState({})

  useEffect(() => {
    if (!filtros?.escenarioBase) return
    cargarDatos()
  }, [filtros])

  async function cargarDatos() {
    setCargando(true)
    const { data, error } = await supabase.rpc('get_pnl', {
      p_ano: filtros.ano,
      p_mes: filtros.mes,
      p_institucion: filtros.institucion,
      p_escenario: filtros.escenarioBase,
    })
    if (error) { console.error(error); setCargando(false); return }
    setFilas(data || [])
    setCargando(false)
  }

  function toggleAbierto(key) {
    setAbiertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const s = {
    tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '8px 12px', background: '#1a1a2e', color: '#fff', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0 },
    thLeft: { padding: '8px 12px', background: '#1a1a2e', color: '#fff', textAlign: 'left', fontWeight: 600, position: 'sticky', top: 0 },
    filaKpi: { background: '#f0f7f0', fontWeight: 600 },
    filaNivel1: { background: '#e8f0fe', fontWeight: 700, cursor: 'pointer' },
    filaNivel2: { background: '#f8f9fa', fontWeight: 600, cursor: 'pointer' },
    filaNivel3: { background: '#fff', fontWeight: 400 },
    filaSubtotal: { background: '#1a1a2e', color: '#fff', fontWeight: 700 },
    td: { padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #eee' },
    tdLeft: { padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #eee' },
  }

  if (cargando) return <p style={{ padding: '16px' }}>Cargando datos...</p>
  if (!filas.length) return <p style={{ padding: '16px' }}>Sin datos para los filtros seleccionados.</p>

  const nivel1s = [...new Set(filas.map(f => f.cta1))]

  return (
    <div style={{ overflowX: 'auto', padding: '16px' }}>
      <table style={s.tabla}>
        <thead>
          <tr>
            <th style={s.thLeft}>Cuenta</th>
            <th style={s.th}>{filtros.escenarioBase}</th>
          </tr>
        </thead>
        <tbody>
          {nivel1s.map(n1 => {
            const esKpi = KPIS.includes(n1)
            const esSubtotal = SUBTOTALES.includes(n1)
            const filasN1 = filas.filter(f => f.cta1 === n1)
            const totalN1 = filasN1.reduce((s, f) => s + (f.valor || 0), 0)
            const nivel2s = [...new Set(filasN1.map(f => f.cta2))]
            const abierto = abiertos[n1] !== false

            if (esKpi) {
              const label = n1 === 'NI' ? 'Nuevo Ingreso' : 'Matricula Total'
              return (
                <tr key={n1} style={s.filaKpi}>
                  <td style={s.tdLeft}>{label}</td>
                  <td style={{ ...s.td, color: '#333' }}>{fmt(totalN1, true)}</td>
                </tr>
              )
            }

            const estiloFila = esSubtotal ? s.filaSubtotal : s.filaNivel1
            const colorTexto = esSubtotal ? '#fff' : '#1a1a2e'

            return [
              <tr key={n1} style={estiloFila} onClick={() => toggleAbierto(n1)}>
                <td style={{ ...s.tdLeft, color: colorTexto }}>
                  {abierto ? '▼' : '▶'} {n1}
                </td>
                <td style={{ ...s.td, color: esSubtotal ? '#fff' : colorVar(totalN1, n1) }}>
                  {fmt(totalN1, false)}
                </td>
              </tr>,
              abierto && nivel2s.map(n2 => {
                const filasN2 = filasN1.filter(f => f.cta2 === n2)
                const totalN2 = filasN2.reduce((s, f) => s + (f.valor || 0), 0)
                const nivel3s = filasN2.filter(f => f.cta3 && f.cta3 !== n2)
                const abiertoN2 = abiertos[n1 + n2] !== false
                return [
                  <tr key={n1 + n2} style={s.filaNivel2} onClick={() => toggleAbierto(n1 + n2)}>
                    <td style={{ ...s.tdLeft, paddingLeft: '28px' }}>
                      {nivel3s.length ? (abiertoN2 ? '▼' : '▶') : '  '} {n2}
                    </td>
                    <td style={{ ...s.td, color: colorVar(totalN2, n1) }}>
                      {fmt(totalN2, false)}
                    </td>
                  </tr>,
                  abiertoN2 && nivel3s.map(f => (
                    <tr key={f.cta_cod} style={s.filaNivel3}>
                      <td style={{ ...s.tdLeft, paddingLeft: '48px' }}>{f.cta3}</td>
                      <td style={{ ...s.td, color: colorVar(f.valor, n1) }}>
                        {fmt(f.valor, false)}
                      </td>
                    </tr>
                  ))
                ]
              })
            ]
          })}
        </tbody>
      </table>
    </div>
  )
}