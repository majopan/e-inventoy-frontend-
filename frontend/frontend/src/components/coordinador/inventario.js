/* eslint-disable no-unused-vars */
"use client"

import { useEffect, useState, useCallback } from "react"
import axios from "axios"
import { useAuth } from "../auth"
import { Search, Trash2, FileText, ChevronLeft, ChevronRight, AlertCircle, CheckCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import * as XLSX from "xlsx"
import "../../styles/Inventario.css"

const Inventario = () => {
  const { isAdmin, sedeId, user, token } = useAuth()

  const [dispositivos, setDispositivos] = useState([])
  const [sedes, setSedes] = useState([])
  const [pisos, setPisos] = useState([])
  const [subpisos, setSubpisos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filtros, setFiltros] = useState({ tipo: "", estado: "", sede: "" })
  const [currentPage, setCurrentPage] = useState(1)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [importProgress, setImportProgress] = useState(null)
  const [importResults, setImportResults] = useState(null)
  const itemsPerPage = 7

  const fetchSedes = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/sedes/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      setSedes(response.data)
      return response.data
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      setError("Error al cargar las sedes")
      return []
    }
  }, [token])

  const fetchPisos = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/pisos/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      setPisos(response.data.results || [])
    } catch (error) {
      console.error("Error al cargar los pisos:", error)
      setError("Error al cargar los pisos")
      setPisos([])
    }
  }, [token])

  const fetchSubpisos = useCallback(async () => {
    try {
      const response = await axios.get("http://localhost:8000/api/subpisos/", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      })
      setSubpisos(response.data.results || [])
    } catch (error) {
      console.error("Error al cargar los subpisos:", error)
      setError("Error al cargar los subpisos")
      setSubpisos([])
    }
  }, [token])

  const fetchDispositivos = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      let url = "http://localhost:8000/api/dispositivos/"
      if (!isAdmin && sedeId) url += `?sede_id=${sedeId}`

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        validateStatus: (status) => status >= 200 && status < 300,
      })

      let dispositivosData = []

      if (Array.isArray(response.data)) {
        dispositivosData = response.data
      } else if (response.data && Array.isArray(response.data.data)) {
        dispositivosData = response.data.data
      } else if (response.data && Array.isArray(response.data.results)) {
        dispositivosData = response.data.results
      } else {
        console.error("Formato de respuesta inesperado:", response.data)
        throw new Error("Formato de datos inválido recibido del servidor")
      }

      setDispositivos(dispositivosData)
    } catch (error) {
      console.error("Error al obtener dispositivos:", error)

      let errorMessage = "Error al cargar dispositivos"
      if (error.response) {
        if (error.response.status === 401) {
          errorMessage = "Sesión expirada o no autorizada. Inicia sesión nuevamente."
        } else if (error.response.status === 500) {
          errorMessage = "Error interno del servidor."
        }
      } else if (error.request) {
        errorMessage = "No se recibió respuesta del servidor."
      } else {
        errorMessage = error.message
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin, sedeId])

  useEffect(() => {
    const cargarDatos = async () => {
      const sedesData = await fetchSedes()
      await fetchPisos()
      await fetchSubpisos()
      await fetchDispositivos()
    }

    cargarDatos()
  }, [fetchDispositivos, fetchSedes, fetchPisos, fetchSubpisos])

  const getNombreSede = (dispositivo) => {
    if (
      typeof dispositivo.sede === "number" ||
      (typeof dispositivo.sede === "string" && !isNaN(Number.parseInt(dispositivo.sede)))
    ) {
      const sedeId = typeof dispositivo.sede === "number" ? dispositivo.sede : Number.parseInt(dispositivo.sede)
      const sedeEncontrada = sedes.find((s) => s.id === sedeId)
      if (sedeEncontrada) {
        return sedeEncontrada.nombre
      }
      return `Sede ID: ${sedeId}`
    }

    if (dispositivo.sede && typeof dispositivo.sede === "object" && dispositivo.sede.nombre) {
      return dispositivo.sede.nombre
    }

    if (dispositivo.sede_nombre) {
      return dispositivo.sede_nombre
    }

    if (typeof dispositivo.sede === "string" && dispositivo.sede !== "") {
      return dispositivo.sede
    }

    if (dispositivo.sede_id) {
      const sedeEncontrada = sedes.find((sede) => sede.id === dispositivo.sede_id)
      if (sedeEncontrada) {
        return sedeEncontrada.nombre
      }
      return `Sede ID: ${dispositivo.sede_id}`
    }

    return "No asignada"
  }

  const getNombrePiso = (pisoId, subpisoId) => {
    if (!pisoId && !subpisoId) return "-";
    
    let pisoNombre = "";
    let subpisoNombre = "";
    
    // Obtener nombre del piso
    if (pisoId) {
      if (typeof pisoId === "object" && pisoId.nombre) {
        pisoNombre = pisoId.nombre;
      } else {
        const id = typeof pisoId === "number" ? pisoId : Number.parseInt(pisoId);
        const pisoEncontrado = pisos.find((p) => p.id === id);
        pisoNombre = pisoEncontrado ? pisoEncontrado.nombre : `Piso ID: ${id}`;
      }
    }
    
    // Obtener nombre del subpiso
    if (subpisoId) {
      if (typeof subpisoId === "object" && subpisoId.nombre) {
        subpisoNombre = subpisoId.nombre;
      } else {
        const id = typeof subpisoId === "number" ? subpisoId : Number.parseInt(subpisoId);
        const subpisoEncontrado = subpisos.find((s) => s.id === id);
        subpisoNombre = subpisoEncontrado ? subpisoEncontrado.nombre : `Subpiso ID: ${id}`;
      }
    }
    
    // Construir el resultado
    if (pisoNombre && subpisoNombre) {
      return `${pisoNombre} / ${subpisoNombre}`;
    } else if (pisoNombre) {
      return pisoNombre;
    } else if (subpisoNombre) {
      return subpisoNombre;
    }
    
    return "-";
  }

  const handleDelete = async (deviceId) => {
    if (!window.confirm("¿Está seguro que desea eliminar este dispositivo?")) return

    try {
      setLoading(true)
      setError(null)

      await axios.delete(`http://localhost:8000/api/dispositivos/${deviceId}/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        validateStatus: (status) => status === 204 || (status >= 200 && status < 300),
      })

      setSuccess("Dispositivo eliminado correctamente")
      setTimeout(() => setSuccess(null), 5000)
      await fetchDispositivos()
    } catch (error) {
      console.error("Error al eliminar el dispositivo", error)

      let errorMessage = "Error al eliminar dispositivo"
      if (error.response) {
        if (error.response.status === 404) {
          errorMessage = "Dispositivo no encontrado"
        } else if (error.response.data && error.response.data.detail) {
          errorMessage = error.response.data.detail
        }
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleExportExcel = () => {
    try {
      if (dispositivos.length === 0) {
        throw new Error("No hay datos para exportar")
      }

      const ws = XLSX.utils.json_to_sheet(
        dispositivos.map((dispositivo) => ({
          PISO: getNombrePiso(dispositivo.piso, dispositivo.subpiso),
          POSICION: dispositivo.posicion_nombre || "",
          SERVICIO: dispositivo.servicio_nombre || "",
          CODIGO_ANALITICO: dispositivo.codigo_analitico || "",
          TIPO_DISPOSITIVO: dispositivo.tipo || "",
          FABRICANTE: dispositivo.marca || "",
          SERIAL: dispositivo.serial || "Sin serial",
          PLACA_CU: dispositivo.placa_cu || "",
          SISTEMA_OPERATIVO: dispositivo.sistema_operativo || "",
          PROCESADOR: dispositivo.procesador || "",
          DISCO_DURO: dispositivo.capacidad_disco_duro || "",
          MEMORIA_RAM: dispositivo.capacidad_memoria_ram || "",
          PROVEEDOR: dispositivo.proveedor || "",
          ESTADO_PROPIEDAD: dispositivo.estado_propiedad || "",
          RAZON_SOCIAL: dispositivo.razon_social || "",
          UBICACION: dispositivo.ubicacion || "",
          ESTADO: dispositivo.estado || "",
          OBSERVACION: dispositivo.observaciones || "",
          REGIMEN: dispositivo.regimen || "",
          SEDE: getNombreSede(dispositivo),
        })),
      )

      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Inventario")
      XLSX.writeFile(wb, `Inventario_${new Date().toISOString().split("T")[0]}.xlsx`)

      setSuccess("Archivo exportado correctamente")
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error("Error al exportar a Excel", error)
      setError(`Error al exportar: ${error.message}`)
    }
  }

  const handleImportExcel = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Por favor, suba un archivo Excel (.xlsx o .xls)")
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      const confirm = window.confirm("El archivo es grande (>5MB). ¿Está seguro de continuar con la importación?")
      if (!confirm) {
        event.target.value = ""
        return
      }
    }

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)
      setImportProgress("Preparando importación...")
      setImportResults(null)

      const formData = new FormData()
      formData.append("file", file)
      // Asegurarse de que los dispositivos se importen solo a la sede del coordinador
      if (!isAdmin && sedeId) {
        formData.append("sede_id", sedeId)
      }

      const response = await axios.post("http://localhost:8000/api/importar-dispositivos/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
            setImportProgress(`Enviando datos: ${percentCompleted}%`)
          }
        },
      })

      setImportProgress(null)
      setImportResults(response.data)

      if (response.data.errors && response.data.errors.length > 0) {
        setError(`Importación completada con ${response.data.errors.length} errores`)
      } else {
        setSuccess(`Importación exitosa: ${response.data.created} creados, ${response.data.updated} actualizados`)
      }

      await fetchDispositivos()
    } catch (error) {
      setImportProgress(null)

      let errorMessage = "Error al importar datos"
      if (error.response) {
        if (error.response.data && error.response.data.error) {
          errorMessage = error.response.data.error
        } else if (error.response.status === 413) {
          errorMessage = "El archivo es demasiado grande (límite 10MB)"
        } else if (error.response.status === 400) {
          errorMessage = error.response.data.detail || "Datos inválidos en el archivo"
        }
      } else if (error.message.includes("Network Error")) {
        errorMessage = "Error de conexión con el servidor"
      }

      setError(errorMessage)
    } finally {
      setLoading(false)
      event.target.value = ""
    }
  }

  const filteredDispositivos = Array.isArray(dispositivos)
    ? dispositivos
        .filter(
          (dispositivo) =>
            dispositivo.modelo?.toLowerCase().includes(search.toLowerCase()) ||
            dispositivo.marca?.toLowerCase().includes(search.toLowerCase()) ||
            dispositivo.serial?.toLowerCase().includes(search.toLowerCase()),
        )
        .filter(
          (dispositivo) =>
            (filtros.tipo ? dispositivo.tipo === filtros.tipo : true) &&
            (filtros.estado ? dispositivo.estado === filtros.estado : true) &&
            (filtros.sede ? getNombreSede(dispositivo) === filtros.sede : true),
        )
    : []

  const pageCount = Math.ceil(filteredDispositivos.length / itemsPerPage)
  const currentItems = filteredDispositivos.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const dispositivosPorTipo = Array.isArray(dispositivos)
    ? dispositivos.reduce((acc, dispositivo) => {
        acc[dispositivo.tipo] = (acc[dispositivo.tipo] || 0) + 1
        return acc
      }, {})
    : {}

  const dispositivosPorProveedor = Array.isArray(dispositivos)
    ? dispositivos.reduce((acc, dispositivo) => {
        acc[dispositivo.marca] = (acc[dispositivo.marca] || 0) + 1
        return acc
      }, {})
    : {}

  const tipoChartData = Object.entries(dispositivosPorTipo).map(([tipo, cantidad]) => ({
    name: tipo,
    value: cantidad,
  }))

  const proveedorChartData = Object.entries(dispositivosPorProveedor).map(([marca, cantidad]) => ({
    name: marca,
    value: cantidad,
  }))

  const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7300", "#0088FE"]

  return (
    <div className="inventory-containert">
      <div className="main-content">
        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>×</button>
          </div>
        )}

        <div className="notifications-container">
          {success && (
            <div className="success-banner">
              <CheckCircle size={18} />
              <span>{success}</span>
              <button onClick={() => setSuccess(null)}>×</button>
            </div>
          )}

          {importProgress && (
            <div className="info-banner">
              <span>{importProgress}</span>
            </div>
          )}

          {importResults && (
            <div className={`import-results ${importResults.errors ? "has-errors" : ""}`}>
              <p>Resultados de la importación</p>
              <p>Total procesados: {importResults.total}</p>
              <p>Dispositivos creados: {importResults.created}</p>
              <p>Dispositivos actualizados: {importResults.updated}</p>

              {importResults.errors && (
                <div className="import-errors">
                  <h4>Errores encontrados ({importResults.errors.length}):</h4>
                  <div className="errors-list">
                    <div className="errors-list-container">
                      {importResults.errors.map((error, index) => (
                        <div key={index} className="error-item">
                          {error}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button onClick={() => setImportResults(null)} className="close-results">
                Cerrar
              </button>
            </div>
          )}
        </div>

        {!isAdmin && (
          <div className="info-banner">
            Mostrando solo los dispositivos de tu sede asignada: {user?.sedeNombre || "Sede no asignada"}
          </div>
        )}

        <div className="search-bar-container">
          <div className="search-containert">
            <Search className="search-icont" />
            <input
              type="text"
              placeholder="Buscar por modelo, marca o serial..."
              className="search-inputt"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
            />
          </div>
        </div>

        <div className="filters-containert">
          <div className="action-buttonst">
            <label className="action-buttont">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                style={{ display: "none" }}
                disabled={loading}
              />
              {loading ? "Cargando..." : "Importar Excel"}
            </label>
            <button
              onClick={handleExportExcel}
              className="action-buttont"
              disabled={loading || dispositivos.length === 0}
            >
              <FileText size={16} />
              Exportar Excel
            </button>
          </div>

          <select
            value={filtros.tipo}
            onChange={(e) => setFiltros({ ...filtros, tipo: e.target.value })}
            className="filter-select"
            disabled={loading}
          >
            <option value="">Todos los tipos</option>
            <option value="COMPUTADOR">Computador</option>
            <option value="DESKTOP">Desktop</option>
            <option value="MONITOR">Monitor</option>
            <option value="TABLET">Tablet</option>
            <option value="MOVIL">Celular</option>
            <option value="HP_PRODISPLAY_P201">HP ProDisplay P201</option>
            <option value="PORTATIL">Portátil</option>
            <option value="TODO_EN_UNO">Todo en uno</option>
          </select>

          {isAdmin && (
            <select
              value={filtros.sede}
              onChange={(e) => setFiltros({ ...filtros, sede: e.target.value })}
              className="filter-select"
              disabled={loading}
            >
              <option value="">Todas las sedes</option>
              {sedes.map((sede) => (
                <option key={sede.id} value={sede.nombre}>
                  {sede.nombre}
                </option>
              ))}
            </select>
          )}

          <select
            value={filtros.estado}
            onChange={(e) => setFiltros({ ...filtros, estado: e.target.value })}
            className="filter-select"
            disabled={loading}
          >
            <option value="">Todos los estados</option>
            <option value="BUENO">Bueno</option>
            <option value="BODEGA_CN">Bodega CN</option>
            <option value="BODEGA">Bodega</option>
            <option value="MALA">Mala</option>
            <option value="MALO">Malo</option>
            <option value="PENDIENTE_BAJA">Pendiente/Baja</option>
            <option value="PERDIDO_ROBADO">Perdido/Robado</option>
            <option value="REPARAR">Reparar</option>
            <option value="REPARAR_BAJA">Reparar/Baja</option>
            <option value="SEDE">Sede</option>
            <option value="STOCK">Stock</option>
          </select>
        </div>

        <div className="table-containert">
          <table className="inventory-tablet">
            <thead>
              <tr>
                <th>Piso/Subpiso</th>
                <th>Posición</th>
                <th>Servicio</th>
                <th>Código Analítico</th>
                <th>Tipo Dispositivo</th>
                <th>Fabricante</th>
                <th>Serial</th>
                <th>CU(placa_cu)</th>
                <th>Sistema Operativo</th>
                <th>Procesador</th>
                <th>Disco Duro</th>
                <th>Memoria RAM</th>
                <th>Proveedor</th>
                <th>Estado Proveedor</th>
                <th>Razón Social</th>
                <th>Ubicación</th>
                <th>Estado</th>
                <th>Observación</th>
                <th>Regimen</th>
                <th>Sede</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={21} style={{ textAlign: "center", padding: "2rem" }}>
                    <div style={{ display: "flex", justifyContent: "center" }}>
                      <div className="loader"></div>
                    </div>
                  </td>
                </tr>
              ) : filteredDispositivos.length === 0 ? (
                <tr>
                  <td colSpan={21} style={{ textAlign: "center", padding: "2rem", color: "#666" }}>
                    {search || Object.values(filtros).some(Boolean)
                      ? "No se encontraron dispositivos con los filtros aplicados"
                      : "No hay dispositivos registrados"}
                  </td>
                </tr>
              ) : (
                currentItems.map((dispositivo) => {
                  const nombreSede = getNombreSede(dispositivo)

                  return (
                    <tr key={dispositivo.id}>
                      <td>{getNombrePiso(dispositivo.piso, dispositivo.subpiso)}</td>
                      <td>{dispositivo.posicion_nombre || "-"}</td>
                      <td>{dispositivo.servicio_nombre || "-"}</td>
                      <td>{dispositivo.codigo_analitico || "-"}</td>
                      <td>{dispositivo.tipo || "-"}</td>
                      <td>{dispositivo.marca || "-"}</td>
                      <td>{dispositivo.serial || "-"}</td>
                      <td>{dispositivo.placa_cu || "-"}</td>
                      <td>{dispositivo.sistema_operativo || "-"}</td>
                      <td>{dispositivo.procesador || "-"}</td>
                      <td>{dispositivo.capacidad_disco_duro || "-"}</td>
                      <td>{dispositivo.capacidad_memoria_ram || "-"}</td>
                      <td>{dispositivo.proveedor || "-"}</td>
                      <td>{dispositivo.estado_propiedad || "-"}</td>
                      <td>{dispositivo.razon_social || "-"}</td>
                      <td>{dispositivo.ubicacion || "-"}</td>
                      <td>
                        <span className={`estado-badge estado-${dispositivo.estado?.toLowerCase() || "desconocido"}`}>
                          {dispositivo.estado || "-"}
                        </span>
                      </td>
                      <td>{dispositivo.observaciones || "-"}</td>
                      <td>{dispositivo.regimen || "-"}</td>
                      <td>
                        <span className="sede-badge">{nombreSede}</span>
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(dispositivo.id)}
                          className="delete-buttont"
                          disabled={loading}
                          title="Eliminar dispositivo"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {filteredDispositivos.length > 0 && (
            <div className="paginationt">
              <div className="pagination-infot">
                Mostrando {(currentPage - 1) * itemsPerPage + 1} a{" "}
                {Math.min(currentPage * itemsPerPage, filteredDispositivos.length)} de {filteredDispositivos.length}{" "}
                dispositivos
              </div>
              <div className="pagination-buttonst">
                <button
                  onClick={() => setCurrentPage((old) => Math.max(old - 1, 1))}
                  disabled={currentPage === 1 || loading}
                  className="pagination-buttont"
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ margin: "0 0.5rem" }}>
                  Página {currentPage} de {pageCount}
                </span>
                <button
                  onClick={() => setCurrentPage((old) => Math.min(old + 1, pageCount))}
                  disabled={currentPage === pageCount || loading}
                  className="pagination-buttont"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {dispositivos.length > 0 && (
          <div className="charts-container">
            <div className="chart-containert">
              <h2 className="chart-titlet">Dispositivos por Tipo</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={tipoChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {tipoChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [`${value} dispositivos`, "Cantidad"]}
                    labelFormatter={(label) => `Tipo: ${label}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="chart-containert">
              <h2 className="chart-titlet">Dispositivos por Proveedor</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={proveedorChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip
                    formatter={(value) => [`${value} dispositivos`, "Cantidad"]}
                    labelFormatter={(label) => `Proveedor: ${label}`}
                  />
                  <Bar dataKey="value" name="Cantidad" fill="#8884d8" animationDuration={1500} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .error-banner {
          padding: 1rem;
          background-color: #ffebee;
          color: #c62828;
          border-radius: 4px;
          margin-bottom: 1rem;
          border: 1px solid #ef9a9a;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        
        .success-banner {
          padding: 1rem;
          background-color: #e8f5e9;
          color: #2e7d32;
          border-radius: 4px;
          margin-bottom: 1rem;
          border: 1px solid #a5d6a7;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }
        
        .info-banner {
          padding: 1rem;
          background-color: #e3f2fd;
          color: #1565c0;
          border-radius: 4px;
          margin-bottom: 1rem;
          border: 1px solid #90caf9;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .import-results {
          padding: 1.5rem;
          background-color:rgb(43, 46, 66);
          border-radius: 8px;
          margin: 1rem 0;
          border: 1px solid #90caf9;
        }
        
        .import-results.has-errors {
          border-left: 4px solid #ff9800;
        }
        
        .import-results h3 {
          margin-top: 0;
          color: #333;
        }
        
        .import-results p {
          margin: 0.5rem 0;
        }
        
        .import-errors {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px dashed #ccc;
        }
        
        .import-errors h4 {
          margin-bottom: 0.5rem;
          color: #d32f2f;
        }
        
        .errors-list {
          max-height: 200px;
          overflow-y: auto;
          background-color: #f5f5f5;
          padding: 0.5rem;
          border-radius: 4px;
          border: 1px solid #eee;
        }
        
        .error-item {
          padding: 0.25rem 0;
          border-bottom: 1px solid #e0e0e0;
          font-size: 0.9rem;
        }
        
        .error-item:last-child {
          border-bottom: none;
        }
        
        .close-results {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background-color: #1976d2;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
        }
        
        .close-results:hover {
          background-color: #1565c0;
        }
        
        .charts-container {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 2rem;
          margin-top: 2rem;
        }
        
        .loader {
          border: 4px solid #f3f3f3;
          border-top: 4px solid #3498db;
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
        }
        
        .estado-badge {
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.8rem;
          font-weight: 500;
        }
        
        .estado-bueno { background-color: #e8f5e9; color: #2e7d32; }
        .estado-bodega_cn { background-color: #e3f2fd; color: #1565c0; }
        .estado-bodega { background-color: #e3f2fd; color: #1565c0; }
        .estado-mala { background-color: #ffebee; color: #c62828; }
        .estado-malo { background-color: #ffebee; color: #c62828; }
        .estado-pendiente_baja { background-color: #fff8e1; color: #ff8f00; }
        .estado-perdido_robado { background-color: #f3e5f5; color: #7b1fa2; }
        .estado-reparar { background-color: #fff3e0; color: #e65100; }
        .estado-reparar_baja { background-color: #fbe9e7; color: #d84315; }
        .estado-sede { background-color: #e0f7fa; color: #00838f; }
        .estado-stock { background-color: #f1f8e9; color: #558b2f; }
        .estado-desconocido { background-color: #eceff1; color: #455a64; }
        
        .sede-badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          background-color: #e3f2fd;
          color: #1565c0;
          font-weight: 500;
        }
      `}</style>
    </div>
  )
}

export default Inventario