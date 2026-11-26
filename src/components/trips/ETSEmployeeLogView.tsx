import React, { useState, useEffect, useMemo, useRef } from 'react'
import * as XLSX from 'xlsx'
import toast from 'react-hot-toast'
import {
  Users,
  UploadCloud,
  Plus,
  Search,
  CheckSquare,
  Square,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Car,
  Sparkles,
  CheckCircle2,
  Building2,
  MapPin,
  Phone,
  ShieldCheck,
  X,
  FileSpreadsheet,
} from 'lucide-react'
import { CORPORATE_OFFICES, type CorporateEmployee } from './CreateETSTripView'
import { sortStopsFarthestFirst } from '../../lib/routing'

interface ETSEmployeeLogViewProps {
  onBack: () => void
  onCreateTrip: (selectedEmployees: CorporateEmployee[]) => void
}

export const ETSEmployeeLogView: React.FC<ETSEmployeeLogViewProps> = ({
  onBack,
  onCreateTrip,
}) => {
  const logFileInputRef = useRef<HTMLInputElement>(null)

  // Load and persist corporate employee directory
  const [directory, setDirectory] = useState<CorporateEmployee[]>(() => {
    try {
      const saved = localStorage.getItem('ETS_SAVED_EMPLOYEES')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((e) => e && e.id && !e.id.startsWith('emp-10'))
        }
      }
    } catch {}
    return [
      {
        id: 'emp-1',
        name: 'Ramesh Rao',
        phone: '+91 98450 12345',
        company: 'Atharva Tech Hub',
        address: 'Outer Ring Rd, Mahadevapura, Bengaluru',
        lat: 12.99,
        lng: 77.7,
        department: 'Operations',
        gender: 'MALE',
      },
      {
        id: 'emp-2',
        name: 'Sneha Hegde',
        phone: '+91 98451 23456',
        company: 'Atharva Tech Hub',
        address: 'Bellandur / Sarjapur Rd, Bengaluru',
        lat: 12.925,
        lng: 77.675,
        department: 'Engineering',
        gender: 'FEMALE',
      },
      {
        id: 'emp-3',
        name: 'Arjun Mehta',
        phone: '+91 98452 34567',
        company: 'Atharva Tech Hub',
        address: 'Kudlu Gate, Hosur Rd, Bengaluru',
        lat: 12.875,
        lng: 77.65,
        department: 'Finance',
        gender: 'MALE',
      },
      {
        id: 'emp-4',
        name: 'Priya Sharma',
        phone: '+91 98453 45678',
        company: 'Atharva Tech Hub',
        address: 'HSR Layout Sector 1, Bengaluru',
        lat: 12.915,
        lng: 77.645,
        department: 'HR',
        gender: 'FEMALE',
      },
      {
        id: 'emp-5',
        name: 'Vikram Singh',
        phone: '+91 98454 56789',
        company: 'Atharva Tech Hub',
        address: 'Koramangala 4th Block, Bengaluru',
        lat: 12.934,
        lng: 77.625,
        department: 'IT Support',
        gender: 'MALE',
      },
      {
        id: 'emp-6',
        name: 'Ananya Deshmukh',
        phone: '+91 98455 67890',
        company: 'Atharva Tech Hub',
        address: 'Electronic City Phase 2, Bengaluru',
        lat: 12.845,
        lng: 77.685,
        department: 'QA',
        gender: 'FEMALE',
      },
    ]
  })

  // Search & Filter Query
  const [searchQuery, setSearchQuery] = useState('')

  // Selected Employee IDs for batch operations & trip creation
  const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([])

  // Inline Add Employee Form state
  const [isAddingNewEmp, setIsAddingNewEmp] = useState(false)
  const [newEmpName, setNewEmpName] = useState('')
  const [newEmpPhone, setNewEmpPhone] = useState('')
  const [newEmpGender, setNewEmpGender] = useState<'MALE' | 'FEMALE'>('FEMALE')
  const [newEmpCompany, setNewEmpCompany] = useState(CORPORATE_OFFICES[0]?.name || 'Atharva Tech Hub')
  const [newEmpAddress, setNewEmpAddress] = useState('')
  const [newEmpLat, setNewEmpLat] = useState('12.9298')
  const [newEmpLng, setNewEmpLng] = useState('77.6743')
  const [newEmpDept, setNewEmpDept] = useState('General')

  // Save changes to localStorage and notify listeners
  const persistDirectory = (updated: CorporateEmployee[]) => {
    setDirectory(updated)
    try {
      localStorage.setItem('ETS_SAVED_EMPLOYEES', JSON.stringify(updated))
      window.dispatchEvent(new Event('storage'))
    } catch (err) {
      console.error('Failed to save employees to localStorage', err)
    }
  }

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim()
    if (!q) return directory
    return directory.filter(
      (emp) =>
        emp.name.toLowerCase().includes(q) ||
        emp.phone.toLowerCase().includes(q) ||
        (emp.department && emp.department.toLowerCase().includes(q)) ||
        (emp.company && emp.company.toLowerCase().includes(q)) ||
        emp.address.toLowerCase().includes(q)
    )
  }, [directory, searchQuery])

  // Select / Deselect individual employee
  const toggleSelectEmp = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEmpIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  // Select All / Deselect All visible employees
  const isAllSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((emp) => selectedEmpIds.includes(emp.id))

  const toggleSelectAll = () => {
    if (isAllSelected) {
      // Remove all visible from selection
      const visibleIds = new Set(filteredEmployees.map((e) => e.id))
      setSelectedEmpIds((prev) => prev.filter((id) => !visibleIds.has(id)))
    } else {
      // Add all visible to selection
      const newIds = new Set([...selectedEmpIds, ...filteredEmployees.map((e) => e.id)])
      setSelectedEmpIds(Array.from(newIds))
    }
  }

  // Handle Add New Employee
  const handleAddNewEmployee = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newEmpName.trim() || !newEmpPhone.trim() || !newEmpAddress.trim()) {
      toast.error('Please enter Name, Phone, and Address')
      return
    }

    const newRecord: CorporateEmployee = {
      id: `emp-${Date.now()}`,
      name: newEmpName.trim(),
      phone: newEmpPhone.trim(),
      company: newEmpCompany,
      address: newEmpAddress.trim(),
      lat: parseFloat(newEmpLat) || 12.9298,
      lng: parseFloat(newEmpLng) || 77.6743,
      department: newEmpDept,
      gender: newEmpGender,
    }

    const updated = [newRecord, ...directory]
    persistDirectory(updated)
    toast.success(`Employee ${newRecord.name} (${newEmpGender === 'FEMALE' ? 'Female' : 'Male'}) added to Corporate Directory!`)

    setIsAddingNewEmp(false)
    setNewEmpName('')
    setNewEmpPhone('')
    setNewEmpAddress('')
    setNewEmpLat('12.9298')
    setNewEmpLng('77.6743')
    setNewEmpGender('FEMALE')
  }

  // Delete single employee
  const handleDeleteEmployee = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const target = directory.find((emp) => emp.id === id)
    const updated = directory.filter((emp) => emp.id !== id)
    setSelectedEmpIds((prev) => prev.filter((item) => item !== id))
    persistDirectory(updated)
    toast.success(`Deleted ${target?.name || 'employee'} from roster`)
  }

  // Bulk Delete selected employees
  const handleBulkDelete = () => {
    if (selectedEmpIds.length === 0) return
    const count = selectedEmpIds.length
    const idSet = new Set(selectedEmpIds)
    const updated = directory.filter((emp) => !idSet.has(emp.id))
    setSelectedEmpIds([])
    persistDirectory(updated)
    toast.success(`Deleted ${count} employees from roster`)
  }

  // Excel / CSV file upload
  const handleLogExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const wb = XLSX.read(bstr, { type: 'binary' })
        const wsname = wb.SheetNames[0]
        const ws = wb.Sheets[wsname]
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(ws)

        if (!data || data.length === 0) {
          toast.error('The selected Excel file contains no records')
          return
        }

        const parsed: CorporateEmployee[] = data
          .map((row, index) => {
            const name =
              row['Employee Name'] || row['Name'] || row['employee_name'] || row['name'] || `Employee ${index + 1}`
            const phone =
              row['Contact Number'] || row['Phone'] || row['phone'] || row['Mobile'] || '+91 98000 00000'
            const address =
              row['Home Address'] || row['Address'] || row['address'] || 'Bengaluru, Karnataka'
            const company =
              row['Company Office'] || row['Company'] || row['company'] || CORPORATE_OFFICES[0]?.name || 'Atharva Tech Hub'
            const department =
              row['Department'] || row['department'] || row['Dept'] || 'General'
            const rawGender = String(row['Gender'] || row['gender'] || row['Sex'] || row['sex'] || '').toUpperCase()
            const gender: 'MALE' | 'FEMALE' =
              rawGender.includes('FEMALE') || rawGender.includes('WOMAN') || rawGender === 'F' ? 'FEMALE' : 'MALE'
            const lat =
              Number(row['Latitude'] || row['latitude'] || row['Lat'] || row['lat']) || 12.9716
            const lng =
              Number(row['Longitude'] || row['longitude'] || row['Lng'] || row['lng'] || row['Long']) || 77.5946

            return {
              id: `emp-excel-${Date.now()}-${index}`,
              name: String(name).trim(),
              phone: String(phone).trim(),
              address: String(address).trim(),
              company: String(company).trim(),
              department: String(department).trim(),
              gender,
              lat,
              lng,
            }
          })
          .filter((emp) => emp.name.length > 0)

        const existingPhones = new Set(directory.map((e) => e.phone.replace(/\D/g, '')).filter(Boolean))
        const existingNames = new Set(directory.map((e) => e.name.toLowerCase().trim()))

        const toAdd = parsed.filter(
          (e) =>
            (!e.phone || !existingPhones.has(e.phone.replace(/\D/g, ''))) &&
            !existingNames.has(e.name.toLowerCase().trim())
        )

        const updated = [...toAdd, ...directory]
        persistDirectory(updated)
        toast.success(`Imported ${toAdd.length} employees directly into Employee Log!`)
      } catch (err) {
        console.error(err)
        toast.error('Failed to parse Excel file. Please use a valid .xlsx, .xls, or .csv file.')
      }
    }
    reader.readAsBinaryString(file)
    e.target.value = ''
  }

  // Auto Route selected employees into Create Trip View
  const handleAutoRoute = () => {
    const selected = directory.filter((emp) => selectedEmpIds.includes(emp.id))
    if (selected.length === 0) {
      toast.error('Please select at least 1 employee to auto route')
      return
    }

    const companyCoords = {
      lat: CORPORATE_OFFICES[0]?.lat || 12.8399,
      lng: CORPORATE_OFFICES[0]?.lng || 77.677,
    }
    const sorted = sortStopsFarthestFirst(selected, companyCoords)
    const capacity = sorted.length <= 3 ? 3 : 6
    const routedSlice = sorted.slice(0, capacity)

    toast.success(`Auto-routing ${routedSlice.length} employees into ${capacity === 3 ? 'Sedan' : 'SUV'} shift!`)
    onCreateTrip(routedSlice)
  }

  // Manual Route selected employees into Create Trip View
  const handleManualRoute = () => {
    const selected = directory.filter((emp) => selectedEmpIds.includes(emp.id))
    if (selected.length === 0) {
      toast.error('Please select at least 1 employee for manual routing')
      return
    }

    const capacity = selected.length <= 3 ? 3 : 6
    const routedSlice = selected.slice(0, capacity)
    toast.success(`Loaded ${routedSlice.length} employees for trip setup`)
    onCreateTrip(routedSlice)
  }

  // Create a Trip button handler
  const handleCreateTripClick = () => {
    if (selectedEmpIds.length > 0) {
      const selected = directory.filter((emp) => selectedEmpIds.includes(emp.id))
      onCreateTrip(selected)
    } else {
      onCreateTrip([])
    }
  }

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-150">
      {/* Top Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5 mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to ETS Dashboard</span>
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              ETS Employee Log & Directory
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 uppercase tracking-wider">
              {directory.length} Employees
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Corporate employee roster, geocoding registry & route dispatch management
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="card p-5 sm:p-6 bg-white border border-slate-200/90 shadow-sm space-y-5">
        {/* Card Header with Upload & Add actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Corporate Employee Roster & Log
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={logFileInputRef}
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={handleLogExcelUpload}
            />
            <button
              type="button"
              onClick={() => logFileInputRef.current?.click()}
              className="btn-secondary text-xs flex items-center gap-1.5 font-semibold text-emerald-800 border-emerald-200 hover:bg-emerald-50 px-3 py-2 cursor-pointer shadow-2xs"
            >
              <UploadCloud className="w-4 h-4 text-emerald-600" />
              <span>Upload</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAddingNewEmp(!isAddingNewEmp)}
              className="btn-secondary text-xs flex items-center gap-1.5 font-semibold px-3 py-2 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              <span>{isAddingNewEmp ? 'Cancel' : 'Add'}</span>
            </button>
          </div>
        </div>

        {/* Inline Add Employee Form */}
        {isAddingNewEmp && (
          <form
            onSubmit={handleAddNewEmployee}
            className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4 animate-in fade-in duration-150"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>New Corporate Employee Profile</span>
              </span>
              <button
                type="button"
                onClick={() => setIsAddingNewEmp(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Meera Iyer"
                  value={newEmpName}
                  onChange={(e) => setNewEmpName(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Phone Number *</label>
                <input
                  type="text"
                  placeholder="+91 98765 00000"
                  value={newEmpPhone}
                  onChange={(e) => setNewEmpPhone(e.target.value)}
                  className="input text-xs font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Gender *</label>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300">
                  <button
                    type="button"
                    onClick={() => setNewEmpGender('MALE')}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                      newEmpGender === 'MALE'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>👨 Male</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewEmpGender('FEMALE')}
                    className={`flex-1 py-1 px-2 rounded-lg text-xs font-bold transition cursor-pointer flex items-center justify-center gap-1 ${
                      newEmpGender === 'FEMALE'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>👩 Female</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Company Office *</label>
                <select
                  value={newEmpCompany}
                  onChange={(e) => setNewEmpCompany(e.target.value)}
                  className="input text-xs"
                >
                  {CORPORATE_OFFICES.map((off) => (
                    <option key={off.id} value={off.name}>
                      {off.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Home Address *</label>
                <input
                  type="text"
                  placeholder="Flat, Building, Street, Area, Bengaluru"
                  value={newEmpAddress}
                  onChange={(e) => setNewEmpAddress(e.target.value)}
                  className="input text-xs"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  placeholder="e.g. Operations, IT, Finance"
                  value={newEmpDept}
                  onChange={(e) => setNewEmpDept(e.target.value)}
                  className="input text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Latitude</label>
                <input
                  type="text"
                  value={newEmpLat}
                  onChange={(e) => setNewEmpLat(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">Longitude</label>
                <input
                  type="text"
                  value={newEmpLng}
                  onChange={(e) => setNewEmpLng(e.target.value)}
                  className="input text-xs font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsAddingNewEmp(false)}
                className="btn-secondary text-xs font-semibold py-1.5 px-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-accent text-xs font-semibold py-1.5 px-5 cursor-pointer shadow-sm"
              >
                Save Employee Profile
              </button>
            </div>
          </form>
        )}

        {/* Search Bar & Bulk Selection Toolbar */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search employees by name, phone, department, or company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input text-xs pl-8.5 w-full"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>

            <button
              type="button"
              onClick={toggleSelectAll}
              className="btn-secondary text-xs px-3.5 py-2.5 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
            >
              {isAllSelected ? (
                <CheckSquare className="w-4 h-4 text-emerald-600" />
              ) : (
                <Square className="w-4 h-4 text-slate-400" />
              )}
              <span className="font-semibold text-slate-700">
                {isAllSelected ? 'Deselect All' : 'Select All'}
              </span>
            </button>
          </div>

          {/* Bulk Actions Bar when employees are selected */}
          {selectedEmpIds.length > 0 && (
            <div className="p-3 rounded-2xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 shadow-lg animate-in fade-in duration-150">
              <div className="flex items-center gap-2.5 pl-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold font-mono">
                  {selectedEmpIds.length} Selected
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleAutoRoute}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Auto-route selected employees into optimal shift"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto Route ({selectedEmpIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualRoute}
                  className="bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Manually configure route with selected members"
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Manual Route ({selectedEmpIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  title="Delete selected employees from log"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete ({selectedEmpIds.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedEmpIds([])}
                  className="text-xs text-slate-300 hover:text-white px-2.5 py-1.5 font-semibold cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Corporate Employee Directory List */}
        <div className="space-y-2.5">
          {filteredEmployees.length === 0 ? (
            <div className="p-12 text-center bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No corporate employees in log yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Click Upload above to import from Excel, or click + Add to register an employee profile manually.
              </p>
            </div>
          ) : (
            filteredEmployees.map((emp) => {
              const isSelected = selectedEmpIds.includes(emp.id)
              return (
                <div
                  key={emp.id}
                  onClick={(e) => toggleSelectEmp(emp.id, e)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3 group ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50/40 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleSelectEmp(emp.id, e)}
                      className="p-1 cursor-pointer text-slate-400 hover:text-emerald-600 transition-colors"
                      title={isSelected ? 'Deselect employee' : 'Select employee'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Avatar Initial */}
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center flex-shrink-0">
                      {emp.name.charAt(0)}
                    </div>

                    {/* Details */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-xs sm:text-sm text-slate-900 truncate">
                          {emp.name}
                        </p>
                        {/* Gender Badge */}
                        {emp.gender === 'FEMALE' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                            <span>👩 Female</span>
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                            <span>👨 Male</span>
                          </span>
                        )}
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {emp.department || 'GENERAL'}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-700 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">{emp.phone}</p>
                      <p className="text-xs text-slate-600 truncate mt-0.5">{emp.address}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pl-8 md:pl-0">
                    <div className="text-left md:text-right">
                      <span className="text-xs font-semibold text-slate-700 block truncate max-w-[200px]">
                        {emp.company}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                        Geo: {Number(emp.lat).toFixed(4)}, {Number(emp.lng).toFixed(4)}
                      </span>
                    </div>

                    {/* Delete button */}
                    <button
                      type="button"
                      title="Delete employee"
                      onClick={(e) => handleDeleteEmployee(emp.id, e)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer Navigation & Create Trip Action */}
        <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={onBack}
            className="btn-secondary text-xs sm:text-sm font-semibold flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer px-4 py-2.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to ETS Dashboard</span>
          </button>

          <button
            type="button"
            onClick={handleCreateTripClick}
            className="btn-accent text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto px-6 py-2.5 cursor-pointer"
          >
            <Car className="w-4 h-4" />
            <span>
              {selectedEmpIds.length > 0
                ? `Create a Trip with ${selectedEmpIds.length} Selected →`
                : 'Create a Trip →'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
