import React from 'react';
import { FaTimes } from 'react-icons/fa';

const EditModal = ({
    formData,
    handleChange,
    handleSubmit,
    loading,
    error,
    successMessage,
    setShowEditModal
}) => {
    return (
        <div className="modal-overlay">
            <div className="modal-container modern-modal">
                <button
                    className="close-button"
                    onClick={() => setShowEditModal(false)}
                    type="button"
                >
                    <FaTimes />
                </button>

                {error && <div className="error-message">{error}</div>}
                {successMessage && <div className="success-message">{successMessage}</div>}

                <form className="modal-content" onSubmit={handleSubmit}>
                    <h1 className="modal-title">Editar Usuario</h1>

                    <div className="input-group select-wrapper">
                        <label>Tipo de Documento</label>
                        <select
                            name="tipo_documento"
                            value={formData.tipo_documento}
                            onChange={handleChange}
                            required
                        >
                            <option value="CC">Cédula de Ciudadanía</option>
                            <option value="CE">Cédula de Extranjería</option>
                            <option value="PASAPORTE">Pasaporte</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Documento</label>
                        <input
                            type="number"
                            name="documento"
                            value={formData.documento}
                            onChange={handleChange}
                            required
                            minLength={5}
                            placeholder="Ingrese el número de documento"
                        />
                    </div>

                    <div className="input-group">
                        <label>Nombre Completo</label>
                        <input
                            type="text"
                            name="nombre_completo"
                            value={formData.nombre_completo}
                            onChange={handleChange}
                            required
                            placeholder="Ingrese nombre completo"
                        />
                    </div>

                    <div className="input-group">
                        <label>Cargo</label>
                        <input
                            type="text"
                            name="cargo"
                            value={formData.cargo}
                            onChange={handleChange}
                            required
                            placeholder="Ingrese el cargo"
                        />
                    </div>

                    <div className="input-group">
                        <label>Teléfono</label>
                        <input
                            type="number"
                            name="telefono"
                            value={formData.telefono}
                            onChange={handleChange}
                            placeholder="Ingrese teléfono"
                        />
                    </div>

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Ingrese email"
                        />
                    </div>

                    <button
                        type="submit"
                        className="create-button"
                        disabled={loading}
                    >
                        {loading ? 'Actualizando...' : 'Actualizar Usuario'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default EditModal;