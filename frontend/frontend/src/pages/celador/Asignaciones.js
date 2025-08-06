/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  FaLaptop,
  FaUser,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaHome,
  FaBuilding,
  FaUndo,
  FaPlus,
  FaEdit,
  FaTimes,
  FaCheck,
  FaExclamationTriangle,
} from "react-icons/fa"
import "./asignacion-dispositivos.css"
import Select from "react-select"

const AsignacionDispositivos = () => {
  const [asignaciones, setAsignaciones] = useState([])
  const [dispositivosDisponibles, setDispositivosDisponibles] = useState([])
  const [usuariosExternos, setUsuariosExternos] = useState([])
  const [formData, setFormData] = useState({
    usuario: "",
    dispositivo: "",
    ubicacion_asignada: "CASA",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [showModal, setShowModal] = useState(false)
  const [editingAsignacion, setEditingAsignacion] = useState(null)

  // Estados para confirmación
  const [confirmAlert, setConfirmAlert] = useState({
    show: false,
    message: "",
    onConfirm: null,
    onCancel: null,
  })

  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [filteredAsignaciones, setFilteredAsignaciones] = useState([])
  const [totalPages, setTotalPages] = useState(1)

  // Componente de notificación
  const Notification = ({ message, type, onDismiss }) => {
    useEffect(() => {
      const timer = setTimeout(() => {
        onDismiss()
      }, 3000) // Duración de 3 segundos

      return () => clearTimeout(timer)
    }, [onDismiss])

    if (!message) return null

    const style = {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: 9999,
      padding: "12px 20px",
      borderRadius: "4px",
      fontSize: "0.9rem",
      backgroundColor: "#f8f9fa",
      color: "#212529",
      boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
      borderLeft: `4px solid ${type === "error" ? "#dc3545" : "#28a745"}`,
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }

    return (
      <div style={style}>
        {type === "error" ? (
          <FaExclamationTriangle style={{ color: "#dc3545" }} />
        ) : (
          <FaCheck style={{ color: "#28a745" }} />
        )}
        <span>{message}</span>
        <button
          onClick={onDismiss}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "#6c757d",
            marginLeft: "10px",
          }}
        >
          <FaTimes />
        </button>
      </div>
    )
  }

  // Componente de confirmación
  const ConfirmAlert = ({ message, onConfirm, onCancel }) => {
    return (
      <div className="alert-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal">
            <p className="confirm-message">{message}</p>
            <div className="confirm-buttons">
              <button className="confirm-button cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button className="confirm-button accept" onClick={onConfirm}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda
  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm, asignaciones])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError("")
      const token = sessionStorage.getItem("token")

      if (!token) {
        throw new Error("No hay token de autenticación")
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }

      // Cargar todos los datos necesarios en paralelo
      const [asignacionesRes, dispositivosRes, usuariosRes] = await Promise.all([
        axios.get("http://localhost:8000/api/asignaciones-dispositivos/", config),
        axios.get("http://localhost:8000/api/dispositivos/?estado_uso=DISPONIBLE&estado=BUENO", config),
        axios.get("http://localhost:8000/api/usuarios-externos/", config),
      ])

      // Verificar y establecer los estados
      setAsignaciones(asignacionesRes.data?.data || asignacionesRes.data || [])
      setDispositivosDisponibles(dispositivosRes.data?.data || dispositivosRes.data || [])
      setUsuariosExternos(usuariosRes.data?.data || usuariosRes.data || [])
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message
      setError(`Error al cargar datos: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const confirmAsignar = async (e) => {
    e.preventDefault()
    setConfirmAlert({
      show: true,
      message: editingAsignacion
        ? "¿Estás seguro de que deseas actualizar esta asignación?"
        : "¿Estás seguro de que deseas crear esta asignación?",
      onConfirm: () => {
        handleAsignar(e)
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }

  const handleAsignar = async (e) => {
    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")

      const token = sessionStorage.getItem("token")
      if (!token) {
        throw new Error("No hay token de autenticación")
      }

      if (editingAsignacion) {
        const response = await axios.put(
          `http://localhost:8000/api/asignaciones-dispositivos/${editingAsignacion.id}/actualizar/`,
          { ubicacion_asignada: formData.ubicacion_asignada },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        )

        if (response.data.success) {
          setSuccessMessage("La ubicación se actualizó correctamente")
          await cargarDatos()
          setEditingAsignacion(null)
          setShowModal(false)
        } else {
          throw new Error(response.data.error || "Error al actualizar ubicación")
        }
      } else {
        if (!formData.usuario || !formData.dispositivo) {
          throw new Error("Debe seleccionar usuario y dispositivo")
        }

        const requestData = {
          usuario: formData.usuario,
          dispositivo: formData.dispositivo,
          ubicacion_asignada: formData.ubicacion_asignada || "CASA",
        }

        const response = await axios.post("http://localhost:8000/api/asignaciones-dispositivos/crear/", requestData, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })

        if (response.status === 201) {
          setSuccessMessage("El dispositivo se asignó correctamente")
          await cargarDatos()
          setFormData({
            usuario: "",
            dispositivo: "",
            ubicacion_asignada: "CASA",
          })
          setShowModal(false)
        }
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.message || err.message || "Error al procesar la solicitud"
      setError(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const confirmDevolver = (asignacionId) => {
    const asignacion = asignaciones.find((a) => a.id === asignacionId)
    setConfirmAlert({
      show: true,
      message: `¿Estás seguro de que deseas marcar como devuelto el dispositivo ${asignacion?.dispositivo_info?.serial || ""}?`,
      onConfirm: () => {
        handleDevolver(asignacionId)
        setConfirmAlert({ ...confirmAlert, show: false })
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }

  const handleDevolver = async (asignacionId) => {
    try {
      setLoading(true)
      setError("")
      setSuccessMessage("")
      const token = sessionStorage.getItem("token")

      if (!token) {
        throw new Error("No hay token de autenticación")
      }

      const response = await axios.put(
        `http://localhost:8000/api/asignaciones-dispositivos/${asignacionId}/devolver/`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      )

      if (response.status >= 200 && response.status < 300) {
        setSuccessMessage("Dispositivo marcado como devuelto correctamente")
        await cargarDatos()
      } else {
        throw new Error(response.data?.message || "Error al procesar devolución")
      }
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || err.message
      setError(`Error al devolver dispositivo: ${errorMsg}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEditarDispositivo = (asignacion) => {
    setEditingAsignacion(asignacion)
    setFormData({
      usuario: asignacion.usuario,
      dispositivo: asignacion.dispositivo,
      ubicacion_asignada: asignacion.ubicacion_asignada,
    })
    setShowModal(true)
  }

  const applyFilters = () => {
    let filtered = [...asignaciones]

    if (searchTerm) {
      filtered = filtered.filter(
        (asignacion) =>
          (asignacion.usuario_info?.nombre &&
            asignacion.usuario_info.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (asignacion.usuario_info?.documento &&
            asignacion.usuario_info.documento.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (asignacion.dispositivo_info?.serial &&
            asignacion.dispositivo_info.serial.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (asignacion.dispositivo_info?.tipo &&
            asignacion.dispositivo_info.tipo.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    filtered = filtered.filter((a) => a.estado === "VIGENTE")
    setFilteredAsignaciones(filtered)
    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredAsignaciones.slice(startIndex, endIndex)
  }

  const getItemRange = () => {
    if (filteredAsignaciones.length === 0) return "No hay resultados"
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredAsignaciones.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredAsignaciones.length} resultados`
  }

  const selectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "40px",
      borderRadius: "4px",
      borderColor: state.isFocused ? "#3b82f6" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 1px #3b82f6" : "none",
      "&:hover": {
        borderColor: state.isFocused ? "#3b82f6" : "#9ca3af",
      },
      ...(!formData.dispositivo && {
        borderColor: "#ef4444",
        boxShadow: state.isFocused ? "0 0 0 1px #ef4444" : "none",
      }),
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
      fontSize: "0.875rem",
    }),
    option: (base, state) => ({
      ...base,
      padding: "8px 12px",
      backgroundColor: state.isSelected ? "#3b82f6" : state.isFocused ? "#f3f4f6" : "white",
      color: state.isSelected ? "white" : "#374151",
      "&:active": {
        backgroundColor: "#3b82f6",
        color: "white",
      },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "#d1d5db",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: "#6b7280",
      "&:hover": {
        color: "#4b5563",
      },
    }),
    clearIndicator: (base) => ({
      ...base,
      color: "#6b7280",
      "&:hover": {
        color: "#ef4444",
      },
    }),
  }

  return (
    <div className="records-container">
      {/* Notificaciones */}
      {error && <Notification message={error} type="error" onDismiss={() => setError("")} />}
      {successMessage && (
        <Notification message={successMessage} type="success" onDismiss={() => setSuccessMessage("")} />
      )}

      {/* Modal de confirmación */}
      {confirmAlert.show && (
        <ConfirmAlert
          message={confirmAlert.message}
          onConfirm={confirmAlert.onConfirm}
          onCancel={confirmAlert.onCancel}
        />
      )}

      <div className="user-card">
        <div className="card-header">
          <h2>Asignación de Dispositivos a Usuarios Externos</h2>
          <button
            className="add-user-btn"
            onClick={() => {
              setEditingAsignacion(null)
              setShowModal(true)
            }}
            disabled={loading}
          >
            <FaPlus />
          </button>
        </div>

        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}

        {showModal && (
          <div className="modal-overlay">
            <div className="modal-container modern-modal">
              <div className="modal-content">
                <h1 className="modal-title">{editingAsignacion ? "Editar Asignacion" : "Nueva Asignación"}</h1>
                <button
                  className="close-button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingAsignacion(null)
                    setFormData({
                      usuario: "",
                      dispositivo: "",
                      ubicacion_asignada: "CASA",
                    })
                  }}
                >
                  &times;
                </button>

                <form onSubmit={confirmAsignar}>
                  <div className="input-group">
                    <label>Usuario Externo</label>
                    {editingAsignacion ? (
                      <input
                        type="text"
                        value={
                          asignaciones.find((a) => a.id === editingAsignacion.id)?.usuario_info?.nombre ||
                          "Usuario no disponible"
                        }
                        readOnly
                        className="readonly-input"
                      />
                    ) : (
                      <Select
                        styles={selectStyles}
                        value={usuariosExternos.find((user) => user.id === formData.usuario)}
                        onChange={(selectedOption) =>
                          setFormData({
                            ...formData,
                            usuario: selectedOption ? selectedOption.id : "",
                          })
                        }
                        options={usuariosExternos}
                        getOptionLabel={(user) =>
                          `${user.nombre_completo || user.nombre}${
                            user.tipo_documento_display ? ` (${user.tipo_documento_display}` : ""
                          }${user.documento ? ` ${user.documento})` : user.tipo_documento_display ? ")" : ""}`
                        }
                        getOptionValue={(user) => user.id}
                        isDisabled={loading || usuariosExternos.length === 0}
                        placeholder="Buscar usuario..."
                        noOptionsMessage={() => "No hay usuarios disponibles"}
                        className={!formData.usuario ? "input-error" : ""}
                        classNamePrefix="custom-select"
                        isClearable
                        isSearchable
                      />
                    )}
                  </div>

                  <div className="input-group">
                    <label>Dispositivo</label>
                    {editingAsignacion ? (
                      <input
                        type="text"
                        value={
                          `${
                            asignaciones.find((a) => a.id === editingAsignacion.id)?.dispositivo_info?.serial || ""
                          } - ${
                            asignaciones.find((a) => a.id === editingAsignacion.id)?.dispositivo_info?.tipo || ""
                          }` || "Dispositivo no disponible"
                        }
                        readOnly
                        className="readonly-input"
                      />
                    ) : (
                      <Select
                        styles={selectStyles}
                        value={dispositivosDisponibles.find((disp) => disp.id === formData.dispositivo)}
                        onChange={(selectedOption) =>
                          setFormData({
                            ...formData,
                            dispositivo: selectedOption ? selectedOption.id : "",
                          })
                        }
                        options={dispositivosDisponibles}
                        getOptionLabel={(disp) =>
                          `${disp.serial} - ${disp.tipo || "Dispositivo"}${disp.modelo ? ` (${disp.modelo})` : ""}`
                        }
                        getOptionValue={(disp) => disp.id}
                        isDisabled={loading || dispositivosDisponibles.length === 0}
                        placeholder="Seleccionar dispositivo..."
                        noOptionsMessage={() => "No hay dispositivos disponibles"}
                        className={!formData.dispositivo ? "input-error" : ""}
                        isClearable
                        isSearchable
                      />
                    )}
                  </div>

<div className="input-group">
                    <label>Ubicación</label>
                    <select
                      value={formData.ubicacion_asignada}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          ubicacion_asignada: e.target.value,
                        })
                      }
                      required
                      disabled={loading}
                    >
                      <option value="CASA">Teletrabajo</option>
                      <option value="CLIENTE">Cliente</option>
                      <option value="SEDE">Sede</option>
                      <option value="OFICINA">Oficina</option>
                      <option value="HIBRIDO">Hibrido</option>
                    </select>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="submit"
                      className="create-button"
                      disabled={
                        loading ||
                        (usuariosExternos.length === 0 && !editingAsignacion) ||
                        (dispositivosDisponibles.length === 0 && !editingAsignacion)
                      }
                    >
                      {loading
                        ? editingAsignacion
                          ? "Actualizando..."
                          : "Asignando..."
                        : editingAsignacion
                          ? "Actualizar Ubicación"
                          : "Asignar Dispositivo"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar asignaciones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={loading}
            />
          </div>
        </div>

        <div className="user-list">
          <h3 className="section-title">Asignaciones Vigentes</h3>

          {getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((asignacion) => (
              <div key={asignacion.id} className="user-item">
                <div className="user-avatar">
                  <FaLaptop />
                </div>
                <div className="user-info">
                  <div className="user-name">
                    {asignacion.dispositivo_info?.serial || "N/A"} -{" "}
                    {asignacion.dispositivo_info?.tipo || "Dispositivo"}
                  </div>
                  <div className="user-details">
                    <div className="user-detail">
                      <FaUser className="detail-icon" />
                      <span>{asignacion.usuario_info?.nombre || "N/A"}</span>
                    </div>
                    <div className="user-detail">
                      {asignacion.ubicacion_asignada === "CASA" ? (
                        <FaHome className="detail-icon" />
                      ) : (
                        <FaBuilding className="detail-icon" />
                      )}
                      <span>{asignacion.ubicacion_asignada || "N/A"}</span>
                    </div>
                  </div>
                  <div className="user-access">
                    Asignado:{" "}
                    {asignacion.fecha_asignacion ? new Date(asignacion.fecha_asignacion).toLocaleString() : "N/A"}
                  </div>
                </div>
                <div className="user-actions">
                  <button
                    className="action-button-modern edit"
                    onClick={() => handleEditarDispositivo(asignacion)}
                    disabled={loading}
                    title="Editar Dispositivo"
                  >
                    <FaEdit />
                  </button>
                  <button
                    className="action-button-modern delete"
                    onClick={() => confirmDevolver(asignacion.id)}
                    disabled={loading}
                    title="Marcar como Devuelto"
                  >
                    <FaUndo />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="empty-message">{loading ? "Cargando..." : "No hay asignaciones vigentes."}</p>
          )}
        </div>

        {filteredAsignaciones.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || loading}
                className="pagination-arrow"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0 || loading}
                className="pagination-arrow"
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AsignacionDispositivos
