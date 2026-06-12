import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '@/components/Layout'
import Dashboard from '@/pages/Dashboard'
import AlertCenter from '@/pages/AlertCenter'
import ContainerArchive from '@/pages/ContainerArchive'
import PortDetail from '@/pages/PortDetail'
import Prediction from '@/pages/Prediction'
import Report from '@/pages/Report'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/alert" element={<AlertCenter />} />
          <Route path="/archive" element={<ContainerArchive />} />
          <Route path="/port/:portId" element={<PortDetail />} />
          <Route path="/prediction" element={<Prediction />} />
          <Route path="/report" element={<Report />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
