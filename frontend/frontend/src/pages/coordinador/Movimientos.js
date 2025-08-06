/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { format } from "date-fns"
import "../../styles/movimientos.css"
import { useAuth } from "../../components/auth"
import { FaCheck, FaExclamationTriangle, FaInfo, FaTimes } from "react-icons/fa"

const Movimientos = () => {
  const { sedeId, sedeNombre } = useAuth()

  // Estados principales
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoDetallesAbierto, setDialogoDetallesAbierto] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState(null)
  const [busquedaPosicionOrigen, setBusquedaPosicionOrigen] = useState("")
  const [busquedaPosicionDestino, setBusquedaPosicionDestino] = useState("")

  // Estados para alertas
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

  // Estados para paginación y filtros - CORREGIDO
  const [paginacion, setPaginacion] = useState({
    pagina: 1,
    itemsPorPagina: 10,
    totalItems: 0,
    totalPaginas: 0,
  })

  const [filtros, setFiltros] = useState({
    sede: sedeId,
    posicion: "",
    fecha_inicio: "",
    fecha_fin: "",
    dispositivo_id: "",
  })

  // Estados para el modal de creación
  const [posicionActual, setPosicionActual] = useState("")
  const [posicionNueva, setPosicionNueva] = useState("")
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState("")
  const [busquedaDispositivo, setBusquedaDispositivo] = useState("")
  const [detalle, setDetalle] = useState("")
  const [dispositivos, setDispositivos] = useState([])
  const [todosDispositivos, setTodosDispositivos] = useState([])

  // Estados para la selección jerárquica con modelo de pisos
  const [pisosOrigen, setPisosOrigen] = useState([])
  const [pisosDestino, setPisosDestino] = useState([])
  const [pisoOrigenSeleccionado, setPisoOrigenSeleccionado] = useState("")
  const [pisoDestinoSeleccionado, setPisoDestinoSeleccionado] = useState("")
  const [posicionesPorPisoOrigen, setPosicionesPorPisoOrigen] = useState([])
  const [posicionesPorPisoDestino, setPosicionesPorPisoDestino] = useState([])
  const [cargandoPisos, setCargandoPisos] = useState(false)
  const [cargandoDispositivos, setCargandoDispositivos] = useState(false)
  const [cargandoPosicionesOrigen, setCargandoPosicionesOrigen] = useState(false)
  const [cargandoPosicionesDestino, setCargandoPosicionesDestino] = useState(false)

  // Actualizar filtros cuando cambie sedeId
  useEffect(() => {
    setFiltros((prev) => ({
      ...prev,
      sede: sedeId,
    }))
  }, [sedeId])

  // Auto-cerrar alertas después de un tiempo determinado
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // EFECTO CORREGIDO: Recargar datos cuando cambie la página
  useEffect(() => {
    if (!sedeId) return
    obtenerMovimientos()
  }, [sedeId, paginacion.pagina, paginacion.itemsPorPagina])

  // Obtener datos iniciales
  useEffect(() => {
    if (!sedeId) return
    console.log("🚀 Componente Movimientos montado con sede:", sedeId)
    obtenerTodosDispositivos()
    obtenerPisosPorSede(sedeId)
  }, [sedeId])

  // Función auxiliar para extraer la marca del dispositivo
  const extraerMarcaDispositivo = (movimiento) => {
    const posiblesMarcas = [
      movimiento.dispositivo_info?.marca,
      movimiento.dispositivo?.marca,
      movimiento.dispositivo_data?.marca,
      movimiento.device?.marca,
      movimiento.device?.brand,
      movimiento.dispositivo_info?.brand,
      movimiento.dispositivo?.brand,
    ]
    for (const marca of posiblesMarcas) {
      if (marca && marca !== "" && marca !== "N/A" && marca !== null && marca !== undefined) {
        return String(marca)
      }
    }
    if (movimiento.dispositivo) {
      const dispositivoCompleto = todosDispositivos.find(
        (d) => d.id === movimiento.dispositivo || d.id === movimiento.dispositivo?.id,
      )
      if (dispositivoCompleto?.marca && dispositivoCompleto.marca !== "N/A") {
        return String(dispositivoCompleto.marca)
      }
    }
    return "No especificada"
  }

  // Función auxiliar para extraer información completa del dispositivo
  const extraerInfoDispositivo = (movimiento) => {
    const dispositivo_info = movimiento.dispositivo_info || {}
    const dispositivo = movimiento.dispositivo || {}
    const dispositivoCompleto = todosDispositivos.find(
      (d) =>
        d.id === (dispositivo.id || movimiento.dispositivo) ||
        d.serial === (dispositivo_info.serial || dispositivo.serial),
    )

    return {
      id: String(dispositivo.id || movimiento.dispositivo || ""),
      serial: String(dispositivo_info.serial || dispositivo.serial || dispositivoCompleto?.serial || "No especificado"),
      modelo: String(dispositivo_info.modelo || dispositivo.modelo || dispositivoCompleto?.modelo || "No especificado"),
      marca:
        dispositivoCompleto?.marca &&
        dispositivoCompleto.marca !== "No especificada" &&
        dispositivoCompleto.marca !== "N/A"
          ? String(dispositivoCompleto.marca)
          : dispositivo_info.marca && dispositivo_info.marca !== "No especificada" && dispositivo_info.marca !== "N/A"
            ? String(dispositivo_info.marca)
            : dispositivo.marca && dispositivo.marca !== "No especificada" && dispositivo.marca !== "N/A"
              ? String(dispositivo.marca)
              : null,
      tipo: String(dispositivo_info.tipo || dispositivo.tipo || dispositivoCompleto?.tipo || "No especificado"),
    }
  }

  // Obtener pisos de la sede del usuario
  const obtenerPisosPorSede = async (sedeIdParam) => {
    if (!sedeIdParam) {
      setPisosOrigen([])
      setPisosDestino([])
      return
    }

    setCargandoPisos(true)
    try {
      console.log("🏢 Cargando pisos para sede:", sedeIdParam)
      const token = sessionStorage.getItem("token")
      const respuesta = await axios.get("http://localhost:8000/api/pisos/", {
        params: {
          sede_id: sedeIdParam,
          page_size: 1000,
        },
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })

      let pisosData = []
      if (Array.isArray(respuesta.data)) {
        pisosData = respuesta.data
      } else if (respuesta.data?.results && Array.isArray(respuesta.data.results)) {
        pisosData = respuesta.data.results
      } else if (respuesta.data?.data && Array.isArray(respuesta.data.data)) {
        pisosData = respuesta.data.data
      }

      const pisosFiltered = pisosData.filter((piso) => {
        const pisoSede = piso.sede || piso.sede_id || piso.sedeId
        const sedeIdNum = Number(sedeIdParam)
        const pisoSedeNum = Number(pisoSede)
        return pisoSedeNum === sedeIdNum || pisoSede === sedeIdParam || pisoSede === sedeIdNum
      })

      const pisosFormateados = pisosFiltered.map((piso) => ({
        id: piso.id || piso._id || "",
        nombre: piso.nombre || piso.name || `Piso ${piso.numero || piso.number || piso.piso}`,
        numero: piso.numero || piso.number || piso.piso || "",
        sede_id: piso.sede_id || piso.sede || sedeIdParam,
      }))

      pisosFormateados.sort((a, b) => {
        const numA = Number.parseInt(a.numero) || 0
        const numB = Number.parseInt(b.numero) || 0
        return numA - numB
      })

      console.log("✅ Pisos filtrados para sede:", pisosFormateados)
      setPisosOrigen(pisosFormateados)
      setPisosDestino(pisosFormateados)
    } catch (error) {
      console.error("❌ Error al obtener pisos:", error)
      mostrarNotificacion(`Error al cargar los pisos de ${sedeNombre}`, "error")
      setPisosOrigen([])
      setPisosDestino([])
    } finally {
      setCargandoPisos(false)
    }
  }

  // Obtener posiciones por piso usando el endpoint genérico
  const obtenerPosicionesPorPiso = async (pisoId) => {
    if (!pisoId || !sedeId) {
      console.log("❌ Missing pisoId or sedeId", { pisoId, sedeId })
      return []
    }

    try {
      const token = sessionStorage.getItem("token")
      console.log("🔍 Obteniendo posiciones para:", { sede: sedeId, piso: pisoId })

      const response = await axios.get("http://localhost:8000/api/posiciones/", {
        params: {
          piso: pisoId,
          sede: sedeId,
          page_size: 10000,
          all: true,
          no_pagination: true,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      console.log("✅ Respuesta completa del API:", response.data)

      let posicionesData = []
      if (Array.isArray(response.data)) {
        posicionesData = response.data
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        posicionesData = response.data.results
        if (response.data.next) {
          let nextUrl = response.data.next
          while (nextUrl) {
            try {
              const nextResponse = await axios.get(nextUrl, {
                headers: {
                  Authorization: `Bearer ${token}`,
                  "Content-Type": "application/json",
                },
              })
              if (nextResponse.data?.results) {
                posicionesData = [...posicionesData, ...nextResponse.data.results]
              }
              nextUrl = nextResponse.data.next
            } catch (error) {
              console.error("Error obteniendo página adicional:", error)
              break
            }
          }
        }
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        posicionesData = response.data.data
      }

      console.log("📍 Posiciones raw obtenidas:", posicionesData.length)

      const posicionesFiltradas = posicionesData.filter((pos) => {
        const posPiso = pos.piso || pos.piso_id || pos.piso_info?.id
        let posSede = pos.sede || pos.sede_id
        if (!posSede && pos.piso_info) {
          posSede = pos.piso_info.sede || pos.piso_info.sede_id
        }
        if (!posSede && pos.sede_info) {
          posSede = pos.sede_info.id
        }

        const pisoMatch = Number(posPiso) === Number(pisoId)
        const sedeMatch = Number(posSede) === Number(sedeId)

        return pisoMatch && sedeMatch
      })

      if (posicionesFiltradas.length === 0) {
        const posicionesSoloPiso = posicionesData.filter((pos) => {
          const posPiso = pos.piso || pos.piso_id || pos.piso_info?.id
          return Number(posPiso) === Number(pisoId)
        })

        if (posicionesSoloPiso.length > 0) {
          const posicionesFormateadas = posicionesSoloPiso.map((pos) => ({
            id: pos.id,
            nombre: pos.nombre || `Posición ${pos.id}`,
            piso: pos.piso || pos.piso_id || pisoId,
            sede: pos.sede || pos.sede_id || sedeId,
            fila: pos.fila,
            columna: pos.columna,
            tipo: pos.tipo,
            estado: pos.estado,
          }))
          return posicionesFormateadas
        }
      }

      const posicionesFormateadas = posicionesFiltradas.map((pos) => ({
        id: pos.id,
        nombre: pos.nombre || `Posición ${pos.id}`,
        piso: pos.piso || pos.piso_id || pisoId,
        sede: pos.sede || pos.sede_id || sedeId,
        fila: pos.fila,
        columna: pos.columna,
        tipo: pos.tipo,
        estado: pos.estado,
      }))

      return posicionesFormateadas
    } catch (error) {
      console.error("❌ Error obteniendo posiciones:", error)
      mostrarNotificacion("Error al cargar posiciones. Verifica la consola para más detalles.", "error")
      return []
    }
  }

  // Obtener todos los dispositivos FILTRADOS POR SEDE
  const obtenerTodosDispositivos = async () => {
    if (!sedeId) {
      setTodosDispositivos([])
      return
    }

    try {
      console.log("📱 Cargando dispositivos para sede:", sedeId)
      const token = sessionStorage.getItem("token")
      if (!token) {
        throw new Error("No se encontró token de autenticación")
      }

      const response = await axios.get("http://localhost:8000/api/dispositivos/", {
        params: {
          sede: sedeId,
          page_size: 1000,
        },
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      let dispositivosData = []
      if (Array.isArray(response.data)) {
        dispositivosData = response.data
      } else if (response.data?.results && Array.isArray(response.data.results)) {
        dispositivosData = response.data.results
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        dispositivosData = response.data.data
      } else if (response.data?.dispositivos && Array.isArray(response.data.dispositivos)) {
        dispositivosData = response.data.dispositivos
      } else {
        console.warn("Formato de respuesta no reconocido para dispositivos:", response.data)
        dispositivosData = []
      }

      const dispositivosFiltered = dispositivosData.filter((disp) => {
        const dispSede = disp.sede || disp.sede_id
        if (dispSede) {
          const sedeIdNum = Number(sedeId)
          const dispSedeNum = Number(dispSede)
          return dispSedeNum === sedeIdNum || dispSede === sedeId
        }
        return false
      })

      const dispositivosFormateados = dispositivosFiltered.map((disp) => ({
        id: disp.id || disp._id || "",
        serial: disp.serial || "",
        modelo: disp.modelo || disp.model || "",
        marca:
          disp.marca && disp.marca !== "No especificada" && disp.marca !== "N/A" && disp.marca.trim() !== ""
            ? disp.marca
            : disp.brand && disp.brand !== "No especificada" && disp.brand !== "N/A" && disp.brand.trim() !== ""
              ? disp.brand
              : null,
      }))

      console.log("✅ Dispositivos filtrados para sede:", dispositivosFormateados.length)
      setTodosDispositivos(dispositivosFormateados)
    } catch (error) {
      console.error("❌ Error obteniendo dispositivos:", error)
      mostrarNotificacion(`Error al cargar los dispositivos de ${sedeNombre}`, "error")
      setTodosDispositivos([])
    }
  }

  // Obtener dispositivos por posición FILTRADOS POR SEDE
  const obtenerDispositivosEnPosicion = async (posicionId) => {
    if (!posicionId || !sedeId) {
      setDispositivos([])
      return
    }

    setCargandoDispositivos(true)
    try {
      const token = sessionStorage.getItem("token")
      console.log("🔍 Obteniendo dispositivos para posición:", posicionId)

      const response = await axios.get("http://localhost:8000/api/dispositivos/", {
        params: {
          posicion: posicionId,
          sede: sedeId,
          page_size: 100,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      let dispositivosData = []
      if (Array.isArray(response.data)) {
        dispositivosData = response.data
      } else if (response.data?.results) {
        dispositivosData = response.data.results
      } else if (response.data?.data) {
        dispositivosData = response.data.data
      }

      const dispositivosFiltrados = dispositivosData.filter((disp) => {
        const dispPosicion = disp.posicion || disp.posicion_id
        return Number(dispPosicion) === Number(posicionId)
      })

      const dispositivosFormateados = dispositivosFiltrados.map((d) => ({
        id: d.id,
        serial: d.serial || "Sin serial",
        modelo: d.modelo || "Sin modelo",
        marca: d.marca || "Sin marca",
        estado: d.estado_uso || "DISPONIBLE",
        tipo: d.tipo || "No especificado",
      }))

      setDispositivos(dispositivosFormateados)
      if (dispositivosFormateados.length === 0) {
        mostrarNotificacion("No hay dispositivos en esta posición", "info")
      } else {
        mostrarNotificacion(`Se encontraron ${dispositivosFormateados.length} dispositivos en esta posición`, "success")
      }
    } catch (error) {
      console.error("❌ Error obteniendo dispositivos:", error)
      mostrarNotificacion("Error al cargar dispositivos de la posición", "error")
      setDispositivos([])
    } finally {
      setCargandoDispositivos(false)
    }
  }

  // Función para mostrar el nombre de la posición en los selects
  const formatearNombrePosicion = (pos) => {
    if (!pos) return "Posición desconocida"
    if (pos.nombre && pos.nombre !== `Fila ${pos.fila}, Columna ${pos.columna}`) {
      return pos.nombre
    }
    return `${pos.tipo || "Posición"} (Fila ${pos.fila || "?"}, Columna ${pos.columna || "?"}) - ${pos.estado || "?"}`
  }

  // Función optimizada para filtrar posiciones
  const filtrarPosiciones = (posiciones, busqueda) => {
    if (!busqueda) return posiciones
    const termino = busqueda.toLowerCase()
    return posiciones.filter(
      (pos) =>
        pos.nombre?.toLowerCase().includes(termino) ||
        pos.tipo?.toLowerCase().includes(termino) ||
        pos.estado?.toLowerCase().includes(termino) ||
        `fila ${pos.fila}`.includes(termino) ||
        `columna ${pos.columna}`.includes(termino),
    )
  }

  // Cambiar filtro
  const cambiarFiltro = (nombre, valor) => {
    setFiltros((prevFiltros) => ({ ...prevFiltros, [nombre]: valor }))
    if (nombre === "dispositivo_id") {
      setTimeout(() => {
        aplicarFiltros()
      }, 100)
    }
  }

  // Aplicar filtros - CORREGIDO
  const aplicarFiltros = async () => {
    // Resetear paginación al aplicar filtros
    setPaginacion((prev) => ({
      ...prev,
      pagina: 1,
    }))

    try {
      await obtenerMovimientosConFiltros(filtros, 1) // Pasar página 1 explícitamente
    } catch (error) {
      console.error("Error al aplicar filtros:", error)
      mostrarNotificacion("Error al aplicar filtros. Intente con otros criterios.", "error")
    }
  }

  // FUNCIÓN CORREGIDA: Obtener movimientos con filtros y paginación
  const obtenerMovimientosConFiltros = async (filtrosAplicar, paginaEspecifica = null) => {
    if (!sedeId) {
      setMovimientos([])
      return
    }

    setCargando(true)
    setError(null)

    try {
      console.log("🔄 Cargando movimientos para sede:", sedeId)
      const token = sessionStorage.getItem("token")
      if (!token) {
        throw new Error("No se encontró token de autenticación")
      }

      const paginaActual = paginaEspecifica || paginacion.pagina

      const params = {
        page: paginaActual,
        page_size: paginacion.itemsPorPagina,
        sede: sedeId,
      }

      // Agregar filtros
      Object.entries(filtrosAplicar).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null && key !== "sede") {
          if (key === "dispositivo_id") {
            params["dispositivo"] = value
          } else {
            params[key] = value
          }
        }
      })

      console.log("📤 Parámetros de consulta:", params)

      const response = await axios.get("http://localhost:8000/api/movimientos/", {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("📥 Respuesta del servidor:", response.data)

      let movimientosData = []
      let totalItems = 0

      if (Array.isArray(response.data)) {
        movimientosData = response.data
        totalItems = response.data.length
      } else if (response.data && Array.isArray(response.data.results)) {
        movimientosData = response.data.results
        totalItems = response.data.count || 0
      } else if (response.data && Array.isArray(response.data.data)) {
        movimientosData = response.data.data
        totalItems = response.data.total || response.data.data.length
      } else {
        console.warn("Formato de respuesta no reconocido", response.data)
        const possibleData = response.data.items || response.data.movimientos || []
        if (Array.isArray(possibleData)) {
          movimientosData = possibleData
          totalItems = possibleData.length
        }
      }

      // Filtrar por sede (doble verificación)
      const movimientosFiltered = movimientosData.filter((mov) => {
        const movSede = mov.sede || mov.sede_id
        if (movSede) {
          return String(movSede) === String(sedeId)
        }
        return false
      })

      // ACTUALIZAR PAGINACIÓN CORRECTAMENTE
      const totalPaginas = Math.ceil(totalItems / paginacion.itemsPorPagina)

      setPaginacion((prev) => ({
        ...prev,
        totalItems: totalItems,
        totalPaginas: totalPaginas,
        pagina: paginaActual,
      }))

      const movimientosFormateados = movimientosFiltered.map((mov) => {
        const dispositivo_info = extraerInfoDispositivo(mov)
        const posicion_origen_info = mov.posicion_origen_info || {}
        const posicion_destino_info = mov.posicion_destino_info || {}
        const encargado_info = mov.encargado_info || {}
        const sede_info = mov.sede_info || {}

        return {
          id: String(mov.id || mov._id || ""),
          fecha_movimiento: mov.fecha_movimiento || mov.fecha || mov.createdAt || null,
          dispositivo: dispositivo_info,
          posicion_origen: {
            id: String(mov.posicion_origen || ""),
            nombre: String(
              posicion_origen_info.nombre ||
                `Fila ${posicion_origen_info.fila}, Columna ${posicion_origen_info.columna}` ||
                "",
            ),
            piso: String(posicion_origen_info.piso || ""),
            sede: String(posicion_origen_info.sede || ""),
          },
          posicion_destino: {
            id: String(mov.posicion_destino || ""),
            nombre: String(
              posicion_destino_info.nombre ||
                `Fila ${posicion_destino_info.fila}, Columna ${posicion_destino_info.columna}` ||
                "",
            ),
            piso: String(posicion_destino_info.piso || ""),
            sede: String(posicion_destino_info.sede || ""),
          },
          encargado: {
            id: String(mov.encargado || ""),
            nombre: String(encargado_info.nombre || "Sistema"),
            email: String(encargado_info.email || "e-inventory@emergiacc.com"),
          },
          observacion: String(mov.observacion || mov.details || ""),
          sede: {
            id: String(mov.sede || ""),
            nombre: String(sede_info.nombre || sedeNombre || "No especificada"),
          },
        }
      })

      console.log("✅ Movimientos procesados:", {
        filtrados: movimientosFormateados.length,
        totalItems,
        totalPaginas,
        paginaActual,
      })

      setMovimientos(movimientosFormateados)
    } catch (error) {
      console.error("❌ Error obteniendo movimientos:", error)
      let mensajeError = `Error al cargar los movimientos de ${sedeNombre}`
      if (error.response) {
        mensajeError =
          error.response.data?.message || error.response.data?.detail || JSON.stringify(error.response.data)
      }
      setError(mensajeError)
      mostrarNotificacion(mensajeError, "error")
      setMovimientos([])
    } finally {
      setCargando(false)
    }
  }

  // Obtener movimientos
  const obtenerMovimientos = () => obtenerMovimientosConFiltros(filtros)

  // Mostrar notificación con diferentes tipos usando el sistema de alertas mejorado
  const mostrarNotificacion = (mensaje, tipo = "success") => {
    setAlert({ show: true, message: mensaje, type: tipo })
  }

  // Mostrar alerta de confirmación
  const mostrarConfirmacion = (mensaje, onConfirm, onCancel = null) => {
    setConfirmAlert({
      show: true,
      message: mensaje,
      onConfirm,
      onCancel: onCancel || (() => setConfirmAlert({ ...confirmAlert, show: false })),
    })
  }

  // Confirmar antes de guardar movimiento
  const confirmarGuardarMovimiento = () => {
    if (!posicionActual || !dispositivoSeleccionado || !posicionNueva) {
      mostrarNotificacion("Debe seleccionar posición origen, dispositivo y posición destino", "error")
      return
    }

    const dispositivoInfo = dispositivos.find((d) => d.id === dispositivoSeleccionado)
    const posicionOrigenInfo = posicionesPorPisoOrigen.find((p) => p.id === posicionActual)
    const posicionDestinoInfo = posicionesPorPisoDestino.find((p) => p.id === posicionNueva)

    let mensaje = `¿Confirma el movimiento del dispositivo ${dispositivoInfo?.serial || "seleccionado"} desde ${posicionOrigenInfo?.nombre || "posición origen"} hacia ${posicionDestinoInfo?.nombre || "posición destino"}?`

    if (detalle.trim()) {
      mensaje += `\n\nObservación: ${detalle.trim()}`
    } else {
      mensaje += `\n\nSin observaciones adicionales.`
    }

    mostrarConfirmacion(mensaje, () => {
      guardarMovimiento()
      setConfirmAlert({ ...confirmAlert, show: false })
    })
  }

  // Guardar movimiento
  const guardarMovimiento = async () => {
    try {
      const token = sessionStorage.getItem("token")
      const user = JSON.parse(sessionStorage.getItem("user"))
      const movimientoData = {
        dispositivo: dispositivoSeleccionado,
        posicion_origen: posicionActual,
        posicion_destino: posicionNueva,
        observacion: detalle.trim() || null,
        sede: sedeId,
        encargado: user?.id,
        confirmado: true,
        fecha_confirmacion: new Date().toISOString(),
        tipo_movimiento: "MANUAL",
        origen: "COORDINADOR",
      }

      console.log("📤 Enviando movimiento manual:", movimientoData)
      mostrarNotificacion("Procesando movimiento...", "info")

      const response = await axios.post("http://localhost:8000/api/movimientos/", movimientoData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.status === 201) {
        console.log("✅ Movimiento creado exitosamente:", response.data)
        mostrarNotificacion("¡Movimiento creado exitosamente!", "success")
        await obtenerMovimientos()
        cerrarDialogoCreacion()
      }
    } catch (error) {
      console.error("❌ Error al guardar movimiento:", error)
      let errorMessage = "Error al crear movimiento"
      if (error.response?.data) {
        if (typeof error.response.data === "string") {
          errorMessage = error.response.data
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail
        } else if (error.response.data.error) {
          errorMessage = error.response.data.error
        } else {
          errorMessage = Object.values(error.response.data).flat().join(", ")
        }
      }
      mostrarNotificacion(errorMessage, "error")
    }
  }

  // Manejar cambio de piso origen
  const cambiarPisoOrigen = async (e) => {
    const pisoId = e.target.value
    console.log("🔄 Cambiando piso origen a:", pisoId)
    setPisoOrigenSeleccionado(pisoId)
    setPosicionActual("")
    setDispositivoSeleccionado("")
    setPosicionesPorPisoOrigen([])

    if (!pisoId) return

    setCargandoPosicionesOrigen(true)
    try {
      const posiciones = await obtenerPosicionesPorPiso(pisoId)
      console.log("✅ Posiciones obtenidas para piso origen:", posiciones.length)
      if (posiciones.length === 0) {
        mostrarNotificacion(`No se encontraron posiciones disponibles en el piso seleccionado.`, "info")
      } else {
        mostrarNotificacion(`Se cargaron ${posiciones.length} posiciones del piso origen`, "success")
      }
      setPosicionesPorPisoOrigen(posiciones)
    } catch (error) {
      console.error("❌ Error cargando posiciones origen:", error)
      mostrarNotificacion("Error al cargar posiciones de origen", "error")
    } finally {
      setCargandoPosicionesOrigen(false)
    }
  }

  // Manejar cambio de piso destino
  const cambiarPisoDestino = async (e) => {
    const pisoId = e.target.value
    console.log("🔄 Cambiando piso destino a:", pisoId)
    setPisoDestinoSeleccionado(pisoId)
    setPosicionNueva("")
    setPosicionesPorPisoDestino([])

    if (!pisoId) return

    setCargandoPosicionesDestino(true)
    try {
      const posiciones = await obtenerPosicionesPorPiso(pisoId)
      console.log("✅ Posiciones obtenidas para piso destino:", posiciones.length)
      if (posiciones.length === 0) {
        mostrarNotificacion(`No hay posiciones en este piso de ${sedeNombre}`, "info")
      } else {
        mostrarNotificacion(`Se cargaron ${posiciones.length} posiciones del piso destino`, "success")
      }
      setPosicionesPorPisoDestino(posiciones)
    } catch (error) {
      console.error("❌ Error al cargar posiciones destino:", error)
      mostrarNotificacion("Error al cargar posiciones de destino", "error")
    } finally {
      setCargandoPosicionesDestino(false)
    }
  }

  // Manejar cambio de posición actual
  const cambiarPosicionActual = async (e) => {
    const posicionId = e.target.value
    setPosicionActual(posicionId)
    setDispositivoSeleccionado("")
    if (posicionId) {
      await obtenerDispositivosEnPosicion(posicionId)
    } else {
      setDispositivos([])
    }
  }

  // Manejar cambio de posición destino
  const cambiarPosicionNueva = (e) => {
    setPosicionNueva(e.target.value)
  }

  // Cerrar notificación
  const cerrarNotificacion = () => {
    setAlert({ ...alert, show: false })
  }

  // Reiniciar filtros
  const reiniciarFiltros = () => {
    setFiltros({
      sede: sedeId,
      posicion: "",
      fecha_inicio: "",
      fecha_fin: "",
      dispositivo_id: "",
    })
    // Resetear paginación también
    setPaginacion((prev) => ({
      ...prev,
      pagina: 1,
    }))
    setTimeout(() => {
      obtenerMovimientos()
    }, 100)
  }

  // FUNCIÓN CORREGIDA: Cambiar página
  const cambiarPagina = (nuevaPagina) => {
    if (nuevaPagina < 1 || nuevaPagina > paginacion.totalPaginas) {
      return
    }

    console.log("📄 Cambiando a página:", nuevaPagina)

    setPaginacion((prev) => ({
      ...prev,
      pagina: nuevaPagina,
    }))
  }

  // FUNCIÓN NUEVA: Cambiar items por página
  const cambiarItemsPorPagina = (nuevoTamaño) => {
    setPaginacion((prev) => ({
      ...prev,
      itemsPorPagina: nuevoTamaño,
      pagina: 1, // Resetear a página 1
    }))
  }

  // Abrir diálogo de creación
  const abrirDialogoCreacion = () => {
    setPosicionActual("")
    setPosicionNueva("")
    setDispositivoSeleccionado("")
    setBusquedaDispositivo("")
    setBusquedaPosicionOrigen("")
    setBusquedaPosicionDestino("")
    setPisoOrigenSeleccionado("")
    setPisoDestinoSeleccionado("")
    setPosicionesPorPisoOrigen([])
    setPosicionesPorPisoDestino([])
    setDispositivos([])
    setDetalle("")
    setDialogoAbierto(true)
  }

  // Cerrar diálogo de creación
  const cerrarDialogoCreacion = () => {
    setDialogoAbierto(false)
  }

  // Abrir detalles de movimiento
  const abrirDetalles = (item) => {
    if (!item) {
      mostrarNotificacion("El movimiento seleccionado no contiene datos", "error")
      return
    }

    const dispositivoInfo = extraerInfoDispositivo(item)
    const itemFormateado = {
      id: String(item.id || item._id || "N/A"),
      fecha_movimiento: item.fecha_movimiento || item.fecha || item.createdAt || null,
      dispositivo: dispositivoInfo,
      posicion_origen: {
        id: String(item.posicion_origen?.id || item.posicion_origen || "N/A"),
        nombre: String(item.posicion_origen_info?.nombre || item.posicion_origen?.nombre || "N/A"),
        piso: String(item.posicion_origen_info?.piso || item.posicion_origen?.piso || "N/A"),
        sede: String(item.posicion_origen_info?.sede || item.posicion_origen?.sede || "N/A"),
      },
      posicion_destino: {
        id: String(item.posicion_destino?.id || item.posicion_destino || "N/A"),
        nombre: String(item.posicion_destino_info?.nombre || item.posicion_destino?.nombre || "N/A"),
        piso: String(item.posicion_destino_info?.piso || item.posicion_destino?.piso || "N/A"),
        sede: String(item.posicion_destino_info?.sede || item.posicion_destino?.sede || "N/A"),
      },
      encargado: {
        id: String(item.encargado?.id || item.encargado || "N/A"),
        nombre: String(item.encargado_info?.nombre || item.encargado?.nombre || "Sistema"),
        email: String(item.encargado_info?.email || item.encargado?.email || "e-inventory@emergiacc.com"),
      },
      observacion: String(item.observacion || item.details || "Sin observaciones"),
      sede: {
        id: String(item.sede?.id || item.sede || sedeId),
        nombre: String(item.sede_info?.nombre || item.sede?.nombre || sedeNombre || "No especificada"),
      },
    }

    setItemSeleccionado(itemFormateado)
    setDialogoDetallesAbierto(true)
  }

  // Cerrar detalles de movimiento
  const cerrarDialogoDetalles = () => {
    setDialogoDetallesAbierto(false)
  }

  // Componente de alerta modal
  const AlertModal = ({ message, type, onClose }) => {
    const getIcon = () => {
      switch (type) {
        case "success":
          return <FaCheck className="alert-icon success" />
        case "error":
          return <FaTimes className="alert-icon error" />
        case "info":
          return <FaInfo className="alert-icon info" />
        default:
          return <FaExclamationTriangle className="alert-icon warning" />
      }
    }

    return (
      <div className="modal-overlay alert-overlay">
        <div className="modal-container alert-container">
          <div className={`alert-modal ${type}`}>
            <div className="alert-content">
              {getIcon()}
              <p className="alert-message">{message}</p>
            </div>
            <button className="alert-close-button" onClick={onClose}>
              &times;
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Componente de confirmación
  const ConfirmAlert = ({ message, onConfirm, onCancel }) => {
    return (
      <div className="modal-overlay alert-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal">
            <div className="confirm-content">
              <FaExclamationTriangle className="confirm-icon" />
              <p className="confirm-message">{message}</p>
            </div>
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

  // Filtrar posiciones y dispositivos
  const posicionesFiltradas = filtrarPosiciones(posicionesPorPisoOrigen, busquedaPosicionOrigen)
  const posicionesDestinoFiltradas = filtrarPosiciones(
    posicionesPorPisoDestino.filter((pos) => pos.id !== posicionActual),
    busquedaPosicionDestino,
  )
  const dispositivosFiltrados = dispositivos.filter((disp) => {
    const termino = busquedaDispositivo.toLowerCase()
    return (
      disp.serial?.toLowerCase().includes(termino) ||
      disp.modelo?.toLowerCase().includes(termino) ||
      disp.marca?.toLowerCase().includes(termino)
    )
  })

  // No mostrar nada si no hay sedeId
  if (!sedeId) {
    return (
      <div className="dashboard-container">
        <div className="registro-image-container">
          <img
            src={require("../../assets/E-Inventory.png") || "/placeholder.svg"}
            alt="E-Inventory"
            className="registro-image"
          />
        </div>
        <div className="header">
          <h1>Registro de Movimientos</h1>
          <p>No se ha seleccionado una sede.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="registro-image-container">
        <img
          src={require("../../assets/E-Inventory.png") || "/placeholder.svg"}
          alt="E-Inventory"
          className="registro-image"
        />
      </div>

      {/* Sistema de alertas mejorado */}
      {alert.show && <AlertModal message={alert.message} type={alert.type} onClose={cerrarNotificacion} />}
      {confirmAlert.show && (
        <ConfirmAlert
          message={confirmAlert.message}
          onConfirm={confirmAlert.onConfirm}
          onCancel={confirmAlert.onCancel}
        />
      )}

      <div className="header">
        <h1>Registro de Movimientos - {sedeNombre}</h1>
        <div className="header-buttons">
          <button className="btn btn-primary" onClick={abrirDialogoCreacion}>
            <span className="icon">+</span> Crear Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Sección de filtros */}
      <div className="filter-card">
        <div className="sede-info-header">
          <h3>Sede actual: {sedeNombre || `Sede ${sedeId}`}</h3>
        </div>
        <div className="filter-grid">
          <div className="filter-item">
            <label htmlFor="fecha_inicio">Fecha inicio</label>
            <input
              type="date"
              id="fecha_inicio"
              value={filtros.fecha_inicio}
              onChange={(e) => cambiarFiltro("fecha_inicio", e.target.value)}
            />
          </div>
          <div className="filter-item">
            <label htmlFor="fecha_fin">Fecha fin</label>
            <input
              type="date"
              id="fecha_fin"
              value={filtros.fecha_fin}
              onChange={(e) => cambiarFiltro("fecha_fin", e.target.value)}
            />
          </div>
          <div className="filter-item">
            <label htmlFor="dispositivo_id">Dispositivo</label>
            <select
              className="color-letra"
              id="dispositivo_id"
              value={filtros.dispositivo_id}
              onChange={(e) => cambiarFiltro("dispositivo_id", e.target.value)}
            >
              <option value="">Todos los dispositivos</option>
              {Array.isArray(todosDispositivos) && todosDispositivos.length > 0 ? (
                todosDispositivos.map((disp) => (
                  <option key={disp.id} value={disp.id}>
                    {disp.marca} {disp.modelo} ({disp.serial})
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  Cargando dispositivos...
                </option>
              )}
            </select>
          </div>
        </div>
        {filtros.dispositivo_id && (
          <div className="filter-message">
            <p>
              Mostrando movimientos para el dispositivo:{" "}
              {todosDispositivos.find((d) => d.id === filtros.dispositivo_id)?.marca || ""}{" "}
              {todosDispositivos.find((d) => d.id === filtros.dispositivo_id)?.modelo || ""} (
              {todosDispositivos.find((d) => d.id === filtros.dispositivo_id)?.serial || ""}) en {sedeNombre}
            </p>
          </div>
        )}
        <div className="filter-buttons">
          <button className="btn btn-primary" onClick={aplicarFiltros}>
            <span className="icon">⚙</span> Aplicar Filtros
          </button>
          <button className="btn btn-outline" onClick={reiniciarFiltros}>
            <span className="icon">×</span> Limpiar Filtros
          </button>
          <button className="btn btn-text" onClick={obtenerMovimientos}>
            <span className="icon">↻</span> Actualizar
          </button>
        </div>
      </div>

      <div className="table-card">
        {/* INFORMACIÓN DE PAGINACIÓN MEJORADA */}
        {!cargando && !error && (
          <div className="pagination-info">
            <div className="pagination-summary">
              <span>
                Mostrando {movimientos.length > 0 ? (paginacion.pagina - 1) * paginacion.itemsPorPagina + 1 : 0} -{" "}
                {Math.min(paginacion.pagina * paginacion.itemsPorPagina, paginacion.totalItems)} de{" "}
                {paginacion.totalItems} movimientos
              </span>
            </div>
            <div className="pagination-controls">
              <label htmlFor="items-per-page">Mostrar:</label>
              <select
                id="items-per-page"
                value={paginacion.itemsPorPagina}
                onChange={(e) => cambiarItemsPorPagina(Number(e.target.value))}
                className="items-per-page-select"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>por página</span>
            </div>
          </div>
        )}

        <table className="data-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Tipo</th>
              <th>Usuario</th>
              <th>Detalles</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {cargando ? (
              <tr>
                <td colSpan={5} className="loading-cell">
                  <div className="loading-spinner"></div>
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={5} className="error-cell">
                  <div className="error-message">{error}</div>
                </td>
              </tr>
            ) : !Array.isArray(movimientos) || movimientos.length === 0 ? (
              <tr>
                <td colSpan={5} className="empty-cell">
                  No se encontraron movimientos en {sedeNombre}
                </td>
              </tr>
            ) : (
              movimientos.map((item) => {
                return (
                  <tr key={item.id}>
                    <td>
                      {item.fecha_movimiento
                        ? format(new Date(item.fecha_movimiento), "dd/MM/yyyy HH:mm")
                        : "No registrado"}
                    </td>
                    <td>
                      <span className="badge">Movimiento</span>
                    </td>
                    <td>
                      <div className="user-info">
                        <div>{item.encargado?.nombre || "Sistema"}</div>
                        <div className="user-email">{item.encargado?.email || "e-inventory@emergiacc.com"}</div>
                      </div>
                    </td>
                    <td>
                      <div className="movement-details">
                        <strong>Dispositivo:</strong>
                        {item.dispositivo?.serial || "No especificado"} - {item.dispositivo?.modelo || ""}
                        {item.dispositivo?.marca &&
                        item.dispositivo.marca !== "No especificada" &&
                        item.dispositivo.marca !== "N/A"
                          ? ` (${item.dispositivo.marca})`
                          : ""}
                      </div>
                      <div>
                        <strong>Origen:</strong>
                        {item.posicion_origen?.nombre || "No especificado"}
                      </div>
                      <div>
                        <strong>Destino:</strong>
                        {item.posicion_destino?.nombre || "No especificado"}
                      </div>
                    </td>
                    <td>
                      <button className="btn-icon" onClick={() => abrirDetalles(item)} title="Ver detalles">
                        <span className="icon">👁</span>
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>

        {/* PAGINACIÓN MEJORADA */}
        {!cargando && !error && Array.isArray(movimientos) && paginacion.totalItems > 0 && (
          <div className="pagination-container">
            <div className="pagination">
              {/* Botón Primera Página */}
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(1)}
                disabled={paginacion.pagina === 1}
                title="Primera página"
              >
                &laquo;&laquo;
              </button>

              {/* Botón Página Anterior */}
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(paginacion.pagina - 1)}
                disabled={paginacion.pagina === 1}
                title="Página anterior"
              >
                &laquo;
              </button>

              {/* Números de página */}
              {(() => {
                const totalPaginas = paginacion.totalPaginas
                const paginaActual = paginacion.pagina
                const botones = []

                // Lógica para mostrar páginas
                let inicio = Math.max(1, paginaActual - 2)
                let fin = Math.min(totalPaginas, paginaActual + 2)

                // Ajustar si estamos cerca del inicio o fin
                if (paginaActual <= 3) {
                  fin = Math.min(5, totalPaginas)
                }
                if (paginaActual >= totalPaginas - 2) {
                  inicio = Math.max(1, totalPaginas - 4)
                }

                // Mostrar primera página si no está en el rango
                if (inicio > 1) {
                  botones.push(
                    <button key={1} className="pagination-btn" onClick={() => cambiarPagina(1)}>
                      1
                    </button>,
                  )
                  if (inicio > 2) {
                    botones.push(
                      <span key="dots1" className="pagination-dots">
                        ...
                      </span>,
                    )
                  }
                }

                // Páginas en el rango
                for (let i = inicio; i <= fin; i++) {
                  botones.push(
                    <button
                      key={i}
                      className={`pagination-btn ${paginaActual === i ? "active" : ""}`}
                      onClick={() => cambiarPagina(i)}
                    >
                      {i}
                    </button>,
                  )
                }

                // Mostrar última página si no está en el rango
                if (fin < totalPaginas) {
                  if (fin < totalPaginas - 1) {
                    botones.push(
                      <span key="dots2" className="pagination-dots">
                        ...
                      </span>,
                    )
                  }
                  botones.push(
                    <button key={totalPaginas} className="pagination-btn" onClick={() => cambiarPagina(totalPaginas)}>
                      {totalPaginas}
                    </button>,
                  )
                }

                return botones
              })()}

              {/* Botón Página Siguiente */}
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(paginacion.pagina + 1)}
                disabled={paginacion.pagina === paginacion.totalPaginas}
                title="Página siguiente"
              >
                &raquo;
              </button>

              {/* Botón Última Página */}
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(paginacion.totalPaginas)}
                disabled={paginacion.pagina === paginacion.totalPaginas}
                title="Última página"
              >
                &raquo;&raquo;
              </button>
            </div>

            {/* Información adicional de paginación */}
            <div className="pagination-info-bottom">
              <span>
                Página {paginacion.pagina} de {paginacion.totalPaginas}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear nuevo movimiento */}
      {dialogoAbierto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Crear Nuevo Movimiento - {sedeNombre}</h2>
              <button className="modal-close" onClick={cerrarDialogoCreacion}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-grid">
                <div className="modal-column">
                  {/* Información de Sede */}
                  <div className="form-group">
                    <label>Sede</label>
                    <input
                      type="text"
                      value={sedeNombre || `Sede ${sedeId}`}
                      disabled
                      style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                    />
                  </div>

                  {/* Selección de Piso Origen */}
                  <div className="form-group">
                    <label htmlFor="piso-origen">Piso (Origen)</label>
                    {cargandoPisos ? (
                      <div className="loading-options">Cargando pisos...</div>
                    ) : (
                      <select
                        className="color-letra"
                        id="piso-origen"
                        value={pisoOrigenSeleccionado}
                        onChange={cambiarPisoOrigen}
                        required
                        disabled={cargandoPisos}
                      >
                        <option value="">Seleccionar piso</option>
                        {pisosOrigen.map((piso) => (
                          <option key={piso.id} value={piso.id}>
                            {piso.nombre} (Nivel {piso.numero})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {pisoOrigenSeleccionado && (
                    <>
                      {/* Búsqueda de Posición Origen */}
                      <div className="form-group">
                        <label htmlFor="search-posicion-origen">Buscar posición origen</label>
                        <div className="search-input">
                          <span className="search-icon">🔍</span>
                          <input
                            id="search-posicion-origen"
                            type="text"
                            value={busquedaPosicionOrigen}
                            onChange={(e) => setBusquedaPosicionOrigen(e.target.value)}
                            placeholder="Buscar posición..."
                          />
                        </div>
                      </div>

                      {/* Selección de Posición Origen */}
                      <div className="form-group">
                        <label htmlFor="posicion-actual">
                          Posición Origen
                          {cargandoPosicionesOrigen ? " (Cargando...)" : ` (${posicionesFiltradas.length} disponibles)`}
                        </label>
                        {cargandoPosicionesOrigen ? (
                          <div className="loading-options">Cargando posiciones del piso...</div>
                        ) : (
                          <div className="select-with-scroll">
                            <select
                              className="color-letra"
                              id="posicion-actual"
                              value={posicionActual}
                              onChange={cambiarPosicionActual}
                              required
                              disabled={cargandoPosicionesOrigen || !pisoOrigenSeleccionado}
                            >
                              <option value="">Seleccionar posición</option>
                              {posicionesFiltradas.length > 0 ? (
                                posicionesFiltradas.map((pos) => (
                                  <option key={pos.id} value={pos.id}>
                                    {formatearNombrePosicion(pos)}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>
                                  {cargandoPosicionesOrigen ? "Cargando..." : "No hay posiciones disponibles"}
                                </option>
                              )}
                            </select>
                          </div>
                        )}
                      </div>

                      {posicionActual && (
                        <>
                          {/* Búsqueda de Dispositivo */}
                          <div className="form-group">
                            <label htmlFor="search-dispositivo">Buscar dispositivo en la posición</label>
                            <div className="search-input">
                              <span className="search-icon">🔍</span>
                              <input
                                id="search-dispositivo"
                                type="text"
                                value={busquedaDispositivo}
                                onChange={(e) => setBusquedaDispositivo(e.target.value)}
                                placeholder="Buscar por serial o modelo..."
                              />
                            </div>
                          </div>

                          {/* Selección de Dispositivo */}
                          <div className="form-group">
                            <label htmlFor="dispositivo-modal">
                              Dispositivo en la posición
                              {cargandoDispositivos
                                ? " (Cargando...)"
                                : ` (${dispositivosFiltrados.length} disponibles)`}
                            </label>
                            {cargandoDispositivos ? (
                              <div className="loading-options">Cargando dispositivos...</div>
                            ) : (
                              <select
                                className="color-letra"
                                id="dispositivo-modal"
                                value={dispositivoSeleccionado}
                                onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                                required
                                disabled={cargandoDispositivos || !posicionActual}
                              >
                                <option value="">Seleccionar dispositivo</option>
                                {dispositivos.length > 0 ? (
                                  dispositivos.map((disp) => (
                                    <option key={disp.id} value={disp.id}>
                                      {disp.tipo} {disp.marca} {disp.modelo} - {disp.serial} ({disp.estado})
                                    </option>
                                  ))
                                ) : (
                                  <option value="" disabled>
                                    {cargandoDispositivos ? "Cargando..." : "No hay dispositivos en esta posición"}
                                  </option>
                                )}
                              </select>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-column">
                  {/* Selección de Piso Destino */}
                  <div className="form-group">
                    <label htmlFor="piso-destino">Piso (Destino)</label>
                    <select
                      className="color-letra"
                      id="piso-destino"
                      value={pisoDestinoSeleccionado}
                      onChange={cambiarPisoDestino}
                      required
                    >
                      <option value="">Seleccionar piso</option>
                      {pisosDestino.map((piso) => (
                        <option key={piso.id} value={piso.id}>
                          {piso.nombre} (Nivel {piso.numero})
                        </option>
                      ))}
                    </select>
                  </div>

                  {pisoDestinoSeleccionado && (
                    <>
                      {/* Búsqueda de Posición Destino */}
                      <div className="form-group">
                        <label htmlFor="search-posicion-destino">Buscar posición destino</label>
                        <div className="search-input">
                          <span className="search-icon">🔍</span>
                          <input
                            id="search-posicion-destino"
                            type="text"
                            value={busquedaPosicionDestino}
                            onChange={(e) => setBusquedaPosicionDestino(e.target.value)}
                            placeholder="Buscar posición..."
                          />
                        </div>
                      </div>

                      {/* Selección de Posición Destino */}
                      <div className="form-group">
                        <label htmlFor="posicion-nueva">
                          Posición Destino
                          {cargandoPosicionesDestino
                            ? " (Cargando...)"
                            : ` (${posicionesDestinoFiltradas.length} disponibles)`}
                        </label>
                        {cargandoPosicionesDestino ? (
                          <div className="loading-options">Cargando posiciones del piso...</div>
                        ) : (
                          <div className="select-with-scroll">
                            <select
                              className="color-letra"
                              id="posicion-nueva"
                              value={posicionNueva}
                              onChange={cambiarPosicionNueva}
                              required
                              size={8}
                            >
                              <option value="">Seleccionar nueva posición</option>
                              {posicionesDestinoFiltradas.length > 0 ? (
                                posicionesDestinoFiltradas.map((pos) => (
                                  <option key={pos.id} value={pos.id}>
                                    {formatearNombrePosicion(pos)}
                                  </option>
                                ))
                              ) : (
                                <option value="" disabled>
                                  {posicionesPorPisoDestino.length === 0
                                    ? "No hay posiciones en este piso"
                                    : "No se encontraron posiciones con el filtro"}
                                </option>
                              )}
                            </select>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* Detalles del Movimiento */}
                  <div className="form-group">
                    <label htmlFor="detalle">Detalle del Movimiento</label>
                    <textarea
                      id="detalle"
                      rows={4}
                      value={detalle}
                      onChange={(e) => setDetalle(e.target.value)}
                      placeholder="Observaciones del movimiento (opcional)"
                    ></textarea>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={cerrarDialogoCreacion}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmarGuardarMovimiento}
                disabled={!pisoOrigenSeleccionado || !dispositivoSeleccionado || !posicionNueva}
              >
                Guardar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver detalles */}
      {dialogoDetallesAbierto && itemSeleccionado && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Detalles del Movimiento - {sedeNombre}</h2>
              <button className="modal-close" onClick={cerrarDialogoDetalles}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="details-grid">
                <div className="details-section">
                  <h3>Información General</h3>
                  <p>
                    <strong>Fecha:</strong>{" "}
                    {itemSeleccionado.fecha_movimiento
                      ? format(new Date(itemSeleccionado.fecha_movimiento), "dd/MM/yyyy HH:mm")
                      : "No registrado"}
                  </p>
                  <p>
                    <strong>Tipo:</strong> Movimiento
                  </p>
                  <p>
                    <strong>Sede:</strong> {itemSeleccionado.sede.nombre}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Dispositivo</h3>
                  <p>
                    <strong>Modelo:</strong> {itemSeleccionado.dispositivo.modelo}
                  </p>
                  <p>
                    <strong>Serial:</strong> {itemSeleccionado.dispositivo.serial}
                  </p>
                  {itemSeleccionado.dispositivo.marca && (
                    <p>
                      <strong>Marca:</strong> {itemSeleccionado.dispositivo.marca}
                    </p>
                  )}
                </div>

                <div className="details-section">
                  <h3>Origen</h3>
                  <p>
                    <strong>Posición:</strong> {itemSeleccionado.posicion_origen.nombre}
                  </p>
                  <p>
                    <strong>Piso:</strong> {itemSeleccionado.posicion_origen.piso || "No especificado"}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Destino</h3>
                  <p>
                    <strong>Posición:</strong> {itemSeleccionado.posicion_destino.nombre}
                  </p>
                  <p>
                    <strong>Piso:</strong> {itemSeleccionado.posicion_destino.piso || "No especificado"}
                  </p>
                </div>

                <div className="details-section">
                  <h3>Usuario Responsable</h3>
                  <p>
                    <strong>Nombre:</strong> {itemSeleccionado.encargado.nombre}
                  </p>
                  <p>
                    <strong>Email:</strong> {itemSeleccionado.encargado.email}
                  </p>
                </div>

                <div className="details-section full-width">
                  <h3>Observaciones</h3>
                  <p>{itemSeleccionado.observacion || "Sin observaciones"}</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={cerrarDialogoDetalles}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS para las alertas y paginación */}
      <style jsx>{`
        .alert-overlay {
          z-index: 10000;
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .alert-container {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
        }

        .alert-modal {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          position: relative;
          border-left: 4px solid;
        }

        .alert-modal.success {
          border-left-color: #10b981;
          background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
        }

        .alert-modal.error {
          border-left-color: #ef4444;
          background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
        }

        .alert-modal.info {
          border-left-color: #3b82f6;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
        }

        .alert-modal.warning {
          border-left-color: #f59e0b;
          background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
        }

        .alert-content {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .alert-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .alert-icon.success {
          color: #10b981;
        }

        .alert-icon.error {
          color: #ef4444;
        }

        .alert-icon.info {
          color: #3b82f6;
        }

        .alert-icon.warning {
          color: #f59e0b;
        }

        .alert-message {
          margin: 0;
          font-size: 16px;
          font-weight: 500;
          color: #1e2130;
          line-height: 1.5;
        }

        .alert-close-button {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          font-size: 24px;
          color: #6b7280;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .alert-close-button:hover {
          background: rgba(0, 0, 0, 0.1);
          color: #1e2130;
        }

        .confirm-container {
          max-width: 450px;
          margin: 0 auto;
          padding: 20px;
        }

        .confirm-modal {
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          text-align: center;
          background: white;
        }

        .confirm-content {
          margin-bottom: 24px;
        }

        .confirm-icon {
          font-size: 48px;
          color: #f59e0b;
          margin-bottom: 16px;
        }

        .confirm-message {
          margin: 0;
          font-size: 16px;
          color: #1e2130;
          line-height: 1.6;
        }

        .confirm-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .confirm-button {
          padding: 10px 24px;
          border-radius: 8px;
          font-weight: 500;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid;
          min-width: 100px;
        }

        .confirm-button.cancel {
          background: #1e2130;
          color: #6b7280;
          border-color: #d1d5db;
        }

        .confirm-button.cancel:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .confirm-button.accept {
          background: #3b82f6;
          color: white;
          border-color: #3b82f6;
        }

        .confirm-button.accept:hover {
          background: #2563eb;
          border-color: #2563eb;
        }

        /* Estilos para paginación mejorada */
        .pagination-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: #1e2130;
          border-bottom: 1px solid#1e2130;
          border-radius: 8px 8px 0 0;
        }

        .pagination-summary {
          font-size: 14px;
          color:rgb(249, 251, 252);
          font-weight: 500;
        }

        .pagination-controls {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
          color:rgb(248, 248, 248);
        }

        .items-per-page-select {
          padding: 4px 8px;
          border: 1px solid #1e2130;
          border-radius: 4px;
          font-size: 14px;
          background: #1e2130;
        }

        .pagination-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 20px;
          background: #1e2130;
          border-radius: 0 0 8px 8px;
        }

        .pagination {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #1e2130;
          background: #1e2130;
          color:rgb(255, 255, 255);
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #6366f1;
          border-color:#6366f1;
          color:rgb(255, 255, 255);
        }

        .pagination-btn.active {
          background: #6366f1;
          border-color: #6366f1;
          color: white;
        }

        .pagination-btn:disabled {
          background: #1e2130;
          border-color: #1e2130;
          color:rgb(255, 255, 255);
          cursor: not-allowed;
        }

        .pagination-dots {
          padding: 8px 4px;
          color: #6c757d;
          font-weight: bold;
        }

        .pagination-info-bottom {
          font-size: 14px;
          color: #6c757d;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .pagination-info {
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }

          .pagination {
            flex-wrap: wrap;
            justify-content: center;
          }

          .pagination-btn {
            padding: 6px 10px;
            font-size: 12px;
            min-width: 36px;
          }
        }
      `}</style>
    </div>
  )
}

export default Movimientos
