/* eslint-disable react-hooks/exhaustive-deps */

"use client"

import { useState, useEffect, useCallback } from "react"

import axios from "axios"

import {
  FaEdit,
  FaPlus,
  FaTrash,
  FaDesktop,
  FaTabletAlt,
  FaMobileAlt,
  FaServer, 
  FaArchive,
  FaLaptop,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa"

import "../../styles/Devices.css"

import { useAuth } from "../auth"

const API_BASE_URL = "http://localhost:8000/api"

const Dispositivos = () => {
  const { sedeId, sedeNombre } = useAuth()

  const [dispositivos, setDispositivos] = useState([])
  const [filteredDispositivos, setFilteredDispositivos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [newDevice, setNewDevice] = useState(initialDeviceState())
  const [selectedDevice, setSelectedDevice] = useState(null)
  const [posiciones, setPosiciones] = useState([])
  const [sedes, setSedes] = useState([])
  const [choices, setChoices] = useState({
    TIPOS_DISPOSITIVOS: [],
    ESTADO_DISPOSITIVO: [],
    ESTADO_USO: [],
    ESTADOS_PROPIEDAD: [],
  })

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
  })

  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)

  function initialDeviceState() {
    return {
      tipo: "COMPUTADOR",
      marca: "DELL",
      modelo: "",
      serial: "",
      estado: "BUENO",
      estado_uso: "DISPONIBLE",
      capacidad_memoria_ram: "8GB",
      capacidad_disco_duro: "500GB",
      sistema_operativo: "WIN10",
      procesador: "I5_8500",
      generacion: "",
      ubicacion: "SEDE",
      razon_social: "ECCC",
      regimen: "",
      placa_cu: "",
      piso: "",
      estado_propiedad: "PROPIO",
      proveedor: "",
      posicion: null,
      sede: sedeId,
      observaciones: "",
      tpm: "",
    }
  }

  const fetchChoices = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/dispositivos/choices/`)
      setChoices({
        TIPOS_DISPOSITIVOS: response.data.TIPOS_DISPOSITIVOS || [],
        ESTADO_DISPOSITIVO: response.data.ESTADO_DISPOSITIVO || [],
        ESTADO_USO: response.data.ESTADO_USO || [],
        ESTADOS_PROPIEDAD: response.data.ESTADOS_PROPIEDAD || [],
      })
    } catch (error) {
      console.error("Error al obtener opciones:", error)
    }
  }

  const fetchDispositivos = async () => {
    if (!sedeId) return

    try {
      const response = await axios.get(`${API_BASE_URL}/dispositivos/?sede=${sedeId}`)
      const data = response.data.results || response.data.data || response.data

      if (Array.isArray(data)) {
        // Filtrar dispositivos por sede del usuario
        const dispositivosFiltrados = data.filter((device) => device.sede === sedeId || device.sede === Number(sedeId))
        setDispositivos(dispositivosFiltrados)
        applyFilters(dispositivosFiltrados)
      } else {
        console.error("Formato inesperado en dispositivos:", data)
        setDispositivos([])
        setFilteredDispositivos([])
      }
    } catch (error) {
      console.error("Error al obtener dispositivos:", error)
      setDispositivos([])
      setFilteredDispositivos([])
    }
  }

  const fetchPosiciones = async () => {
    if (!sedeId) return

    try {
      const response = await axios.get(`${API_BASE_URL}/posiciones/?sede=${sedeId}`)
      const data = response.data.results || response.data

      // Filtrar posiciones por sede del usuario
      const posicionesFiltradas = Array.isArray(data)
        ? data.filter((posicion) => posicion.sede === sedeId || posicion.sede === Number(sedeId))
        : []

      setPosiciones(posicionesFiltradas)
    } catch (error) {
      console.error("Error al obtener posiciones:", error)
      setPosiciones([])
    }
  }

  const fetchSedes = async () => {
    if (!sedeId) return

    try {
      const response = await axios.get(`${API_BASE_URL}/sedes/${sedeId}/`)
      const data = response.data

      const sedeFormateada = {
        id: data.id || data.pk || data.ID || sedeId,
        nombre: data.nombre || data.name || data.Nombre || sedeNombre || `Sede ${sedeId}`,
      }

      setSedes([sedeFormateada])
    } catch (error) {
      console.error("Error al obtener sede:", error)
      // Fallback con datos del contexto de autenticación
      setSedes([
        {
          id: sedeId,
          nombre: sedeNombre || `Sede ${sedeId}`,
        },
      ])
    }
  }

  const applyFilters = (devicesData = dispositivos) => {
    let filtered = Array.isArray(devicesData) ? [...devicesData] : []

    if (searchTerm) {
      filtered = filtered.filter(
        (device) =>
          (device.tipo && device.tipo.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.marca && device.marca.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.modelo && device.modelo.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.serial && device.serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.estado && device.estado.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.placa_cu && device.placa_cu.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (device.sistema_operativo && device.sistema_operativo.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredDispositivos(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredDispositivos.slice(startIndex, endIndex)
  }

  const getItemRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredDispositivos.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredDispositivos.length} resultados`
  }

  const validateDevice = (device) => {
    if (!device.modelo || !device.serial) {
      setAlert({
        show: true,
        message: "El modelo y el serial son campos obligatorios.",
        type: "error",
      })
      return false
    }

    return true
  }

  const confirmAddDevice = () => {
    if (!validateDevice(newDevice)) return

    setConfirmAlert({
      show: true,
      message: "¿Estás seguro de que deseas crear este dispositivo?",
      onConfirm: () => {
        addDevice()
        setConfirmAlert((prev) => ({ ...prev, show: false }))
      },
      onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
    })
  }

  const addDevice = async () => {
    try {
      const deviceToSend = {
        ...newDevice,
        posicion: newDevice.posicion ? Number(newDevice.posicion) : null,
        sede: sedeId, // Forzar la sede del usuario autenticado
      }

      Object.keys(deviceToSend).forEach((key) => {
        if (typeof deviceToSend[key] === "string") {
          deviceToSend[key] = deviceToSend[key].toUpperCase()
        }
        if (deviceToSend[key] === "" || deviceToSend[key] === null) {
          delete deviceToSend[key]
        }
      })

      // Asegurar que la sede siempre esté presente
      deviceToSend.sede = sedeId

      const response = await axios.post(`${API_BASE_URL}/dispositivos/`, deviceToSend)

      if (response.status === 201) {
        fetchDispositivos()
        setShowForm(false)
        setNewDevice(initialDeviceState())
        setAlert({
          show: true,
          message: "Dispositivo agregado exitosamente.",
          type: "success",
        })
      }
    } catch (error) {
      console.error("Error al agregar el dispositivo:", error)
      let errorMessage = "Hubo un error al agregar el dispositivo."

      if (error.response?.data) {
        errorMessage = Object.values(error.response.data).flat().join(", ")
      }

      setAlert({
        show: true,
        message: errorMessage,
        type: "error",
      })
    }
  }

  const confirmUpdateDevice = () => {
    if (!validateDevice(selectedDevice)) return

    setConfirmAlert({
      show: true,
      message: "¿Estás seguro de que deseas actualizar este dispositivo?",
      onConfirm: () => {
        updateDevice()
        setConfirmAlert((prev) => ({ ...prev, show: false }))
      },
      onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
    })
  }

  const updateDevice = async () => {
    try {
      const cleanDeviceData = {
        ...selectedDevice,
        posicion: selectedDevice.posicion ? Number(selectedDevice.posicion) : null,
        sede: sedeId, // Forzar la sede del usuario autenticado
      }

      Object.keys(cleanDeviceData).forEach((key) => {
        if (typeof cleanDeviceData[key] === "string") {
          cleanDeviceData[key] = cleanDeviceData[key].toUpperCase()
        }
        if (cleanDeviceData[key] === "" || cleanDeviceData[key] === null) {
          delete cleanDeviceData[key]
        }
      })

      // Asegurar que la sede siempre esté presente
      cleanDeviceData.sede = sedeId

      await axios.put(`${API_BASE_URL}/dispositivos/${selectedDevice.id}/`, cleanDeviceData)

      fetchDispositivos()
      setShowDetailModal(false)
      setAlert({
        show: true,
        message: "Dispositivo actualizado exitosamente.",
        type: "success",
      })
    } catch (error) {
      console.error("Error al actualizar el dispositivo:", error.response?.data || error)
      setAlert({
        show: true,
        message: "Error al actualizar el dispositivo. Verifique los datos.",
        type: "error",
      })
    }
  }

  const deleteDevice = async (deviceId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/dispositivos/${deviceId}/`)

      if (response.status === 204) {
        fetchDispositivos()
        setAlert({
          show: true,
          message: "Dispositivo eliminado exitosamente.",
          type: "success",
        })
      }
    } catch (error) {
      console.error("Error al eliminar el dispositivo:", error)
      let errorMessage = "Hubo un error al eliminar el dispositivo."

      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail
      }

      setAlert({
        show: true,
        message: errorMessage,
        type: "error",
      })
    }
  }

  const confirmDelete = (deviceId) => {
    setConfirmAlert({
      show: true,
      message: "¿Estás seguro de que deseas eliminar este dispositivo?",
      onConfirm: () => {
        deleteDevice(deviceId)
        setConfirmAlert((prev) => ({ ...prev, show: false }))
      },
      onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
    })
  }

  const getDeviceIcon = (tipo) => {
    switch (tipo) {
      case "COMPUTADOR":
        return <FaLaptop />
      case "DESKTOP":
        return <FaArchive />
      case "MONITOR":
        return <FaDesktop />
      case "TABLET":
        return <FaTabletAlt />
      case "MOVIL":
        return <FaMobileAlt />
      case "HP_PRODISPLAY_P201":
        return <FaDesktop />
      case "PORTATIL":
        return <FaLaptop />
      case "TODO_EN_UNO":
        return <FaDesktop />
      default:
        return <FaServer />
    }
  }

  // Función para cerrar alert de manera estable
  const closeAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, show: false }))
  }, [])

  useEffect(() => {
    if (!sedeId) return

    const fetchData = async () => {
      await fetchChoices()
      await fetchSedes()
      await fetchPosiciones()
      await fetchDispositivos()
    }

    fetchData()
  }, [sedeId])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm])

  // FIX: Cambiar la dependencia del useEffect para evitar loop infinito
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        closeAlert()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [alert.show, closeAlert]) // Solo depender de alert.show, no de todo el objeto alert

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDetailModal(false)
      setShowForm(false)
    }
  }

  const AlertModal = ({ message, type, onClose }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-container alert-container">
          <div className={`alert-modal ${type}`}>
            <p>{message}</p>
            <button className="close-button" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>
      </div>
    )
  }

  const ConfirmAlert = ({ message, onConfirm, onCancel }) => {
    return (
      <div className="alert-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal">
            <p>{message}</p>
            <div className="confirm-buttons">
              <button className="confirm-button cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button className="alert-button accept" onClick={onConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const DeviceList = ({ dispositivos, setSelectedDevice, setShowDetailModal, deleteDevice, getDeviceIcon }) => (
    <div className="user-list">
      {dispositivos.length > 0 ? (
        dispositivos.map((device) => (
          <div key={device.id} className="user-item">
            <div className="user-avatar">{getDeviceIcon(device.tipo)}</div>
            <div
              className="user-info"
              onClick={() => {
                setSelectedDevice(device)
                setShowDetailModal(true)
              }}
            >
              <div className="user-name">
                {device.tipo} - {device.marca} {device.modelo}
              </div>
              <div className="user-access">Serial: {device.serial}</div>
              <div className="user-details">
                <span>Estado: {device.estado} </span>
                {device.placa_cu && <span> Placa: {device.placa_cu}</span>}
                {device.tpm && <span> TPM: {device.tpm}</span>}
              </div>
            </div>
            <div className="user-actions">
              <button
                className="action-button-modern edit"
                onClick={() => {
                  setSelectedDevice(device)
                  setShowDetailModal(true)
                }}
              >
                <FaEdit />
              </button>
              <button className="action-button-modern delete" onClick={() => deleteDevice(device.id)}>
                <FaTrash />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p className="no-results">No hay dispositivos disponibles para {sedeNombre || "tu sede"}.</p>
      )}
    </div>
  )

  // No mostrar nada si no hay sedeId
  if (!sedeId) {
    return (
      <div className="devices-container">
        <div className="user-card">
          <p className="no-data-message">No se ha seleccionado una sede.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="devices-container">
      <div className="user-card">
        <div className="card-header">
          <h2>Gestión de Dispositivos - {sedeNombre || "Tu Sede"}</h2>
          <button className="add-user-btn" onClick={() => setShowForm(true)}>
            <FaPlus />
          </button>
        </div>

        {alert.show && <AlertModal message={alert.message} type={alert.type} onClose={closeAlert} />}

        {confirmAlert.show && (
          <ConfirmAlert
            message={confirmAlert.message}
            onConfirm={confirmAlert.onConfirm}
            onCancel={confirmAlert.onCancel}
          />
        )}

        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar dispositivos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        <DeviceList
          dispositivos={getCurrentPageItems()}
          setSelectedDevice={setSelectedDevice}
          setShowDetailModal={setShowDetailModal}
          deleteDevice={confirmDelete}
          getDeviceIcon={getDeviceIcon}
        />

        {filteredDispositivos.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="pagination-arrow"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="pagination-arrow"
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowForm(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Agregar Dispositivo</h1>
                <DeviceForm
                  device={newDevice}
                  setDevice={setNewDevice}
                  onSubmit={confirmAddDevice}
                  posiciones={posiciones}
                  sedes={sedes}
                  choices={choices}
                  sedeId={sedeId}
                  sedeNombre={sedeNombre}
                />
              </div>
            </div>
          </div>
        )}

        {showDetailModal && selectedDevice && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowDetailModal(false)}>
                &times;
              </button>
              <div className="modal-content">
                <h1 className="modal-title">Editar Dispositivo</h1>
                <DeviceForm
                  device={selectedDevice}
                  setDevice={setSelectedDevice}
                  onSubmit={confirmUpdateDevice}
                  posiciones={posiciones}
                  sedes={sedes}
                  choices={choices}
                  sedeId={sedeId}
                  sedeNombre={sedeNombre}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

const DeviceForm = ({ device, setDevice, onSubmit, posiciones, sedes, choices, sedeId, sedeNombre }) => {
  if (!device) return null

  const handleInputChange = (field, value) => {
    setDevice({
      ...device,
      [field]: typeof value === "string" ? value.toUpperCase() : value,
    })
  }

  return (
    <div className="device-form">
      <div className="form-columns">
        <div className="form-column">
          {renderSelect("Tipo*", "tipo", device, handleInputChange, choices.TIPOS_DISPOSITIVOS)}
          {renderInput("Marca*", "marca", device, handleInputChange)}
          {renderInput("Modelo*", "modelo", device, handleInputChange)}
          {renderInput("Serial*", "serial", device, handleInputChange)}
          {renderInput("Placa CU", "placa_cu", device, handleInputChange)}
          {renderSelect("Estado*", "estado", device, handleInputChange, choices.ESTADO_DISPOSITIVO)}
          {renderSelect("Estado de Uso", "estado_uso", device, handleInputChange, choices.ESTADO_USO)}
          {renderInput("Sistema Operativo", "sistema_operativo", device, handleInputChange)}
          {renderInput("Procesador", "procesador", device, handleInputChange)}
          {renderInput("Generación", "generacion", device, handleInputChange)}
        </div>

        <div className="form-column">
          {renderInput("Capacidad Memoria RAM", "capacidad_memoria_ram", device, handleInputChange)}
          {renderInput("Capacidad Disco Duro", "capacidad_disco_duro", device, handleInputChange)}
          {renderInput("Ubicación", "ubicacion", device, handleInputChange)}
          {renderInput("TPM", "tpm", device, handleInputChange)}
          {renderInput("Razón Social", "razon_social", device, handleInputChange)}
          {renderInput("Régimen", "regimen", device, handleInputChange)}
          {renderSelect("Estado Propiedad", "estado_propiedad", device, handleInputChange, choices.ESTADOS_PROPIEDAD)}
          {renderInput("Proveedor", "proveedor", device, handleInputChange)}
        </div>

        <div className="form-column">
          {/* Campo de sede deshabilitado y preseleccionado */}
          <div className="input-group">
            <label>Sede</label>
            <input
              type="text"
              value={sedeNombre || "Tu Sede"}
              disabled
              style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
            />
          </div>

          {/* Selector de posición filtrado por sede */}
          {posiciones.length > 0 &&
            renderSelect(
              "Posición",
              "posicion",
              device,
              handleInputChange,
              posiciones.map((posicion) => [
                posicion.id,
                posicion.nombre || posicion.name || `Posición ${posicion.id}`,
              ]),
              true,
            )}

          <div className="input-group">
            <label>Observaciones</label>
            <textarea
              value={device.observaciones || ""}
              onChange={(e) => handleInputChange("observaciones", e.target.value)}
              placeholder="Observaciones adicionales"
              rows="3"
            />
          </div>
        </div>
      </div>

      <button className="create-button" onClick={onSubmit}>
        {device.id ? "Guardar cambios" : "Agregar Dispositivo"}
      </button>
    </div>
  )
}

const renderInput = (label, field, device, onChange) => (
  <div className="input-group">
    <label>{label}</label>
    <input
      type="text"
      value={device[field] || ""}
      onChange={(e) => onChange(field, e.target.value)}
      placeholder={label}
      required={label.includes("*")}
    />
  </div>
)

const renderSelect = (label, field, device, onChange, options, includeEmpty = false) => (
  <div className="input-group">
    <label>{label}</label>
    <select
      value={device[field] || ""}
      onChange={(e) => onChange(field, e.target.value || null)}
      required={label.includes("*")}
    >
      {includeEmpty && <option value="">Seleccione una opción</option>}
      {options.map((opt) => (
        <option key={opt[0]} value={opt[0]}>
          {opt[1]}
        </option>
      ))}
    </select>
  </div>
)

export default Dispositivos
