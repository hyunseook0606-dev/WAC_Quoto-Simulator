import { Navigate, Route, Routes } from 'react-router-dom'
import { OriginCostDeskSite } from './origin-cost-desk/OriginCostDeskSite'

/**
 * Internal-only SPA:
 * - /origin-cost-desk : Origin Cost Desk (Excel-style desk quotation)
 * All other routes redirect here.
 */
export default function App() {
  return (
    <Routes>
      <Route path="/origin-cost-desk" element={<OriginCostDeskSite />} />
      <Route path="*" element={<Navigate to="/origin-cost-desk" replace />} />
    </Routes>
  )
}

