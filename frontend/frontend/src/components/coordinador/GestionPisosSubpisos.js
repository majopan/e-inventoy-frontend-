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
import "../../styles/ServiciosExistentes.css"
import { useAuth } from "../auth" // Importar useAuth

const PisosManager = () => {
  // Usar useAuth para obtener información de la sede
  const { sedeId, sedeNombre } = useAuth()

  // Estados principales
  const [pisos, setPisos] = useState([])
  const [subpisos, setSubpisos] = useState([])
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
    sede: sedeId, // Usar sedeId del contexto
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

  // Estados para datos filtrados
  const [filteredPisos, setFilteredPisos] = useState([])
  const [filteredSubpisos, setFilteredSubpisos] = useState([])

  // Actualizar newPiso cuando cambie sedeId
  useEffect(() => {
    setNewPiso((prev) => ({
      ...prev,
      sede: sedeId,
    }))
  }, [sedeId])

  // Obtener datos de la API FILTRADOS POR SEDE
  const fetchPisos = useCallback(async () => {
    if (!sedeId) {
      console.log("❌ No hay sede seleccionada, limpiando pisos")
      setPisos([])
      return []
    }

    setIsLoading(true)
    try {
      console.log("🏢 Cargando pisos para sede:", sedeId)

      // Intentar filtrar por sede en la URL
      const url = "http://localhost:8000/api/pisos/"
      let response

      try {
        response = await axios.get(`${url}?sede=${sedeId}`)
      } catch (error) {
        console.log("⚠️ Error con filtro en URL, intentando sin filtro:", error)
        response = await axios.get(url)
      }

      console.log("Respuesta pisos:", response.data)

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

      // FILTRAR SOLO PISOS DE LA SEDE DEL USUARIO
      const filteredPisos = pisosData.filter((piso) => {
        const pisoSede = piso.sede || piso.sede_id || piso.sedeId
        const sedeIdNum = Number(sedeId)
        const pisoSedeNum = Number(pisoSede)
        return pisoSedeNum === sedeIdNum || pisoSede === sedeId || pisoSede === sedeIdNum
      })

      console.log("✅ Pisos filtrados para sede:", filteredPisos)
      setPisos(filteredPisos)
      return filteredPisos
    } catch (error) {
      console.error("❌ Error al obtener pisos:", error)
      showAlert(`Error al cargar pisos para la sede: ${error.message}`, "error")
      setPisos([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [sedeId])

  const fetchSubpisos = useCallback(async () => {
    if (!sedeId) {
      console.log("❌ No hay sede seleccionada, limpiando subpisos")
      setSubpisos([])
      return []
    }

    setIsLoading(true)
    try {
      console.log("🏢 Cargando subpisos para sede:", sedeId)

      // Intentar filtrar por sede en la URL
      const url = "http://localhost:8000/api/subpisos/"
      let response

      try {
        response = await axios.get(`${url}?sede=${sedeId}`)
      } catch (error) {
        console.log("⚠️ Error con filtro en URL, intentando sin filtro:", error)
        response = await axios.get(url)
      }

      console.log("Respuesta subpisos:", response.data)

      let subpisosData = []
      if (Array.isArray(response.data)) {
        subpisosData = response.data
      } else if (response.data.results && Array.isArray(response.data.results)) {
        subpisosData = response.data.results
      } else if (response.data.subpisos && Array.isArray(response.data.subpisos)) {
        subpisosData = response.data.subpisos
      } else if (response.data.data && Array.isArray(response.data.data)) {
        subpisosData = response.data.data
      }

      // FILTRAR SOLO SUBPISOS DE LA SEDE DEL USUARIO
      const filteredSubpisos = subpisosData.filter((subpiso) => {
        // Verificar por sede directa
        const subpisoSede = subpiso.sede || subpiso.sede_id
        if (subpisoSede) {
          const sedeIdNum = Number(sedeId)
          const subpisoSedeNum = Number(subpisoSede)
          return subpisoSedeNum === sedeIdNum || subpisoSede === sedeId
        }

        // Verificar por piso padre
        if (subpiso.piso_padre) {
          const pisoPadre = typeof subpiso.piso_padre === "object" ? subpiso.piso_padre : null
          if (pisoPadre && pisoPadre.sede) {
            const pisoPadreSede = pisoPadre.sede || pisoPadre.sede_id
            const sedeIdNum = Number(sedeId)
            const pisoPadreSedeNum = Number(pisoPadreSede)
            return pisoPadreSedeNum === sedeIdNum || pisoPadreSede === sedeId
          }
        }

        return false
      })

      console.log("✅ Subpisos filtrados para sede:", filteredSubpisos)
      setSubpisos(filteredSubpisos)
      return filteredSubpisos
    } catch (error) {
      console.error("❌ Error al obtener subpisos:", error)
      showAlert(`Error al cargar subpisos para la sede: ${error.message}`, "error")
      setSubpisos([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [sedeId])

  // Función para mostrar alertas
  const showAlert = (message, type) => {
    setAlert({
      show: true,
      message,
      type,
    })
  }

  // Aplicar filtros SIMPLIFICADO (ya no filtra por sede, solo por búsqueda)
  const applyFilters = useCallback(() => {
    console.log("Aplicando filtros de búsqueda para sede:", sedeId)
    console.log("Datos actuales:", activeTab === "pisos" ? pisos : subpisos)

    const currentData = activeTab === "pisos" ? pisos : subpisos

    if (!Array.isArray(currentData)) {
      console.log("currentData no es array:", currentData)
      if (activeTab === "pisos") {
        setFilteredPisos([])
      } else {
        setFilteredSubpisos([])
      }
      setTotalPages(0)
      return
    }

    let filtered = [...currentData]

    // Solo filtro por búsqueda (ya están filtrados por sede)
    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.descripcion && item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    console.log("Resultados filtrados:", filtered)

    if (activeTab === "pisos") {
      setFilteredPisos(filtered)
    } else {
      setFilteredSubpisos(filtered)
    }

    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
    setCurrentPage(1)
  }, [pisos, subpisos, searchTerm, activeTab, itemsPerPage, sedeId])

  // Función para obtener el nombre de la sede (siempre será la del usuario)
  const getSedeNombre = () => {
    return sedeNombre || `Sede ${sedeId}`
  }

  // Función para obtener el nombre del piso padre
  const getPisoPadreNombre = (subpiso) => {
    if (subpiso.piso_padre && subpiso.piso_padre.nombre) return subpiso.piso_padre.nombre

    // Buscar por ID en los pisos cargados
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
    // Crear una copia para no modificar el original
    const preparedData = { ...data }

    // FORZAR SEDE DEL USUARIO
    preparedData.sede = sedeId

    // Si piso_padre es un objeto, extraer solo el ID
    if (preparedData.piso_padre && typeof preparedData.piso_padre === "object" && preparedData.piso_padre.id) {
      preparedData.piso_padre = preparedData.piso_padre.id
    }

    // Eliminar campos que no deben enviarse
    delete preparedData.sede_nombre

    console.log("Datos preparados para enviar:", preparedData)
    return preparedData
  }

  // Operaciones CRUD para Pisos
  const handleCreatePiso = () => {
    if (!newPiso.nombre) {
      showAlert("El nombre es un campo obligatorio", "error")
      return
    }

    showConfirmation(`¿Estás seguro de que deseas crear este piso en ${sedeNombre}?`, () => createPiso(), "create")
  }

  const createPiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(newPiso)
      console.log("Enviando datos para crear piso:", dataToSend)

      const response = await axios.post("http://localhost:8000/api/pisos/", dataToSend)
      console.log("Piso creado:", response.data)

      showAlert(`Piso creado exitosamente en ${sedeNombre}`, "success")

      // Actualizar datos
      await fetchPisos()

      // Limpiar formulario
      setNewPiso({
        nombre: "",
        sede: sedeId, // Mantener sede del usuario
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
    if (!selectedPiso.nombre) {
      showAlert("El nombre es un campo obligatorio", "error")
      return
    }

    showConfirmation(`¿Estás seguro de que deseas actualizar este piso en ${sedeNombre}?`, () => updatePiso(), "edit")
  }

  const updatePiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(selectedPiso)
      console.log("Enviando datos para actualizar piso:", dataToSend)

      const response = await axios.put(`http://localhost:8000/api/pisos/${selectedPiso.id}/`, dataToSend)
      console.log("Piso actualizado:", response.data)

      showAlert(`Piso actualizado exitosamente en ${sedeNombre}`, "success")

      // Actualizar datos
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
      // Primero verificamos si es un piso principal y tiene subpisos
      const pisoAEliminar = pisos.find((p) => p.id === pisoId)
      if (pisoAEliminar && pisoAEliminar.es_principal) {
        // Obtener todos los subpisos asociados a este piso
        const subpisosData = await fetchSubpisos()
        const subpisosAsociados = subpisosData.filter(
          (s) =>
            String(s.piso_padre) === String(pisoId) || (s.piso_padre && String(s.piso_padre.id) === String(pisoId)),
        )

        console.log(`Piso ${pisoId} tiene ${subpisosAsociados.length} subpisos asociados`)

        // Eliminar cada subpiso asociado
        for (const subpiso of subpisosAsociados) {
          console.log(`Eliminando subpiso asociado: ${subpiso.id}`)
          await axios.delete(`http://localhost:8000/api/subpisos/${subpiso.id}/`)
        }
      }

      // Finalmente eliminar el piso
      await axios.delete(`http://localhost:8000/api/pisos/${pisoId}/`)

      showAlert(`Piso y sus subpisos asociados eliminados exitosamente de ${sedeNombre}`, "success")

      // Actualizar datos
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

    showConfirmation(
      `¿Estás seguro de que deseas crear este subpiso en ${sedeNombre}?`,
      () => createSubpiso(),
      "create",
    )
  }

  const createSubpiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(newSubpiso)
      console.log("Enviando datos para crear subpiso:", dataToSend)

      const response = await axios.post("http://localhost:8000/api/subpisos/", dataToSend)
      console.log("Subpiso creado:", response.data)

      showAlert(`Subpiso creado exitosamente en ${sedeNombre}`, "success")

      // Actualizar datos
      await fetchSubpisos()

      // Limpiar formulario
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

    showConfirmation(
      `¿Estás seguro de que deseas actualizar este subpiso en ${sedeNombre}?`,
      () => updateSubpiso(),
      "edit",
    )
  }

  const updateSubpiso = async () => {
    setIsLoading(true)
    try {
      const dataToSend = prepareDataForServer(selectedSubpiso)
      console.log("Enviando datos para actualizar subpiso:", dataToSend)

      const response = await axios.put(`http://localhost:8000/api/subpisos/${selectedSubpiso.id}/`, dataToSend)
      console.log("Subpiso actualizado:", response.data)

      showAlert(`Subpiso actualizado exitosamente en ${sedeNombre}`, "success")

      // Actualizar datos
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

      showAlert(`Subpiso eliminado exitosamente de ${sedeNombre}`, "success")

      // Actualizar datos
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
        ? `¿Estás seguro de que deseas eliminar este piso de ${sedeNombre}? También se eliminarán todos los subpisos asociados.`
        : `¿Estás seguro de que deseas eliminar este piso de ${sedeNombre}?`
      : `¿Estás seguro de que deseas eliminar este subpiso de ${sedeNombre}?`

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
  const getCurrentPageItems = () => {
    const data = activeTab === "pisos" ? filteredPisos : filteredSubpisos
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return data.slice(startIndex, endIndex)
  }

  const getItemRange = () => {
    const data = activeTab === "pisos" ? filteredPisos : filteredSubpisos
    if (data.length === 0) return "No hay resultados"

    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, data.length)

    return `Mostrando ${startItem} a ${endItem} de ${data.length} resultados`
  }

  // Función para obtener pisos válidos para subpisos (solo de la sede del usuario)
  const getPisosForSubpisos = () => {
    if (!Array.isArray(pisos)) {
      console.log("pisos no es array:", pisos)
      return []
    }

    return pisos.filter((p) => p.es_principal)
  }

  // Efectos
  useEffect(() => {
    if (!sedeId) return

    console.log("🚀 Componente montado con sede:", sedeId)
    const loadInitialData = async () => {
      await Promise.all([fetchPisos(), fetchSubpisos()])
    }

    loadInitialData()
  }, [sedeId, fetchPisos, fetchSubpisos])

  // Aplicar filtros cuando cambien los datos o filtros
  useEffect(() => {
    applyFilters()
  }, [pisos, subpisos, searchTerm, activeTab])

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

  // No mostrar nada si no hay sedeId
  if (!sedeId) {
    return (
      <div className="records-container enhanced">
        <div className="user-card enhanced">
          <div className="card-header enhanced">
            <h2>Gestión de Pisos y Subpisos</h2>
          </div>
          <div className="empty-state enhanced">
            <div className="empty-icon">
              <FaBuilding />
            </div>
            <p>No se ha seleccionado una sede.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="records-container enhanced">
      <div className="user-card enhanced">
        <div className="card-header enhanced">
          <h2>Gestión de Pisos y Subpisos - {sedeNombre}</h2>
          <button
            className="add-user-btn enhanced"
            onClick={() => (activeTab === "pisos" ? setShowFormPiso(true) : setShowFormSubpiso(true))}
            disabled={isLoading}
          >
            <FaPlus />
          </button>
        </div>

        {/* Tabs mejorados */}
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

        {/* Filtros simplificados - Solo búsqueda */}
        <div className="filters-section enhanced">
          <div className="sede-info enhanced">
            <label>Sede actual:</label>
            <div className="sede-display">
              <FaBuilding /> {sedeNombre || `Sede ${sedeId}`}
            </div>
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

        {/* Alertas mejoradas - Posición fija encima de todo */}
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

        {/* Listado mejorado */}
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
                        Sede: {getSedeNombre()} | {item.es_principal ? " Principal" : " Secundario"}
                      </>
                    ) : (
                      <>
                        Piso: {getPisoPadreNombre(item)} | Sede: {getSedeNombre()}
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
              <p>
                {isLoading
                  ? "Cargando..."
                  : `No hay ${activeTab === "pisos" ? "pisos" : "subpisos"} disponibles en ${sedeNombre}.`}
              </p>
            </div>
          )}
        </div>

        {/* Paginación mejorada */}
        {getCurrentPageItems().length > 0 && (
          <div className="pagination-container enhanced">
            <div className="pagination-info enhanced">{getItemRange()}</div>
            <div className="pagination-controls enhanced">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
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
                disabled={currentPage === totalPages || totalPages === 0 || isLoading}
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
                <h1 className="modal-title">Editar Piso - {sedeNombre}</h1>
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
                  <label>Sede</label>
                  <input
                    type="text"
                    value={sedeNombre || `Sede ${sedeId}`}
                    disabled
                    className="input-enhanced sede-readonly"
                    style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                  />
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
                <h1 className="modal-title">Crear Nuevo Piso - {sedeNombre}</h1>
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
                  <label>Sede</label>
                  <input
                    type="text"
                    value={sedeNombre || `Sede ${sedeId}`}
                    disabled
                    className="input-enhanced sede-readonly"
                    style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                  />
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
                <h1 className="modal-title">Editar Subpiso - {sedeNombre}</h1>
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
                        {piso.nombre}
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
                  />
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
                <h1 className="modal-title">Crear Nuevo Subpiso - {sedeNombre}</h1>
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
                        {piso.nombre}
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
        /* Estilos mejorados manteniendo los colores originales */
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

        .enhanced .sede-info.enhanced {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .enhanced .sede-display {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, #667eea, #764ba2);
          color: white;
          border-radius: 8px;
          font-weight: 600;
        }

        .enhanced .search-input.enhanced {
          border-radius: 8px;
          border: 2px solid rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
        }

        .enhanced .search-input.enhanced:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

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

        .enhanced .action-button-modern.enhanced {
          border-radius: 8px;
          transition: all 0.3s ease;
          padding: 0.5rem;
          margin: 0 0.25rem;
        }

        .enhanced .action-button-modern.enhanced:hover {
          transform: scale(1.1);
        }

        .enhanced .modal-container.enhanced {
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        }

        .enhanced .modal-header.enhanced {
          background: linear-gradient(#2a2d3e);
          color: white;
          padding: 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .enhanced .input-enhanced,
        .enhanced .select-enhanced,
        .enhanced .textarea-enhanced {
          border-radius: 8px;
          border: 2px solid rgba(102, 126, 234, 0.3);
          transition: all 0.3s ease;
          padding: 0.75rem;
        }

        .enhanced .input-enhanced:focus,
        .enhanced .select-enhanced:focus,
        .enhanced .textarea-enhanced:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }

        .enhanced .sede-readonly {
          background-color: #f8f9fa !important;
          color: #6c757d !important;
          cursor: not-allowed !important;
        }

        .enhanced .checkbox-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          position: relative;
          padding-left: 2rem;
        }

        .enhanced .checkbox-enhanced {
          position: absolute;
          left: 0;
          opacity: 0;
        }

        .enhanced .checkmark {
          position: absolute;
          left: 0;
          height: 20px;
          width: 20px;
          background-color: #eee;
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

        .enhanced .confirm-modal.enhanced {
          border-radius: 16px;
          padding: 2rem;
          text-align: center;
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
        }

        .enhanced .confirm-icon.delete-icon {
          color: #7c4dff;
        }

        .enhanced .confirm-icon.create-icon {
          color: #7c4dff;
        }

        .enhanced .confirm-icon.edit-icon {
          color: #7c4dff;
        }

        .enhanced .confirm-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 2rem;
        }

        .enhanced .confirm-button {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          transition: all 0.3s ease;
        }

        .enhanced .confirm-button.accept.delete {
          background: #7c4dff;
          color: white;
        }

        .enhanced .confirm-button.accept.create {
          background: #7c4dff;
          color: white;
        }

        .enhanced .confirm-button.accept.edit {
          background: #7c4dff;
          color: white;
        }

        .enhanced .empty-state.enhanced {
          text-align: center;
          padding: 3rem;
          color: #666;
        }

        .enhanced .empty-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          opacity: 0.5;
        }

        .enhanced .pagination-container.enhanced {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 12px;
          padding: 1rem;
          margin-top: 1.5rem;
        }

        .enhanced .pagination-current {
          background: linear-gradient(#7c4dff);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .enhanced .filters-section.enhanced {
            grid-template-columns: 1fr;
          }
        }

        /* Toast Notifications - Encima de todo */
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