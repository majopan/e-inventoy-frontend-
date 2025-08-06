/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import "../../styles/UsuariosExistentes.css"
import { FaUser, FaEdit, FaSearch, FaPlus, FaTimes, FaAngleLeft, FaAngleRight, FaAngleDoubleLeft, FaAngleDoubleRight } from 'react-icons/fa';
import CreateModal from './CreateModal';
import EditModal from './EditModal';

const GestionUsuariosExternos = () => {
    // Estados para el formulario
    const [formData, setFormData] = useState({
        tipo_documento: 'CC',
        documento: '',
        nombre_completo: '',
        cargo: '',
        telefono: '',
        email: ''
    });

    // Estados para la lista de usuarios
    const [usuarios, setUsuarios] = useState([]);
    const [filteredUsuarios, setFilteredUsuarios] = useState([]);
    const [displayedUsuarios, setDisplayedUsuarios] = useState([]); // Usuarios a mostrar en la página actual
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);

    // Estados para modales
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);

    // Estados para UI
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Puedes hacer esto configurable

    // Obtener token de autenticación
    const getAuthToken = () => {
        const token = sessionStorage.getItem('token');
        if (!token) {
            throw new Error('No hay token de autenticación');
        }
        return token;
    };

    // Estilos
    const styles = {
        container: {
            width: 'calc(100% - 40px)',
            margin: '0 auto',
            padding: '1.5rem',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            backgroundColor: 'transparent',
            borderRadius: '8px',
        },
        header: {
            color: '#ffffff',
            marginBottom: '1.5rem',
            paddingBottom: '0.5rem',
            borderBottom: '2px solid rgba(255,255,255,0.1)',
        },
        card: {
            backgroundColor: 'rgba(30, 41, 59, 0.7)',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(5px)',
        },
        title: {
            color: '#ffffff',
            fontSize: '1.25rem',
            fontWeight: '600',
            marginBottom: '1rem',
        },
        searchContainer: {
            display: 'flex',
            marginBottom: '1rem',
            alignItems: 'center',
        },
        searchInput: {
            flex: 1,
            padding: '0.7rem 1rem',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            fontSize: '0.95rem',
            backgroundColor: 'rgba(0,0,0,0.2)',
            color: '#ffffff',
            marginRight: '0.5rem',
        },
        addButton: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0.7rem 1rem',
            background: 'linear-gradient(135deg, #1d72b8 0%, #0e4a8a 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '0.95rem',
            transition: 'all 0.2s',
        },
        userList: {
            listStyle: 'none',
            padding: 0,
            margin: 0,
        },
        userItem: {
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            marginBottom: '0.5rem',
            borderRadius: '6px',
        },
        userInfo: {
            flex: 1,
        },
        userName: {
            fontWeight: '500',
            color: '#ffffff',
            marginBottom: '0.25rem',
        },
        userRole: {
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '0.25rem',
        },
        userSede: {
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.7)',
        },
        userActions: {
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
        },
        actionButton: {
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '1rem',
            transition: 'all 0.2s',
            padding: '0.5rem',
            borderRadius: '4px',
            ':hover': {
                color: '#ffffff',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
        },
        editButton: {
            ':hover': {
                color: '#1d72b8',
            },
        },
        deleteButton: {
            ':hover': {
                color: '#dc3545',
            },
        },
        modalOverlay: {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
        },
        modalContent: {
            backgroundColor: 'rgba(30, 41, 59, 0.95)',
            borderRadius: '8px',
            width: '100%',
            maxWidth: '500px',
            padding: '1.5rem',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
        },
        modalHeader: {
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.5rem',
        },
        modalTitle: {
            color: '#ffffff',
            fontSize: '1.25rem',
            fontWeight: '600',
        },
        closeButton: {
            background: 'none',
            border: 'none',
            color: 'rgba(255, 255, 255, 0.7)',
            cursor: 'pointer',
            fontSize: '1.25rem',
            ':hover': {
                color: '#ffffff',
            },
        },
        formGroup: {
            marginBottom: '1rem',
        },
        label: {
            fontWeight: '500',
            display: 'block',
            marginBottom: '0.5rem',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.9rem',
        },
        select: {
            width: '100%',
            padding: '0.7rem 1rem',
            border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: '6px',
            fontSize: '0.95rem',
            backgroundColor: 'rgba(0,0,0,0.2)',
            color: '#ffffff',
            appearance: 'none',
        },
        submitButton: {
            width: '100%',
            padding: '0.8rem',
            background: 'linear-gradient(135deg, #1d72b8 0%, #0e4a8a 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: '500',
            fontSize: '1rem',
            transition: 'all 0.2s',
            marginTop: '1rem',
            ':hover': {
                transform: 'translateY(-1px)',
            },
        },
        error: {
            backgroundColor: 'rgba(220, 53, 69, 0.15)',
            color: '#dc3545',
            padding: '0.8rem 1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            fontSize: '0.9rem',
        },
        success: {
            backgroundColor: 'rgba(40, 167, 69, 0.15)',
            color: '#28a745',
            padding: '0.8rem 1rem',
            marginBottom: '1rem',
            borderRadius: '6px',
            fontSize: '0.9rem',
        },
        resultsText: {
            fontSize: '0.85rem',
            color: 'rgba(255, 255, 255, 0.6)',
            marginTop: '1rem',
            textAlign: 'right',
        },
    };

    // Cargar usuarios al montar el componente
    useEffect(() => {
        fetchUsuarios();
    }, []);


    // Filtrar usuarios según término de búsqueda y estado activo
    useEffect(() => {
        const filtered = usuarios.filter(usuario => {
            const matchesSearch = usuario.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                usuario.documento.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesSearch;
        });
        setFilteredUsuarios(filtered);
        setCurrentPage(1);
    }, [searchTerm, usuarios]);

    // Actualizar usuarios mostrados cuando cambia la página o los usuarios filtrados
    useEffect(() => {
        // Calcular índices de los items a mostrar
        const indexOfLastItem = currentPage * itemsPerPage;
        const indexOfFirstItem = indexOfLastItem - itemsPerPage;
        const currentItems = filteredUsuarios.slice(indexOfFirstItem, indexOfLastItem);

        setDisplayedUsuarios(currentItems);
    }, [currentPage, itemsPerPage, filteredUsuarios]);

    // Función para cambiar de página
    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    // Función para ir a la primera página
    const goToFirstPage = () => paginate(1);

    // Función para ir a la última página
    const goToLastPage = () => paginate(Math.ceil(filteredUsuarios.length / itemsPerPage));

    // Función para ir a la página anterior
    const goToPreviousPage = () => {
        if (currentPage > 1) {
            paginate(currentPage - 1);
        }
    };

    // Función para ir a la página siguiente
    const goToNextPage = () => {
        if (currentPage < Math.ceil(filteredUsuarios.length / itemsPerPage)) {
            paginate(currentPage + 1);
        }
    };

    // Función para cambiar la cantidad de items por página
    const handleItemsPerPageChange = (e) => {
        setItemsPerPage(Number(e.target.value));
        setCurrentPage(1); // Volver a la primera página cuando cambia la cantidad por página
    };

    // Función corregida
    const fetchUsuarios = async () => {
        try {
            setLoading(true);
            const token = getAuthToken();

            const response = await axios.get(
                'http://localhost:8000/api/gestion-usuarios-externos/',
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    }
                }
            );

            if (response.data.success && response.data.data) {
                setUsuarios(response.data.data);
                setFilteredUsuarios(response.data.data);
            } else {
                throw new Error('Formato de respuesta inesperado');
            }
        } catch (err) {
            console.error("Error al cargar usuarios:", err);
            setError(err.response?.data?.errors || err.message);
        } finally {
            setLoading(false);
        }
    };

    // Manejar cambios en el formulario con useCallback para evitar recreación en cada render
    const handleChange = useCallback((e) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    }, []);

    // Resetear formulario
    const resetForm = useCallback(() => {
        setFormData({
            tipo_documento: 'CC',
            documento: '',
            nombre_completo: '',
            cargo: '',
            telefono: '',
            email: ''
        });
        setEditingId(null);
        setError('');
        setSuccessMessage('');
    }, []);

    // Abrir modal de creación
    const openCreateModal = useCallback(() => {
        resetForm();
        setShowCreateModal(true);
    }, [resetForm]);

    // Abrir modal de edición
    const openEditModal = useCallback((usuario) => {
        setFormData({
            tipo_documento: usuario.tipo_documento,
            documento: usuario.documento,
            nombre_completo: usuario.nombre_completo,
            cargo: usuario.cargo,
            telefono: usuario.telefono || '',
            email: usuario.email || ''
        });
        setEditingId(usuario.id);
        setShowEditModal(true);
    }, []);

    // Manejar envío del formulario (crear o actualizar)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setLoading(true);

        try {
            const token = getAuthToken();
            let response;

            if (editingId) {
                response = await axios.put(
                    `http://localhost:8000/api/usuarios-externos/${editingId}/`,
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                setSuccessMessage('Usuario actualizado exitosamente.');
                setShowEditModal(false);
            } else {
                response = await axios.post(
                    'http://localhost:8000/api/usuarios-externos/',
                    formData,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                setSuccessMessage('Usuario registrado exitosamente.');
                setShowCreateModal(false);
            }

            if (response.status === 200 || response.status === 201) {
                resetForm();
                fetchUsuarios();
            }
        } catch (err) {
            const errMsg = err.response?.data?.errors || err.message;
            setError(typeof errMsg === 'object' ? JSON.stringify(errMsg) : errMsg);
        } finally {
            setLoading(false);
        }
    };

    // Manejar activación/desactivación de usuario
    const handleToggleStatus = async (usuarioId, activo) => {
        try {
            setLoading(true);
            const token = getAuthToken();

            if (activo) {
                await axios.delete(
                    `http://localhost:8000/api/usuarios-externos/${usuarioId}/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        }
                    }
                );
                setSuccessMessage('Usuario desactivado correctamente.');
            } else {
                await axios.put(
                    `http://localhost:8000/api/usuarios-externos/${usuarioId}/`,
                    { activo: true },
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                setSuccessMessage('Usuario activado correctamente.');
            }

            fetchUsuarios();
        } catch (err) {
            setError(err.response?.data?.errors || err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="records-container">
            <div className="user-card">
                <div className="card-header">
                    <h3>Registro de Usuarios Externos</h3>
                    <button
                        className="add-user-btn"
                        onClick={openCreateModal}
                        type="button"
                    >
                        <FaPlus />
                    </button>
                </div>

                <div className="search-container">
                    {error && <div className="error-message">{error}</div>}
                    {successMessage && <div className="success-message">{successMessage}</div>}
                    <div className="search-input-container">
                        <FaSearch className="search-icon" />
                        <input
                            type="text"
                            placeholder="Buscar usuarios..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="search-input"
                        />
                    </div>
                </div>

                {/* Selector de items por página */}
                <div className="pagination-controls-top" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div className="items-per-page">
                        <label htmlFor="itemsPerPage" style={{ marginRight: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>Items por página:</label>
                        <select
                            id="itemsPerPage"
                            value={itemsPerPage}
                            onChange={handleItemsPerPageChange}
                            style={{
                                padding: '0.3rem',
                                borderRadius: '4px',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                color: '#ffffff',
                                border: '1px solid rgba(255,255,255,0.2)'
                            }}
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                    <div className="results-text">
                        Mostrando {displayedUsuarios.length} de {filteredUsuarios.length} resultados
                    </div>
                </div>
                <div className="user-list">
                    {displayedUsuarios.map(usuario => (
                        <li key={usuario.id} className={`user-item ${!usuario.activo ? 'inactive' : ' '}`}>
                            <div className="user-avatar">
                                <FaUser />
                            </div>
                            <div className="user-info">
                                <div className="user-name">
                                    {usuario.nombre_completo}
                                    <span style={{ margin: '0 5px' }}></span>
                                    {!usuario.activo && <span className="status-badge inactive"> Inactivo</span>}
                                    {usuario.activo && <span className="status-badge active"> Activo</span>}
                                </div>
                                <div className="user-access">
                                    {usuario.cargo}
                                </div>
                                <div className="user-sedes">
                                    Documento: {usuario.tipo_documento_display} {usuario.documento}
                                </div>
                            </div>
                            <div className="user-actions">
                                <button
                                    className="action-button-modern edit"
                                    onClick={() => openEditModal(usuario)}
                                    type="button"
                                >
                                    <FaEdit />
                                </button>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={usuario.activo}
                                        onChange={() => handleToggleStatus(usuario.id, usuario.activo)}
                                        uncheckedIcon={false}
                                        checkedIcon={false}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </li>
                    ))}

                    {/* Controles de paginación */}
                    <div className="pagination-controls" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginTop: '1.5rem',
                        gap: '0.5rem'
                    }}>
                        <button
                            onClick={goToFirstPage}
                            disabled={currentPage === 1}
                            className="pagination-button"
                            style={{
                                padding: '0.5rem',
                                background: currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '4px',
                                color: currentPage === 1 ? 'rgba(255,255,255,0.5)' : '#ffffff',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <FaAngleDoubleLeft />
                        </button>
                        <button
                            onClick={goToPreviousPage}
                            disabled={currentPage === 1}
                            className="pagination-button"
                            style={{
                                padding: '0.5rem',
                                background: currentPage === 1 ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '4px',
                                color: currentPage === 1 ? 'rgba(255,255,255,0.5)' : '#ffffff',
                                cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <FaAngleLeft />
                        </button>

                        {/* Números de página */}
                        {Array.from({ length: Math.ceil(filteredUsuarios.length / itemsPerPage) }, (_, i) => {
                            // Mostrar solo algunas páginas alrededor de la actual para no saturar
                            if (
                                i === 0 ||
                                i === Math.ceil(filteredUsuarios.length / itemsPerPage) - 1 ||
                                (i >= currentPage - 2 && i <= currentPage + 2)
                            ) {
                                return (
                                    <button
                                        key={i + 1}
                                        onClick={() => paginate(i + 1)}
                                        className={`pagination-button ${currentPage === i + 1 ? 'active' : ''}`}
                                        style={{
                                            padding: '0.5rem 0.8rem',
                                            background: currentPage === i + 1 ? 'rgba(29, 114, 184, 0.8)' : 'rgba(255,255,255,0.1)',
                                            border: 'none',
                                            borderRadius: '4px',
                                            color: '#ffffff',
                                            cursor: 'pointer',
                                            fontWeight: currentPage === i + 1 ? 'bold' : 'normal'
                                        }}
                                    >
                                        {i + 1}
                                    </button>
                                );
                            }
                            return null;
                        })}

                        <button
                            onClick={goToNextPage}
                            disabled={currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage)}
                            className="pagination-button"
                            style={{
                                padding: '0.5rem',
                                background: currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '4px',
                                color: currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage) ? 'rgba(255,255,255,0.5)' : '#ffffff',
                                cursor: currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <FaAngleRight />
                        </button>
                        <button
                            onClick={goToLastPage}
                            disabled={currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage)}
                            className="pagination-button"
                            style={{
                                padding: '0.5rem',
                                background: currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage) ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '4px',
                                color: currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage) ? 'rgba(255,255,255,0.5)' : '#ffffff',
                                cursor: currentPage === Math.ceil(filteredUsuarios.length / itemsPerPage) ? 'not-allowed' : 'pointer'
                            }}
                        >
                            <FaAngleDoubleRight />
                        </button>
                    </div>
                </div>
            </div>

            {showCreateModal && (
                <CreateModal
                    formData={formData}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                    successMessage={successMessage}
                    setShowCreateModal={setShowCreateModal}
                />
            )}

            {showEditModal && (
                <EditModal
                    formData={formData}
                    handleChange={handleChange}
                    handleSubmit={handleSubmit}
                    loading={loading}
                    error={error}
                    successMessage={successMessage}
                    setShowEditModal={setShowEditModal}
                />
            )}
        </div>
    );
};

export default GestionUsuariosExternos;