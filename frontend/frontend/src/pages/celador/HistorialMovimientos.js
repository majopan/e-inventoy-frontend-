"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import * as XLSX from "xlsx"
import { saveAs } from "file-saver"

const HistorialMovimientos = () => {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(true)

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
    totalPaginas: 0,
  })

  // Estado para el modal de exportación
  const [showExportModal, setShowExportModal] = useState(false)
  const [exportLoading, setExportLoading] = useState(false)
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

      const response = await axios.get("http://10.60.10.16:8000/api/control-acceso/historial-movimientos/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })

      setMovimientos(response.data.results)
      setPaginacion((prev) => ({
        ...prev,
        total: response.data.count,
        totalPaginas: Math.ceil(response.data.count / prev.porPagina),
      }))
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
    setPaginacion((prev) => ({ ...prev, pagina: 1 }))
  }

  const handlePaginaChange = (nuevaPagina) => {
    setPaginacion((prev) => ({ ...prev, pagina: nuevaPagina }))
  }

  const exportarExcelConFechas = async () => {
    try {
      setExportLoading(true)
      const token = sessionStorage.getItem("token")

      // Si no hay fechas, exportar todos los registros
      const params = {
        page: 1,
        per_page: 50000, // Número muy grande para obtener todos los registros
      }

      // Solo agregar fechas si están definidas
      if (fechasExport.fechaInicio) {
        params.fechaInicio = fechasExport.fechaInicio
      }
      if (fechasExport.fechaFin) {
        params.fechaFin = fechasExport.fechaFin
      }

      const response = await axios.get("http://10.60.10.16:8000/api/control-acceso/historial-movimientos/", {
        headers: { Authorization: `Bearer ${token}` },
        params,
      })

      const data = response.data.results.map((mov) => ({
        Fecha: `${mov.fecha} ${mov.hora}`,
        Tipo: mov.tipo,
        Usuario: mov.asignacion_info.usuario.nombre,
        Cargo: mov.asignacion_info.usuario.cargo || "",
        Documento: mov.asignacion_info.usuario.documento_num,
        Serial_Dispositivo: mov.asignacion_info.dispositivo.serial,
        Marca: mov.asignacion_info.dispositivo.marca,
        Vigilante: mov.registrado_por_info?.nombre || "—",
      }))

      const worksheet = XLSX.utils.json_to_sheet(data)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, "Historial")
      const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })

      // Nombre del archivo según si hay fechas o no
      let fileName = "historial_movimientos_completo.xlsx"
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

      saveAs(
        new Blob([excelBuffer], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8",
        }),
        fileName,
      )

      setShowExportModal(false)
      setFechasExport({ fechaInicio: "", fechaFin: "" })
    } catch (error) {
      console.error("Error exportando:", error)
      alert("Error al exportar los datos")
    } finally {
      setExportLoading(false)
    }
  }

  // Función para generar los números de página a mostrar
  const generarNumerosPagina = () => {
    const { pagina, totalPaginas } = paginacion
    const numeros = []
    const rango = 2 // Mostrar 2 páginas antes y después de la actual

    // Siempre mostrar la primera página
    if (totalPaginas > 0) {
      numeros.push(1)
    }

    // Agregar puntos suspensivos si hay un salto
    if (pagina > rango + 2) {
      numeros.push("...")
    }

    // Páginas alrededor de la actual
    for (let i = Math.max(2, pagina - rango); i <= Math.min(totalPaginas - 1, pagina + rango); i++) {
      numeros.push(i)
    }

    // Agregar puntos suspensivos si hay un salto
    if (pagina < totalPaginas - rango - 1) {
      numeros.push("...")
    }

    // Siempre mostrar la última página (si es diferente de la primera)
    if (totalPaginas > 1) {
      numeros.push(totalPaginas)
    }

    return numeros
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
    },
    tableContainer: {
      maxWidth: "100%",
      overflowX: "auto",
      borderRadius: "8px",
      backgroundColor: "#1e2130",
      backdropFilter: "blur(5px)",
      marginBottom: "1.5rem",
    },
    cell: {
      padding: "1rem",
      borderBottom: "1px solid rgba(255,255,255,0.1)",
      color: "#ffffff",
      fontSize: "0.9rem",
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
    },
    tipoEntrada: {
      backgroundColor: "rgba(40, 167, 69, 0.15)",
      color: "#28a745",
      padding: "0.3rem 0.8rem",
      borderRadius: "12px",
      fontSize: "0.8rem",
      fontWeight: "600",
      display: "inline-block",
      textTransform: "uppercase",
    },
    tipoSalida: {
      backgroundColor: "rgba(220, 53, 69, 0.15)",
      color: "#dc3545",
      padding: "0.3rem 0.8rem",
      borderRadius: "12px",
      fontSize: "0.8rem",
      fontWeight: "600",
      display: "inline-block",
      textTransform: "uppercase",
    },
    // Estilos para paginación mejorada
    paginacionContainer: {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: "1.5rem",
      flexWrap: "wrap",
      gap: "1rem",
    },
    paginacionInfo: {
      color: "#ffffff",
      fontSize: "0.9rem",
    },
    paginacionControles: {
      display: "flex",
      gap: "0.5rem",
      alignItems: "center",
    },
    paginacionBoton: {
      padding: "0.5rem 1rem",
      border: "1px solid rgba(255,255,255,0.2)",
      backgroundColor: "rgba(255,255,255,0.1)",
      color: "#ffffff",
      cursor: "pointer",
      borderRadius: "4px",
      transition: "all 0.2s",
      fontSize: "0.9rem",
    },
    paginacionBotonActivo: {
      backgroundColor: "#785bc7",
      borderColor: "#785bc7",
      color: "white",
    },
    paginacionBotonDeshabilitado: {
      opacity: 0.5,
      cursor: "not-allowed",
    },
    // Estilos para modal de exportación
    modalOverlay: {
      position: "fixed",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0,0,0,0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 1000,
    },
    modal: {
      backgroundColor: "#2b2f42",
      padding: "2rem",
      borderRadius: "8px",
      width: "90%",
      maxWidth: "500px",
      color: "#ffffff",
    },
    modalHeader: {
      marginBottom: "1.5rem",
      fontSize: "1.2rem",
      fontWeight: "600",
    },
    modalBody: {
      marginBottom: "1.5rem",
    },
    modalFooter: {
      display: "flex",
      gap: "1rem",
      justifyContent: "flex-end",
    },
    modalButton: {
      padding: "0.7rem 1.2rem",
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
      marginBottom: "1rem",
    },
    label: {
      display: "block",
      marginBottom: "0.5rem",
      fontSize: "0.9rem",
      color: "rgba(255,255,255,0.8)",
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
          <h2 style={{ margin: 0 }}>Historial Completo de Movimientos</h2>
        </div>

        <div style={styles.filtrosContainer}>
          <div>
            <label style={styles.label}>Tipo</label>
            <select name="tipo" value={filtros.tipo} onChange={handleFiltroChange} style={selectStyles}>
              <option value="">Todos</option>
              <option value="ENTRADA">Entradas</option>
              <option value="SALIDA">Salidas</option>
            </select>
          </div>
          <div>
            <label style={styles.label}>Documento</label>
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
            <label style={styles.label}>Fecha inicio</label>
            <input
              type="date"
              name="fechaInicio"
              value={filtros.fechaInicio}
              onChange={handleFiltroChange}
              style={styles.input}
            />
          </div>
          <div>
            <label style={styles.label}>Fecha fin</label>
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
            <button
              onClick={() => setShowExportModal(true)}
              style={styles.exportButton}
              onMouseEnter={(e) => {
                e.target.style.transform = "translateY(-1px)"
                e.target.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)"
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = "translateY(0)"
                e.target.style.boxShadow = "none"
              }}
            >
              <i className="fas fa-file-excel"></i>
              Exportar a Excel
            </button>

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
                        <span style={movimiento.tipo === "ENTRADA" ? styles.tipoEntrada : styles.tipoSalida}>
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

            {/* Paginación mejorada */}
            <div style={styles.paginacionContainer}>
              <div style={styles.paginacionInfo}>
                Mostrando {(paginacion.pagina - 1) * paginacion.porPagina + 1} -{" "}
                {Math.min(paginacion.pagina * paginacion.porPagina, paginacion.total)} de {paginacion.total} registros
              </div>

              <div style={styles.paginacionControles}>
                {/* Botón Anterior */}
                <button
                  style={{
                    ...styles.paginacionBoton,
                    ...(paginacion.pagina === 1 ? styles.paginacionBotonDeshabilitado : {}),
                  }}
                  onClick={() => handlePaginaChange(paginacion.pagina - 1)}
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
                {generarNumerosPagina().map((num, index) =>
                  num === "..." ? (
                    <span key={`dots-${index}`} style={{ color: "#ffffff", padding: "0 0.5rem" }}>
                      ...
                    </span>
                  ) : (
                    <button
                      key={num}
                      style={{
                        ...styles.paginacionBoton,
                        ...(paginacion.pagina === num ? styles.paginacionBotonActivo : {}),
                      }}
                      onClick={() => handlePaginaChange(num)}
                      onMouseEnter={(e) => {
                        if (paginacion.pagina !== num) {
                          e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (paginacion.pagina !== num) {
                          e.target.style.backgroundColor = "rgba(255,255,255,0.1)"
                        }
                      }}
                    >
                      {num}
                    </button>
                  ),
                )}

                {/* Botón Siguiente */}
                <button
                  style={{
                    ...styles.paginacionBoton,
                    ...(paginacion.pagina === paginacion.totalPaginas ? styles.paginacionBotonDeshabilitado : {}),
                  }}
                  onClick={() => handlePaginaChange(paginacion.pagina + 1)}
                  disabled={paginacion.pagina === paginacion.totalPaginas}
                  onMouseEnter={(e) => {
                    if (paginacion.pagina !== paginacion.totalPaginas) {
                      e.target.style.backgroundColor = "rgba(255,255,255,0.2)"
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (paginacion.pagina !== paginacion.totalPaginas) {
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

        {showExportModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <div style={styles.modalHeader}>Exportar Historial de Movimientos</div>
              <div style={styles.modalBody}>
                <p style={{ marginBottom: "1.5rem", color: "rgba(255,255,255,0.8)" }}>
                  Selecciona el rango de fechas para exportar. Si no seleccionas fechas, se exportarán todos los
                  registros de la base de datos.
                </p>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Fecha de inicio (opcional):</label>
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
                  <label style={styles.label}>Fecha de fin (opcional):</label>
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
