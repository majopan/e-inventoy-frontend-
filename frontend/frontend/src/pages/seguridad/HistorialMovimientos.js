"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"
import "../../styles/Dashboard.css"

const HistorialMovimientos = () => {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportLoading, setExportLoading] = useState(false)
  const [showExportModal, setShowExportModal] = useState(false)

  const [filtros, setFiltros] = useState({
    tipo: "",
    documento: "",
    fechaInicio: "",
    fechaFin: "",
  })

  const [paginacion, setPaginacion] = useState({
    pagina: 1,
    porPagina: 10,
    total: 0,
  })

  // Estado para las fechas de exportación
  const [fechasExport, setFechasExport] = useState({
    fechaInicio: "",
    fechaFin: "",
  })

  const cargarHistorial = async () => {
    try {
      setLoading(true)
      const token = sessionStorage.getItem("token")
      const params = {
        ...filtros,
        page: paginacion.pagina,
        per_page: paginacion.porPagina,
      }

      const response = await axios.get("http://localhost:8000/api/control-acceso/historial-movimientos/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })

      setMovimientos(response.data.results)
      setPaginacion({
        ...paginacion,
        total: response.data.count,
      })
    } catch (error) {
      console.error("Error cargando historial:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarHistorial()
  }, [filtros, paginacion.pagina])

  const handleFiltroChange = (e) => {
    const { name, value } = e.target
    setFiltros({
      ...filtros,
      [name]: value,
    })
    // Resetear a página 1 al cambiar filtros
    setPaginacion({ ...paginacion, pagina: 1 })
  }

  // Función para obtener TODOS los registros haciendo múltiples llamadas
  const obtenerTodosLosRegistros = async (filtrosFecha = {}) => {
    const token = sessionStorage.getItem("token")
    let todosLosRegistros = []
    let paginaActual = 1
    let totalPaginas = 1
    const registrosPorPagina = 100 // Usar el máximo que permite la API

    do {
      const params = {
        ...filtrosFecha,
        page: paginaActual,
        per_page: registrosPorPagina,
      }

      console.log(`Obteniendo página ${paginaActual} con parámetros:`, params)

      const response = await axios.get("http://localhost:8000/api/control-acceso/historial-movimientos/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })

      // Agregar los registros de esta página
      todosLosRegistros = [...todosLosRegistros, ...response.data.results]

      // Calcular total de páginas
      totalPaginas = Math.ceil(response.data.count / registrosPorPagina)

      console.log(`Página ${paginaActual}/${totalPaginas} - Registros obtenidos: ${response.data.results.length}`)
      console.log(`Total acumulado: ${todosLosRegistros.length}`)

      paginaActual++
    } while (paginaActual <= totalPaginas)

    return todosLosRegistros
  }

  const exportarExcelConFechas = async () => {
    try {
      setExportLoading(true)

      // Preparar filtros de fecha
      const filtrosFecha = {}
      if (fechasExport.fechaInicio) {
        filtrosFecha.fechaInicio = fechasExport.fechaInicio
      }
      if (fechasExport.fechaFin) {
        filtrosFecha.fechaFin = fechasExport.fechaFin
      }

      console.log("Iniciando exportación con filtros:", filtrosFecha)

      // Obtener TODOS los registros
      const todosLosRegistros = await obtenerTodosLosRegistros(filtrosFecha)

      console.log(`Total de registros obtenidos para exportar: ${todosLosRegistros.length}`)

      if (todosLosRegistros.length === 0) {
        alert("No se encontraron registros para exportar con los filtros seleccionados")
        return
      }

      // Preparar datos para Excel
      const data = todosLosRegistros.map((mov) => ({
        Fecha: `${mov.fecha} ${mov.hora}`,
        Tipo: mov.tipo,
        Usuario: mov.asignacion_info.usuario.nombre,
        Cargo: mov.asignacion_info.usuario.cargo || "",
        Documento: mov.asignacion_info.usuario.documento_num,
        Serial_Dispositivo: mov.asignacion_info.dispositivo.serial,
        Marca: mov.asignacion_info.dispositivo.marca,
        Vigilante: mov.registrado_por_info?.nombre || "—",
      }))

      // Crear Excel
      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial")
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

      // Nombre del archivo según las fechas
      let fileName = `historial_movimientos_completo_${Date.now()}.xlsx`
      if (fechasExport.fechaInicio && fechasExport.fechaFin) {
        const fechaInicioFormat = format(new Date(fechasExport.fechaInicio), "dd-MM-yyyy")
        const fechaFinFormat = format(new Date(fechasExport.fechaFin), "dd-MM-yyyy")
        fileName = `historial_movimientos_${fechaInicioFormat}_al_${fechaFinFormat}.xlsx`
      } else if (fechasExport.fechaInicio) {
        const fechaInicioFormat = format(new Date(fechasExport.fechaInicio), "dd-MM-yyyy")
        fileName = `historial_movimientos_desde_${fechaInicioFormat}.xlsx`
      } else if (fechasExport.fechaFin) {
        const fechaFinFormat = format(new Date(fechasExport.fechaFin), "dd-MM-yyyy")
        fileName = `historial_movimientos_hasta_${fechaFinFormat}.xlsx`
      }

      // Descargar archivo
      saveAs(
        new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8",
        }),
        fileName,
      )

      alert(`✅ Se exportaron ${data.length} registros exitosamente`)
      setShowExportModal(false)
      setFechasExport({ fechaInicio: "", fechaFin: "" })
    } catch (error) {
      console.error("Error exportando:", error)
      alert("❌ Error al exportar los datos: " + error.message)
    } finally {
      setExportLoading(false)
    }
  }

  const styles = {
    container: {
      width: "calc(100% - 40px)",
      margin: "0 auto",
      padding: "1.5rem",
      fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
      backgroundColor: "transparent",
      borderRadius: "8px",
    },
    header: {
      color: "#ffffff",
      marginBottom: "1.5rem",
      paddingBottom: "0.5rem",
      borderBottom: "2px solid rgba(255,255,255,0.1)",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    },
    card: {
      backgroundColor: "#ffffff",
      borderRadius: "8px",
      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
      marginBottom: "1rem",
      overflow: "hidden",
    },
    movimientoItem: {
      padding: "1rem",
      borderBottom: "1px solid #eee",
      display: "grid",
      gridTemplateColumns: "1.5fr 1fr 1.2fr 1.2fr 1.5fr",
      gap: "1rem",
      alignItems: "center",
    },
    movimientoHeader: {
      backgroundColor: "#f8f9fa",
      fontWeight: "600",
    },
    fechaHora: {
      color: "#555",
      fontSize: "0.9rem",
    },
    tipoEntrada: {
      color: "#28a745",
      fontWeight: "500",
      backgroundColor: "#e6f7eb",
      padding: "0.3rem 0.6rem",
      borderRadius: "4px",
      display: "inline-block",
    },
    tipoSalida: {
      color: "#dc3545",
      fontWeight: "500",
      backgroundColor: "#fce8e8",
      padding: "0.3rem 0.6rem",
      borderRadius: "4px",
      display: "inline-block",
    },
    usuarioInfo: {
      display: "flex",
      flexDirection: "column",
    },
    documento: {
      fontSize: "0.85rem",
      color: "#666",
    },
    dispositivoInfo: {
      display: "flex",
      flexDirection: "column",
    },
    serial: {
      fontWeight: "500",
    },
    marca: {
      fontSize: "0.85rem",
      color: "#666",
    },
    registradoPor: {
      fontStyle: "italic",
      color: "#6c757d",
    },
    filtrosContainer: {
      backgroundColor: "rgba(255,255,255,0.1)",
      padding: "1.5rem",
      borderRadius: "8px",
      marginBottom: "1.5rem",
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: "1.5rem",
      backdropFilter: "blur(5px)",
    },
    input: {
      width: "100%",
      padding: "0.6rem 0.8rem",
      border: "1px solid rgba(255,255,255,0.2)",
      borderRadius: "6px",
      fontSize: "0.9rem",
      transition: "all 0.2s",
      backgroundColor: "rgba(0,0,0,0.2)",
      color: "#ffffff",
      "::placeholder": {
        color: "rgba(255,255,255,0.5)",
      },
      ":focus": {
        outline: "none",
        borderColor: "#4a90e2",
        boxShadow: "0 0 0 2px rgba(74, 144, 226, 0.2)",
      },
    },
    paginacion: {
      display: "flex",
      justifyContent: "center",
      gap: "0.5rem",
      marginTop: "1.5rem",
    },
    tr: {
      ":hover": {
        backgroundColor: "rgba(255,255,255,0.05)",
      },
    },
    tableContainer: {
      maxWidth: "100%",
      overflowX: "auto",
      borderRadius: "8px",
      backgroundColor: "rgba(30, 41, 59, 0.7)",
      backdropFilter: "blur(5px)",
      marginBottom: "1.5rem",
      border: "1px solid rgba(255, 255, 255, 0.1)",
    },
    cell: {
      padding: "1rem",
      borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
      color: "#ffffff",
      fontSize: "0.9rem",
      textAlign: "left",
    },
    tableHeader: {
      backgroundColor: "#1e2130",
      fontWeight: "600",
      color: "#ffffff",
      textTransform: "uppercase",
      fontSize: "0.8rem",
      letterSpacing: "0.5px",
    },
    evenRow: {
      backgroundColor: "#2b2f42",
    },
    oddRow: {
      backgroundColor: "rgba(255,255,255,0.1)",
    },
    exportButton: {
      marginBottom: "1rem",
      padding: "0.7rem 1.2rem",
      background: "#785bc7",
      color: "white",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "0.9rem",
      display: "flex",
      alignItems: "center",
      gap: "0.5rem",
      transition: "all 0.2s",
      ":hover": {
        transform: "translateY(-1px)",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.2)",
      },
    },
    tipoEntradaBadge: {
      backgroundColor: "rgba(40, 167, 69, 0.15)",
      color: "#28a745",
      padding: "0.3rem 0.8rem",
      borderRadius: "12px",
      fontSize: "0.8rem",
      fontWeight: "600",
      display: "inline-block",
      textTransform: "uppercase",
    },
    tipoSalidaBadge: {
      backgroundColor: "rgba(220, 53, 69, 0.15)",
      color: "#dc3545",
      padding: "0.3rem 0.8rem",
      borderRadius: "12px",
      fontSize: "0.8rem",
      fontWeight: "600",
      display: "inline-block",
      textTransform: "uppercase",
    },
    filterLabel: {
      display: "block",
      marginBottom: "0.5rem",
      fontSize: "0.9rem",
      color: "rgba(255,255,255,0.8)",
      fontWeight: "500",
    },
    // Estilos para modal de exportación
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.8)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modal: {
      backgroundColor: "#2b2f42",
      padding: "2rem",
      borderRadius: "12px",
      width: "90%",
      maxWidth: "500px",
      color: "#ffffff",
      boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
    },
    modalHeader: {
      marginBottom: "1.5rem",
      fontSize: "1.3rem",
      fontWeight: "600",
      textAlign: "center",
      color: "#ffffff",
    },
    modalBody: {
      marginBottom: "2rem",
    },
    modalFooter: {
      display: "flex",
      gap: "1rem",
      justifyContent: "flex-end",
    },
    modalButton: {
      padding: "0.8rem 1.5rem",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontWeight: "500",
      fontSize: "0.9rem",
      transition: "all 0.2s",
    },
    modalButtonPrimary: {
      backgroundColor: "#785bc7",
      color: "white",
    },
    modalButtonSecondary: {
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "#ffffff",
      border: "1px solid rgba(255,255,255,0.2)",
    },
    formGroup: {
      marginBottom: "1.2rem",
    },
    modalDescription: {
      marginBottom: "1.5rem",
      color: "rgba(255,255,255,0.8)",
      lineHeight: "1.5",
      fontSize: "0.95rem",
    },
    loadingText: {
      textAlign: "center",
      color: "#785bc7",
      fontSize: "0.9rem",
      marginTop: "1rem",
      fontStyle: "italic",
    },
  }

  const selectStyles = {
    ...styles.input,
    appearance: "none",
    backgroundImage:
      'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23ffffff%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 0.7rem top 50%",
    backgroundSize: "0.65rem auto",
  }

  return (
    <div className="dashboard-container">
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={{ margin: 0 }}>Historial de Entradas y Salidas</h2>
        </div>

        <div style={styles.filtrosContainer}>
          <div>
            <label style={styles.filterLabel}>Tipo</label>
            <select name="tipo" value={filtros.tipo} onChange={handleFiltroChange} style={selectStyles}>
              <option value="">Todos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SALIDA">Salidas</option>
            </select>
          </div>

          <div>
            <label style={styles.filterLabel}>Documento</label>
            <input
              type="text"
              name="documento"
              value={filtros.documento}
              onChange={handleFiltroChange}
              placeholder="Buscar por documento"
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.filterLabel}>Fecha inicio</label>
            <input
              type="date"
              name="fechaInicio"
              value={filtros.fechaInicio}
              onChange={handleFiltroChange}
              style={styles.input}
            />
          </div>

          <div>
            <label style={styles.filterLabel}>Fecha fin</label>
            <input
              type="date"
              name="fechaFin"
              value={filtros.fechaFin}
              onChange={handleFiltroChange}
              style={styles.input}
            />
          </div>
        </div>

        {loading ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#666",
              fontSize: "1.1rem",
            }}
          >
            Cargando historial...
          </div>
        ) : (
          <>
            <button onClick={() => setShowExportModal(true)} style={styles.exportButton}>
              <i className="fas fa-file-excel"></i>
              Exportar a Excel
            </button>

            <div
              style={{
                overflowX: "auto",
                borderRadius: "8px",
                boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                marginBottom: "1.5rem",
              }}
            >
              <div style={styles.tableContainer}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ ...styles.cell, ...styles.tableHeader }}>Fecha y Hora</th>
                      <th style={{ ...styles.cell, ...styles.tableHeader }}>Tipo</th>
                      <th style={{ ...styles.cell, ...styles.tableHeader }}>Usuario</th>
                      <th style={{ ...styles.cell, ...styles.tableHeader }}>Cargo</th>
                      <th style={{ ...styles.cell, ...styles.tableHeader }}>Documento</th>
                      <th style={{ ...styles.cell, ...styles.tableHeader }}>Dispositivo</th>
                      <th style={{ ...styles.cell, ...styles.tableHeader }}>Vigilante de turno</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimientos.map((movimiento, index) => (
                      <tr key={movimiento.id} style={index % 2 === 0 ? styles.evenRow : styles.oddRow}>
                        <td style={styles.cell}>
                          {format(
                            new Date(movimiento.fecha + "T" + movimiento.hora),
                            "d 'de' MMMM 'de' y 'a las' HH:mm:ss",
                            { locale: es },
                          )}
                        </td>
                        <td style={styles.cell}>
                          <span
                            style={movimiento.tipo === "ENTRADA" ? styles.tipoEntradaBadge : styles.tipoSalidaBadge}
                          >
                            {movimiento.tipo === "ENTRADA" ? "Entrada" : "Salida"}
                          </span>
                        </td>
                        <td style={styles.cell}>{movimiento.asignacion_info.usuario.nombre}</td>
                        <td style={styles.cell}>{movimiento.asignacion_info.usuario.cargo}</td>
                        <td style={styles.cell}>{movimiento.asignacion_info.usuario.documento}</td>
                        <td style={styles.cell}>
                          <div
                            style={{
                              fontWeight: "600",
                              color: "#ffffff",
                              marginBottom: "0.25rem",
                            }}
                          >
                            {movimiento.asignacion_info.dispositivo.serial}
                          </div>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "rgba(255, 255, 255, 0.7)",
                              display: "flex",
                              gap: "0.5rem",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                backgroundColor: "rgba(74, 144, 226, 0.2)",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "4px",
                                fontSize: "0.8rem",
                              }}
                            >
                              {movimiento.asignacion_info.dispositivo.tipo}
                            </span>
                            <span>-</span>
                            <span>{movimiento.asignacion_info.dispositivo.marca}</span>
                          </div>
                        </td>
                        <td style={styles.cell}>{movimiento.registrado_por_info?.nombre || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación mejorada */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: "1.5rem",
                flexWrap: "wrap",
                gap: "1rem",
              }}
            >
              <div
                style={{
                  color: "#ffffff",
                  fontSize: "0.9rem",
                }}
              >
                Mostrando {(paginacion.pagina - 1) * paginacion.porPagina + 1} -{" "}
                {Math.min(paginacion.pagina * paginacion.porPagina, paginacion.total)} de {paginacion.total} registros
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignItems: "center",
                }}
              >
                {/* Botón Anterior */}
                <button
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid rgba(255,255,255,0.2)",
                    backgroundColor: paginacion.pagina === 1 ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.1)",
                    color: paginacion.pagina === 1 ? "rgba(255,255,255,0.5)" : "#ffffff",
                    cursor: paginacion.pagina === 1 ? "not-allowed" : "pointer",
                    borderRadius: "4px",
                    transition: "all 0.2s",
                    fontSize: "0.9rem",
                  }}
                  onClick={() =>
                    paginacion.pagina > 1 && setPaginacion({ ...paginacion, pagina: paginacion.pagina - 1 })
                  }
                  disabled={paginacion.pagina === 1}
                  onMouseEnter={(e) => {
                    if (paginacion.pagina !== 1) {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (paginacion.pagina !== 1) {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.1)"
                    }
                  }}
                >
                  ← Anterior
                </button>

                {/* Números de página */}
                {(() => {
                  const totalPaginas = Math.ceil(paginacion.total / paginacion.porPagina)
                  const paginaActual = paginacion.pagina
                  const numeros = []

                  // Siempre mostrar página 1
                  if (totalPaginas > 0) {
                    numeros.push(
                      <button
                        key={1}
                        style={{
                          padding: "0.5rem 1rem",
                          border: "1px solid rgba(255,255,255,0.2)",
                          backgroundColor: paginaActual === 1 ? "#785bc7" : "rgba(255,255,255,0.1)",
                          color: paginaActual === 1 ? "white" : "#ffffff",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "all 0.2s",
                          fontSize: "0.9rem",
                        }}
                        onClick={() => setPaginacion({ ...paginacion, pagina: 1 })}
                        onMouseEnter={(e) => {
                          if (paginaActual !== 1) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (paginaActual !== 1) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.1)"
                          }
                        }}
                      >
                        1
                      </button>,
                    )
                  }

                  // Mostrar página 2 si existe y no es la actual
                  if (totalPaginas > 1 && paginaActual !== 2) {
                    numeros.push(
                      <button
                        key={2}
                        style={{
                          padding: "0.5rem 1rem",
                          border: "1px solid rgba(255,255,255,0.2)",
                          backgroundColor: paginaActual === 2 ? "#785bc7" : "rgba(255,255,255,0.1)",
                          color: paginaActual === 2 ? "white" : "#ffffff",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "all 0.2s",
                          fontSize: "0.9rem",
                        }}
                        onClick={() => setPaginacion({ ...paginacion, pagina: 2 })}
                        onMouseEnter={(e) => {
                          if (paginaActual !== 2) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (paginaActual !== 2) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.1)"
                          }
                        }}
                      >
                        2
                      </button>,
                    )
                  }

                  // Mostrar página 3 si existe y no es la actual
                  if (totalPaginas > 2 && paginaActual !== 3) {
                    numeros.push(
                      <button
                        key={3}
                        style={{
                          padding: "0.5rem 1rem",
                          border: "1px solid rgba(255,255,255,0.2)",
                          backgroundColor: paginaActual === 3 ? "#785bc7" : "rgba(255,255,255,0.1)",
                          color: paginaActual === 3 ? "white" : "#ffffff",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "all 0.2s",
                          fontSize: "0.9rem",
                        }}
                        onClick={() => setPaginacion({ ...paginacion, pagina: 3 })}
                        onMouseEnter={(e) => {
                          if (paginaActual !== 3) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (paginaActual !== 3) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.1)"
                          }
                        }}
                      >
                        3
                      </button>,
                    )
                  }

                  // Mostrar puntos suspensivos si hay más páginas
                  if (totalPaginas > 4) {
                    numeros.push(
                      <span key="dots" style={{ color: "#ffffff", padding: "0 0.5rem" }}>
                        ...
                      </span>,
                    )
                  }

                  // Mostrar última página si es diferente de las anteriores
                  if (totalPaginas > 3) {
                    numeros.push(
                      <button
                        key={totalPaginas}
                        style={{
                          padding: "0.5rem 1rem",
                          border: "1px solid rgba(255,255,255,0.2)",
                          backgroundColor: paginaActual === totalPaginas ? "#785bc7" : "rgba(255,255,255,0.1)",
                          color: paginaActual === totalPaginas ? "white" : "#ffffff",
                          cursor: "pointer",
                          borderRadius: "4px",
                          transition: "all 0.2s",
                          fontSize: "0.9rem",
                        }}
                        onClick={() => setPaginacion({ ...paginacion, pagina: totalPaginas })}
                        onMouseEnter={(e) => {
                          if (paginaActual !== totalPaginas) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (paginaActual !== totalPaginas) {
                            e.target.style.backgroundColor = "rgba(255,255,255,0.1)"
                          }
                        }}
                      >
                        {totalPaginas}
                      </button>,
                    )
                  }

                  return numeros
                })()}

                {/* Botón Siguiente */}
                <button
                  style={{
                    padding: "0.5rem 1rem",
                    border: "1px solid rgba(255,255,255,0.2)",
                    backgroundColor:
                      paginacion.pagina === Math.ceil(paginacion.total / paginacion.porPagina)
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.1)",
                    color:
                      paginacion.pagina === Math.ceil(paginacion.total / paginacion.porPagina)
                        ? "rgba(255,255,255,0.5)"
                        : "#ffffff",
                    cursor:
                      paginacion.pagina === Math.ceil(paginacion.total / paginacion.porPagina)
                        ? "not-allowed"
                        : "pointer",
                    borderRadius: "4px",
                    transition: "all 0.2s",
                    fontSize: "0.9rem",
                  }}
                  onClick={() => {
                    const totalPaginas = Math.ceil(paginacion.total / paginacion.porPagina)
                    if (paginacion.pagina < totalPaginas) {
                      setPaginacion({ ...paginacion, pagina: paginacion.pagina + 1 })
                    }
                  }}
                  disabled={paginacion.pagina === Math.ceil(paginacion.total / paginacion.porPagina)}
                  onMouseEnter={(e) => {
                    if (paginacion.pagina !== Math.ceil(paginacion.total / paginacion.porPagina)) {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (paginacion.pagina !== Math.ceil(paginacion.total / paginacion.porPagina)) {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.1)"
                    }
                  }}
                >
                  Siguiente →
                </button>
              </div>
            </div>
          </>
        )}

        {/* Modal de exportación */}
        {showExportModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>📊 Exportar Historial de Entradas y Salidas</div>
              <div style={styles.modalBody}>
                <div style={styles.modalDescription}>
                  <strong>¿De qué fecha a qué fecha quieres exportar el historial?</strong>
                  <br />
                  <br />
                  Si no seleccionas ninguna fecha, se exportarán <strong>TODOS</strong> los registros de tu base de
                  datos.
                  <br />
                  <br />
                  <em>⚠️ La exportación puede tomar varios minutos si tienes muchos registros.</em>
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.filterLabel}>Fecha de inicio (opcional):</label>
                  <input
                    type="date"
                    value={fechasExport.fechaInicio}
                    onChange={(e) =>
                      setFechasExport({
                        ...fechasExport,
                        fechaInicio: e.target.value,
                      })
                    }
                    style={styles.input}
                  />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.filterLabel}>Fecha de fin (opcional):</label>
                  <input
                    type="date"
                    value={fechasExport.fechaFin}
                    onChange={(e) =>
                      setFechasExport({
                        ...fechasExport,
                        fechaFin: e.target.value,
                      })
                    }
                    style={styles.input}
                  />
                </div>
                {exportLoading && (
                  <div style={styles.loadingText}>
                    🔄 Obteniendo todos los registros... Esto puede tomar varios minutos.
                  </div>
                )}
              </div>
              <div style={styles.modalFooter}>
                <button
                  style={{
                    ...styles.modalButton,
                    ...styles.modalButtonSecondary,
                  }}
                  onClick={() => {
                    setShowExportModal(false)
                    setFechasExport({ fechaInicio: "", fechaFin: "" })
                  }}
                  disabled={exportLoading}
                >
                  Cancelar
                </button>
                <button
                  style={{
                    ...styles.modalButton,
                    ...styles.modalButtonPrimary,
                    opacity: exportLoading ? 0.7 : 1,
                  }}
                  onClick={exportarExcelConFechas}
                  disabled={exportLoading}
                >
                  {exportLoading ? "Exportando..." : "Exportar Excel"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default HistorialMovimientos
