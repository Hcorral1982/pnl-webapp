import { useState } from 'react'
import Filtros from './Filtros'
import TablaPnL from './TablaPnL'

function App() {
  const [filtros, setFiltros] = useState(null)

  return (
    <div style={{ fontFamily: 'sans-serif', minHeight: '100vh' }}>
      <Filtros onChange={setFiltros} />
      {filtros && <TablaPnL filtros={filtros} />}
    </div>
  )
}

export default App