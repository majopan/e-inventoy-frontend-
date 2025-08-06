/* eslint-disable react-hooks/exhaustive-deps */

"use client"

import { useState, useEffect, useCallback } from "react"

import axios from "axios"

import { FaServicestack, FaEdit, FaPlus, FaTrash, FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa"

import "../../styles/ServiciosExistentes.css"

import { useAuth } from "../auth"

const API_BASE_URL = "http://localhost:8000/api"

const ServiciosCoordinador = () => {
  const { sedeId, sedeNombre } = useAuth()

  const [services, setServices] = useState([])

  const [filteredServices, setFilteredServices] = useState([])

  const [showForm, setShowForm] = useState(false)

  const [showDetailModal, setShowDetailModal] = useState(false)

  const [newService, setNewService] = useState({
    nombre: "",

    codigo_analitico: "",

    color:
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0"),

    sedes: [sedeId],
  })

  const [selectedService, setSelectedService] = useState(null)

  const [isLoading, setIsLoading] = useState(false)

  const [servicePositions, setServicePositions] = useState({})

  const [alert, setAlert] = useState({
    show: false,

    message: "",

    type: "error",
  })

  const [confirmAlert, setConfirmAlert] = useState({
    show: false,

    message: "",

    positionsCount: 0,

    onConfirm: null,

    onCancel: null,
  })

  // Estados para búsqueda y paginación

  const [searchTerm, setSearchTerm] = useState("")

  const [currentPage, setCurrentPage] = useState(1)

  const [itemsPerPage] = useState(6)

  const [totalPages, setTotalPages] = useState(1)

  // Función para cerrar alert de manera estable
  const closeAlert = useCallback(() => {
    setAlert((prev) => ({ ...prev, show: false }))
  }, [])

  // Función para obtener y contar posiciones por servicio

  const fetchServicePositions = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/posiciones/`)

      const positionsData = Array.isArray(response.data)
        ? response.data
        : response.data.results
          ? response.data.results
          : response.data.posiciones
            ? response.data.posiciones
            : []

      const counts = {}

      positionsData.forEach((position) => {
        if (position.servicio) {
          const serviceId = position.servicio.id || position.servicio

          counts[serviceId] = (counts[serviceId] || 0) + 1
        }
      })

      setServicePositions(counts)
    } catch (error) {
      console.error("Error al obtener posiciones:", error)
    }
  }, [])

  // Fetch the list of services for the coordinator's sede

  const fetchServices = useCallback(async () => {
    setIsLoading(true)

    try {
      const response = await axios.get(`${API_BASE_URL}/servicios/`)

      let servicesData = Array.isArray(response.data) ? response.data : []

      // FIX: Mejorar el filtrado de servicios por sede
      if (sedeId) {
        servicesData = servicesData.filter((service) => {
          if (!service.sedes) return false

          // Manejar tanto arrays de objetos como arrays de IDs
          return service.sedes.some((sede) => {
            // Si sede es un objeto con id
            if (typeof sede === "object" && sede.id) {
              return sede.id === sedeId || sede.id === Number(sedeId)
            }
            // Si sede es directamente un ID
            return sede === sedeId || sede === Number(sedeId)
          })
        })
      }

      setServices(servicesData)

      applyFilters(servicesData)
    } catch (error) {
      console.error("Error al obtener servicios:", error)

      setAlert({
        show: true,

        message: "Error al cargar servicios",

        type: "error",
      })

      setServices([])

      setFilteredServices([])
    } finally {
      setIsLoading(false)
    }
  }, [sedeId])

  // Aplicar filtros a los servicios

  const applyFilters = (servicesData = services) => {
    let filtered = [...servicesData]

    if (searchTerm) {
      filtered = filtered.filter(
        (service) =>
          (service.nombre && service.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (service.codigo_analitico && service.codigo_analitico.toLowerCase().includes(searchTerm.toLowerCase())),
      )
    }

    setFilteredServices(filtered)

    setTotalPages(Math.ceil(filtered.length / itemsPerPage))
  }

  // Fetch service details

  const fetchServiceDetails = async (serviceId) => {
    setIsLoading(true)

    try {
      const response = await axios.get(`${API_BASE_URL}/servicios/${serviceId}/`)

      const serviceData = response.data

      setSelectedService({
        ...serviceData,

        color: serviceData.color || "#FFFFFF",
      })

      setShowDetailModal(true)
    } catch (error) {
      console.error("Error al obtener los detalles del servicio:", error)

      setAlert({
        show: true,

        message: "No se pudo cargar el servicio.",

        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Validate service data

  const validateService = (service) => {
    if (!service.nombre || !service.nombre.trim()) {
      setAlert({
        show: true,

        message: "El campo 'Nombre' es obligatorio.",

        type: "error",
      })

      return false
    }

    return true
  }

  // Add new service

  const confirmAddService = (serviceData) => {
    if (!validateService(serviceData)) return

    setConfirmAlert({
      show: true,

      message: "¿Estás seguro de que deseas crear este servicio?",

      positionsCount: null,

      onConfirm: () => {
        addService(serviceData)

        setConfirmAlert((prev) => ({ ...prev, show: false }))
      },

      onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
    })
  }

  const addService = async (serviceData) => {
    setIsLoading(true)

    try {
      const payload = {
        nombre: serviceData.nombre,

        codigo_analitico: serviceData.codigo_analitico,

        sedes: [sedeId],

        color: serviceData.color || "#FFFFFF",
      }

      await axios.post(`${API_BASE_URL}/servicios/`, payload)

      fetchServices()

      setShowForm(false)

      setNewService({
        nombre: "",

        codigo_analitico: "",

        color:
          "#" +
          Math.floor(Math.random() * 16777215)
            .toString(16)
            .padStart(6, "0"),

        sedes: [sedeId],
      })

      setAlert({
        show: true,

        message: "Servicio creado exitosamente.",

        type: "success",
      })
    } catch (error) {
      console.error("Error al crear el servicio:", error)

      let errorMessage = "Hubo un error al crear el servicio."

      if (
        error.response &&
        error.response.data &&
        error.response.data.codigo_analitico &&
        error.response.data.codigo_analitico.includes("ya existe")
      ) {
        errorMessage = "El código analítico ya existe en otro servicio. Por favor ingrese uno diferente."
      }

      setAlert({
        show: true,

        message: errorMessage,

        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Edit service

  const confirmUpdateService = (serviceData) => {
    if (!validateService(serviceData)) return

    setConfirmAlert({
      show: true,

      message: "¿Deseas guardar los cambios realizados?",

      positionsCount: null,

      onConfirm: () => {
        updateService(serviceData)

        setConfirmAlert((prev) => ({ ...prev, show: false }))
      },

      onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
    })
  }

  const updateService = async (serviceData) => {
    setIsLoading(true)

    try {
      const payload = {
        nombre: serviceData.nombre,

        codigo_analitico: serviceData.codigo_analitico,

        sedes: [sedeId],

        color: serviceData.color || "#FFFFFF",
      }

      await axios.put(`${API_BASE_URL}/servicios/${serviceData.id}/`, payload)

      fetchServices()

      setShowDetailModal(false)

      setAlert({
        show: true,

        message: "Servicio actualizado exitosamente.",

        type: "success",
      })
    } catch (error) {
      console.error("Error al actualizar el servicio:", error)

      let errorMessage = "Hubo un error al actualizar el servicio."

      if (
        error.response &&
        error.response.data &&
        error.response.data.codigo_analitico &&
        error.response.data.codigo_analitico.includes("ya existe")
      ) {
        errorMessage = "El código analítico ya existe en otro servicio. Por favor ingrese uno diferente."
      }

      setAlert({
        show: true,

        message: errorMessage,

        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Delete service

  const deleteService = async (serviceId) => {
    setIsLoading(true)

    try {
      await axios.delete(`${API_BASE_URL}/servicios/${serviceId}/`)

      fetchServices()

      fetchServicePositions()

      setAlert({
        show: true,

        message: "Servicio eliminado exitosamente.",

        type: "success",
      })
    } catch (error) {
      console.error("Error al eliminar el servicio:", error)

      setAlert({
        show: true,

        message: "Hubo un error al eliminar el servicio.",

        type: "error",
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Confirm delete with positions count

  const confirmDelete = async (serviceId) => {
    setIsLoading(true)

    try {
      const count = servicePositions[serviceId] || 0

      setConfirmAlert({
        show: true,

        message: "¿Estás seguro de que deseas eliminar este servicio?",

        positionsCount: count,

        onConfirm: () => {
          deleteService(serviceId)

          setConfirmAlert((prev) => ({ ...prev, show: false }))
        },

        onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
      })
    } catch (error) {
      console.error("Error al confirmar eliminación:", error)

      setConfirmAlert({
        show: true,

        message: "¿Estás seguro de que deseas eliminar este servicio?",

        positionsCount: null,

        onConfirm: () => {
          deleteService(serviceId)

          setConfirmAlert((prev) => ({ ...prev, show: false }))
        },

        onCancel: () => setConfirmAlert((prev) => ({ ...prev, show: false })),
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Obtener los servicios para la página actual

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage

    const endIndex = startIndex + itemsPerPage

    return filteredServices.slice(startIndex, endIndex)
  }

  // Calcular el rango de elementos mostrados

  const getItemRange = () => {
    if (filteredServices.length === 0) return "No hay resultados"

    const startItem = (currentPage - 1) * itemsPerPage + 1

    const endItem = Math.min(startItem + itemsPerPage - 1, filteredServices.length)

    return `Mostrando ${startItem} a ${endItem} de ${filteredServices.length} resultados`
  }

  // Load services when component mounts

  useEffect(() => {
    const loadInitialData = async () => {
      await fetchServices()

      await fetchServicePositions()
    }

    loadInitialData()
  }, [fetchServices])

  // Efecto para aplicar filtros cuando cambia el término de búsqueda

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
    if (e.target === e.currentTarget && (showForm || showDetailModal)) {
      setShowDetailModal(false)

      setShowForm(false)
    }
  }

  const ConfirmAlert = ({ message, positionsCount, onConfirm, onCancel }) => {
    return (
      <div className="alert-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal">
            <p
              style={{
                whiteSpace: "pre-line",

                textAlign: "center",

                marginBottom: "15px",

                lineHeight: "1.5",

                fontSize: "16px",
              }}
            >
              {message}
            </p>

            {positionsCount !== null && (
              <div className="positions-info">
                {positionsCount > 0 ? (
                  <div className="positions-warning">
                    <p style={{ color: "#ff6b6b", fontWeight: "bold" }}>
                      ⚠️ Este servicio tiene {positionsCount} posición(es) asociada(s)
                    </p>
                  </div>
                ) : (
                  <p style={{ color: "#666", fontStyle: "italic" }}>Este servicio no tiene posiciones asociadas</p>
                )}
              </div>
            )}

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

  const ServiceList = ({ services, onViewDetails, onDelete, isLoading }) => (
    <div className="user-list">
      {services.length > 0 ? (
        services.map((service) => (
          <div key={service.id} className="user-item">
            <div className="user-avatar">
              <FaServicestack />
            </div>

            <div
              className="user-info"
              onClick={() => !isLoading && onViewDetails(service.id)}
              style={{ cursor: isLoading ? "not-allowed" : "pointer" }}
            >
              <div className="user-name">{service.nombre}</div>

              <div className="color-box" style={{ backgroundColor: service.color || "#ccc" }}></div>

              <div className="user-access">Código: {service.codigo_analitico || "No asignado"}</div>
            </div>

            <div className="user-actions">
              <button
                className="action-button-modern edit"
                onClick={() => !isLoading && onViewDetails(service.id)}
                disabled={isLoading}
              >
                <FaEdit />
              </button>

              <button
                className="action-button-modern delete"
                onClick={() => !isLoading && onDelete(service.id)}
                disabled={isLoading}
              >
                <FaTrash />
              </button>
            </div>
          </div>
        ))
      ) : (
        <p>{isLoading ? "Cargando..." : "No hay servicios disponibles en tu sede."}</p>
      )}
    </div>
  )

  // FIX: Corregir el ServiceForm para permitir escritura normal
  const ServiceForm = ({ service, onSubmit, isEdit = false }) => {
    // Estado local para el formulario
    const [formData, setFormData] = useState(service)

    // Actualizar el estado local cuando cambie el service prop
    useEffect(() => {
      setFormData(service)
    }, [service])

    const handleChange = (e) => {
      const { name, value } = e.target
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }))
    }

    const handleSubmit = (e) => {
      e.preventDefault()
      onSubmit(formData, true)
    }

    return (
      <form className="service-form" onSubmit={handleSubmit}>
        <div className="form-columns">
          <div className="form-column">
            <div className="input-group">
              <label htmlFor="nombre">Nombre *</label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                value={formData.nombre || ""}
                onChange={handleChange}
                placeholder="Nombre del servicio"
                className={!formData.nombre?.trim() ? "input-error" : ""}
              />
            </div>
            <div className="input-group">
              <label htmlFor="codigo_analitico">Código analítico</label>
              <input
                id="codigo_analitico"
                name="codigo_analitico"
                type="text"
                value={formData.codigo_analitico || ""}
                onChange={handleChange}
                placeholder="Código analítico"
              />
            </div>
          </div>

          <div className="form-column">
            <div className="input-group">
              <label htmlFor="color">Color</label>
              <div className="color-picker-container">
                <input
                  id="color"
                  name="color"
                  type="color"
                  value={formData.color || "#000000"}
                  onChange={handleChange}
                />
                <div className="color-preview" style={{ backgroundColor: formData.color || "#FFFFFF" }}></div>
              </div>
            </div>

            <div className="input-group">
              <label>Sede</label>
              <input
                type="text"
                value={sedeNombre || "Tu sede"}
                disabled
                style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
              />
            </div>
          </div>
        </div>
        <button type="submit" className="create-button" disabled={!formData.nombre?.trim()}>
          {isEdit ? "Guardar cambios" : "Crear servicio"}
        </button>
      </form>
    )
  }

  return (
    <div className="records-container">
      <div className="user-card">
        <div className="card-header">
          <h2>Servicios de {sedeNombre || "tu sede"}</h2>

          <button
            className="add-user-btn"
            onClick={() => {
              setNewService({
                nombre: "",

                codigo_analitico: "",

                color:
                  "#" +
                  Math.floor(Math.random() * 16777215)
                    .toString(16)
                    .padStart(6, "0"),

                sedes: [sedeId],
              })

              setShowForm(true)
            }}
          >
            <FaPlus />
          </button>
        </div>

        {alert.show && <AlertModal message={alert.message} type={alert.type} onClose={closeAlert} />}

        {confirmAlert.show && (
          <ConfirmAlert
            message={confirmAlert.message}
            positionsCount={confirmAlert.positionsCount}
            onConfirm={confirmAlert.onConfirm}
            onCancel={confirmAlert.onCancel}
          />
        )}

        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
          </div>
        )}

        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />

            <input
              type="text"
              placeholder="Buscar servicios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={isLoading}
            />
          </div>
        </div>

        <ServiceList
          services={getCurrentPageItems()}
          onViewDetails={fetchServiceDetails}
          onDelete={confirmDelete}
          isLoading={isLoading}
        />

        {filteredServices.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>

            <div className="pagination-controls">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="pagination-arrow"
                aria-label="Página anterior"
              >
                <FaChevronLeft />
              </button>

              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                className="pagination-arrow"
                aria-label="Página siguiente"
              >
                <FaChevronRight />
              </button>
            </div>

            <div className="pagination-progress-bar">
              <div className="pagination-progress" style={{ width: `${(currentPage / totalPages) * 100}%` }}></div>
            </div>
          </div>
        )}

        {showForm && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowForm(false)} disabled={isLoading}>
                &times;
              </button>

              <div className="modal-content">
                <h1 className="modal-title">Nuevo Servicio</h1>

                <ServiceForm
                  service={newService}
                  onSubmit={(updatedService, shouldSubmit) => {
                    if (shouldSubmit) {
                      confirmAddService(updatedService)
                    } else {
                      setNewService(updatedService)
                    }
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {showDetailModal && selectedService && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button className="close-button" onClick={() => setShowDetailModal(false)} disabled={isLoading}>
                &times;
              </button>

              <div className="modal-content">
                <h1 className="modal-title">Editar Servicio</h1>

                <ServiceForm
                  service={selectedService}
                  onSubmit={(updatedService, shouldSubmit) => {
                    if (shouldSubmit) {
                      confirmUpdateService(updatedService)
                    } else {
                      setSelectedService(updatedService)
                    }
                  }}
                  isEdit={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ServiciosCoordinador
