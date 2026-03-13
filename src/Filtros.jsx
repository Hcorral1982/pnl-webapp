import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function Filtros({ onChange }) {
  const [anos, setAnos] = useState([])
  const [meses, setMeses] = useState([])
  const [instituciones, setInstituciones] = useState([])
  const [escenarios, setEscenarios] = useState([])
  const [filtros, setFiltros] = useState({
    ano: '',
    mes: '',
    institucion: 'TODAS',
    escenarioBase: '',
    escenarios: [],
  })

  useEffect(() => {
    async function cargarOpciones() {
      const { data, error } = await supabase.rpc('get_distinct_values')
      if (error) { console.error(error); return }
      const anosU = data.anos || []
      const mesesU = (data.meses || []).sort((a, b) => a.num - b.num)
      const instU = ['TODAS', ...(data.instituciones || [])]
      const escU = data.escenarios || []
      setAnos(anosU)
      setMeses(mesesU)
      setInstituciones(instU)
      setEscenarios(escU)
      const inicial = {
        ano: anosU[anosU.length - 1],
        mes: mesesU[mesesU.length - 1]?.num,
        institucion: 'TODAS',
        escenarioBase: escU[0],
        escenarios: [],
      }
      setFiltros(inicial)
      onChange(inicial)
    }
    cargarOpciones()
  }, [])

  function actualizar(campo, valor) {
    const nuevo = { ...filtros, [campo]: valor }
    setFiltros(nuevo)
    onChange(nuevo)
  }

  function toggleEscenario(esc) {
    const actual = filtros.escenarios
    const nuevo = actual.includes(esc)
      ? actual.filter(e => e !== esc)
      : actual.length < 2 ? [...actual, esc] : actual
    actualizar('escenarios', nuevo)
  }

  const s = {
    wrap: { display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '16px', background: '#f5f5f5', borderBottom: '1px solid #ddd' },
    grupo: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '11px', fontWeight: 600, color: '#666', textTransform: 'uppercase' },
    select: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '14px' },
    chip: (activo) => ({ padding: '6px 12px', borderRadius: '20px', border: '1px solid #ccc', fontSize: '13px', cursor: 'pointer', background: activo ? '#1a73e8' : '#fff', color: activo ? '#fff' : '#333' }),
  }

  return (
    <div style={s.wrap}>
      <div style={s.grupo}>
        <span style={s.label}>Año</span>
        <select style={s.select} value={filtros.ano} onChange={e => actualizar('ano', Number(e.target.value))}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div style={s.grupo}>
        <span style={s.label}>Mes</span>
        <select style={s.select} value={filtros.mes} onChange={e => actualizar('mes', Number(e.target.value))}>
          {meses.map(m => <option key={m.num} value={m.num}>{m.desc}</option>)}
        </select>
      </div>
      <div style={s.grupo}>
        <span style={s.label}>Institución</span>
        <select style={s.select} value={filtros.institucion} onChange={e => actualizar('institucion', e.target.value)}>
          {instituciones.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>
      <div style={s.grupo}>
        <span style={s.label}>Escenario base</span>
        <select style={s.select} value={filtros.escenarioBase} onChange={e => actualizar('escenarioBase', e.target.value)}>
          {escenarios.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>
      <div style={s.grupo}>
        <span style={s.label}>Comparar con (max. 2)</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          {escenarios.filter(e => e !== filtros.escenarioBase).map(e => (
            <button key={e} style={s.chip(filtros.escenarios.includes(e))} onClick={() => toggleEscenario(e)}>
              {e}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}