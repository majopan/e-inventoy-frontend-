/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect, useCallback } from "react"
import axios from "axios"
import { FaUser, FaEdit, FaPlus, FaSearch, FaChevronLeft, FaChevronRight, FaTimes } from "react-icons/fa"
import "../styles/UsuariosExistentes.css"

const UsuariosExistentes = () => {
  const [users, setUsers] = useState([])
  const [filteredUsers, setFilteredUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [sedes, setSedes] = useState([])
  const [selectedSedes, setSelectedSedes] = useState([])
  const [newUser, setNewUser] = useState({
    username: "",
    nombre: "",
    email: "",
    documento: "",
    celular: "",
    rol: "coordinador",
    password: "",
    confirm_password: "",
  })
  const [alert, setAlert] = useState({
    show: false,
    message: "",
    type: "error",
  })
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  const [totalPages, setTotalPages] = useState(1)
  const [passwordError, setPasswordError] = useState("")
  const [documentoError, setDocumentoError] = useState("")
  const [celularError, setCelularError] = useState("")
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [confirmAction, setConfirmAction] = useState({ callback: null, message: "" })
  const [selectedRole, setSelectedRole] = useState("all")
  const [isLoading, setIsLoading] = useState(false)

  const fetchSedes = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await axios.get("http://localhost:8000/api/sedes/")
      
      let sedesData = []
      
      if (Array.isArray(response.data)) {
        sedesData = response.data
      } else if (response.data.sedes) {
        sedesData = response.data.sedes
      } else if (response.data.results) {
        sedesData = response.data.results
      }
      
      setSedes(sedesData)
    } catch (error) {
      console.error("Error fetching sedes:", error)
      showAlert("Error al cargar las sedes disponibles. Por favor, intente más tarde.")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await axios.get("http://localhost:8000/api/usuarios/")
      const usersData = Array.isArray(response.data) ? response.data : []
      
      const usersWithSedes = usersData.map(user => ({
        ...user,
        sedes: user.sedes || []
      }))
      
      setUsers(usersWithSedes)
      return usersWithSedes // Retornamos los usuarios para poder usarlos en applyFilters
    } catch (error) {
      console.error("Error fetching users:", error)
      showAlert("Error al cargar los usuarios. Por favor, intente más tarde.")
      setUsers([])
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const applyFilters = useCallback(async (usersData = null) => {
    try {
      setIsLoading(true)
      // Si no se proporciona usersData, obtener los usuarios actuales
      const dataToFilter = usersData || users
      
      let filtered = [...dataToFilter]

      // Filtro por rol
      if (selectedRole !== "all") {
        filtered = filtered.filter(user => user.rol === selectedRole)
      }

      // Filtro por búsqueda
      if (searchTerm) {
        filtered = filtered.filter(
          (user) =>
            (user.nombre && user.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.documento && user.documento.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.celular && user.celular.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (user.rol && user.rol.toLowerCase().includes(searchTerm.toLowerCase()))
        )
      }

      setFilteredUsers(filtered)
      const newTotalPages = Math.ceil(filtered.length / itemsPerPage)
      setTotalPages(newTotalPages)
      
      // Si la página actual ya no existe (porque filtramos muchos elementos), volvemos a la primera
      if (currentPage > newTotalPages) {
        setCurrentPage(1)
      }
    } catch (error) {
      console.error("Error applying filters:", error)
      showAlert("Error al aplicar los filtros. Por favor, intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }, [users, selectedRole, searchTerm, currentPage, itemsPerPage])

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return filteredUsers.slice(startIndex, endIndex)
  }

  const getItemRange = () => {
    const startItem = (currentPage - 1) * itemsPerPage + 1
    const endItem = Math.min(startItem + itemsPerPage - 1, filteredUsers.length)
    return `Mostrando ${startItem} a ${endItem} de ${filteredUsers.length} resultados`
  }

  const fetchUserDetails = async (userId) => {
    try {
      setIsLoading(true)
      const response = await axios.get(`http://localhost:8000/api/dusuarios/${userId}/`)
      const userData = response.data
      
      const userSedes = Array.isArray(userData.sedes) 
        ? userData.sedes.map(sede => sede.id || sede) 
        : []
      
      setSelectedUser(userData)
      setSelectedSedes(userSedes)
      setShowDetailModal(true)
    } catch (error) {
      console.error("Error fetching user details:", error)
      showAlert("Error al cargar los detalles del usuario. Por favor, intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const editUser = async (userId, updatedUserData) => {
    if (!updatedUserData.nombre || !updatedUserData.email || !updatedUserData.username) {
      showAlert("Por favor, complete todos los campos obligatorios")
      return false
    }

    try {
      setIsLoading(true)
      await axios.put(`http://localhost:8000/api/editusuarios/${userId}/`, {
        ...updatedUserData,
        sedes: selectedSedes
      })
      
      showAlert("Usuario editado exitosamente", "success")
      const updatedUsers = await fetchUsers()
      await applyFilters(updatedUsers)
      setShowDetailModal(false)
      return true
    } catch (error) {
      console.error("Error editing user:", error)
      const errorMsg = error.response?.data?.error || 
                      error.response?.data?.message || 
                      "Error al editar el usuario. Por favor, intente nuevamente."
      showAlert(errorMsg)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const toggleUserStatus = async (userId, isActive) => {
    try {
      setIsLoading(true)
      const endpoint = isActive
        ? `http://localhost:8000/api/deusuarios/${userId}/`
        : `http://localhost:8000/api/activarusuarios/${userId}/`

      await axios.put(endpoint)
      showAlert(`Usuario ${isActive ? "desactivado" : "activado"} exitosamente`, "success")
      const updatedUsers = await fetchUsers()
      await applyFilters(updatedUsers)
    } catch (error) {
      console.error("Error toggling user status:", error)
      showAlert("Error al cambiar el estado del usuario. Por favor, intente nuevamente.")
    } finally {
      setIsLoading(false)
    }
  }

  const confirmActionHandler = async () => {
    try {
      setShowConfirmModal(false)
      if (confirmAction.callback) {
        await confirmAction.callback()
      }
    } catch (error) {
      console.error("Error in confirm action:", error)
      showAlert("Ocurrió un error al realizar la acción. Por favor, intente nuevamente.")
    }
  }

  const handleToggleUserStatus = (userId, isActive) => {
    setConfirmAction({
      callback: () => toggleUserStatus(userId, isActive),
      message: `¿Estás seguro que deseas ${isActive ? "desactivar" : "activar"} este usuario?`
    })
    setShowConfirmModal(true)
  }

  const handleEditUser = (userId, updatedUserData) => {
    setConfirmAction({
      callback: () => editUser(userId, updatedUserData),
      message: "¿Estás seguro que deseas guardar los cambios realizados?"
    })
    setShowConfirmModal(true)
  }

  const validatePassword = (password) => {
    if (password.length < 8) {
      setPasswordError("La contraseña debe tener al menos 8 caracteres")
      return false
    }
    setPasswordError("")
    return true
  }

  const validateDocumento = (documento) => {
    if (documento && (documento.length < 8 || documento.length > 12)) {
      setDocumentoError("El documento debe tener entre 8 y 12 caracteres")
      return false
    }
    setDocumentoError("")
    return true
  }

  const validateCelular = (celular) => {
    if (celular && (celular.length < 10 || celular.length > 12)) {
      setCelularError("El celular debe tener entre 10 y 12 caracteres")
      return false
    }
    setCelularError("")
    return true
  }

  const addUser = async () => {
    if (!newUser.nombre || !newUser.email || !newUser.password || !newUser.username) {
      showAlert("Por favor, complete todos los campos obligatorios")
      return
    }

    if (!validatePassword(newUser.password)) {
      return
    }

    if (newUser.password !== newUser.confirm_password) {
      showAlert("Las contraseñas no coinciden")
      return
    }

    if (!validateDocumento(newUser.documento)) {
      return
    }

    if (!validateCelular(newUser.celular)) {
      return
    }

    if (newUser.rol !== "admin" && selectedSedes.length === 0) {
      showAlert("Por favor, seleccione al menos una sede para el usuario")
      return
    }

    try {
      setIsLoading(true)
      await axios.post("http://localhost:8000/api/register/", {
        ...newUser,
        sedes: selectedSedes
      })
      
      showAlert("Usuario agregado exitosamente", "success")
      setShowForm(false)
      setNewUser({
        username: "",
        nombre: "",
        email: "",
        documento: "",
        celular: "",
        rol: "coordinador",
        password: "",
        confirm_password: "",
      })
      setSelectedSedes([])
      const updatedUsers = await fetchUsers()
      await applyFilters(updatedUsers)
    } catch (error) {
      console.error("Error adding user:", error)
      const errorMsg = error.response?.data?.error || 
                      error.response?.data?.message || 
                      "Error al agregar el usuario. Por favor, intente nuevamente."
      showAlert(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSedeSelection = (sedeId) => {
    setSelectedSedes(prev => 
      prev.includes(sedeId) 
        ? prev.filter(id => id !== sedeId) 
        : [...prev, sedeId]
    )
  }

  const selectAllSedes = () => {
    if (selectedSedes.length === sedes.length) {
      setSelectedSedes([])
    } else {
      setSelectedSedes(sedes.map(sede => sede.id))
    }
  }

  const removeAllSedes = () => {
    setSelectedSedes([])
  }

  const showAlert = (message, type = "error") => {
    setAlert({ show: true, message, type })
    setTimeout(() => setAlert({ show: false, message: "", type: "error" }), 3000)
  }

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      setShowDetailModal(false)
      setShowForm(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        await fetchSedes()
        const usersData = await fetchUsers()
        await applyFilters(usersData)
      } catch (error) {
        console.error("Initial data loading error:", error)
      }
    }
    
    loadData()
  }, [])

  useEffect(() => {
    applyFilters()
    setCurrentPage(1)
  }, [searchTerm, selectedRole])

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

  const ConfirmModal = ({ message, onConfirm, onCancel }) => {
    return (
      <div className="modal-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal">
            <p>{message}</p>
            <div className="confirm-buttons">
              <button className="confirm-button cancel" onClick={onCancel}>
                Cancelar
              </button>
              <button className="confirm-button accept" onClick={onConfirm}>
                Aceptar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="records-container">
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
      
      <div className="user-card">
        <div className="card-header">
          <h2>Usuarios existentes</h2>
          <button 
            className="add-user-btn" 
            onClick={() => setShowForm(true)}
            disabled={isLoading}
          >
            <FaPlus />
          </button>
        </div>

        <div className="search-container">
          <div className="search-input-container">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              disabled={isLoading}
            />
          </div>
          <div className="role-filter-container">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="role-filter-select"
              disabled={isLoading}
            >
              <option value="all">Todos los roles</option>
              <option value="admin">Administrador</option>
              <option value="coordinador">Coordinador</option>
              <option value="celador">Vigilante</option>
              <option value="seguridad">Seguridad</option>
            </select>
          </div>
        </div>

        <div className="user-list">
          {isLoading ? (
            <div className="loading-placeholder">Cargando usuarios...</div>
          ) : getCurrentPageItems().length > 0 ? (
            getCurrentPageItems().map((user) => (
              <div key={user.id} className="user-item">
                <div className="user-avatar">
                  <FaUser />
                </div>
                <div className="user-info" onClick={() => !isLoading && fetchUserDetails(user.id)}>
                  <div className="user-name">{user.nombre}</div>
                  <div className="user-access">
                    {user.rol === "admin" 
                      ? "Administrador" 
                      : user.rol === "celador" 
                      ? "Vigilante" 
                      : user.rol === "seguridad" 
                      ? "Seguridad" 
                      : "Coordinador"}
                  </div>
                  <div className="user-sedes">
                    {user.sedes && user.sedes.length > 0 ? (
                      `Sedes: ${user.sedes.map(sede => typeof sede === 'object' ? sede.nombre : sedes.find(s => s.id === sede)?.nombre).join(', ')}`
                    ) : (
                      "Sin sedes asignadas"
                    )}
                  </div>
                </div>
                <div className="user-actions">
                  <button 
                    className="action-button-modern edit" 
                    onClick={() => !isLoading && fetchUserDetails(user.id)}
                    disabled={isLoading}
                  >
                    <FaEdit />
                  </button>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={user.is_active}
                      onChange={() => !isLoading && handleToggleUserStatus(user.id, user.is_active)}
                      disabled={isLoading}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>
              </div>
            ))
          ) : (
            <p>No hay usuarios disponibles.</p>
          )}
        </div>

        {filteredUsers.length > 0 && (
          <div className="pagination-container">
            <div className="pagination-info">{getItemRange()}</div>
            <div className="pagination-controls">
              <button
                onClick={() => !isLoading && setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1 || isLoading}
                className="pagination-arrow"
              >
                <FaChevronLeft />
              </button>
              <button
                onClick={() => !isLoading && setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0 || isLoading}
                className="pagination-arrow"
              >
                <FaChevronRight />
              </button>
            </div>
          </div>
        )}

        {(showDetailModal || showForm) && (
          <div className="modal-overlay" onClick={handleOverlayClick}>
            <div className="modal-container modern-modal" onClick={(e) => e.stopPropagation()}>
              <button 
                className="close-button" 
                onClick={() => showForm ? setShowForm(false) : setShowDetailModal(false)}
                disabled={isLoading}
              >
                <FaTimes />
              </button>
              
              <form className="modal-content" onSubmit={(e) => {
                e.preventDefault()
                showForm ? addUser() : handleEditUser(selectedUser.id, selectedUser)
              }}>
                <h1 className="modal-title">{showForm ? "Agregar Usuario" : "Editar Usuario"}</h1>
                
                <div className="input-group">
                  <label>Nombre completo *</label>
                  <input
                    type="text"
                    value={showForm ? newUser.nombre : selectedUser?.nombre || ""}
                    onChange={(e) => showForm 
                      ? setNewUser({...newUser, nombre: e.target.value}) 
                      : setSelectedUser({...selectedUser, nombre: e.target.value})
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="input-group">
                  <label>Nombre de usuario *</label>
                  <input
                    type="text"
                    value={showForm ? newUser.username : selectedUser?.username || ""}
                    onChange={(e) => showForm 
                      ? setNewUser({...newUser, username: e.target.value}) 
                      : setSelectedUser({...selectedUser, username: e.target.value})
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="input-group">
                  <label>Correo electrónico *</label>
                  <input
                    type="email"
                    value={showForm ? newUser.email : selectedUser?.email || ""}
                    onChange={(e) => showForm 
                      ? setNewUser({...newUser, email: e.target.value}) 
                      : setSelectedUser({...selectedUser, email: e.target.value})
                    }
                    required
                    disabled={isLoading}
                  />
                </div>
                
                <div className="input-group">
                  <label>Documento</label>
                  <input
                    type="number"
                    value={showForm ? newUser.documento : selectedUser?.documento || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      showForm 
                        ? setNewUser({...newUser, documento: value}) 
                        : setSelectedUser({...selectedUser, documento: value})
                      validateDocumento(value)
                    }}
                    minLength="8"
                    maxLength="12"
                    disabled={isLoading}
                  />
                  {documentoError && <span className="error-message">{documentoError}</span>}
                </div>

                <div className="input-group">
                  <label>Celular</label>
                  <input
                    type="tel"
                    value={showForm ? newUser.celular : selectedUser?.celular || ""}
                    onChange={(e) => {
                      const value = e.target.value
                      showForm 
                        ? setNewUser({...newUser, celular: value}) 
                        : setSelectedUser({...selectedUser, celular: value})
                      validateCelular(value)
                    }}
                    minLength="10"
                    maxLength="12"
                    disabled={isLoading}
                  />
                  {celularError && <span className="error-message">{celularError}</span>}
                </div>
                
                {showForm && (
                  <>
                    <div className="input-group">
                      <label>Contraseña *</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => {
                          setNewUser({...newUser, password: e.target.value})
                          validatePassword(e.target.value)
                        }}
                        required
                        minLength="8"
                        disabled={isLoading}
                      />
                      {passwordError && <span className="error-message">{passwordError}</span>}
                    </div>
                    
                    <div className="input-group">
                      <label>Confirmar contraseña *</label>
                      <input
                        type="password"
                        value={newUser.confirm_password}
                        onChange={(e) => setNewUser({...newUser, confirm_password: e.target.value})}
                        required
                        minLength="8"
                        disabled={isLoading}
                      />
                    </div>
                  </>
                )}
                
                <div className="input-group select-wrapper">
                  <label>Rol *</label>
                  <select
                    value={showForm ? newUser.rol : selectedUser?.rol || ""}
                    onChange={(e) => showForm 
                      ? setNewUser({...newUser, rol: e.target.value}) 
                      : setSelectedUser({...selectedUser, rol: e.target.value})
                    }
                    disabled={isLoading}
                  >
                    <option value="coordinador">Coordinador</option>
                    <option value="admin">Administrador</option>
                    <option value="celador">Vigilante</option>
                    <option value="seguridad">Seguridad</option>
                  </select>
                </div>
                
                <div className="input-group">
                  <label>Sedes asignadas {(showForm ? newUser.rol : selectedUser?.rol) !== "admin" && "*"}</label>
                  
                  <div className="sedes-selector-container">
                    <div className="sedes-column">
                      <h3>Sedes Disponibles</h3>
                      <div className="sedes-list-container">
                        <div className="select-all-container">
                          <button 
                            className="select-all-btn"
                            onClick={selectAllSedes}
                            type="button"
                            disabled={isLoading}
                          >
                            Seleccionar todos
                          </button>
                        </div>
                        <div className="sedes-list">
                          {sedes.map(sede => (
                            <div 
                              key={sede.id} 
                              className={`sede-item ${selectedSedes.includes(sede.id) ? 'selected' : ''}`}
                              onClick={() => !isLoading && handleSedeSelection(sede.id)}
                            >
                              <input
                                type="checkbox"
                                checked={selectedSedes.includes(sede.id)}
                                readOnly
                                disabled={isLoading}
                              />
                              <span className="sede-info">
                                <strong>{sede.nombre}</strong> - {sede.ciudad}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="sedes-column">
                      <h3>Sedes Seleccionadas</h3>
                      <div className="selected-sedes-container">
                        <button 
                          className="remove-all-btn"
                          onClick={removeAllSedes}
                          type="button"
                          disabled={isLoading}
                        >
                          Eliminar todos
                        </button>
                        <div className="selected-sedes-list">
                          {selectedSedes.length > 0 ? (
                            sedes
                              .filter(sede => selectedSedes.includes(sede.id))
                              .map(sede => (
                                <div key={sede.id} className="selected-sede-item">
                                  {sede.nombre} - {sede.ciudad}
                                </div>
                              ))
                          ) : (
                            <div className="no-sedes-selected">No hay sedes seleccionadas</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <button 
                  type="submit"
                  className="create-button"
                  disabled={
                    isLoading ||
                    (showForm && (passwordError || documentoError || celularError)) || 
                    (!showForm && (documentoError || celularError))
                  }
                >
                  {isLoading ? "Procesando..." : showForm ? "Agregar Usuario" : "Guardar Cambios"}
                </button>
              </form>
            </div>
          </div>
        )}

        {alert.show && (
          <AlertModal 
            message={alert.message} 
            type={alert.type} 
            onClose={() => setAlert({ ...alert, show: false })} 
          />
        )}

        {showConfirmModal && (
          <ConfirmModal 
            message={confirmAction.message}
            onConfirm={confirmActionHandler}
            onCancel={() => setShowConfirmModal(false)}
          />
        )}
      </div>
    </div>
  )
}

export default UsuariosExistentes