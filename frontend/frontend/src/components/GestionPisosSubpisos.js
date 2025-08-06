/* eslint-disable react-hooks/exhaustive-deps */
"use client"
import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import {
  FaBuilding,
  FaLayerGroup,
  FaEdit,
  FaPlus,
  FaTrash,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaTimes,
} from "react-icons/fa"
import "../styles/ServiciosExistentes.css"

const PisosManager = () => {
  // Estados principales
  const [pisos, setPisos] = useState([])
  const [subpisos, setSubpisos] = useState([])
  const [sedes, setSedes] = useState([])
  const [selectedPiso, setSelectedPiso] = useState(null)
  const [selectedSubpiso, setSelectedSubpiso] = useState(null)
  const [showPisoModal, setShowPisoModal] = useState(false)
  const [showSubpisoModal, setShowSubpisoModal] = useState(false)
  const [showFormPiso, setShowFormPiso] = useState(false)
  const [showFormSubpiso, setShowFormSubpiso] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("pisos")

  // Estados para formularios
  const [newPiso, setNewPiso] = useState({
    nombre: "",
    sede: "",
    es_principal: true,
  })
  const [newSubpiso, setNewSubpiso] = useState({
    nombre: "",
    piso_padre: "",
    descripcion: "",
  })

  // Estados para alertas
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error",
  })
  const [confirmAlert, setConfirmAlert] = useState({
    show: false,
    message: "",
    onConfirm: null,
    onCancel: null,
    type: "delete", // 'delete', 'create', 'edit'
  })

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [selectedSede, setSelectedSede] = useState("")

  // Estados para datos filtrados
  const [filteredPisos, setFilteredPisos] = useState([])
  const [filteredSubpisos, setFilteredSubpisos] = useState([])

  // Obtener datos de la API
  const fetchPisos = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get("http://localhost:8000/api/pisos/")
      let pisosData = []
      if (Array.isArray(response.data)) {
        pisosData = response.data
      } else if (response.data.results && Array.isArray(response.data.results)) {
        pisosData = response.data.results
      } else if (response.data.pisos && Array.isArray(response.data.pisos)) {
        pisosData = response.data.pisos
      } else if (response.data.data && Array.isArray(response.data.data)) {
        pisosData = response.data.data
      }
      setPisos(pisosData)
      return pisosData
    } catch (error) {
      console.error("Error al obtener pisos:", error)
      showAlert("Error al cargar pisos", "error")
      setPisos([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSubpisos = useCallback(async () => {
    setIsLoading(true)
    try {
      let allSubpisosData = []
      let nextUrl = "http://localhost:8000/api/subpisos/"

      while (nextUrl) {
        const response = await axios.get(nextUrl)
        let currentPageData = []

        if (Array.isArray(response.data)) {
          currentPageData = response.data
          nextUrl = null // Assume no pagination if direct array
        } else if (response.data.results && Array.isArray(response.data.results)) {
          currentPageData = response.data.results
          nextUrl = response.data.next
        } else if (response.data.subpisos && Array.isArray(response.data.subpisos)) {
          currentPageData = response.data.subpisos
          nextUrl = null // Assume no pagination if custom 'subpisos' key
        } else if (response.data.data && Array.isArray(response.data.data)) {
          currentPageData = response.data.data
          nextUrl = null // Assume no pagination if custom 'data' key
        }

        allSubpisosData = [...allSubpisosData, ...currentPageData]
      }
      setSubpisos(allSubpisosData)
      return allSubpisosData
    } catch (error) {
      console.error("Error al obtener subpisos:", error)
      showAlert("Error al cargar subpisos", "error")
      setSubpisos([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchSedes = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await axios.get("http://localhost:8000/api/sede/")
      let sedesData = []
      if (Array.isArray(response.data)) {
        sedesData = response.data
      } else if (response.data.sedes && Array.isArray(response.data.sedes)) {
        sedesData = response.data.sedes
      } else if (response.data.results && Array.isArray(response.data.results)) {
        sedesData = response.data.results
      } else if (response.data.data && Array.isArray(response.data.data)) {
        sedesData = response.data.data
      }
      setSedes(sedesData)
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      showAlert("Error al cargar sedes", "error")
      setSedes([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Función para mostrar alertas
  const showAlert = (message, type) => {
    setAlert({
      show: true,
      message,
      type,
    })
  }

  // Aplicar filtros mejorado para subpisos
  const applyFilters = useCallback(() => {
    const currentData = activeTab === "pisos" ? pisos : subpisos
    if (!Array.isArray(currentData)) {
      if (activeTab === "pisos") {
        setFilteredPisos([])
      } else {
        setFilteredSubpisos([])
      }
      setTotalPages(0)
      return
    }
    let filtered = [...currentData]
    // Filtro por sede
    if (selectedSede && selectedSede !== "") {
      filtered = filtered.filter((item) => {
        if (activeTab === "pisos") {
          const match = String(item.sede?.id) === String(selectedSede) || String(item.sede) === String(selectedSede)
          return match
        } else {
          // Para subpisos, verificar la sede del piso padre
          const pisoPadre = pisos.find((p) => p.id === (item.piso_padre?.id || item.piso_padre))
          const sedePisoPadre = pisoPadre?.sede?.id || pisoPadre?.sede
          const match =
            String(item.sede?.id) === String(selectedSede) ||
            String(item.sede) === String(selectedSede) ||
            String(sedePisoPadre) === String(selectedSede)
          return match
        }
      })
    }
    // Filtro por búsqueda
    if (searchTerm && searchTerm.trim() !== "") {
      filtered = filtered.filter(
        (item) =>
          item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.sede &&
            (item.sede.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              getSedeNombre(item).toLowerCase().includes(searchTerm.toLowerCase()))) ||
          (item.piso_padre &&
            (item.piso_padre.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
              getPisoPadreNombre(item).toLowerCase().includes(searchTerm.toLowerCase()))) ||
          item.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }
    if (activeTab === "pisos") {
      setFilteredPisos(filtered)
      setTotalPages(Math.ceil(filtered.length / itemsPerPage))
    } else {
      setFilteredSubpisos(filtered)
      // For subpisos, set totalPages to 1 to show all on one page
      setTotalPages(filtered.length > 0 ? 1 : 0)
    }
    setCurrentPage(1)
  }, [pisos, subpisos, selectedSede, searchTerm, activeTab, itemsPerPage])

  // Manejar cambios de sede
  const handleSedeChange = (sedeId) => {
    setSelectedSede(sedeId)
  }

  // Función para obtener el nombre de la sede
  const getSedeNombre = (item) => {
    // Si es un subpiso, obtener la sede del piso padre
    if (item.piso_padre) {
      const pisoPadre = pisos.find((p) => p.id === (item.piso_padre?.id || item.piso_padre))
      if (pisoPadre) {
        return getSedeNombre(pisoPadre)
      }
    }
    if (item.sede && item.sede.nombre) return item.sede.nombre
    // Buscar por ID
    const sedeId = item.sede || item.sede_id
    if (sedeId) {
      const sede = sedes.find((s) => String(s.id) === String(sedeId))
      return sede ? sede.nombre : "No asignada"
    }
    return "No asignada"
  }

  // Función para obtener el nombre del piso padre
  const getPisoPadreNombre = (subpiso) => {
    if (subpiso.piso_padre && subpiso.piso_padre.nombre) return subpiso.piso_padre.nombre
    // Buscar por ID
    const pisoPadreId = subpiso.piso_padre || subpiso.piso_padre_id
    if (pisoPadreId) {
      const piso = pisos.find((p) => String(p.id) === String(pisoPadreId))
      return piso ? piso.nombre : "No asignado"
    }
    return "No asignado"
  }

  // Confirmación para operaciones
  const showConfirmation = (message, onConfirm, type = "delete") => {
    setConfirmAlert({
      show: true,
      message,
      onConfirm,
      onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
      type,
    })
  }

  // Preparar datos para enviar al servidor
  const prepareDataForServer = (data) => {
    const preparedData = { ...data }
    if (preparedData.sede && typeof preparedData.sede === "object" && preparedData.sede.id) {
      preparedData.sede = preparedData.sede.id
    }
    if (preparedData.piso_padre && typeof preparedData.piso_padre === "object" && preparedData.piso_padre.id) {
      preparedData.piso_padre = preparedData.piso_padre.id
    }
    delete preparedData.sede_nombre
    return preparedData
  }

  // Operaciones CRUD para Pisos
  const handleCreatePiso = () => {
    if (!newPiso.nombre || !newPiso.sede) {
      showAlert("Nombre y sede son campos obligatorios", "error")
      return
    }
    showConfirmation("¿Estás seguro de que deseas crear este piso?", () => createPiso(), "create")
  }
  const createPiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(newPiso)
      const response = await axios.post("http://localhost:8000/api/pisos/", dataToSend)
      showAlert("Piso creado exitosamente", "success")
      await fetchPisos()
      setNewPiso({
        nombre: "",
        sede: "",
        es_principal: true,
      })
      setConfirmAlert((prev) => ({ ...prev, show: false }))
      setTimeout(() => setShowFormPiso(false), 1500)
    } catch (error) {
      console.error("Error al crear piso:", error)
      showAlert(error.response?.data?.error || "Error al crear piso", "error")
    } finally {
      setIsLoading(false)
    }
  }
  const handleUpdatePiso = () => {
    if (!selectedPiso.nombre || !selectedPiso.sede) {
      showAlert("Nombre y sede son campos obligatorios", "error")
      return
    }
    showConfirmation("¿Estás seguro de que deseas actualizar este piso?", () => updatePiso(), "edit")
  }
  const updatePiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(selectedPiso)
      const response = await axios.put(`http://localhost:8000/api/pisos/${selectedPiso.id}/`, dataToSend)
      showAlert("Piso actualizado exitosamente", "success")
      await fetchPisos()
      setConfirmAlert((prev) => ({ ...prev, show: false }))
      setTimeout(() => setShowPisoModal(false), 1500)
    } catch (error) {
      console.error("Error al actualizar piso:", error)
      showAlert(error.response?.data?.error || "Error al actualizar piso", "error")
    } finally {
      setIsLoading(false)
    }
  }
  // Eliminar piso y sus subpisos asociados
  const deletePiso = async (pisoId) => {
    setIsLoading(true)
    try {
      const pisoAEliminar = pisos.find((p) => p.id === pisoId)
      if (pisoAEliminar && pisoAEliminar.es_principal) {
        const subpisosData = await fetchSubpisos()
        const subpisosAsociados = subpisosData.filter(
          (s) =>
            String(s.piso_padre) === String(pisoId) || (s.piso_padre && String(s.piso_padre.id) === String(pisoId)),
        )
        for (const subpiso of subpisosAsociados) {
          await axios.delete(`http://localhost:8000/api/subpisos/${subpiso.id}/`)
        }
      }
      await axios.delete(`http://localhost:8000/api/pisos/${pisoId}/`)
      showAlert("Piso y sus subpisos asociados eliminados exitosamente", "success")
      await Promise.all([fetchPisos(), fetchSubpisos()])
      setConfirmAlert((prev) => ({ ...prev, show: false }))
    } catch (error) {
      console.error("Error al eliminar piso:", error)
      showAlert(error.response?.data?.error || "Error al eliminar piso", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Operaciones CRUD para SubPisos
  const handleCreateSubpiso = () => {
    if (!newSubpiso.nombre || !newSubpiso.piso_padre) {
      showAlert("Nombre y piso padre son campos obligatorios", "error")
      return
    }
    showConfirmation("¿Estás seguro de que deseas crear este subpiso?", () => createSubpiso(), "create")
  }
  const createSubpiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(newSubpiso)
      const response = await axios.post("http://localhost:8000/api/subpisos/", dataToSend)
      showAlert("Subpiso creado exitosamente", "success")
      await fetchSubpisos()
      setNewSubpiso({
        nombre: "",
        piso_padre: "",
        descripcion: "",
      })
      setConfirmAlert((prev) => ({ ...prev, show: false }))
      setTimeout(() => setShowFormSubpiso(false), 1500)
    } catch (error) {
      console.error("Error al crear subpiso:", error)
      showAlert(error.response?.data?.error || "Error al crear subpiso", "error")
    } finally {
      setIsLoading(false)
    }
  }
  const handleUpdateSubpiso = () => {
    if (!selectedSubpiso.nombre || !selectedSubpiso.piso_padre) {
      showAlert("Nombre y piso padre son campos obligatorios", "error")
      return
    }
    showConfirmation("¿Estás seguro de que deseas actualizar este subpiso?", () => updateSubpiso(), "edit")
  }
  const updateSubpiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(selectedSubpiso)
      const response = await axios.put(`http://localhost:8000/api/subpisos/${selectedSubpiso.id}/`, dataToSend)
      showAlert("Subpiso actualizado exitosamente", "success")
      await fetchSubpisos()
      setConfirmAlert((prev) => ({ ...prev, show: false }))
      setTimeout(() => setShowSubpisoModal(false), 1500)
    } catch (error) {
      console.error("Error al actualizar subpiso:", error)
      showAlert(error.response?.data?.error || "Error al actualizar subpiso", "error")
    } finally {
      setIsLoading(false)
    }
  }
  const deleteSubpiso = async (subpisoId) => {
    setIsLoading(true)
    try {
      await axios.delete(`http://localhost:8000/api/subpisos/${subpisoId}/`)
      showAlert("Subpiso eliminado exitosamente", "success")
      await fetchSubpisos()
      setConfirmAlert((prev) => ({ ...prev, show: false }))
    } catch (error) {
      console.error("Error al eliminar subpiso:", error)
      showAlert(error.response?.data?.error || "Error al eliminar subpiso", "error")
    } finally {
      setIsLoading(false)
    }
  }

  // Confirmación antes de eliminar
  const confirmDelete = (item, isPiso = true) => {
    const message = isPiso
      ? item.es_principal
        ? "¿Estás seguro de que deseas eliminar este piso? También se eliminarán todos los subpisos asociados."
        : "¿Estás seguro de que deseas eliminar este piso?"
      : "¿Estás seguro de que deseas eliminar este subpiso?"
    showConfirmation(
      message,
      () => {
        if (isPiso) {
          deletePiso(item.id)
        } else {
          deleteSubpiso(item.id)
        }
      },
      "delete",
    )
  }

  // Paginación
  const getCurrentPageItems = useCallback(() => {
    const data = activeTab === "pisos" ? filteredPisos : filteredSubpisos
    if (activeTab === "subpisos") {
      return data // Return all subpisos
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }, [activeTab, filteredPisos, filteredSubpisos, currentPage, itemsPerPage])

  const getItemRange = () => {
    const data = activeTab === "pisos" ? filteredPisos : filteredSubpisos
    if (data.length === 0) return "No hay resultados"
    if (activeTab === "subpisos") {
      return `Mostrando 1 a ${data.length} de ${data.length} resultados` // Adjusted for "show all"
    }
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, data.length)
    return `Mostrando ${startItem} a ${endItem} de ${data.length} resultados`
  }

  // Función para obtener pisos válidos para subpisos
  const getPisosForSubpisos = () => {
    if (!Array.isArray(pisos)) {
      return []
    }
    return pisos.filter((p) => p.es_principal)
  }

  // Efectos
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchSedes()
      await Promise.all([fetchPisos(), fetchSubpisos()])
    }
    loadInitialData()
  }, [fetchSedes, fetchPisos, fetchSubpisos])

  // Aplicar filtros cuando cambien los datos o filtros
  useEffect(() => {
    applyFilters()
  }, [pisos, subpisos, selectedSede, searchTerm, activeTab, itemsPerPage, applyFilters])

  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Manejador para cerrar modales
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowPisoModal(false)
      setShowSubpisoModal(false)
      setShowFormPiso(false)
      setShowFormSubpiso(false)
    }
  }

  // Componente de confirmación mejorado
  const ConfirmAlert = ({ message, onConfirm, onCancel, type }) => {
    const getIcon = () => {
      switch (type) {
        case "delete":
          return <FaTrash className="confirm-icon delete-icon" />
        case "create":
          return <FaPlus className="confirm-icon create-icon" />
        case "edit":
          return <FaEdit className="confirm-icon edit-icon" />
        default:
          return <FaCheck className="confirm-icon" />
      }
    }
    const getTitle = () => {
      switch (type) {
        case "delete":
          return "Confirmar Eliminación"
        case "create":
          return "Confirmar Creación"
        case "edit":
          return "Confirmar Edición"
        default:
          return "Confirmar Acción"
      }
    }
    return (
      <div className="alert-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal enhanced">
            <div className="confirm-header">
              {getIcon()}
              <h3>{getTitle()}</h3>
            </div>
            <p className="confirm-message">{message}</p>
            <div className="confirm-buttons">
              <button className="confirm-button cancel" onClick={onCancel}>
                <FaTimes /> Cancelar
              </button>
              <button className={`confirm-button accept ${type}`} onClick={onConfirm}>
                <FaCheck /> Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="records-container enhanced">
      <div className="user-card enhanced">
        <div className="card-header enhanced">
          <h2>Gestión de Pisos y Subpisos</h2>
          <button
            className="add-user-btn enhanced"
            onClick={() => (activeTab === "pisos" ? setShowFormPiso(true) : setShowFormSubpiso(true))}
            disabled={isLoading}
          >
            <FaPlus />
          </button>
        </div>
        {/* Tabs */}
        <div className="tabs-container enhanced">
          <button
            className={`tab-button enhanced ${activeTab === "pisos" ? "active" : ""}`}
            onClick={() => setActiveTab("pisos")}
          >
            <FaBuilding /> Pisos
          </button>
          <button
            className={`tab-button enhanced ${activeTab === "subpisos" ? "active" : ""}`}
            onClick={() => setActiveTab("subpisos")}
          >
            <FaLayerGroup /> Subpisos
          </button>
        </div>
        {/* Filtros */}
        <div className="filters-section enhanced">
          <div className="filter-container enhanced">
            <label>Filtrar por sede:</label>
            <select
              value={selectedSede}
              onChange={(e) => handleSedeChange(e.target.value)}
              disabled={isLoading}
              className="filter-select enhanced"
            >
              <option value="">Todas las sedes</option>
              {Array.isArray(sedes) &&
                sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div className="search-container enhanced">
            <div className="search-input-container enhanced">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`Buscar ${activeTab === "pisos" ? "pisos" : "subpisos"}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input enhanced"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>
        {/* Alertas */}
        {alert.show && (
          <div className="toast-notification-overlay">
            <div className={`toast-notification ${alert.type}`}>
              <div className="toast-content">
                <div className="toast-icon">
                  {alert.type === "success" ? <FaCheck /> : alert.type === "error" ? <FaTimes /> : <FaCheck />}
                </div>
                <span className="toast-message">{alert.message}</span>
                <button className="toast-close" onClick={() => setAlert({ ...alert, show: false })}>
                  <FaTimes />
                </button>
              </div>
            </div>
          </div>
        )}
        {confirmAlert.show && (
          <ConfirmAlert
            message={confirmAlert.message}
            onConfirm={confirmAlert.onConfirm}
            onCancel={confirmAlert.onCancel}
            type={confirmAlert.type}
          />
        )}
        {isLoading && (
          <div className="loading-overlay enhanced">
            <div className="loading-spinner enhanced"></div>
          </div>
        )}
        {/* Listado */}
        <div className="user-list enhanced">
          {getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((item) => (
              <div key={item.id} className="user-item enhanced">
                <div className="user-avatar enhanced">{activeTab === "pisos" ? <FaBuilding /> : <FaLayerGroup />}</div>
                <div
                  className="user-info enhanced"
                  onClick={() => {
                    if (isLoading) return
                    if (activeTab === "pisos") {
                      setSelectedPiso(item)
                      setShowPisoModal(true)
                    } else {
                      setSelectedSubpiso(item)
                      setShowSubpisoModal(true)
                    }
                  }}
                  style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
                >
                  <div className="user-name enhanced">{item.nombre}</div>
                  <div className="user-access enhanced">
                    {activeTab === "pisos" ? (
                      <>
                        <span>Sede: {getSedeNombre(item)}</span>
                        <span>{item.es_principal ? "Principal" : "Secundario"}</span>
                      </>
                    ) : (
                      <>
                        <span>Piso padre: {getPisoPadreNombre(item)}</span>
                        <span>Sede: {getSedeNombre(item)}</span>
                        {item.descripcion && (
                          <span>
                            Desc: {item.descripcion.substring(0, 30)}
                            {item.descripcion.length > 30 ? "..." : ""}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <div className="user-actions enhanced">
                  <button
                    className="action-button-modern edit enhanced"
                    onClick={() => {
                      if (activeTab === "pisos") {
                        setSelectedPiso(item)
                        setShowPisoModal(true)
                      } else {
                        setSelectedSubpiso(item)
                        setShowSubpisoModal(true)
                      }
                    }}
                    disabled={isLoading}
                    title="Editar"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="action-button-modern delete enhanced"
                    onClick={() => confirmDelete(item, activeTab === "pisos")}
                    disabled={isLoading}
                    title="Eliminar"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state enhanced">
              <div className="empty-icon">{activeTab === "pisos" ? <FaBuilding /> : <FaLayerGroup />}</div>
              <p>{isLoading ? "Cargando..." : `No hay ${activeTab === "pisos" ? "pisos" : "subpisos"} disponibles.`}</p>
            </div>
          )}
        </div>
        {/* Paginación */}
        {getCurrentPageItems().length > 0 && (
          <div className="pagination-container enhanced">
            <div className="pagination-info enhanced">{getItemRange()}</div>
            <div className="pagination-controls enhanced">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading || activeTab === "subpisos"}
                className="pagination-arrow enhanced"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <span className="pagination-current">
                {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0 || isLoading || activeTab === "subpisos"}
                className="pagination-arrow enhanced"
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>
            <div className="pagination-progress-bar enhanced">
              <div
                className="pagination-progress enhanced"
                style={{ width: `${totalPages > 0 ? (currentPage / totalPages) * 100 : 0}%` }}
              ></div>
            </div>
          </div>
        )}
        {/* Modal para editar Piso */}
        {showPisoModal && selectedPiso && (
          <div className="modal-overlay enhanced" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal enhanced" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header enhanced">
                <h1 className="modal-title">Editar Piso</h1>
                <button className="close-button enhanced" onClick={() => setShowPisoModal(false)} disabled={isLoading}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content enhanced">
                <div className="input-group enhanced">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={selectedPiso.nombre || ""}
                    onChange={(e) => setSelectedPiso({ ...selectedPiso, nombre: e.target.value })}
                    placeholder="Nombre del piso"
                    disabled={isLoading}
                    className={`input-enhanced ${!selectedPiso.nombre?.trim() ? "input-error" : ""}`}
                  />
                </div>
                <div className="input-group enhanced">
                  <label>Sede *</label>
                  <select
                    value={selectedPiso.sede?.id || selectedPiso.sede || ""}
                    onChange={(e) => setSelectedPiso({ ...selectedPiso, sede: e.target.value })}
                    disabled={isLoading}
                    className="select-enhanced"
                  >
                    <option value="">Seleccionar sede</option>
                    {Array.isArray(sedes) &&
                      sedes.map((sede) => (
                        <option key={sede.id} value={sede.id}>
                          {sede.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="input-group checkbox-group enhanced">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={selectedPiso.es_principal || false}
                      onChange={(e) => setSelectedPiso({ ...selectedPiso, es_principal: e.target.checked })}
                      disabled={isLoading}
                      className="checkbox-enhanced"
                    />
                    <span className="checkmark"></span>
                    Piso principal
                  </label>
                </div>
                <button className="create-button enhanced" onClick={handleUpdatePiso} disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal para crear Piso */}
        {showFormPiso && (
          <div className="modal-overlay enhanced" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal enhanced" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header enhanced">
                <h1 className="modal-title">Crear Nuevo Piso</h1>
                <button className="close-button enhanced" onClick={() => setShowFormPiso(false)} disabled={isLoading}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content enhanced">
                <div className="input-group enhanced">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    placeholder="Nombre del piso"
                    value={newPiso.nombre}
                    onChange={(e) => setNewPiso({ ...newPiso, nombre: e.target.value })}
                    disabled={isLoading}
                    className={`input-enhanced ${!newPiso.nombre?.trim() ? "input-error" : ""}`}
                  />
                </div>
                <div className="input-group enhanced">
                  <label>Sede *</label>
                  <select
                    value={newPiso.sede || ""}
                    onChange={(e) => setNewPiso({ ...newPiso, sede: e.target.value })}
                    disabled={isLoading}
                    className="select-enhanced"
                  >
                    <option value="">Seleccionar sede</option>
                    {Array.isArray(sedes) &&
                      sedes.map((sede) => (
                        <option key={sede.id} value={sede.id}>
                          {sede.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div className="input-group checkbox-group enhanced">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newPiso.es_principal || false}
                      onChange={(e) => setNewPiso({ ...newPiso, es_principal: e.target.checked })}
                      disabled={isLoading}
                      className="checkbox-enhanced"
                    />
                    <span className="checkmark"></span>
                    Piso principal
                  </label>
                </div>
                <button className="create-button enhanced" onClick={handleCreatePiso} disabled={isLoading}>
                  {isLoading ? "Creando..." : "Crear Piso"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal para editar Subpiso */}
        {showSubpisoModal && selectedSubpiso && (
          <div className="modal-overlay enhanced" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal enhanced" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header enhanced">
                <h1 className="modal-title">Editar Subpiso</h1>
                <button
                  className="close-button enhanced"
                  onClick={() => setShowSubpisoModal(false)}
                  disabled={isLoading}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content enhanced">
                <div className="input-group enhanced">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    value={selectedSubpiso.nombre || ""}
                    onChange={(e) => setSelectedSubpiso({ ...selectedSubpiso, nombre: e.target.value })}
                    placeholder="Nombre del subpiso"
                    disabled={isLoading}
                    className={`input-enhanced ${!selectedSubpiso.nombre?.trim() ? "input-error" : ""}`}
                  />
                </div>
                <div className="input-group enhanced">
                  <label>Piso Padre *</label>
                  <select
                    value={selectedSubpiso.piso_padre?.id || selectedSubpiso.piso_padre || ""}
                    onChange={(e) => setSelectedSubpiso({ ...selectedSubpiso, piso_padre: e.target.value })}
                    disabled={isLoading}
                    className="select-enhanced"
                  >
                    <option value="">Seleccionar piso padre</option>
                    {getPisosForSubpisos().map((piso) => (
                      <option key={piso.id} value={piso.id}>
                        {piso.nombre} - {getSedeNombre(piso)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group enhanced">
                  <label>Descripción</label>
                  <textarea
                    value={selectedSubpiso.descripcion || ""}
                    onChange={(e) => setSelectedSubpiso({ ...selectedSubpiso, descripcion: e.target.value })}
                    disabled={isLoading}
                    className="textarea-enhanced"
                    placeholder="Descripción del subpiso"
                    rows="4"
                  />
                </div>
                <div className="subpiso-info enhanced">
                  <p>
                    <strong>Sede asociada:</strong> {getSedeNombre(selectedSubpiso)}
                  </p>
                </div>
                <button className="create-button enhanced" onClick={handleUpdateSubpiso} disabled={isLoading}>
                  {isLoading ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Modal para crear Subpiso */}
        {showFormSubpiso && (
          <div className="modal-overlay enhanced" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal enhanced" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header enhanced">
                <h1 className="modal-title">Crear Nuevo Subpiso</h1>
                <button
                  className="close-button enhanced"
                  onClick={() => setShowFormSubpiso(false)}
                  disabled={isLoading}
                >
                  <FaTimes />
                </button>
              </div>
              <div className="modal-content enhanced">
                <div className="input-group enhanced">
                  <label>Nombre *</label>
                  <input
                    type="text"
                    placeholder="Nombre del subpiso"
                    value={newSubpiso.nombre}
                    onChange={(e) => setNewSubpiso({ ...newSubpiso, nombre: e.target.value })}
                    disabled={isLoading}
                    className={`input-enhanced ${!newSubpiso.nombre?.trim() ? "input-error" : ""}`}
                  />
                </div>
                <div className="input-group enhanced">
                  <label>Piso Padre *</label>
                  <select
                    value={newSubpiso.piso_padre || ""}
                    onChange={(e) => setNewSubpiso({ ...newSubpiso, piso_padre: e.target.value })}
                    disabled={isLoading}
                    className="select-enhanced"
                  >
                    <option value="">Seleccionar piso padre</option>
                    {getPisosForSubpisos().map((piso) => (
                      <option key={piso.id} value={piso.id}>
                        {piso.nombre} - {getSedeNombre(piso)}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="input-group enhanced">
                  <label>Descripción</label>
                  <textarea
                    value={newSubpiso.descripcion || ""}
                    onChange={(e) => setNewSubpiso({ ...newSubpiso, descripcion: e.target.value })}
                    disabled={isLoading}
                    className="textarea-enhanced"
                    placeholder="Descripción del subpiso"
                    rows="4"
                  />
                </div>
                <button className="create-button enhanced" onClick={handleCreateSubpiso} disabled={isLoading}>
                  {isLoading ? "Creando..." : "Crear Subpiso"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style jsx>{`
        /* Estilos generales */
        .enhanced .card-header.enhanced {
          background: linear-gradient(#1e2130);
          padding: 1.5rem;
          border-radius: 12px 12px 0 0;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .enhanced .tabs-container.enhanced {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 8px;
          padding: 0.5rem;
          margin: 1rem 0;
        }
        .enhanced .tab-button.enhanced {
          transition: all 0.3s ease;
          border-radius: 6px;
          padding: 0.75rem 1.5rem;
        }
        .enhanced .tab-button.enhanced:hover {
          background: rgba(255, 255, 255, 0.1);
          transform: translateY(-1px);
        }
        .enhanced .filters-section.enhanced {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          margin: 1.5rem 0;
        }
        .enhanced .filter-select.enhanced,
        .enhanced .search-input.enhanced {
          border-radius: 8px;
          border: 2px solid rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }
        .enhanced .filter-select.enhanced:focus,
        .enhanced .search-input.enhanced:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        /* Estilos para los items de la lista */
        .enhanced .user-item.enhanced {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          transition: all 0.3s ease;
          margin-bottom: 0.75rem;
        }
        .enhanced .user-item.enhanced:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        .enhanced .user-avatar.enhanced {
          background: linear-gradient(#7c4dff);
          border-radius: 12px;
          width: 50px;
          height: 50px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 1.2rem;
        }
        .enhanced .user-info.enhanced {
          flex: 1;
          padding: 0.75rem;
        }
        .enhanced .user-name.enhanced {
          font-weight: 600;
          margin-bottom: 0.25rem;
        }
        .enhanced .user-access.enhanced {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .enhanced .user-access.enhanced span {
          background: rgba(255, 255, 255, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }
        .enhanced .action-button-modern.enhanced {
          border-radius: 8px;
          transition: all 0.3s ease;
          padding: 0.5rem;
          margin: 0 0.25rem;
        }
        .enhanced .action-button-modern.enhanced:hover {
          transform: scale(1.1);
        }
        /* Estilos para modales */
        .enhanced .modal-container.enhanced {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          max-width: 500px;
          width: 90%;
        }
        .enhanced .modal-header.enhanced {
          background: linear-gradient(#2a2d3e);
          color: white;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .enhanced .modal-title {
          margin: 0;
          font-size: 1.25rem;
        }
        .enhanced .modal-content.enhanced {
          padding: 1.5rem;
          background: #2a2d3e;
        }
        .enhanced .input-group.enhanced {
          margin-bottom: 1rem;
        }
        .enhanced .input-group.enhanced label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
        }
        .enhanced .input-enhanced,
        .enhanced .select-enhanced,
        .enhanced .textarea-enhanced {
          width: 100%;
          border-radius: 8px;
          border: 2px solid rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
          padding: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          color: white;
        }
        .enhanced .input-enhanced:focus,
        .enhanced .select-enhanced:focus,
        .enhanced .textarea-enhanced:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          outline: none;
        }
        .enhanced .input-enhanced.input-error,
        .enhanced .select-enhanced.input-error {
          border-color: #ef4444;
        }
        .enhanced .textarea-enhanced {
          min-height: 100px;
          resize: vertical;
        }
        .enhanced .checkbox-group.enhanced {
          margin: 1rem 0;
        }
        .enhanced .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          position: relative;
          padding-left: 2rem;
          user-select: none;
        }
        .enhanced .checkbox-enhanced {
          position: absolute;
          left: 0;
          opacity: 0;
          cursor: pointer;
          height: 0;
          width: 0;
        }
        .enhanced .checkmark {
          position: absolute;
          left: 0;
          height: 20px;
          width: 20px;
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          transition: all 0.3s ease;
        }
        .enhanced .checkbox-enhanced:checked ~ .checkmark {
          background-color: #667eea;
        }
        .enhanced .checkmark:after {
          content: "";
          position: absolute;
          display: none;
          left: 7px;
          top: 3px;
          width: 5px;
          height: 10px;
          border: solid white;
          border-width: 0 3px 3px 0;
          transform: rotate(45deg);
        }
        .enhanced .checkbox-enhanced:checked ~ .checkmark:after {
          display: block;
        }
        .enhanced .create-button.enhanced {
          width: 100%;
          padding: 0.75rem;
          border-radius: 8px;
          background: #7c4dff;
          color: white;
          border: none;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 1rem;
        }
        .enhanced .create-button.enhanced:hover {
          background: #6b3dff;
        }
        .enhanced .create-button.enhanced:disabled {
          background: #7c4dff;
          opacity: 0.7;
          cursor: not-allowed;
        }
        .enhanced .subpiso-info.enhanced {
          background: rgba(0, 0, 0, 0.1);
          padding: 0.75rem;
          border-radius: 8px;
          margin: 1rem 0;
        }
        .enhanced .subpiso-info.enhanced p {
          margin: 0;
          font-size: 0.9rem;
        }
        /* Estilos para confirmación */
        .enhanced .confirm-modal.enhanced {
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
          background: #2a2d3e;
          max-width: 400px;
          width: 90%;
        }
        .enhanced .confirm-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 1.5rem;
        }
        .enhanced .confirm-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
          opacity: 0.8;
        }
        .enhanced .confirm-icon.delete-icon {
          color: #ef4444;
        }
        .enhanced .confirm-icon.create-icon {
          color: #10b981;
        }
        .enhanced .confirm-icon.edit-icon {
          color: #3b82f6;
        }
        .enhanced .confirm-message {
          margin-bottom: 2rem;
          line-height: 1.5;
        }
        .enhanced .confirm-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
        }
        .enhanced .confirm-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          transition: all 0.3s ease;
          border: none;
          font-weight: 600;
          cursor: pointer;
        }
        .enhanced .confirm-button.cancel {
          background: rgba(255, 255, 255, 0.1);
          color: white;
        }
        .enhanced .confirm-button.cancel:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .enhanced .confirm-button.accept {
          color: white;
        }
        .enhanced .confirm-button.accept.delete {
          background: #ef4444;
        }
        .enhanced .confirm-button.accept.delete:hover {
          background: #dc2626;
        }
        .enhanced .confirm-button.accept.create {
          background: #10b981;
        }
        .enhanced .confirm-button.accept.create:hover {
          background: #059669;
        }
        .enhanced .confirm-button.accept.edit {
          background: #3b82f6;
        }
        .enhanced .confirm-button.accept.edit:hover {
          background: #2563eb;
        }
        /* Estilos para estado vacío */
        .enhanced .empty-state.enhanced {
          text-align: center;
          padding: 3rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .enhanced .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.3;
        }
        /* Estilos para paginación */
        .enhanced .pagination-container.enhanced {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .enhanced .pagination-info.enhanced {
          text-align: center;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.7);
        }
        .enhanced .pagination-controls.enhanced {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
        }
        .enhanced .pagination-arrow.enhanced {
          background: rgba(255, 255, 255, 0.1);
          border: none;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .enhanced .pagination-arrow.enhanced:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .enhanced .pagination-arrow.enhanced:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .enhanced .pagination-current {
          background: linear-gradient(#7c4dff);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
        }
        .enhanced .pagination-progress-bar.enhanced {
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }
        .enhanced .pagination-progress.enhanced {
          height: 100%;
          background: linear-gradient(#7c4dff);
          transition: width 0.3s ease;
        }
        /* Toast Notifications */
        .toast-notification-overlay {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 99999;
          pointer-events: none;
        }
        .toast-notification {
          pointer-events: auto;
          min-width: 300px;
          max-width: 400px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
          animation: slideInRight 0.3s ease-out;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .toast-notification.success {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
        }
        .toast-notification.error {
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
        }
        .toast-content {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          gap: 12px;
        }
        .toast-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          flex-shrink: 0;
        }
        .toast-message {
          flex: 1;
          font-weight: 500;
          font-size: 14px;
          line-height: 1.4;
        }
        .toast-close {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
          border: none;
          background: rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }
        .toast-close:hover {
          background: rgba(255, 255, 255, 0.3);
          transform: scale(1.1);
        }
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        /* Loading overlay */
        .loading-overlay.enhanced {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .loading-spinner.enhanced {
          width: 50px;
          height: 50px;
          border: 5px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: #7c4dff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        /* Responsive */
        @media (max-width: 768px) {
          .enhanced .filters-section.enhanced {
            grid-template-columns: 1fr;
          }
          .enhanced .user-access.enhanced {
            flex-direction: column;
            gap: 0.25rem;
          }
          .enhanced .user-item.enhanced {
            flex-direction: column;
            align-items: flex-start;
          }
          .enhanced .user-actions.enhanced {
            width: 100%;
            justify-content: flex-end;
            margin-top: 0.5rem;
          }
        }
        /* Asegurar que las alertas estén encima de modales */
        .modal-overlay {
          z-index: 9999;
        }
        .alert-overlay {
          z-index: 10000;
        }
      `}</style>
    </div>
  )
}

export default PisosManager
