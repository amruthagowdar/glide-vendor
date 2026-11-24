import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Navbar } from './Navbar'
import { RechargeModal } from '../wallet/RechargeModal'

export const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024
    }
    return true
  })
  const [rechargeModalOpen, setRechargeModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-sky-50/50 flex flex-col">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className={`transition-all duration-200 flex flex-col flex-1 ${sidebarOpen ? 'lg:pl-64' : 'lg:pl-0'}`}>
        <Navbar
          sidebarOpen={sidebarOpen}
          onMenuClick={() => setSidebarOpen((prev) => !prev)}
          onOpenRechargeModal={() => setRechargeModalOpen(true)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>

      <RechargeModal
        isOpen={rechargeModalOpen}
        onClose={() => setRechargeModalOpen(false)}
      />
    </div>
  )
}
