import { useState, useRef, useEffect } from 'react'

export default function Filtros({ filtros, setFiltros, opciones }) {
  const { anos, meses, instituciones, escenarios } = opciones
  const [dropdownAbierto, setDropdownAbierto] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAbierto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function updateBase(key, val) {
    setFiltros(prev => ({ ...prev, [key]: val }))
  }

  function toggleInstitucion(inst) {
    setFiltros(prev => {
      const actual = prev.instituciones
      if (actual.includes(inst)) {
        return { ...prev, instituciones: actual.filter(i => i !== inst) }
      } else {
        return { ...prev, instituciones: [...actual, inst] }
      }
    })
  }

  function toggleTodas() {
    setFiltros(prev => ({
      ...prev,
      instituciones: prev.instituciones.length === instituciones.length ? [] : [...instituciones]
    }))
  }

  function addComparacion() {
    if (filtros.comparaciones.length >= 2) return
    setFiltros(prev => ({
      ...prev,
      comparaciones: [...prev.comparaciones, { ano: prev.ano, escenario: escenarios[0] || 'PPTO' }]
    }))
  }

  function removeComparacion(i) {
    setFiltros(prev => ({
      ...prev,
      comparaciones: prev.comparaciones.filter((_, idx) => idx !== i)
    }))
  }

  function updateComparacion(i, key, val) {
    setFiltros(prev => ({
      ...prev,
      comparaciones: prev.comparaciones.map((c, idx) => idx === i ? { ...c, [key]: val } : c)
    }))
  }

  const todasSeleccionadas = filtros.instituciones.length === instituciones.length
  const algunaSeleccionada = filtros.instituciones.length > 0
  const labelInst = filtros.instituciones.length === 0
    ? 'TODAS'
    : filtros.instituciones.length === instituciones.length
    ? 'TODAS'
    : filtros.instituciones.length === 1
    ? filtros.instituciones[0]
    : `${filtros.instituciones.length} seleccionadas`

  const s = {
    wrap: { display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'flex-end', padding: '12px 16px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' },
    group: { display: 'flex', flexDirection: 'column', gap: '4px' },
    label: { fontSize: '11px', fontWeight: 700, color: '#666', textTransform: 'uppercase', letterSpacing: '0.5px' },
    select: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', background: '#fff' },
    divider: { width: '1px', background: '#dee2e6', alignSelf: 'stretch', margin: '0 4px' },
    compWrap: { display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'flex-end' },
    compGroup: { display: 'flex', gap: '6px', alignItems: 'flex-end', background: '#e8f0fe', padding: '6px 10px', borderRadius: '8px' },
    btnAdd: { padding: '6px 14px', borderRadius: '6px', border: '1px dashed #666', background: '#fff', cursor: 'pointer', fontSize: '13px', color: '#444' },
    btnRemove: { padding: '4px 8px', borderRadius: '4px', border: 'none', background: '#fee2e2', color: '#cf222e', cursor: 'pointer', fontWeight: 700, fontSize: '13px' },
    dropBtn: { padding: '6px 10px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '13px', background: '#fff', cursor: 'pointer', minWidth: '160px', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
    dropdown: { position: 'absolute', top: '100%', left: 0, background: '#fff', border: '1px solid #ccc', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 100, minWidth: '200px', maxHeight: '280px', overflowY: 'auto', marginTop: '4px' },
    checkItem: { display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '13px' },
    checkItemHdr: { display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', cursor: 'pointer', fontSize: '13px', fontWeight: 700, borderBottom: '1px solid #eee', background: '#f8f9fa' },
  }

  return (
    <div style={s.wrap}>
      <div style={s.group}>
        <span style={s.label}>Año</span>
        <select style={s.select} value={filtros.ano} onChange={e => updateBase('ano', parseInt(e.target.value))}>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <div style={s.group}>
        <span style={s.label}>Mes</span>
        <select style={s.select} value={filtros.mes} onChange={e => updateBase('mes', parseInt(e.target.value))}>
          {meses.map(m => <option key={m.num} value={m.num}>{m.desc}</option>)}
        </select>
      </div>

      <div style={{ ...s.group, position: 'relative' }} ref={dropdownRef}>
        <span style={s.label}>Institución</span>
        <button style={s.dropBtn} onClick={() => setDropdownAbierto(prev => !prev)}>
          <span>{labelInst}</span>
          <span style={{ fontSize: '10px', marginLeft: '8px' }}>▼</span>
        </button>
        {dropdownAbierto && (
          <div style={s.dropdown}>
            <div style={s.checkItemHdr} onClick={toggleTodas}>
              <input type="checkbox" readOnly checked={todasSeleccionadas || !algunaSeleccionada} style={{ cursor: 'pointer' }} />
              <span>TODAS</span>
            </div>
            {instituciones.map(inst => (
              <div key={inst} style={s.checkItem} onClick={() => toggleInstitucion(inst)}>
                <input type="checkbox" readOnly checked={filtros.instituciones.includes(inst)} style={{ cursor: 'pointer' }} />
                <span>{inst}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={s.group}>
        <span style={s.label}>Escenario Base</span>
        <select style={s.select} value={filtros.escenarioBase} onChange={e => updateBase('escenarioBase', e.target.value.trim())}>
          {escenarios.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      <div style={s.divider} />

      <div style={s.group}>
        <span style={s.label}>Comparar con (máx. 2)</span>
        <div style={s.compWrap}>
          {filtros.comparaciones.map((comp, i) => (
            <div key={i} style={s.compGroup}>
              <select style={s.select} value={comp.ano} onChange={e => updateComparacion(i, 'ano', parseInt(e.target.value))}>
                {anos.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <select style={s.select} value={comp.escenario} onChange={e => updateComparacion(i, 'escenario', e.target.value.trim())}>
                {escenarios.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <button style={s.btnRemove} onClick={() => removeComparacion(i)}>✕</button>
            </div>
          ))}
          {filtros.comparaciones.length < 2 && (
            <button style={s.btnAdd} onClick={addComparacion}>+ Agregar comparación</button>
          )}
        </div>
      </div>
    </div>
  )
}
