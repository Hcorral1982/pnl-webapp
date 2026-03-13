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

function colorVarDiff(diff, cta1) {
  if (!diff || diff === 0) return '#333'
  if (KPIS.includes(cta1)) return '#333'
  const esInvertido = INVERTIDOS.includes(cta1)
  const esBueno = esInvertido ? diff > 0 : diff < 0
  return esBueno ? '#1a7f37' : '#cf222e'
}

function fmt(n, esKpi, enMillones) {
  if (n === null || n === undefined) return '-'
  if (esKpi) return Math.round(n).toLocaleString('es-MX')
  if (enMillones) return (n / 1000000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return (n / 1000).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function fmtPct(n) {
  if (n === null || n === undefined || !isFinite(n)) return '-'
  return (n * 100).toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

function calcSubtotales(filas) {
  const total = (cta1) => filas.filter(f => f.cta1 === cta1).reduce((s, f) => s + (f.valor || 0), 0)
  const ingresos = total('INGRESOS')
  const costos = total('COSTOS')
  const gastos = total('GASTOS')
  const oneTimers = total('ONE TIMERS')
  const capex = total('CAPEX')
  const aportacion = total('APORTACION')
  const balance = total('BALANCE')
  return {
    ingresos, costos, gastos, oneTimers, capex, aportacion, balance,
    ebitdaProforma: ingresos - costos - gastos,
    ebitdaContable: ingresos - costos - gastos - oneTimers,
    flujo: ingresos - costos - gastos - oneTimers - aportacion - capex - balance,
  }
}

export default function TablaPnL({ filtros }) {
  const [filasBase, setFilasBase] = useState([])
  const [filasComp, setFilasComp] = useState([])
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

    // Carga escenario base
    const { data: dataBase, error: errBase } = await supabase.rpc('get_pnl', {
      p_ano: filtros.ano,
      p_mes: filtros.mes,
      p_instituciones: insts,
      p_escenario: filtros.escenarioBase,
      p_acumulado: acumulado,
    })
    if (errBase) { console.error(errBase); setCargando(false); return }
    setFilasBase(dataBase || [])

    // Carga comparaciones
    const comps = []
    for (const comp of filtros.comparaciones) {
      const { data: dataComp, error: errComp } = await supabase.rpc('get_pnl', {
        p_ano: comp.ano,
        p_mes: filtros.mes,
        p_instituciones: insts,
        p_escenario: comp.escenario,
        p_acumulado: acumulado,
      })
      if (!errComp) comps.push({ label: `${comp.ano} ${comp.escenario}`, filas: dataComp || [] })
    }
    setFilasComp(comps)

    // Estado inicial colapsado
    const estadoInicial = {}
    const n1s = [...new Set((dataBase || []).map(f => f.cta1))]
    n1s.forEach(n1 => {
      estadoInicial[n1] = !CERRADOS_POR_DEFAULT.includes(n1)
      const filasN1 = (dataBase || []).filter(f => f.cta1 === n1)
      const n2s = [...new Set(filasN1.map(f => f.cta2))]
      n2s.forEach(n2 => { estadoInicial[n1 + n2] = false })
    })
    setAbiertos(estadoInicial)
    setCargando(false)
  }

  function toggle(key) {
    setAbiertos(prev => ({ ...prev, [key]: !prev[key] }))
  }

  function getValorComp(compFilas, cta1, cta2, cta3, cta_cod) {
    const f = compFilas.find(f => f.cta_cod === cta_cod && f.cta1 === cta1)
    return f ? f.valor : 0
  }

  function totalSeccionComp(compFilas, cta1) {
    return compFilas.filter(f => f.cta1 === cta1).reduce((s, f) => s + (f.valor || 0), 0)
  }

  const btnStyle = (activo) => ({
    padding: '6px 16px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer',
    background: activo ? '#305496' : '#fff', color: activo ? '#fff' : '#333', fontWeight: 600
  })

  const s = {
    tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    th: { padding: '8px 12px', background: '#305496', color: '#fff', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, whiteSpace: 'nowrap' },
    thLeft: { padding: '8px 12px', background: '#305496', color: '#fff', textAlign: 'left', fontWeight: 600, position: 'sticky', top: 0 },
    thComp: { padding: '8px 12px', background: '#2d3561', color: '#fff', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, whiteSpace: 'nowrap' },
    thVar: { padding: '8px 12px', background: '#3d4a6b', color: '#ccc', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, whiteSpace: 'nowrap', fontSize: '11px' },
    td: { padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #eee' },
    tdLeft: { padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #eee' },
    tdVar: { padding: '6px 12px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '12px' },
  }

  if (cargando) return <p style={{ padding: '16px' }}>Cargando datos...</p>
  if (!filasBase.length) return <p style={{ padding: '16px' }}>Sin datos para los filtros seleccionados.</p>

  const base = calcSubtotales(filasBase)
  const compsSubtotales = filasComp.map(c => ({ label: c.label, ...calcSubtotales(c.filas) }))
  const unidad = enMillones ? 'MXN millones' : 'MXN miles'
  const nComps = filasComp.length

  function celdaComp(baseVal, compVal, cta1, esKpi) {
    const diff = baseVal - compVal
    const pct = compVal !== 0 ? diff / Math.abs(compVal) : null
    const color = esKpi ? '#333' : colorVarDiff(diff, cta1)
    return (
      <>
        <td style={{ ...s.td }}>{fmt(compVal, esKpi, esKpi ? false : enMillones)}</td>
        <td style={{ ...s.tdVar, color }}>{fmt(diff, esKpi, esKpi ? false : enMillones)}</td>
        <td style={{ ...s.tdVar, color }}>{fmtPct(pct)}</td>
      </>
    )
  }

  function FilaSubtotal({ label, baseVal, compsVals }) {
    return (
      <tr style={{ background: '#305496', color: '#fff', fontWeight: 700 }}>
        <td style={{ padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #444' }}>{label}</td>
        <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #444', color: baseVal >= 0 ? '#4caf89' : '#e57373' }}>
          {fmt(baseVal, false, enMillones)}
        </td>
        {compsVals.map((cv, i) => {
          const diff = baseVal - cv
          const pct = cv !== 0 ? diff / Math.abs(cv) : null
          const color = diff >= 0 ? '#4caf89' : '#e57373'
          return (
            <React.Fragment key={i}>
              <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #444', color: cv >= 0 ? '#4caf89' : '#e57373' }}>{fmt(cv, false, enMillones)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #444', color }}>{fmt(diff, false, enMillones)}</td>
              <td style={{ padding: '8px 12px', textAlign: 'right', borderBottom: '2px solid #444', color }}>{fmtPct(pct)}</td>
            </React.Fragment>
          )
        })}
      </tr>
    )
  }

  function renderSeccion(n1) {
    const esKpi = KPIS.includes(n1)
    const filasN1 = filasBase.filter(f => f.cta1 === n1)
    const totalN1 = filasN1.reduce((s, f) => s + (f.valor || 0), 0)
    const nivel2s = [...new Set(filasN1.map(f => f.cta2))]
    const abierto = abiertos[n1]
    const label = n1 === 'NI' ? 'Nuevo Ingreso' : n1 === 'MT' ? 'Matricula Total' : n1

    if (esKpi) {
      return (
        <tr key={n1} style={{ background: '#f0f7f0', fontWeight: 600 }}>
          <td style={s.tdLeft}>{label}</td>
          <td style={{ ...s.td, color: '#333' }}>{fmt(totalN1, true, false)}</td>
          {filasComp.map((comp, i) => {
            const compVal = totalSeccionComp(comp.filas, n1)
            const diff = totalN1 - compVal
            const pct = compVal !== 0 ? diff / Math.abs(compVal) : null
            return (
              <React.Fragment key={i}>
                <td style={{ ...s.td, color: '#333' }}>{fmt(compVal, true, false)}</td>
                <td style={{ ...s.tdVar, color: '#333' }}>{fmt(diff, true, false)}</td>
                <td style={{ ...s.tdVar, color: '#333' }}>{fmtPct(pct)}</td>
              </React.Fragment>
            )
          })}
        </tr>
      )
    }

    return [
      <tr key={n1} style={{ background: '#e8f0fe', fontWeight: 700, cursor: 'pointer' }} onClick={() => toggle(n1)}>
        <td style={{ ...s.tdLeft, color: '#305496' }}>{abierto ? '▼' : '▶'} {n1}</td>
        <td style={{ ...s.td, color: colorVar(totalN1, n1) }}>{fmt(totalN1, false, enMillones)}</td>
        {filasComp.map((comp, i) => {
          const compVal = totalSeccionComp(comp.filas, n1)
          return <React.Fragment key={i}>{celdaComp(totalN1, compVal, n1, false)}</React.Fragment>
        })}
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
            {filasComp.map((comp, i) => {
              const compFilasN2 = comp.filas.filter(f => f.cta1 === n1 && f.cta2 === n2)
              const compTotalN2 = compFilasN2.reduce((s, f) => s + (f.valor || 0), 0)
              return <React.Fragment key={i}>{celdaComp(totalN2, compTotalN2, n1, false)}</React.Fragment>
            })}
          </tr>,
          abiertoN2 && nivel3s.map(f => (
            <tr key={f.cta_cod} style={{ background: '#fff', fontWeight: 400 }}>
              <td style={{ ...s.tdLeft, paddingLeft: '48px' }}>{f.cta3}</td>
              <td style={{ ...s.td, color: colorVar(f.valor, n1) }}>{fmt(f.valor, false, enMillones)}</td>
              {filasComp.map((comp, i) => {
                const compF = comp.filas.find(cf => cf.cta_cod === f.cta_cod)
                const compVal = compF ? compF.valor : 0
                return <React.Fragment key={i}>{celdaComp(f.valor, compVal, n1, false)}</React.Fragment>
              })}
            </tr>
          ))
        ]
      })
    ]
  }

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
              {filasComp.map((comp, i) => (
                <React.Fragment key={i}>
                  <th style={s.thComp}>{comp.label}</th>
                  <th style={s.thVar}>Var $</th>
                  <th style={s.thVar}>Var %</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {renderSeccion('NI')}
            {renderSeccion('MT')}
            {renderSeccion('INGRESOS')}
            {renderSeccion('COSTOS')}
            {renderSeccion('GASTOS')}
            <FilaSubtotal label="EBITDA PROFORMA" baseVal={base.ebitdaProforma} compsVals={compsSubtotales.map(c => c.ebitdaProforma)} />
            {renderSeccion('ONE TIMERS')}
            <FilaSubtotal label="EBITDA CONTABLE" baseVal={base.ebitdaContable} compsVals={compsSubtotales.map(c => c.ebitdaContable)} />
            {renderSeccion('CAPEX')}
            {renderSeccion('APORTACION')}
            <FilaSubtotal label="FLUJO" baseVal={base.flujo} compsVals={compsSubtotales.map(c => c.flujo)} />
            {renderSeccion('CAPEX FINANCIAMIENTO')}
            {renderSeccion('BALANCE')}
          </tbody>
        </table>
      </div>
    </div>
  )
}