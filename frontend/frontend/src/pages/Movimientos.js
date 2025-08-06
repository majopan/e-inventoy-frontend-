/* eslint-disable no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { format } from "date-fns"
import "../styles/movimientos.css"
import { FaCheck, FaExclamationTriangle, FaInfo, FaTimes } from "react-icons/fa"

const Movimientos = () => {
  // Estados principales
  const [movimientos, setMovimientos] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState(null)
  const [dialogoAbierto, setDialogoAbierto] = useState(false)
  const [dialogoDetallesAbierto, setDialogoDetallesAbierto] = useState(false)
  const [itemSeleccionado, setItemSeleccionado] = useState(null)
  const [busquedaPosicionOrigen, setBusquedaPosicionOrigen] = useState("")
  const [busquedaPosicionDestino, setBusquedaPosicionDestino] = useState("")

  // Estados para alertas (mismo diseño que Dispositivos)
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

  // Estados para paginación y filtros
  const [paginacion, setPaginacion] = useState({
    pagina: 1,
    itemsPorPagina: 10,
    totalItems: 0,
  })
  const [filtros, setFiltros] = useState({
    sede: "",
    posicion: "",
    fecha_inicio: "",
    fecha_fin: "",
    dispositivo_id: "",
  })

  // Estados para el modal de creación
  const [sedeSeleccionada, setSedeSeleccionada] = useState("")
  const [posicionActual, setPosicionActual] = useState("")
  const [posicionNueva, setPosicionNueva] = useState("")
  const [dispositivoSeleccionado, setDispositivoSeleccionado] = useState("")
  const [busquedaDispositivo, setBusquedaDispositivo] = useState("")
  const [detalle, setDetalle] = useState("")
  const [sedes, setSedes] = useState([])
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

  // Auto-cerrar alertas después de un tiempo determinado
  useEffect(() => {
    if (alert.show) {
      const timer = setTimeout(() => {
        setAlert({ ...alert, show: false })
      }, 4000)
      return () => clearTimeout(timer)
    }
  }, [alert])

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

  // Obtener datos iniciales
  useEffect(() => {
    obtenerSedes()
    obtenerTodosDispositivos()
    obtenerMovimientos() // Esto cargará TODOS los movimientos sin filtros
  }, [paginacion.pagina])

  // Obtener lista de sedes
  const obtenerSedes = async () => {
    try {
      const token = sessionStorage.getItem("token")
      const respuesta = await axios.get("http://localhost:8000/api/sede/", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      })
      if (respuesta.status === 200) {
        setSedes(respuesta.data.sedes || [])
        console.log("✅ Sedes cargadas:", respuesta.data.sedes?.length || 0)
      } else {
        throw new Error(`Error ${respuesta.status}: ${respuesta.statusText}`)
      }
    } catch (error) {
      console.error("Error al obtener sedes:", error)
      mostrarNotificacion("No se pudieron cargar las sedes. Verifica tu conexión.", "error")
    }
  }

  // Obtener pisos de una sede
  const obtenerPisosPorSede = async (sedeId) => {
    if (!sedeId) {
      setPisosOrigen([])
      setPisosDestino([])
      return
    }

    setCargandoPisos(true)
    try {
      console.log("🏢 Cargando pisos para sede:", sedeId)
      const token = sessionStorage.getItem("token")
      const respuesta = await axios.get("http://localhost:8000/api/pisos/", {
        params: {
          sede_id: sedeId,
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

      // Filtrar pisos por sede (doble verificación)
      const pisosFiltered = pisosData.filter((piso) => {
        const pisoSede = piso.sede || piso.sede_id || piso.sedeId
        const sedeIdNum = Number(sedeId)
        const pisoSedeNum = Number(pisoSede)
        return pisoSedeNum === sedeIdNum || pisoSede === sedeId || pisoSede === sedeIdNum
      })

      const pisosFormateados = pisosFiltered.map((piso) => ({
        id: piso.id || piso._id || "",
        nombre: piso.nombre || piso.name || `Piso ${piso.numero || piso.number || piso.piso}`,
        numero: piso.numero || piso.number || piso.piso || "",
        sede_id: piso.sede_id || piso.sede || sedeId,
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
      mostrarNotificacion("Error al cargar los pisos de la sede", "error")
      setPisosOrigen([])
      setPisosDestino([])
    } finally {
      setCargandoPisos(false)
    }
  }

  // FUNCIÓN CORREGIDA: Obtener posiciones por piso usando el endpoint genérico
  const obtenerPosicionesPorPiso = async (pisoId, sedeId) => {
    if (!pisoId || !sedeId) {
      console.log("❌ Missing pisoId or sedeId", { pisoId, sedeId })
      return []
    }

    try {
      const token = sessionStorage.getItem("token")
      console.log("🔍 Obteniendo posiciones para:", { sede: sedeId, piso: pisoId })

      // USAR EL ENDPOINT GENÉRICO CON FILTROS CORRECTOS
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
        // Manejar paginación si existe
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

      // FILTRADO MÁS FLEXIBLE - Verificar múltiples formas de obtener sede y piso
      const posicionesFiltradas = posicionesData.filter((pos) => {
        // Obtener piso de múltiples formas posibles
        const posPiso = pos.piso || pos.piso_id || pos.piso_info?.id
        // Obtener sede de múltiples formas posibles
        let posSede = pos.sede || pos.sede_id
        // Si no hay sede directa, intentar obtenerla del piso
        if (!posSede && pos.piso_info) {
          posSede = pos.piso_info.sede || pos.piso_info.sede_id
        }
        // Si aún no hay sede, intentar obtenerla de sede_info
        if (!posSede && pos.sede_info) {
          posSede = pos.sede_info.id
        }

        // Convertir a números para comparación
        const pisoMatch = Number(posPiso) === Number(pisoId)
        const sedeMatch = Number(posSede) === Number(sedeId)

        return pisoMatch && sedeMatch
      })

      console.log("📍 Posiciones después del filtrado:", posicionesFiltradas.length)

      // Si no hay posiciones filtradas, intentar sin filtro de sede
      if (posicionesFiltradas.length === 0) {
        console.log("⚠️ No hay posiciones con filtro de sede, intentando solo con piso...")
        const posicionesSoloPiso = posicionesData.filter((pos) => {
          const posPiso = pos.piso || pos.piso_id || pos.piso_info?.id
          const pisoMatch = Number(posPiso) === Number(pisoId)
          return pisoMatch
        })

        console.log("📍 Posiciones solo por piso:", posicionesSoloPiso.length)

        // Si encontramos posiciones solo por piso, usarlas
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

          console.log(
            `✅ Usando posiciones solo por piso para sede ${sedeId}, piso ${pisoId}:`,
            posicionesFormateadas.length,
          )
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

      console.log(
        `✅ Total de posiciones formateadas para sede ${sedeId}, piso ${pisoId}:`,
        posicionesFormateadas.length,
      )

      return posicionesFormateadas
    } catch (error) {
      console.error("❌ Error obteniendo posiciones:", error)
      if (error.response) {
        console.error("Error response data:", error.response.data)
        console.error("Error status:", error.response.status)
      }
      mostrarNotificacion("Error al cargar posiciones. Verifica la consola para más detalles.", "error")
      return []
    }
  }

  // Obtener todos los dispositivos
  const obtenerTodosDispositivos = async () => {
    try {
      const token = sessionStorage.getItem("token")
      if (!token) {
        throw new Error("No se encontró token de autenticación")
      }

      const response = await axios.get("http://localhost:8000/api/dispositivos/", {
        params: {
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

      const dispositivosFormateados = dispositivosData.map((disp) => ({
        id: disp.id || disp._id || "",
        serial: disp.serial || "",
        modelo: disp.modelo || disp.model || "",
        marca:
          disp.marca && disp.marca !== "No especificada" && disp.marca !== "N/A" && disp.marca.trim() !== ""
            ? disp.marca
            : disp.brand && disp.brand !== "No especificada" && disp.brand !== "N/A" && disp.brand.trim() !== ""
              ? disp.brand
              : null,
        sede: disp.sede || disp.sede_id,
      }))

      setTodosDispositivos(dispositivosFormateados)
      console.log("✅ Dispositivos cargados:", dispositivosFormateados.length)
    } catch (error) {
      console.error("Error obteniendo todos los dispositivos:", error)
      mostrarNotificacion("Error al cargar los dispositivos", "error")
      setTodosDispositivos([])
    }
  }

  // Obtener dispositivos por posición
  const obtenerDispositivosEnPosicion = async (posicionId) => {
    if (!posicionId) {
      setDispositivos([])
      return
    }

    setCargandoDispositivos(true)
    try {
      const token = sessionStorage.getItem("token")
      console.log("🔍 Obteniendo dispositivos para posición:", posicionId)

      // Usar el endpoint genérico de dispositivos con filtro específico por posición
      const response = await axios.get("http://localhost:8000/api/dispositivos/", {
        params: {
          posicion: posicionId,
          page_size: 100,
        },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("📱 Respuesta dispositivos por posición:", response.data)

      let dispositivosData = []
      if (Array.isArray(response.data)) {
        dispositivosData = response.data
      } else if (response.data?.results) {
        dispositivosData = response.data.results
      } else if (response.data?.data) {
        dispositivosData = response.data.data
      }

      console.log("📱 Dispositivos raw obtenidos:", dispositivosData.length)

      // Filtrar dispositivos que estén específicamente en esta posición
      const dispositivosFiltrados = dispositivosData.filter((disp) => {
        const dispPosicion = disp.posicion || disp.posicion_id
        const posicionMatch = Number(dispPosicion) === Number(posicionId)
        return posicionMatch
      })

      console.log("✅ Dispositivos filtrados por posición:", dispositivosFiltrados.length)

      const dispositivosFormateados = dispositivosFiltrados.map((d) => ({
        id: d.id,
        serial: d.serial || "Sin serial",
        modelo: d.modelo || "Sin modelo",
        marca: d.marca || "Sin marca",
        estado: d.estado_uso || "DISPONIBLE",
        tipo: d.tipo || "No especificado",
      }))

      console.log("📱 Dispositivos formateados:", dispositivosFormateados)
      setDispositivos(dispositivosFormateados)
    } catch (error) {
      console.error("❌ Error obteniendo dispositivos:", error)
      mostrarNotificacion("Error al cargar dispositivos de la posición", "error")
      setDispositivos([])
    } finally {
      setCargandoDispositivos(false)
    }
  }

  // FUNCIÓN CORREGIDA: Función para mostrar el nombre de la posición con sede
  const formatearNombrePosicionConSede = (pos) => {
    if (!pos) return "Posición desconocida"

    // CORRECCIÓN: Buscar la sede usando múltiples formas de identificación
    let sedeNombre = "Sede no identificada"

    // Intentar encontrar la sede por ID
    const sedeId = pos.sede || pos.sede_id
    if (sedeId && sedes.length > 0) {
      const sedeEncontrada = sedes.find((s) => Number(s.id) === Number(sedeId) || String(s.id) === String(sedeId))
      if (sedeEncontrada) {
        sedeNombre = sedeEncontrada.nombre
      }
    }

    // Si no se encontró por ID, intentar por nombre directo
    if (sedeNombre === "Sede no identificada" && pos.sede_nombre) {
      sedeNombre = pos.sede_nombre
    }

    // Formatear el nombre de la posición
    let nombrePosicion = pos.nombre
    if (!nombrePosicion || nombrePosicion === `Fila ${pos.fila}, Columna ${pos.columna}`) {
      nombrePosicion = `${pos.tipo || "Posición"} (Fila ${pos.fila || "?"}, Columna ${pos.columna || "?"})`
    }

    return `${nombrePosicion} - ${sedeNombre}`
  }

  // Función original para mostrar el nombre de la posición
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

  // Aplicar filtros
  const aplicarFiltros = async () => {
    setPaginacion((prev) => ({
      ...prev,
      pagina: 1,
      totalItems: 0,
    }))
    try {
      await obtenerMovimientosConFiltros(filtros)
    } catch (error) {
      console.error("Error al aplicar filtros:", error)
      mostrarNotificacion("Error al aplicar filtros. Intente con otros criterios.", "error")
    }
  }

  // Obtener movimientos con filtros
  const obtenerMovimientosConFiltros = async (filtrosAplicar) => {
    setCargando(true)
    setError(null)

    try {
      const token = sessionStorage.getItem("token")
      if (!token) {
        throw new Error("No se encontró token de autenticación")
      }

      const params = {
        page: paginacion.pagina,
        page_size: paginacion.itemsPorPagina,
        // CAMBIO: No filtrar por sede por defecto para mostrar TODOS los movimientos
      }

      // Solo aplicar filtros si tienen valores específicos
      Object.entries(filtrosAplicar).forEach(([key, value]) => {
        if (value !== "" && value !== undefined && value !== null) {
          if (key === "dispositivo_id") {
            params["dispositivo"] = value
          } else {
            params[key] = value
          }
        }
      })

      console.log("🔍 Parámetros de búsqueda:", params)

      const response = await axios.get("http://localhost:8000/api/movimientos/", {
        params,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("📊 Respuesta completa del API:", response.data)

      let movimientosData = []
      let totalItems = 0

      if (Array.isArray(response.data)) {
        movimientosData = response.data
        totalItems = response.data.length
      } else if (response.data && Array.isArray(response.data.results)) {
        movimientosData = response.data.results
        totalItems = response.data.count || response.data.total || 0
      } else if (response.data && Array.isArray(response.data.data)) {
        movimientosData = response.data.data
        totalItems = response.data.total || response.data.count || response.data.data.length
      } else {
        console.warn("Formato de respuesta no reconocido", response.data)
        const possibleData = response.data.items || response.data.movimientos || []
        if (Array.isArray(possibleData)) {
          movimientosData = possibleData
          totalItems = response.data.total || response.data.count || possibleData.length
        }
      }

      console.log(`📊 Datos obtenidos: ${movimientosData.length} movimientos de ${totalItems} totales`)

      setPaginacion((prev) => ({
        ...prev,
        totalItems: totalItems,
      }))

      const movimientosFormateados = movimientosData.map((mov) => {
        const dispositivo_info = extraerInfoDispositivo(mov)
        const posicion_origen_info = mov.posicion_origen_info || {}
        const posicion_destino_info = mov.posicion_destino_info || {}
        const encargado_info = mov.encargado_info || {}
        const sede_info = mov.sede_info || {}

        // MEJORADO: Buscar nombres de sede de múltiples formas
        const sedeOrigenId = posicion_origen_info.sede || mov.sede || ""
        const sedeDestinoId = posicion_destino_info.sede || mov.sede || ""

        const sedeOrigen =
          sedes.find((s) => String(s.id) === String(sedeOrigenId))?.nombre || sede_info.nombre || "No especificada"
        const sedeDestino =
          sedes.find((s) => String(s.id) === String(sedeDestinoId))?.nombre || sede_info.nombre || "No especificada"

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
            sede: String(sedeOrigenId),
            sede_nombre: sedeOrigen,
          },
          posicion_destino: {
            id: String(mov.posicion_destino || ""),
            nombre: String(
              posicion_destino_info.nombre ||
                `Fila ${posicion_destino_info.fila}, Columna ${posicion_destino_info.columna}` ||
                "",
            ),
            piso: String(posicion_destino_info.piso || ""),
            sede: String(sedeDestinoId),
            sede_nombre: sedeDestino,
          },
          encargado: {
            id: String(mov.encargado || ""),
            nombre: String(encargado_info.nombre || "Sistema"),
            email: String(encargado_info.email || "e-inventory@emergiacc.com"),
          },
          observacion: String(mov.observacion || mov.details || ""),
          sede: {
            id: String(mov.sede || sedeOrigenId || ""),
            nombre: String(sede_info.nombre || sedeOrigen),
          },
        }
      })

      setMovimientos(movimientosFormateados)
      console.log(`✅ Se cargaron ${movimientosFormateados.length} movimientos formateados`)

      // Solo mostrar alerta informativa si se aplicaron filtros específicos
      const filtrosAplicados = Object.values(filtrosAplicar).some(
        (value) => value !== "" && value !== undefined && value !== null,
      )

      if (filtrosAplicados) {
        console.log(`🔍 Filtros aplicados - Mostrando ${movimientosFormateados.length} de ${totalItems} movimientos`)
      } else {
        console.log(
          `📊 Mostrando todos los movimientos - Página ${paginacion.pagina} de ${Math.ceil(totalItems / paginacion.itemsPorPagina)}`,
        )
      }
    } catch (error) {
      console.error("❌ Error obteniendo movimientos:", error)
      let mensajeError = "Error al cargar los movimientos"

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
    console.log("🔍 Validando campos:", {
      sedeSeleccionada,
      posicionActual,
      dispositivoSeleccionado,
      posicionNueva,
    })

    if (!sedeSeleccionada || !posicionActual || !dispositivoSeleccionado || !posicionNueva) {
      mostrarNotificacion("Debe seleccionar sede, posición origen, dispositivo y posición destino", "error")
      return
    }

    const dispositivoInfo = dispositivos.find((d) => d.id === dispositivoSeleccionado)
    const posicionOrigenInfo = posicionesPorPisoOrigen.find((p) => p.id === posicionActual)
    const posicionDestinoInfo = posicionesPorPisoDestino.find((p) => p.id === posicionNueva)
    const sedeInfo = sedes.find((s) => s.id === sedeSeleccionada)

    console.log("✅ Información encontrada:", {
      dispositivoInfo,
      posicionOrigenInfo,
      posicionDestinoInfo,
      sedeInfo,
    })

    let mensaje = `¿Confirma el movimiento del dispositivo ${dispositivoInfo?.serial || "seleccionado"} desde ${posicionOrigenInfo?.nombre || "posición origen"} hacia ${posicionDestinoInfo?.nombre || "posición destino"} en ${sedeInfo?.nombre || "la sede seleccionada"}?`

    if (detalle.trim()) {
      mensaje += `\n\nObservación: ${detalle.trim()}`
    } else {
      mensaje += `\n\nSin observaciones adicionales.`
    }

    console.log("📝 Mostrando confirmación:", mensaje)

    mostrarConfirmacion(mensaje, () => {
      console.log("✅ Usuario confirmó, guardando movimiento...")
      guardarMovimiento()
      setConfirmAlert({ ...confirmAlert, show: false })
    })
  }

  // Guardar movimiento EVITANDO DUPLICADOS
  const guardarMovimiento = async () => {
    try {
      const token = sessionStorage.getItem("token")
      const user = JSON.parse(sessionStorage.getItem("user"))

      const movimientoData = {
        dispositivo: dispositivoSeleccionado,
        posicion_origen: posicionActual,
        posicion_destino: posicionNueva,
        observacion: detalle.trim() || null, // CAMBIO: Permitir observación vacía
        sede: sedeSeleccionada,
        encargado: user?.id,
        confirmado: true, // CLAVE: Marcar como confirmado para evitar duplicados
        fecha_confirmacion: new Date().toISOString(), // CLAVE: Fecha de confirmación
        tipo_movimiento: "MANUAL", // NUEVO: Especificar que es manual
        origen: "ADMIN", // NUEVO: Especificar origen
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

  // Manejar cambio de sede
  const cambiarSede = async (e) => {
    const sedeId = e.target.value
    setSedeSeleccionada(sedeId)
    setPosicionActual("")
    setDispositivoSeleccionado("")
    setPosicionNueva("")
    setBusquedaDispositivo("")
    setPisoOrigenSeleccionado("")
    setPisoDestinoSeleccionado("")
    setPosicionesPorPisoOrigen([])
    setPosicionesPorPisoDestino([])
    setDispositivos([])

    setFiltros((prev) => ({
      ...prev,
      sede: sedeId,
      posicion: "",
      dispositivo_id: "",
    }))

    if (sedeId) {
      await obtenerPisosPorSede(sedeId)
    } else {
      setPisosOrigen([])
      setPisosDestino([])
    }
  }

  // FUNCIÓN CORREGIDA: Manejar cambio de piso origen
  const cambiarPisoOrigen = async (e) => {
    const pisoId = e.target.value
    console.log("🔄 Cambiando piso origen a:", pisoId)
    setPisoOrigenSeleccionado(pisoId)
    setPosicionActual("")
    setDispositivoSeleccionado("")
    setPosicionesPorPisoOrigen([])

    if (!pisoId || !sedeSeleccionada) return

    setCargandoPosicionesOrigen(true)
    try {
      const posiciones = await obtenerPosicionesPorPiso(pisoId, sedeSeleccionada)
      console.log("✅ Posiciones obtenidas para piso origen:", posiciones.length)
      setPosicionesPorPisoOrigen(posiciones)
    } catch (error) {
      console.error("❌ Error cargando posiciones origen:", error)
      mostrarNotificacion("Error al cargar posiciones de origen", "error")
    } finally {
      setCargandoPosicionesOrigen(false)
    }
  }

  // FUNCIÓN CORREGIDA: Manejar cambio de piso destino
  const cambiarPisoDestino = async (e) => {
    const pisoId = e.target.value
    console.log("🔄 Cambiando piso destino a:", pisoId)
    setPisoDestinoSeleccionado(pisoId)
    setPosicionNueva("")
    setPosicionesPorPisoDestino([])

    if (!pisoId || !sedeSeleccionada) return

    setCargandoPosicionesDestino(true)
    try {
      const posiciones = await obtenerPosicionesPorPiso(pisoId, sedeSeleccionada)
      console.log("✅ Posiciones obtenidas para piso destino:", posiciones.length)
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
      sede: "",
      posicion: "",
      fecha_inicio: "",
      fecha_fin: "",
      dispositivo_id: "",
    })

    // Resetear paginación al limpiar filtros
    setPaginacion((prev) => ({
      ...prev,
      pagina: 1,
      totalItems: 0,
    }))

    setTimeout(() => {
      obtenerMovimientos()
    }, 100)
  }

  // Cambiar página
  const cambiarPagina = (pagina) => {
    setPaginacion({ ...paginacion, pagina })
  }

  // Abrir diálogo de creación
  const abrirDialogoCreacion = () => {
    setSedeSeleccionada("")
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

    // CORRECCIÓN: Extraer correctamente la información de sede
    const sedeOrigenId = item.posicion_origen_info?.sede || item.posicion_origen?.sede || item.sede?.id || item.sede
    const sedeDestinoId = item.posicion_destino_info?.sede || item.posicion_destino?.sede || item.sede?.id || item.sede

    const sedeOrigenNombre =
      sedes.find((s) => String(s.id) === String(sedeOrigenId))?.nombre ||
      item.sede_info?.nombre ||
      item.sede?.nombre ||
      "No especificada"

    const sedeDestinoNombre =
      sedes.find((s) => String(s.id) === String(sedeDestinoId))?.nombre ||
      item.sede_info?.nombre ||
      item.sede?.nombre ||
      "No especificada"

    const itemFormateado = {
      id: String(item.id || item._id || "N/A"),
      fecha_movimiento: item.fecha_movimiento || item.fecha || item.createdAt || null,
      dispositivo: dispositivoInfo,
      posicion_origen: {
        id: String(item.posicion_origen?.id || item.posicion_origen || "N/A"),
        nombre: String(item.posicion_origen_info?.nombre || item.posicion_origen?.nombre || "N/A"),
        piso: String(item.posicion_origen_info?.piso || item.posicion_origen?.piso || "N/A"),
        sede: String(sedeOrigenId || "N/A"),
        sede_nombre: sedeOrigenNombre,
      },
      posicion_destino: {
        id: String(item.posicion_destino?.id || item.posicion_destino || "N/A"),
        nombre: String(item.posicion_destino_info?.nombre || item.posicion_destino?.nombre || "N/A"),
        piso: String(item.posicion_destino_info?.piso || item.posicion_destino?.piso || "N/A"),
        sede: String(sedeDestinoId || "N/A"),
        sede_nombre: sedeDestinoNombre,
      },
      encargado: {
        id: String(item.encargado?.id || item.encargado || "N/A"),
        nombre: String(item.encargado_info?.nombre || item.encargado?.nombre || "Sistema"),
        email: String(item.encargado_info?.email || item.encargado?.email || "e-inventory@emergiacc.com"),
      },
      observacion: String(item.observacion || item.details || "Sin observaciones"),
      sede: {
        id: String(item.sede?.id || item.sede || "N/A"),
        nombre: String(item.sede_info?.nombre || item.sede?.nombre || sedeOrigenNombre),
      },
    }

    console.log("🔍 Detalles del movimiento formateado:", itemFormateado)
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

  return (
    <div className="dashboard-container">
      <div className="registro-image-container">
        <img
          src={require("../assets/E-Inventory.png") || "/placeholder.svg"}
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
        <h1>Registro de Movimientos - Administrador</h1>
        <div className="header-buttons">
          <button className="btn btn-primary" onClick={abrirDialogoCreacion}>
            <span className="icon">+</span> Crear Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Sección de filtros */}
      <div className="filter-card">
        <div className="filter-grid">
          <div className="filter-item">
            <label htmlFor="sede_filtro">Sede</label>
            <select
              className="color-letra"
              id="sede_filtro"
              value={filtros.sede}
              onChange={(e) => cambiarFiltro("sede", e.target.value)}
            >
              <option value="">Todas las sedes</option>
              {Array.isArray(sedes) && sedes.length > 0 ? (
                sedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nombre}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  Cargando sedes...
                </option>
              )}
            </select>
          </div>

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
              {todosDispositivos.find((d) => d.id === filtros.dispositivo_id)?.serial || ""})
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
                  No se encontraron movimientos
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
                        {item.posicion_origen?.nombre || "No especificado"} -{" "}
                        {item.posicion_origen?.sede_nombre ||
                          sedes.find((s) => String(s.id) === String(item.posicion_origen?.sede))?.nombre ||
                          "No especificada"}
                      </div>
                      <div>
                        <strong>Destino:</strong>
                        {item.posicion_destino?.nombre || "No especificado"} -{" "}
                        {item.posicion_destino?.sede_nombre ||
                          sedes.find((s) => String(s.id) === String(item.posicion_destino?.sede))?.nombre ||
                          "No especificada"}
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

        {!cargando && !error && Array.isArray(movimientos) && movimientos.length > 0 && (
          <div className="pagination">
            <div className="pagination-info">
              <span>
                Mostrando {(paginacion.pagina - 1) * paginacion.itemsPorPagina + 1} -{" "}
                {Math.min(paginacion.pagina * paginacion.itemsPorPagina, paginacion.totalItems)} de{" "}
                {paginacion.totalItems} movimientos
              </span>
            </div>
            <div className="pagination-controls">
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(1)}
                disabled={paginacion.pagina === 1}
                title="Primera página"
              >
                ⟪
              </button>
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(paginacion.pagina - 1)}
                disabled={paginacion.pagina === 1}
                title="Página anterior"
              >
                ⟨
              </button>
              {/* Mostrar páginas cercanas */}
              {(() => {
                const totalPages = Math.ceil(paginacion.totalItems / paginacion.itemsPorPagina)
                const currentPage = paginacion.pagina
                const pages = []

                // Calcular rango de páginas a mostrar
                let startPage = Math.max(1, currentPage - 2)
                let endPage = Math.min(totalPages, currentPage + 2)

                // Ajustar si estamos cerca del inicio o final
                if (endPage - startPage < 4) {
                  if (startPage === 1) {
                    endPage = Math.min(totalPages, startPage + 4)
                  } else if (endPage === totalPages) {
                    startPage = Math.max(1, endPage - 4)
                  }
                }

                // Agregar primera página si no está en el rango
                if (startPage > 1) {
                  pages.push(
                    <button key={1} className="pagination-btn" onClick={() => cambiarPagina(1)}>
                      1
                    </button>,
                  )
                  if (startPage > 2) {
                    pages.push(
                      <span key="start-ellipsis" className="pagination-ellipsis">
                        ...
                      </span>,
                    )
                  }
                }

                // Agregar páginas en el rango
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      className={`pagination-btn ${paginacion.pagina === i ? "active" : ""}`}
                      onClick={() => cambiarPagina(i)}
                    >
                      {i}
                    </button>,
                  )
                }

                // Agregar última página si no está en el rango
                if (endPage < totalPages) {
                  if (endPage < totalPages - 1) {
                    pages.push(
                      <span key="end-ellipsis" className="pagination-ellipsis">
                        ...
                      </span>,
                    )
                  }
                  pages.push(
                    <button key={totalPages} className="pagination-btn" onClick={() => cambiarPagina(totalPages)}>
                      {totalPages}
                    </button>,
                  )
                }

                return pages
              })()}
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(paginacion.pagina + 1)}
                disabled={paginacion.pagina === Math.ceil(paginacion.totalItems / paginacion.itemsPorPagina)}
                title="Página siguiente"
              >
                ⟩
              </button>
              <button
                className="pagination-btn"
                onClick={() => cambiarPagina(Math.ceil(paginacion.totalItems / paginacion.itemsPorPagina))}
                disabled={paginacion.pagina === Math.ceil(paginacion.totalItems / paginacion.itemsPorPagina)}
                title="Última página"
              >
                ⟫
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal para crear nuevo movimiento */}
      {dialogoAbierto && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Crear Nuevo Movimiento</h2>
              <button className="modal-close" onClick={cerrarDialogoCreacion}>
                ×
              </button>
            </div>
            <div className="modal-content">
              <div className="modal-grid">
                <div className="modal-column">
                  {/* Selección de Sede */}
                  <div className="form-group">
                    <label htmlFor="sede-modal">Sede</label>
                    <select
                      className="color-letra"
                      id="sede-modal"
                      value={sedeSeleccionada}
                      onChange={cambiarSede}
                      required
                    >
                      <option value="">Seleccionar sede</option>
                      {Array.isArray(sedes) &&
                        sedes.map((sede) => (
                          <option key={sede.id} value={sede.id}>
                            {sede.nombre}
                          </option>
                        ))}
                    </select>
                  </div>

                  {sedeSeleccionada && (
                    <>
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
                              {cargandoPosicionesOrigen
                                ? " (Cargando...)"
                                : ` (${posicionesFiltradas.length} disponibles)`}
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
                                  size={8}
                                >
                                  <option value="">Seleccionar posición</option>
                                  {posicionesFiltradas.length > 0 ? (
                                    posicionesFiltradas.map((pos) => (
                                      <option key={pos.id} value={pos.id}>
                                        {formatearNombrePosicionConSede(pos)}
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
                                  <div className="select-with-scroll">
                                    <select
                                      className="color-letra"
                                      id="dispositivo-modal"
                                      value={dispositivoSeleccionado}
                                      onChange={(e) => setDispositivoSeleccionado(e.target.value)}
                                      required
                                      disabled={cargandoDispositivos || !posicionActual}
                                      size={8}
                                    >
                                      <option value="">Seleccionar dispositivo</option>
                                      {dispositivosFiltrados.length > 0 ? (
                                        dispositivosFiltrados.map((disp) => (
                                          <option key={disp.id} value={disp.id}>
                                            {disp.serial} - {disp.modelo} ({disp.marca || "Sin marca"})
                                          </option>
                                        ))
                                      ) : (
                                        <option value="" disabled>
                                          {cargandoDispositivos
                                            ? "Cargando..."
                                            : "No hay dispositivos en esta posición"}
                                        </option>
                                      )}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                <div className="modal-column">
                  {sedeSeleccionada && (
                    <>
                      {/* Selección de Piso Destino */}
                      <div className="form-group">
                        <label htmlFor="piso-destino">Piso (Destino)</label>
                        {cargandoPisos ? (
                          <div className="loading-options">Cargando pisos...</div>
                        ) : (
                          <select
                            className="color-letra"
                            id="piso-destino"
                            value={pisoDestinoSeleccionado}
                            onChange={cambiarPisoDestino}
                            required
                            disabled={cargandoPisos}
                          >
                            <option value="">Seleccionar piso</option>
                            {pisosDestino.map((piso) => (
                              <option key={piso.id} value={piso.id}>
                                {piso.nombre} (Nivel {piso.numero})
                              </option>
                            ))}
                          </select>
                        )}
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
                                  disabled={cargandoPosicionesDestino || !pisoDestinoSeleccionado}
                                  size={8}
                                >
                                  <option value="">Seleccionar posición</option>
                                  {posicionesDestinoFiltradas.length > 0 ? (
                                    posicionesDestinoFiltradas.map((pos) => (
                                      <option key={pos.id} value={pos.id}>
                                        {formatearNombrePosicionConSede(pos)}
                                      </option>
                                    ))
                                  ) : (
                                    <option value="" disabled>
                                      {cargandoPosicionesDestino ? "Cargando..." : "No hay posiciones disponibles"}
                                    </option>
                                  )}
                                </select>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </>
                  )}

                  {/* Detalles del Movimiento */}
                  <div className="form-group">
                    <label htmlFor="detalle-modal">Detalles del movimiento</label>
                    <textarea
                      id="detalle-modal"
                      value={detalle}
                      onChange={(e) => setDetalle(e.target.value)}
                      placeholder="Ingrese detalles del movimiento..."
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={cerrarDialogoCreacion}>
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmarGuardarMovimiento}
                disabled={!sedeSeleccionada || !posicionActual || !dispositivoSeleccionado || !posicionNueva}
              >
                Guardar Movimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver detalles del movimiento - NUEVO DISEÑO */}
      {dialogoDetallesAbierto && (
        <div className="modal-overlay">
          <div className="modal-details">
            <div className="modal-details-header">
              <h2>Detalles del Movimiento - {itemSeleccionado?.sede?.nombre || "Centro Unión Plaza"}</h2>
              <button className="modal-close-details" onClick={cerrarDialogoDetalles}>
                ×
              </button>
            </div>
            <div className="modal-details-content">
              {itemSeleccionado ? (
                <div className="details-grid">
                  {/* Información General */}
                  <div className="details-section">
                    <h3 className="section-title">Información General</h3>
                    <div className="detail-item">
                      <span className="detail-label">Fecha:</span>
                      <span className="detail-value">
                        {itemSeleccionado.fecha_movimiento
                          ? format(new Date(itemSeleccionado.fecha_movimiento), "dd/MM/yyyy HH:mm")
                          : "No registrado"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Tipo:</span>
                      <span className="detail-value">Movimiento</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Sede:</span>
                      <span className="detail-value">{itemSeleccionado.sede?.nombre || "No especificada"}</span>
                    </div>
                  </div>

                  {/* Dispositivo */}
                  <div className="details-section">
                    <h3 className="section-title">Dispositivo</h3>
                    <div className="detail-item">
                      <span className="detail-label">Modelo:</span>
                      <span className="detail-value">{itemSeleccionado.dispositivo?.modelo || "No especificado"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Serial:</span>
                      <span className="detail-value">{itemSeleccionado.dispositivo?.serial || "No especificado"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Marca:</span>
                      <span className="detail-value">{itemSeleccionado.dispositivo?.marca || "No especificada"}</span>
                    </div>
                  </div>

                  {/* Origen */}
                  <div className="details-section">
                    <h3 className="section-title">Origen</h3>
                    <div className="detail-item">
                      <span className="detail-label">Posición:</span>
                      <span className="detail-value">
                        {itemSeleccionado.posicion_origen?.nombre || "No especificado"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Piso:</span>
                      <span className="detail-value">
                        {itemSeleccionado.posicion_origen?.piso || "No especificado"}
                      </span>
                    </div>
                  </div>

                  {/* Destino */}
                  <div className="details-section">
                    <h3 className="section-title">Destino</h3>
                    <div className="detail-item">
                      <span className="detail-label">Posición:</span>
                      <span className="detail-value">
                        {itemSeleccionado.posicion_destino?.nombre || "No especificado"}
                      </span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Piso:</span>
                      <span className="detail-value">
                        {itemSeleccionado.posicion_destino?.piso || "No especificado"}
                      </span>
                    </div>
                  </div>

                  {/* Usuario Responsable */}
                  <div className="details-section">
                    <h3 className="section-title">Usuario Responsable</h3>
                    <div className="detail-item">
                      <span className="detail-label">Nombre:</span>
                      <span className="detail-value">{itemSeleccionado.encargado?.nombre || "Sistema"}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Email:</span>
                      <span className="detail-value">
                        {itemSeleccionado.encargado?.email || "e-inventory@emergiacc.com"}
                      </span>
                    </div>
                  </div>

                  {/* Observaciones */}
                  <div className="details-section observaciones-section">
                    <h3 className="section-title">Observaciones</h3>
                    <div className="observaciones-content">
                      {itemSeleccionado.observacion || "Movimiento automático por cambio de posición"}
                    </div>
                  </div>
                </div>
              ) : (
                <p>No hay detalles disponibles para este movimiento.</p>
              )}
            </div>
            <div className="modal-details-footer">
              <button className="btn-cerrar" onClick={cerrarDialogoDetalles}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS para las alertas y el nuevo modal */}
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
          color: #1e2130;
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
          color: rgb(205, 206, 207);
          line-height: 1.6;
          white-space: pre-line;
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
          background: white;
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

        .pagination {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
          margin-top: 20px;
          padding: 20px;
          border-top: 1px solid #e5e7eb;
        }

        .pagination-info {
          font-size: 14px;
          color: #6b7280;
          font-weight: 500;
        }

        .pagination-controls {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #1e2130;
          background: #1e2130;
          color:rgb(254, 254, 255);
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          min-width: 40px;
        }

        .pagination-btn:hover:not(:disabled) {
          background: #1e2130;
          border-color: #9ca3af;
        }

        .pagination-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .pagination-btn.active {
          background: #7c4dff;
          color: white;
          border-color: #7c4dff;
        }

        .pagination-ellipsis {
          padding: 8px 4px;
          color: #6b7280;
          font-weight: 500;
        }

        /* NUEVOS ESTILOS PARA EL MODAL DE DETALLES */
        .modal-details {
          background: #1e2130;
          border-radius: 12px;
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          overflow: hidden;
          position: relative;
          border-right: 6px solid #6366f1;
        }

        .modal-details-header {
          background: #1e2130;
          padding: 20px 24px;
          border-bottom: 1px solid #3f4451;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-details-header h2 {
          color: #e5e7eb;
          font-size: 18px;
          font-weight: 600;
          margin: 0;
        }

        .modal-close-details {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 24px;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .modal-close-details:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #e5e7eb;
        }

        .modal-details-content {
          padding: 24px;
          background: #1e2130;
          overflow-y: auto;
          max-height: calc(90vh - 140px);
        }

        .details-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .details-section {
          background: #1e2130;
          border-radius: 8px;
          padding: 16px;
        }

        .observaciones-section {
          grid-column: 1 / -1;
        }

        .section-title {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 600;
          margin: 0 0 16px 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          gap: 16px;
        }

        .detail-item:last-child {
          margin-bottom: 0;
        }

        .detail-label {
          color: #9ca3af;
          font-size: 14px;
          font-weight: 500;
          min-width: 60px;
          flex-shrink: 0;
        }

        .detail-value {
          color: #e5e7eb;
          font-size: 14px;
          font-weight: 400;
          text-align: right;
          word-break: break-word;
        }

        .observaciones-content {
          color: #e5e7eb;
          font-size: 14px;
          line-height: 1.5;
          background: #1e2130;
          padding: 12px;
          border-radius: 6px;
          border-left: 3px solid #6366f1;
        }

        .modal-details-footer {
          background: #1e2130;
          padding: 16px 24px;
          border-top: 1px solid #1e2130;
          display: flex;
          justify-content: flex-end;
        }

        .btn-cerrar {
          background: #6366f1;
          color: white;
          border: none;
          padding: 10px 24px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-cerrar:hover {
          background: #5855eb;
        }

        /* Responsive para el modal de detalles */
        @media (max-width: 768px) {
          .modal-details {
            width: 95%;
            max-height: 95vh;
          }

          .details-grid {
            grid-template-columns: 1fr;
            gap: 16px;
          }

          .modal-details-header {
            padding: 16px 20px;
          }

          .modal-details-content {
            padding: 20px;
          }

          .modal-details-footer {
            padding: 12px 20px;
          }

          .detail-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .detail-value {
            text-align: left;
          }
        }
      `}</style>
    </div>
  )
}

export default Movimientos
