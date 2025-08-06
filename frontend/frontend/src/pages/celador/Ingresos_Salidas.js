/* eslint-disable no-unused-vars */
"use client";

import React, { useState } from "react";
import axios from "axios";
import "../../styles/Dashboard.css";
import { FaArrowLeft, FaUser, FaPaperPlane, FaTimes } from "react-icons/fa";

const ControlAccesoDispositivos = () => {
  // Estados principales
  const [documento, setDocumento] = useState("");
  const [usuario, setUsuario] = useState(null);
  const [tipoMovimiento, setTipoMovimiento] = useState("ENTRADA");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [mostrarDispositivos, setMostrarDispositivos] = useState(false);
  const [mostrarTeclado, setMostrarTeclado] = useState(false);
  const [mostrarModalInformacion, setMostrarModalInformacion] = useState(false);
  
  // Estado para el formulario de información del visitante
  const [formData, setFormData] = useState({
    tipo_documento: "CC",
    documento: "",
    nombre_completo: "",
    cargo: "",
    marca_dispositivo: "",
    serial: "",
    telefono: "",
    email: ""
  });

  // Close keyboard when clicking outside or changing tabs
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      const keyboardElement = document.getElementById("teclado-numerico");
      if (
        keyboardElement &&
        !keyboardElement.contains(event.target) &&
        !event.target.closest('button[title="Mostrar teclado numérico"]')
      ) {
        setMostrarTeclado(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setMostrarTeclado(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Funciones para el teclado numérico
  const handleTecladoInput = (numero) => {
    setDocumento((prev) => prev + numero);
  };

  const handleBorrar = () => {
    setDocumento((prev) => prev.slice(0, -1));
  };

  const handleLimpiar = () => {
    setDocumento("");
  };

  // Función para buscar usuario
  const buscarUsuario = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");
      setUsuario(null);

      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("No hay token de autenticación");

      const response = await axios.post(
        "http://localhost:8000/api/control-acceso/buscar-usuario/",
        { documento },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Mapeo simplificado
      const dispositivosAsignados = response.data.asignaciones.map(
        (asignacion) => ({
          serial: asignacion.dispositivo_info.serial,
          marca: asignacion.dispositivo_info.marca,
          tipo: asignacion.dispositivo_info.tipo,
        })
      );

      setUsuario({
        ...response.data.usuario_info,
        dispositivos: dispositivosAsignados,
      });

      if (response.data.usuario_ya_dentro) {
        setError("Debe registrar una SALIDA primero.");
        setTipoMovimiento("SALIDA");
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.error || err.response?.data?.message || err.message;
      setError(errorMsg);
      
      // Si es un error 404 (usuario no encontrado), mostrar modal
      if (err.response?.status === 404) {
        setFormData(prev => ({ ...prev, documento }));
        setMostrarModalInformacion(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Función para registrar movimiento
  const registrarMovimiento = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("No hay token de autenticación");

      const { data } = await axios.post(
        "http://localhost:8000/api/control-acceso/registrar-movimiento/",
        {
          documento,
          tipo_movimiento: tipoMovimiento,
          observaciones,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setSuccess(`Registro de ${data.tipo.toLowerCase()} exitoso`);
      resetForm();
    } catch (err) {
      let errorMessage = "Error al registrar el movimiento";

      if (axios.isAxiosError(err)) {
        if (err.response) {
          const errorData = err.response.data;

          errorMessage =
            errorData.non_field_errors?.[0]?.string ||
            errorData.non_field_errors?.[0] ||
            errorData.error ||
            errorData.message ||
            err.response.statusText;

          if (
            err.response.status === 400 &&
            errorMessage.includes("consecutiva")
          ) {
            const nuevoTipo =
              tipoMovimiento === "ENTRADA" ? "SALIDA" : "ENTRADA";
            setTipoMovimiento(nuevoTipo);
            errorMessage = `${errorMessage
              .replace(/{.*}/, "")
              .trim()}\nSe ha cambiado automáticamente a ${nuevoTipo.toLowerCase()}`;
          }
        } else if (err.request) {
          errorMessage = "No se recibió respuesta del servidor";
        }
      } else {
        errorMessage = err.message;
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para enviar información del visitante por correo
  const enviarInformacionVisitante = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const token = sessionStorage.getItem("token");
      if (!token) throw new Error("No hay token de autenticación");

      // Validación básica
      if (!formData.documento || formData.documento.length < 5) {
        throw new Error("El documento debe tener al menos 5 caracteres");
      }

      if (!formData.nombre_completo) {
        throw new Error("El nombre completo es obligatorio");
      }

      // Enviar solo correo
      await axios.post(
        "http://localhost:8000/api/enviar-correo-visitante/",
        {
          visitante: formData,
          destinatario: "mjjimenezd@emergiacc.com"
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess("Información enviada correctamente al área correspondiente");
      
      // Limpiar el formulario después de enviar
      setFormData({
        tipo_documento: "CC",
        documento: "",
        nombre_completo: "",
        cargo: "",
        marca_dispositivo: "",
        serial: "",
        telefono: "",
        email: ""
      });

      setTimeout(() => {
        setMostrarModalInformacion(false);
      }, 2000);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 
                      err.response?.data?.message || 
                      err.message;
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // Función para resetear el formulario
  const resetForm = () => {
    setDocumento("");
    setObservaciones("");
    setUsuario(null);
    setMostrarDispositivos(false);
  };

  // Función para volver a buscar
  const volverABuscar = () => {
    resetForm();
    setError("");
    setSuccess("");
  };

  // Manejar cambios en el formulario de información
  const handleChangeInformacion = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Estilos
  const styles = {
    container: {
      width: "calc(100% - 40px)",
      maxWidth: "800px",
      margin: "2rem auto",
      padding: "1.5rem",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: "#1e2130",
      borderRadius: "8px",
      backdropFilter: "blur(5px)",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    header: {
      color: "#ffffff",
      marginBottom: "1.5rem",
      paddingBottom: "0.5rem",
      borderBottom: "2px solid rgba(255,255,255,0.1)",
      fontWeight: "600",
      fontSize: "1.5rem",
    },
    card: {
      background: "#2a2d3e",
      borderRadius: "8px",
      border: "1px solid rgba(74, 144, 226, 0.2)",
      marginBottom: "1.5rem",
      overflow: "hidden",
    },
    cardHeader: {
      background: "#2a2d3e",
      padding: "1rem",
      color: "white",
      fontSize: "1.1rem",
      fontWeight: "500",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
    },
    cardBody: {
      padding: "1.5rem",
    },
    inputGroup: {
      marginBottom: "1.5rem",
    },
    label: {
      display: "block",
      marginBottom: "0.5rem",
      fontWeight: "600",
      color: "rgba(255,255,255,0.9)",
      fontSize: "0.9rem",
    },
    input: {
      width: "100%",
      padding: "0.75rem",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "4px",
      fontSize: "1rem",
      backgroundColor: "rgba(0,0,0,0.2)",
      color: "#ffffff",
      transition: "all 0.3s",
      boxSizing: "border-box",
      "::placeholder": {
        color: "rgba(255,255,255,0.5)",
      },
      ":focus": {
        outline: "none",
        borderColor: "#4a90e2",
        boxShadow: "0 0 0 2px rgba(74, 144, 226, 0.3)",
      },
    },
    button: {
      background: "#3498db",
      color: "white",
      border: "none",
      padding: "0.75rem 1.5rem",
      borderRadius: "4px",
      cursor: "pointer",
      fontSize: "1rem",
      fontWeight: "600",
      transition: "background-color 0.3s",
      marginRight: "0.5rem",
    },
    toggleButton: {
      background: "#785bc7",
      color: "#ffffff",
      border: "1px solid #785bc7",
      padding: "0.6rem 1rem",
      borderRadius: "6px",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      transition: "all 0.2s",
      marginBottom: "1.5rem",
      ":hover": {
        backgroundColor: "rgba(74, 144, 226, 0.15)",
      },
    },
    userWelcome: {
      backgroundColor: "rgba(120, 91, 199, 0.1)",
      padding: "1rem",
      borderRadius: "8px",
      borderLeft: "4px solid #785bc7",
      marginBottom: "1.5rem",
      display: "flex",
      alignItems: "center",
      gap: "1rem",
    },
    userName: {
      fontSize: "1.2rem",
      fontWeight: "600",
      color: "#ffffff",
      margin: 0,
    },
    error: {
      color: "#e74c3c",
      backgroundColor: "#fadbd8",
      padding: "1rem",
      borderRadius: "6px",
      marginBottom: "1.5rem",
      border: "1px solid #f5b7b1",
    },
    success: {
      color: "#27ae60",
      backgroundColor: "#d5f5e3",
      padding: "1rem",
      borderRadius: "6px",
      marginBottom: "1.5rem",
      border: "1px solid #a3e4d7",
    },
    formSection: {
      marginBottom: "1.5rem",
    },
    sectionTitle: {
      color: "rgba(255,255,255,0.9)",
      fontSize: "1rem",
      fontWeight: "600",
      marginBottom: "0.75rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
    },
    // Estilos para el modal
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.7)",
      zIndex: 1000,
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backdropFilter: "blur(5px)"
    },
    modalContent: {
      backgroundColor: "#2a2d3e",
      borderRadius: "10px",
      width: "90%",
      maxWidth: "500px",
      maxHeight: "90vh",
      overflowY: "auto",
      boxShadow: "0 5px 20px rgba(0, 0, 0, 0.3)",
      border: "1px solid rgba(255, 255, 255, 0.1)"
    },
    modalHeader: {
      padding: "1.5rem",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center"
    },
    modalTitle: {
      color: "#ffffff",
      margin: 0,
      fontSize: "1.3rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem"
    },
    modalCloseBtn: {
      background: "none",
      border: "none",
      color: "rgba(255,255,255,0.7)",
      fontSize: "1.2rem",
      cursor: "pointer",
      transition: "color 0.2s",
      ":hover": {
        color: "#ffffff"
      }
    },
    modalBody: {
      padding: "1.5rem"
    },
    modalFooter: {
      padding: "1.5rem",
      borderTop: "1px solid rgba(255,255,255,0.1)",
      display: "flex",
      justifyContent: "flex-end",
      gap: "0.75rem"
    },
    modalButton: {
      padding: "0.75rem 1.5rem",
      borderRadius: "6px",
      border: "none",
      cursor: "pointer",
      fontSize: "0.9rem",
      fontWeight: "600",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      transition: "all 0.2s"
    },
    modalButtonPrimary: {
      backgroundColor: "#785bc7",
      color: "#ffffff",
      ":hover": {
        backgroundColor: "#6a4fbb"
      }
    },
    modalButtonSecondary: {
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "rgba(255,255,255,0.8)",
      ":hover": {
        backgroundColor: "rgba(255,255,255,0.2)"
      }
    },
    modalSelect: {
      width: "100%",
      padding: "0.75rem",
      borderRadius: "6px",
      border: "1px solid rgba(255,255,255,0.2)",
      backgroundColor: "rgba(0,0,0,0.2)",
      color: "#ffffff",
      fontSize: "1rem",
      transition: "all 0.3s",
      appearance: "none",
      backgroundImage: "url(\"data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='white'%3e%3cpath d='M7 10l5 5 5-5z'/%3e%3c/svg%3e\")",
      backgroundRepeat: "no-repeat",
      backgroundPosition: "right 0.75rem center",
      backgroundSize: "1rem"
    }
  };

  return (
    <div className="dashboard-container">
      <div style={styles.container}>
        <h1 style={styles.header}>Control de Acceso con Dispositivos</h1>

        {error && (
          <div
            style={{
              ...styles.error,
              ...(typeof error === "string" && error.includes("consecutiva")
                ? {
                    borderLeft: "4px solid #e74c3c",
                    animation: "shake 0.5s",
                  }
                : {}),
            }}
          >
            {typeof error === "object"
              ? error.non_field_errors?.[0]?.string || JSON.stringify(error)
              : error}
            {typeof error === "string" && error.includes("consecutiva") && (
              <div style={{ marginTop: "0.5rem", color: "#2c3e50" }}>
                Se ha cambiado automáticamente a {tipoMovimiento.toLowerCase()}
              </div>
            )}
          </div>
        )}

        {success && (
          <div
            style={{
              backgroundColor: "rgba(39, 174, 96, 0.2)",
              color: "#2ecc71",
              padding: "1rem",
              borderRadius: "6px",
              marginBottom: "1.5rem",
              borderLeft: "4px solid #2ecc71",
            }}
          >
            {success}
          </div>
        )}

        {!usuario ? (
          <div style={styles.card}>
            <div style={styles.cardHeader}>Buscar Usuario</div>
            <div style={styles.cardBody}>
              <div style={styles.inputGroup}>
                <label style={styles.label}>Número de Documento</label>
                <div style={{ display: "flex", alignItems: "center" }}>
                  <input
                    type="number"
                    style={styles.input}
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    placeholder="Ingrese el número de documento"
                    disabled={loading}
                  />
                  <button
                    onClick={() => setMostrarTeclado(!mostrarTeclado)}
                    style={{
                      marginLeft: "10px",
                      background: "#785bc7",
                      color: "white",
                      border: "none",
                      padding: "0.75rem",
                      borderRadius: "4px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    title="Mostrar teclado numérico"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect
                        x="2"
                        y="4"
                        width="20"
                        height="16"
                        rx="2"
                        ry="2"
                      ></rect>
                      <line x1="6" y1="8" x2="6" y2="8"></line>
                      <line x1="10" y1="8" x2="10" y2="8"></line>
                      <line x1="14" y1="8" x2="14" y2="8"></line>
                      <line x1="18" y1="8" x2="18" y2="8"></line>
                      <line x1="6" y1="12" x2="6" y2="12"></line>
                      <line x1="10" y1="12" x2="10" y2="12"></line>
                      <line x1="14" y1="12" x2="14" y2="12"></line>
                      <line x1="18" y1="12" x2="18" y2="12"></line>
                      <line x1="6" y1="16" x2="6" y2="16"></line>
                      <line x1="10" y1="16" x2="10" y2="16"></line>
                      <line x1="14" y1="16" x2="14" y2="16"></line>
                      <line x1="18" y1="16" x2="18" y2="16"></line>
                    </svg>
                  </button>
                </div>
              </div>

              <button
                style={{
                  ...styles.button,
                  background: "#785bc7",
                  ":hover": {
                    background: "linear-gradient(135deg, #1d72b8 0%, #0e4a8a 100%)",
                  },
                }}
                onClick={buscarUsuario}
                disabled={loading || !documento}
              >
                {loading ? (
                  <>
                    <i
                      className="fas fa-spinner fa-spin"
                      style={{ marginRight: "0.5rem" }}
                    ></i>
                    Buscando...
                  </>
                ) : (
                  <>
                    <i
                      className="fas fa-search"
                      style={{ marginRight: "0.5rem" }}
                    ></i>
                    Buscar Usuario
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <div style={styles.cardBody}>
              <button
                onClick={volverABuscar}
                style={{
                  position: "absolute",
                  top: "20px",
                  right: "20px",
                  background: "rgba(120, 91, 199, 0.2)",
                  color: "#ffffff",
                  border: "1px solid #785bc7",
                  padding: "0.5rem 1rem",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  zIndex: 100,
                  ":hover": {
                    backgroundColor: "rgba(120, 91, 199, 0.4)",
                  },
                }}
              >
                <FaArrowLeft />
                Buscar otro
              </button>
              <div style={styles.userWelcome}>
                <i
                  className="fas fa-user-circle"
                  style={{ fontSize: "1.8rem", color: "#4a90e2" }}
                ></i>
                <h2 style={styles.userName}>
                  Bienvenido/a: <strong>{usuario.nombre}</strong>
                </h2>
              </div>

              <button
                style={styles.toggleButton}
                onClick={() => setMostrarDispositivos(!mostrarDispositivos)}
              >
                {mostrarDispositivos
                  ? "Ocultar dispositivos"
                  : "Ver dispositivos asignados"}
              </button>

              {mostrarDispositivos &&
                usuario.dispositivos &&
                usuario.dispositivos.length > 0 && (
                  <div style={styles.formSection}>
                    <h3 style={styles.sectionTitle}>
                      <i className="fas fa-laptop"></i>
                      Dispositivos asignados:
                    </h3>
                    <div style={styles.deviceGrid}>
                      {usuario.dispositivos.map((dispositivo, index) => (
                        <div key={index} style={styles.deviceCard}>
                          <span style={styles.detailLabel}>Serial</span>
                          <h4 style={styles.deviceTitle}>
                            <i
                              className={
                                dispositivo.tipo
                                  .toLowerCase()
                                  .includes("laptop")
                                  ? "fas fa-laptop"
                                  : "fas fa-desktop"
                              }
                            ></i>
                            {dispositivo.serial || "N/A"}
                          </h4>
                          <div style={styles.deviceDetail}>
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Marca:</span>
                              <span style={styles.detailValue}>
                                {dispositivo.marca}
                              </span>
                            </div>
                            <div style={styles.detailItem}>
                              <span style={styles.detailLabel}>Tipo</span>
                              <span style={styles.detailValue}>
                                {dispositivo.tipo || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>
                  <i className="fas fa-exchange-alt"></i>
                  Tipo de Movimiento
                </h3>
                <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="tipoMovimiento"
                      value="ENTRADA"
                      checked={tipoMovimiento === "ENTRADA"}
                      onChange={() => setTipoMovimiento("ENTRADA")}
                      style={{ accentColor: "#785bc7" }}
                    />
                    <span style={{ color: "#ffffff" }}>Entrada</span>
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      cursor: "pointer",
                    }}
                  >
                    <input
                      type="radio"
                      name="tipoMovimiento"
                      value="SALIDA"
                      checked={tipoMovimiento === "SALIDA"}
                      onChange={() => setTipoMovimiento("SALIDA")}
                      style={{ accentColor: "#e74c3c" }}
                    />
                    <span style={{ color: "#ffffff" }}>Salida</span>
                  </label>
                </div>
              </div>

              <div style={styles.formSection}>
                <h3 style={styles.sectionTitle}>
                  <i className="fas fa-edit"></i>
                  Observaciones
                </h3>
                <textarea
                  style={{
                    ...styles.input,
                    minHeight: "100px",
                    backgroundColor: "rgba(15, 23, 42, 0.5)",
                  }}
                  placeholder="Observaciones adicionales..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>

              <button
                style={{
                  ...styles.button,
                  background:
                    tipoMovimiento === "ENTRADA"
                      ? "linear-gradient(135deg, #785bc7 0%, #9578e8 100%)"
                      : "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
                  padding: "1rem 2rem",
                  fontSize: "1rem",
                  width: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
                onClick={registrarMovimiento}
              >
                <i
                  className={`fas ${
                    tipoMovimiento === "ENTRADA"
                      ? "fa-sign-in-alt"
                      : "fa-sign-out-alt"
                  }`}
                ></i>
                Registrar {tipoMovimiento.toLowerCase()}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Teclado numérico virtual */}
      {mostrarTeclado && (
        <div
          id="teclado-numerico"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            backgroundColor: "#2a2d3e",
            padding: "15px",
            borderRadius: "10px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            zIndex: 1000,
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <button
            style={{
              position: "absolute",
              top: "5px",
              right: "5px",
              background: "none",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              cursor: "pointer",
              fontSize: "1rem",
            }}
            onClick={() => setMostrarTeclado(false)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "10px",
            }}
          >
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("1")}
            >
              1
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("2")}
            >
              2
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("3")}
            >
              3
            </button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "10px",
            }}
          >
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("4")}
            >
              4
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("5")}
            >
              5
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("6")}
            >
              6
            </button>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "10px",
            }}
          >
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("7")}
            >
              7
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("8")}
            >
              8
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("9")}
            >
              9
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#785bc7",
                color: "white",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={handleBorrar}
              title="Borrar caracter"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"></path>
                <line x1="18" y1="9" x2="12" y2="15"></line>
                <line x1="12" y1="9" x2="18" y2="15"></line>
              </svg>
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#3a3f5a",
                color: "white",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
              }}
              onClick={() => handleTecladoInput("0")}
            >
              0
            </button>
            <button
              style={{
                width: "60px",
                height: "60px",
                margin: "5px",
                borderRadius: "8px",
                backgroundColor: "#785bc7",
                color: "white",
                border: "none",
                fontSize: "1.2rem",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={() => {
                buscarUsuario();
                setMostrarTeclado(false);
              }}
              title="Buscar usuario"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modal para información de visitante */}
      {mostrarModalInformacion && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>
                <FaUser /> Información de Usuario con dispositivo
              </h2>
              <button 
                style={styles.modalCloseBtn} 
                onClick={() => setMostrarModalInformacion(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div style={styles.modalBody}>
              {error && (
                <div style={{
                  color: "#e74c3c",
                  backgroundColor: "rgba(231, 76, 60, 0.1)",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  borderLeft: "4px solid #e74c3c"
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div style={{
                  color: "#2ecc71",
                  backgroundColor: "rgba(46, 204, 113, 0.1)",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  marginBottom: "1rem",
                  borderLeft: "4px solid #2ecc71"
                }}>
                  {success}
                </div>
              )}

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Tipo de Documento</label>
                <select
                  style={styles.modalSelect}
                  name="tipo_documento"
                  value={formData.tipo_documento}
                  onChange={handleChangeInformacion}
                  required
                >
                  <option value="CC">Cédula de Ciudadanía</option>
                  <option value="CE">Cédula de Extranjería</option>
                  <option value="PASAPORTE">Pasaporte</option>
                </select>
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Documento</label>
                <input
                  style={styles.input}
                  type="text"
                  name="documento"
                  value={formData.documento}
                  onChange={handleChangeInformacion}
                  placeholder="Ingrese el número de documento"
                  required
                  minLength="5"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Nombre Completo</label>
                <input
                  style={styles.input}
                  type="text"
                  name="nombre_completo"
                  value={formData.nombre_completo}
                  onChange={handleChangeInformacion}
                  placeholder="Ingrese nombre completo"
                  required
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Cargo</label>
                <input
                  style={styles.input}
                  type="text"
                  name="cargo"
                  value={formData.cargo}
                  onChange={handleChangeInformacion}
                  placeholder="Ingrese el cargo"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Teléfono</label>
                <input
                  style={styles.input}
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleChangeInformacion}
                  placeholder="Ingrese teléfono"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Email</label>
                <input
                  style={styles.input}
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChangeInformacion}
                  placeholder="Ingrese email"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Marca del dispositivo</label>
                <input
                  style={styles.input}
                  type="text"
                  name="marca_dispositivo"
                  value={formData.marca_dispositivo}
                  onChange={handleChangeInformacion}
                  placeholder="Ingrese marca del dispositivo"
                />
              </div>

              <div style={{ marginBottom: "1.5rem" }}>
                <label style={styles.label}>Serial del dispositivo</label>
                <input
                  style={styles.input}
                  type="text"
                  name="serial"
                  value={formData.serial}
                  onChange={handleChangeInformacion}
                  placeholder="Ingrese serial del dispositivo"
                />
              </div>
            </div>

            <div style={styles.modalFooter}>
              <button 
                style={{ ...styles.modalButton, ...styles.modalButtonSecondary }}
                onClick={() => setMostrarModalInformacion(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                style={{ ...styles.modalButton, ...styles.modalButtonPrimary }}
                onClick={enviarInformacionVisitante}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin"></i>
                    Enviando...
                  </>
                ) : (
                  <>
                    <FaPaperPlane /> Enviar Información
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ControlAccesoDispositivos;