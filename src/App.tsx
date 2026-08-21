import { Navigate, Route, Routes } from 'react-router-dom'
import { OriginCostDeskSite } from './origin-cost-desk/OriginCostDeskSite'

/**
 * Internal-only SPA.
 * Serve the desk at `/` and `/origin-cost-desk` so both
 * http://host:34344/ and .../origin-cost-desk work.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<OriginCostDeskSite />} />
      <Route path="/origin-cost-desk" element={<OriginCostDeskSite />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
