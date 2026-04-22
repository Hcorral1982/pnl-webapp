import React, { useEffect, useState } from 'react'
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

function fmtPctIngreso(valor, ingresos) {
  if (!ingresos || ingresos === 0) return '-'
  return fmtPct(valor / ingresos)
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

const BORDE_GRUPO = '2px solid #305496'
const BORDE_VAR = '2px solid #888'

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

    const { data: dataBase, error: errBase } = await supabase.rpc('get_pnl', {
      p_ano: filtros.ano,
      p_mes: filtros.mes,
      p_instituciones: insts,
      p_escenario: filtros.escenarioBase,
      p_acumulado: acumulado,
    })
    if (errBase) { console.error(errBase); setCargando(false); return }
    setFilasBase(dataBase || [])

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

  function totalSeccionComp(compFilas, cta1) {
    return compFilas.filter(f => f.cta1 === cta1).reduce((s, f) => s + (f.valor || 0), 0)
  }

  const btnStyle = (activo) => ({
    padding: '6px 16px', borderRadius: '6px', border: '1px solid #ccc', cursor: 'pointer',
    background: activo ? '#305496' : '#fff', color: activo ? '#fff' : '#333', fontWeight: 600
  })

  const s = {
    tabla: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
    thLeft: { padding: '8px 12px', background: '#305496', color: '#fff', textAlign: 'left', fontWeight: 600, position: 'sticky', top: 0, borderRight: BORDE_GRUPO },
    thGrupoBase: { padding: '6px 8px', background: '#305496', color: '#fff', textAlign: 'center', fontWeight: 700, position: 'sticky', top: 0, borderLeft: BORDE_GRUPO, borderRight: BORDE_GRUPO, whiteSpace: 'nowrap' },
    thGrupoComp: { padding: '6px 8px', background: '#2d3a6b', color: '#fff', textAlign: 'center', fontWeight: 700, position: 'sticky', top: 0, borderLeft: BORDE_GRUPO, borderRight: BORDE_GRUPO, whiteSpace: 'nowrap' },
    thGrupoVar: { padding: '6px 8px', background: '#4a5568', color: '#fff', textAlign: 'center', fontWeight: 700, position: 'sticky', top: 0, borderLeft: BORDE_VAR, borderRight: BORDE_VAR, whiteSpace: 'nowrap' },
    thSub: { padding: '6px 8px', background: '#3d6099', color: '#dce6f1', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, fontSize: '11px', whiteSpace: 'nowrap' },
    thSubFirst: { padding: '6px 8px', background: '#3d6099', color: '#dce6f1', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, fontSize: '11px', whiteSpace: 'nowrap', borderLeft: BORDE_GRUPO },
    thSubComp: { padding: '6px 8px', background: '#3a4a7a', color: '#dce6f1', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, fontSize: '11px', whiteSpace: 'nowrap' },
    thSubCompFirst: { padding: '6px 8px', background: '#3a4a7a', color: '#dce6f1', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, fontSize: '11px', whiteSpace: 'nowrap', borderLeft: BORDE_GRUPO },
    thSubVar: { padding: '6px 8px', background: '#555f70', color: '#dce6f1', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, fontSize: '11px', whiteSpace: 'nowrap' },
    thSubVarFirst: { padding: '6px 8px', background: '#555f70', color: '#dce6f1', textAlign: 'right', fontWeight: 600, position: 'sticky', top: 0, fontSize: '11px', whiteSpace: 'nowrap', borderLeft: BORDE_VAR },
    td: { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #eee' },
    tdLeft: { padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #eee', borderRight: BORDE_GRUPO },
    tdVal: { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #eee', borderLeft: BORDE_GRUPO },
    tdPct: { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '12px', color: '#555', borderRight: BORDE_GRUPO },
    tdValComp: { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #eee', borderLeft: BORDE_GRUPO },
    tdPctComp: { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '12px', color: '#555', borderRight: BORDE_GRUPO },
    tdVarFirst: { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '12px', borderLeft: BORDE_VAR },
    tdVar: { padding: '6px 10px', textAlign: 'right', borderBottom: '1px solid #eee', fontSize: '12px', borderRight: BORDE_VAR },
  }

  if (cargando) return <p style={{ padding: '16px' }}>Cargando datos...</p>
  if (!filasBase.length) return <p style={{ padding: '16px' }}>Sin datos para los filtros seleccionados.</p>

  const base = calcSubtotales(filasBase)
  const compsSubtotales = filasComp.map(c => ({ label: c.label, ...calcSubtotales(c.filas) }))
  const unidad = enMillones ? 'MXN millones' : 'MXN miles'

  function celdaValor(valor, cta1, esKpi, ingresos, isFirst) {
    return (
      <>
        <td style={{ ...(isFirst ? s.tdVal : s.tdValComp), color: esKpi ? '#333' : colorVar(valor, cta1) }}>
          {fmt(valor, esKpi, esKpi ? false : enMillones)}
        </td>
        <td style={esKpi ? { ...s.tdPctComp } : s.tdPct}>
          {esKpi ? '-' : fmtPctIngreso(valor, ingresos)}
        </td>
      </>
    )
  }

  function celdaVar(baseVal, compVal, cta1, esKpi) {
    const diff = baseVal - compVal
    const pct = compVal !== 0 ? diff / Math.abs(compVal) : null
    const color = esKpi ? '#555' : colorVarDiff(diff, cta1)
    return (
      <>
        <td style={{ ...s.tdVarFirst, color }}>{fmt(diff, esKpi, esKpi ? false : enMillones)}</td>
        <td style={{ ...s.tdVar, color }}>{fmtPct(pct)}</td>
      </>
    )
  }

  function FilaSubtotal({ label, baseVal, compsVals, ingresosBase, ingresosComps }) {
    const bg = '#305496'
    const color = '#fff'
    const stBase = { padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #1a3a6e', background: bg, color: baseVal >= 0 ? '#4caf89' : '#e57373', fontWeight: 700 }
    const stPct = { padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #1a3a6e', background: bg, color: '#ccc', fontSize: '12px', fontWeight: 600, borderRight: BORDE_GRUPO }
    const stLabel = { padding: '8px 12px', textAlign: 'left', borderBottom: '2px solid #1a3a6e', background: bg, color, fontWeight: 700, borderRight: BORDE_GRUPO }
    const stVarFirst = { padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #1a3a6e', background: '#3a4560', fontWeight: 700, borderLeft: BORDE_VAR }
    const stVar = { padding: '8px 10px', textAlign: 'right', borderBottom: '2px solid #1a3a6e', background: '#3a4560', fontWeight: 700, borderRight: BORDE_VAR }
    return (
      <tr>
        <td style={stLabel}>{label}</td>
        <td style={{ ...stBase, borderLeft: BORDE_GRUPO }}>{fmt(baseVal, false, enMillones)}</td>
        <td style={stPct}>{fmtPctIngreso(baseVal, ingresosBase)}</td>
        {compsVals.map((cv, i) => {
          const diff = baseVal - cv
          const pct = cv !== 0 ? diff / Math.abs(cv) : null
          const varColor = diff >= 0 ? '#4caf89' : '#e57373'
          return (
            <React.Fragment key={i}>
              <td style={{ ...stBase, borderLeft: BORDE_GRUPO }}>{fmt(cv, false, enMillones)}</td>
              <td style={stPct}>{fmtPctIngreso(cv, ingresosComps[i])}</td>
              <td style={{ ...stVarFirst, color: varColor }}>{fmt(diff, false, enMillones)}</td>
              <td style={{ ...stVar, color: varColor }}>{fmtPct(pct)}</td>
            </React.Fragment>
          )
        })}
      </tr>
    )
  }

  function renderSeccion(n1) {
    const esKpi = KPIS.includes(n1)
    const filasN1 = filasBase.filter(f => f.cta1 === n1)
    const totalN1 = filasN1.reduce((acc, f) => acc + (f.valor || 0), 0)
    const nivel2s = [...new Set(filasN1.map(f => f.cta2))]
    const abierto = abiertos[n1]
    const label = n1 === 'NI' ? 'Nuevo Ingreso' : n1 === 'MT' ? 'Matricula Total' : n1

    if (esKpi) {
      return (
        <tr key={n1} style={{ background: '#f0f7f0', fontWeight: 600 }}>
          <td style={s.tdLeft}>{label}</td>
          {celdaValor(totalN1, n1, true, base.ingresos, true)}
          {filasComp.map((comp, i) => {
            const compVal = totalSeccionComp(comp.filas, n1)
            return (
              <React.Fragment key={i}>
                {celdaValor(compVal, n1, true, compsSubtotales[i].ingresos, false)}
                {celdaVar(totalN1, compVal, n1, true)}
              </React.Fragment>
            )
          })}
        </tr>
      )
    }

    return [
      <tr key={n1} style={{ background: '#e8f0fe', fontWeight: 700, cursor: 'pointer' }} onClick={() => toggle(n1)}>
        <td style={s.tdLeft}>{abierto ? '▼' : '▶'} {n1}</td>
        {celdaValor(totalN1, n1, false, base.ingresos, true)}
        {filasComp.map((comp, i) => {
          const compVal = totalSeccionComp(comp.filas, n1)
          return (
            <React.Fragment key={i}>
              {celdaValor(compVal, n1, false, compsSubtotales[i].ingresos, false)}
              {celdaVar(totalN1, compVal, n1, false)}
            </React.Fragment>
          )
        })}
      </tr>,
      abierto && nivel2s.map(n2 => {
        const filasN2 = filasN1.filter(f => f.cta2 === n2)
        const totalN2 = filasN2.reduce((acc, f) => acc + (f.valor || 0), 0)
        const nivel3s = filasN2.filter(f => f.cta3 && f.cta3 !== n2)
        const abiertoN2 = abiertos[n1 + n2]
        return [
          <tr key={n1 + n2} style={{ background: '#f8f9fa', fontWeight: 600, cursor: 'pointer' }} onClick={() => toggle(n1 + n2)}>
            <td style={s.tdLeft} >
              <span style={{ paddingLeft: '16px' }}>{nivel3s.length ? (abiertoN2 ? '▼' : '▶') : '  '} {n2}</span>
            </td>
            {celdaValor(totalN2, n1, false, base.ingresos, true)}
            {filasComp.map((comp, i) => {
              const compFilasN2 = comp.filas.filter(f => f.cta1 === n1 && f.cta2 === n2)
              const compTotalN2 = compFilasN2.reduce((acc, f) => acc + (f.valor || 0), 0)
              return (
                <React.Fragment key={i}>
                  {celdaValor(compTotalN2, n1, false, compsSubtotales[i].ingresos, false)}
                  {celdaVar(totalN2, compTotalN2, n1, false)}
                </React.Fragment>
              )
            })}
          </tr>,
          abiertoN2 && nivel3s.map(f => (
            <tr key={f.cta_cod} style={{ background: '#fff', fontWeight: 400 }}>
              <td style={s.tdLeft}>
                <span style={{ paddingLeft: '32px' }}>
                  <span style={{ color: '#888', fontSize: '11px', marginRight: '6px' }}>{f.cta_cod}</span>
                  {f.cta3}
                </span>
              </td>
              {celdaValor(f.valor, n1, false, base.ingresos, true)}
              {filasComp.map((comp, i) => {
                const compF = comp.filas.find(cf => cf.cta_cod === f.cta_cod)
                const compVal = compF ? compF.valor : 0
                return (
                  <React.Fragment key={i}>
                    {celdaValor(compVal, n1, false, compsSubtotales[i].ingresos, false)}
                    {celdaVar(f.valor, compVal, n1, false)}
                  </React.Fragment>
                )
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
            {/* Fila 1: grupos */}
            <tr>
              <th style={{ ...s.thLeft, borderBottom: '1px solid #4472c4' }} rowSpan={2}>Cuenta</th>
              <th style={{ ...s.thGrupoBase }} colSpan={2}>
                {filtros.ano} {filtros.escenarioBase} ({unidad})
              </th>
              {filasComp.map((comp, i) => (
                <React.Fragment key={i}>
                  <th style={s.thGrupoComp} colSpan={2}>{comp.label}</th>
                  <th style={s.thGrupoVar} colSpan={2}>Var. vs {comp.label}</th>
                </React.Fragment>
              ))}
            </tr>
            {/* Fila 2: subencabezados */}
            <tr>
              <th style={s.thSubFirst}>Valor</th>
              <th style={{ ...s.thSub, borderRight: BORDE_GRUPO }}>% Ing.</th>
              {filasComp.map((comp, i) => (
                <React.Fragment key={i}>
                  <th style={s.thSubCompFirst}>Valor</th>
                  <th style={{ ...s.thSubComp, borderRight: BORDE_GRUPO }}>% Ing.</th>
                  <th style={s.thSubVarFirst}>Var $</th>
                  <th style={{ ...s.thSubVar, borderRight: BORDE_VAR }}>Var %</th>
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
            <FilaSubtotal label="EBITDA PROFORMA" baseVal={base.ebitdaProforma} compsVals={compsSubtotales.map(c => c.ebitdaProforma)} ingresosBase={base.ingresos} ingresosComps={compsSubtotales.map(c => c.ingresos)} />
            {renderSeccion('ONE TIMERS')}
            <FilaSubtotal label="EBITDA CONTABLE" baseVal={base.ebitdaContable} compsVals={compsSubtotales.map(c => c.ebitdaContable)} ingresosBase={base.ingresos} ingresosComps={compsSubtotales.map(c => c.ingresos)} />
            {renderSeccion('CAPEX')}
            {renderSeccion('APORTACION')}
            <FilaSubtotal label="FLUJO" baseVal={base.flujo} compsVals={compsSubtotales.map(c => c.flujo)} ingresosBase={base.ingresos} ingresosComps={compsSubtotales.map(c => c.ingresos)} />
            {renderSeccion('CAPEX FINANCIAMIENTO')}
            {renderSeccion('BALANCE')}
          </tbody>
        </table>
      </div>
    </div>
  )
}