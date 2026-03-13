import { useEffect, useState } from 'react'
import { supabase } from './supabase'

const KPIS = ['NI', 'MT']
const INVERTIDOS = ['COSTOS', 'GASTOS', 'CAPEX', 'CAPEX FINANCIAMIENTO']
const CERRADOS_POR_DEFAULT = ['ONE TIMERS', 'CAPEX', 'APORTACION', 'BALANCE', 'CAPEX FINANCIAMIENTO']

function colorVar(valor, cta1) {
  if (!valor || valor === 0) return '#333'
  if (KPIS.includes(cta1)) return '#333'
  const esInvertido = INVERTIDOS.includes(cta1)
  const esBueno = esInvertido ? valor < 0 : valor > 0
  return esBueno ? '#1a7f37' : '#cf222e'
}

function fmt(n, esKpi, enMillones) {
  if (n === null || n === undefined) return '-'
  if (esKpi) return Math.round(n).toLocaleString('es-MX')
  if (enMillones) return (n / 1000000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (n / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function FilaSubtotal({ label, valor, enMillones }) {
  return (
    <tr style={{ background: '#1a1a2e', color: '#fff', fontWeight: 700 }}>
      <td style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #444' }}>{label}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #444', color: valor >= 0 ? '#4caf89' : '#e57373' }}>
        {fmt(valor, false, enMillones)}
      </td>
    </tr>
  )
}

export default function TablaPnL({ filtros }) {
  const [filas, setFilas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [abiertos, setAbiertos] = useState({})
  const [acumulado, setAcumulado] = useState(true)
  const [enMillones, setEnMillones] = useState(true)

  useEffect(() => {
    if (!filtros?.escenarioBase) return
    cargarDatos()
  }, [filtros, acumulado])

  async function cargarDatos() {
    setCargando(true)
    const insts = filtros.instituciones.length === 0 ? null : filtros.instituciones
    const { data, error } = await supabase.rpc('get_pnl', {
      p_ano: filtros.ano,
      p_mes: filtros.mes,
      p_instituciones: insts,
      p_escenario: filtros.escenarioBase,
      p_acumulado: acumulado,
    })
    if (error) { console.error(error); setCargando(false); return }
    setFilas(data || [])

    const estadoInicial = {}
    const n1s = [...new Set((data || []).map(f => f.cta1))]
    n1s.forEach(n1 => {
      const cerrado = CERRADOS_POR_DEFAULT.includes(n1)
      estadoInicial[n1] = !cerrado
      const filasN1 = (data || []).filter(f => f.cta1 === n1)
      const n2s = [...new Set(filasN1.map(f => f.cta2))]
      n2s.forEach(n2 => { estadoInicial[n1 + n2] = false })
    })
    setAbiertos(estadoInicial)
    setCargando(false)
  }

  function toggle(key) {
    setAbiertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function totalSeccion(cta1) {
    return filas.filter(f => f.cta1 === cta1).reduce((s, f) => s + (f.valor || 0), 0)
  }

  const s = {
    tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '8px 12px', background: '#1a1a2e', color: '#fff', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0 },
    thLeft: { padding: '8px 12px', background: '#1a1a2e', color: '#fff', textAlign: 'left', fontWeight: 600, position: 'sticky', top: 0 },
    td: { padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #eee' },
    tdLeft: { padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #eee' },
  }

  const btnStyle = (activo) => ({
    padding: '6px 16px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer',
    background: activo ? '#1a1a2e' : '#fff', color: activo ? '#fff' : '#333', fontWeight: 600
  })

  if (cargando) return <p style={{ padding: '16px' }}>Cargando datos...</p>
  if (!filas.length) return <p style={{ padding: '16px' }}>Sin datos para los filtros seleccionados.</p>

  const ingresos = totalSeccion('INGRESOS')
  const costos = totalSeccion('COSTOS')
  const gastos = totalSeccion('GASTOS')
  const oneTimers = totalSeccion('ONE TIMERS')
  const capex = totalSeccion('CAPEX')
  const aportacion = totalSeccion('APORTACION')
  const balance = totalSeccion('BALANCE')
  const ebitdaProforma = ingresos - costos - gastos
  const ebitdaContable = ebitdaProforma - oneTimers
  const flujo = ebitdaContable - aportacion - capex - balance

  function renderSeccion(n1) {
    const esKpi = KPIS.includes(n1)
    const filasN1 = filas.filter(f => f.cta1 === n1)
    const totalN1 = filasN1.reduce((s, f) => s + (f.valor || 0), 0)
    const nivel2s = [...new Set(filasN1.map(f => f.cta2))]
    const abierto = abiertos[n1]

    if (esKpi) {
      const label = n1 === 'NI' ? 'Nuevo Ingreso' : 'Matricula Total'
      return (
        <tr key={n1} style={{ background: '#f0f7f0', fontWeight: 600 }}>
          <td style={s.tdLeft}>{label}</td>
          <td style={{ ...s.td, color: '#333' }}>{fmt(totalN1, true, false)}</td>
        </tr>
      )
    }

    return [
      <tr key={n1} style={{ background: '#e8f0fe', fontWeight: 700, cursor: 'pointer' }} onClick={() => toggle(n1)}>
        <td style={{ ...s.tdLeft, color: '#1a1a2e' }}>{abierto ? '▼' : '▶'} {n1}</td>
        <td style={{ ...s.td, color: colorVar(totalN1, n1) }}>{fmt(totalN1, false, enMillones)}</td>
      </tr>,
      abierto && nivel2s.map(n2 => {
        const filasN2 = filasN1.filter(f => f.cta2 === n2)
        const totalN2 = filasN2.reduce((s, f) => s + (f.valor || 0), 0)
        const nivel3s = filasN2.filter(f => f.cta3 && f.cta3 !== n2)
        const abiertoN2 = abiertos[n1 + n2]
        return [
          <tr key={n1 + n2} style={{ background: '#f8f9fa', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggle(n1 + n2)}>
            <td style={{ ...s.tdLeft, paddingLeft: '28px' }}>
              {nivel3s.length ? (abiertoN2 ? '▼' : '▶') : '  '} {n2}
            </td>
            <td style={{ ...s.td, color: colorVar(totalN2, n1) }}>{fmt(totalN2, false, enMillones)}</td>
          </tr>,
          abiertoN2 && nivel3s.map(f => (
            <tr key={f.cta_cod} style={{ background: '#fff', fontWeight: 400 }}>
              <td style={{ ...s.tdLeft, paddingLeft: '48px' }}>{f.cta3}</td>
              <td style={{ ...s.td, color: colorVar(f.valor, n1) }}>{fmt(f.valor, false, enMillones)}</td>
            </tr>
          ))
        ]
      })
    ]
  }

  const unidad = enMillones ? 'MXN millones' : 'MXN miles'

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: '12px', display: 'flex', gap: '16px', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setAcumulado(true)} style={btnStyle(acumulado)}>Acumulado</button>
          <button onClick={() => setAcumulado(false)} style={btnStyle(!acumulado)}>Mes</button>
        </div>
        <div style={{ width: '1px', background: '#dee2e6', height: '28px' }} />
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setEnMillones(true)} style={btnStyle(enMillones)}>Millones</button>
          <button onClick={() => setEnMillones(false)} style={btnStyle(!enMillones)}>Miles</button>
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={s.tabla}>
          <thead>
            <tr>
              <th style={s.thLeft}>Cuenta</th>
              <th style={s.th}>{filtros.escenarioBase} ({unidad})</th>
            </tr>
          </thead>
          <tbody>
            {renderSeccion('NI')}
            {renderSeccion('MT')}
            {renderSeccion('INGRESOS')}
            {renderSeccion('COSTOS')}
            {renderSeccion('GASTOS')}
            <FilaSubtotal label="EBITDA PROFORMA" valor={ebitdaProforma} enMillones={enMillones} />
            {renderSeccion('ONE TIMERS')}
            <FilaSubtotal label="EBITDA CONTABLE" valor={ebitdaContable} enMillones={enMillones} />
            {renderSeccion('CAPEX')}
            {renderSeccion('APORTACION')}
            <FilaSubtotal label="FLUJO" valor={flujo} enMillones={enMillones} />
            {renderSeccion('CAPEX FINANCIAMIENTO')}
            {renderSeccion('BALANCE')}
          </tbody>
        </table>
      </div>
    </div>
  )
}