import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing.jsx'
import Login from './pages/Login.jsx'
import Signup from './pages/Signup.jsx'
import PhotographerHome from './pages/PhotographerHome.jsx'
import EventManage from './pages/EventManage.jsx'
import EventDetail from './pages/EventDetail.jsx'
import PublicGallery from './pages/PublicGallery.jsx'
import AdminLayout from './components/AdminLayout.jsx'
import Dashboard from './pages/admin/Dashboard.jsx'
import Photographers from './pages/admin/Photographers.jsx'
import Events from './pages/admin/Events.jsx'
import Photos from './pages/admin/Photos.jsx'
import Subscriptions from './pages/admin/Subscriptions.jsx'
import CountryPlans from './pages/admin/CountryPlans.jsx'
import Transactions from './pages/admin/Transactions.jsx'
import HelpAdd from './pages/admin/HelpAdd.jsx'
import HelpManage from './pages/admin/HelpManage.jsx'
import SettingsGeneral from './pages/admin/SettingsGeneral.jsx'
import SettingsPayment from './pages/admin/SettingsPayment.jsx'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/home" element={<PhotographerHome />} />
      <Route path="/home/events/:id" element={<EventManage />} />
      <Route path="/event/:id" element={<EventDetail />} />
      <Route path="/e/:id" element={<PublicGallery />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="photographers" element={<Photographers />} />
        <Route path="events" element={<Events />} />
        <Route path="photos" element={<Photos />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="country-plans" element={<CountryPlans />} />
        <Route path="transactions" element={<Transactions />} />
        <Route path="helps/add" element={<HelpAdd />} />
        <Route path="helps/manage" element={<HelpManage />} />
        <Route path="settings/general" element={<SettingsGeneral />} />
        <Route path="settings/payment" element={<SettingsPayment />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
