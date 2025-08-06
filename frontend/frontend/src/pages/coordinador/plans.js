  /* eslint-disable eqeqeq */
"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import axios from "axios"
import {
  FaTimes,
  FaPlus,
  FaDownload,
  FaUpload,
  FaSearch,
  FaSearchPlus,
  FaSearchMinus,
  FaUndo,
  FaCheck,
  FaExclamationTriangle,
  FaList,
  FaTable,
  FaChartPie,
} from "react-icons/fa"
import * as XLSX from "xlsx"
import "../../styles/Plans.css" // Asegúrate de que esta ruta es correcta
import { useAuth } from "../../components/auth" // Importar useAuth

// Chart.js imports
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
} from "chart.js"
import { Doughnut } from "react-chartjs-2"
import ChartDataLabels from "chartjs-plugin-datalabels"

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartDataLabels,
)

const API_URL = "http://localhost:8000/"
const COLOR_DEFAULT = "#FFFFFF"

const ESTADOS = [
  { value: "disponible", label: "Disponible", color: "green" },
  { value: "ocupado", label: "Ocupado", color: "red" },
  { value: "reservado", label: "Reservado", color: "orange" },
  { value: "inactivo", label: "Inactivo", color: "gray" },
]

const getContrastColor = (hexcolor) => {
  if (!hexcolor) return "#000000"
  try {
    const hex = hexcolor.replace("#", "")
    const r = Number.parseInt(hex.substr(0, 2), 16)
    const g = Number.parseInt(hex.substr(2, 2), 16)
    const b = Number.parseInt(hex.substr(4, 2), 16)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
    return luminance > 0.5 ? "#000000" : "#ffffff"
  } catch (error) {
    return "#000000"
  }
}

const cleanHexColor = (hexColor) => {
  if (!hexColor) return "#FFFFFF"
  try {
    if (/^#[0-9A-F]{6}$/i.test(hexColor)) {
      return hexColor
    }
    if (/^[0-9A-F]{6}$/i.test(hexColor)) {
      return `#${hexColor}`
    }
    let cleanedColor = hexColor
    if (/^[0-9A-F]{8}$/i.test(hexColor)) {
      cleanedColor = hexColor.substring(2)
      return `#${cleanedColor}`
    }
    if (hexColor.startsWith("#")) {
      cleanedColor = hexColor.substring(1)
      if (/^[0-9A-F]{3}$/i.test(cleanedColor)) {
        return `#${cleanedColor[0]}${cleanedColor[0]}${cleanedColor[1]}${cleanedColor[1]}${cleanedColor[2]}${cleanedColor[2]}`
      }
      if (/^[0-9A-F]{8}$/i.test(cleanedColor)) {
        return `#${cleanedColor.substring(2)}`
      }
    }
    if (!/^#[0-9A-F]{6}$/i.test(`#${cleanedColor}`)) {
      return "#FFFFFF"
    }
    return `#${cleanedColor}`
  } catch (error) {
    return "#FFFFFF"
  }
}

const extractColor = (cell) => {
  try {
    if (!cell || !cell.s || !cell.s.fill) return { color: "#FFFFFF", originalColor: "FFFFFF" }
    const cleanColor = (colorStr) => {
      if (!colorStr) return null
      if (colorStr.length === 8 && colorStr.startsWith("FF")) {
        return colorStr.substring(2)
      }
      return colorStr
    }
    let color = null
    if (cell.s.fill.fgColor) {
      if (cell.s.fill.fgColor.rgb) {
        color = cleanColor(cell.s.fill.fgColor.rgb)
      } else if (cell.s.fill.fgColor.theme !== undefined) {
        const themeColors = {
          0: "5B9BD5",
        }
        color = themeColors[cell.s.fill.fgColor.theme] || "FFFFFF"
      } else if (cell.s.fill.fgColor.indexed !== undefined) {
        const indexedColors = {
          0: "FF0000",
        }
        color = indexedColors[cell.s.fill.fgColor.indexed] || "FFFFFF"
      }
    }
    if (!color && cell.s.fill.bgColor) {
      if (cell.s.fill.bgColor.rgb) {
        color = cleanColor(cell.s.fill.bgColor.rgb)
      } else if (cell.s.fill.bgColor.theme !== undefined) {
        const themeColors = {
          0: "FFFFFF",
        }
        color = themeColors[cell.s.fill.bgColor.theme] || "FFFFFF"
      } else if (cell.s.fill.bgColor.indexed !== undefined) {
        const indexedColors = {
          0: "000000",
        }
        color = indexedColors[cell.s.fill.bgColor.indexed] || "FFFFFF"
      }
    }
    if (!color && cell.s.fill.patternType === "solid") {
      if (cell.s.fill.color && cell.s.fill.color.rgb) {
        color = cleanColor(cell.s.fill.color.rgb)
      } else if (cell.s.fill.color && cell.s.fill.color.theme !== undefined) {
        const themeColors = {
          0: "FFFFFF",
        }
        color = themeColors[cell.s.fill.color.theme] || "FFFFFF"
      } else if (cell.s.fill.color && cell.s.fill.color.indexed !== undefined) {
        const indexedColors = {
          0: "000000",
        }
        color = indexedColors[cell.s.fill.color.indexed] || "FFFFFF"
      }
    }
    if (!color && cell.s.fill.start && cell.s.fill.end) {
      if (cell.s.fill.start.rgb) {
        color = cleanColor(cell.s.fill.start.rgb)
      } else if (cell.s.fill.end.rgb) {
        color = cleanColor(cell.s.fill.end.rgb)
      }
    }
    if (!color || color === "auto") {
      return { color: "#FFFFFF", originalColor: "FFFFFF" }
    }
    color = color.replace(/^#/, "")
    if (!/^[0-9A-F]{6}$/i.test(color)) {
      return { color: "#FFFFFF", originalColor: "FFFFFF" }
    }
    return {
      color: `#${color}`,
      originalColor: color,
    }
  } catch (error) {
    return { color: "#FFFFFF", originalColor: "FFFFFF" }
  }
}

function FloorPlan() {
  // Usar useAuth para obtener información de la sede
  const { sedeId, sedeNombre } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [positions, setPositions] = useState({})
  const [rows, setRows] = useState(51)
  const [columns, setColumns] = useState([
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
    "AA",
    "AB",
    "AC",
    "AD",
    "AE",
    "AF",
    "AG",
    "AH",
    "AI",
    "AJ",
    "AK",
    "AL",
    "AM",
    "AN",
    "AO",
    "AP",
    "AQ",
    "AR",
    "AS",
    "AT",
    "AU",
    "AV",
    "AW",
    "AX",
    "AY",
    "AZ",
    "BA",
    "BB",
    "BC",
    "BD",
    "BE",
    "BF",
    "BG",
    "BH",
    "BI",
    "BJ",
    "BK",
    "BL",
    "BM",
    "BN",
    "BO",
    "BP",
    "BQ",
    "BR",
    "BS",
    "BT",
    "BU",
    "BV",
    "BW",
  ])
  const [pisos, setPisos] = useState([])
  const [newPosition, setNewPosition] = useState({
    id: null,
    nombre: "",
    tipo: "",
    estado: "disponible",
    detalles: "",
    fila: 1,
    columna: "A",
    color: COLOR_DEFAULT,
    colorFuente: "#000000",
    colorOriginal: "",
    borde: false,
    bordeDoble: false,
    bordeDetalle: {
      top: false,
      right: false,
      bottom: false,
      left: false,
      topDouble: false,
      rightDouble: false,
      bottomDouble: false,
      leftDouble: false,
    },
    piso: "",
    sede: sedeId, // Usar sedeId del contexto
    servicio: "",
    dispositivos: [],
    mergedCells: [],
  })
  const [zoomLevel, setZoomLevel] = useState(1)
  const [selectedPiso, setSelectedPiso] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [deviceSearchTerm, setDeviceSearchTerm] = useState("")
  const [selectionStart, setSelectionStart] = useState(null)
  const [selectionEnd, setSelectionEnd] = useState(null)
  const [isSelecting, setIsSelecting] = useState(false)
  const [loading, setLoading] = useState(false)
  const [notification, setNotification] = useState({ show: false, message: "", type: "success" })
  const tableContainerRef = useRef(null)
  const [showAllPositions, setShowAllPositions] = useState(false)
  const [allDevices, setAllDevices] = useState([])
  const [assignedDevices, setAssignedDevices] = useState({})
  const [viewMode, setViewMode] = useState("plano")
  const [servicios, setServicios] = useState([])
  const [sedes, setSedes] = useState([])
  const [selectedService, setSelectedService] = useState("")
  const [confirmAlert, setConfirmAlert] = useState({
    show: false,
    message: "",
    onConfirm: null,
    onCancel: null,
  })
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [importFile, setImportFile] = useState(null)
  const [importFileData, setImportFileData] = useState(null)
  const [importFileName, setImportFileName] = useState("")
  const [importTargetPiso, setImportTargetPiso] = useState("")

  // Función para cargar todos los pisos disponibles FILTRADOS POR SEDE
  const fetchPisos = useCallback(async () => {
    try {
      if (!sedeId) {
        console.log("❌ No hay sede seleccionada, limpiando pisos")
        setPisos([])
        setSelectedPiso("")
        return
      }
      console.log("🏢 Cargando pisos para sede:", sedeId)
      const url = `${API_URL}api/pisos/`
      let response
      try {
        response = await axios.get(`${url}?sede=${sedeId}`)
      } catch (error) {
        console.log("⚠️ Error con filtro en URL, intentando sin filtro:", error)
        response = await axios.get(url)
      }
      let pisosData = []
      if (response.data && Array.isArray(response.data)) {
        pisosData = response.data
      } else if (response.data && Array.isArray(response.data.results)) {
        pisosData = response.data.results
      } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
        pisosData = response.data.data
      }
      console.log("📋 Pisos obtenidos del backend:", pisosData)
      // FILTRAR SOLO PISOS DE LA SEDE DEL USUARIO
      const filteredPisos = pisosData.filter((piso) => {
        const pisoSede = piso.sede || piso.sede_id || piso.sedeId
        const sedeIdNum = Number(sedeId)
        const pisoSedeNum = Number(pisoSede)
        return pisoSedeNum === sedeIdNum || pisoSede === sedeId || pisoSede === sedeIdNum
      })
      console.log("✅ Pisos filtrados para sede:", filteredPisos)
      const formattedPisos = filteredPisos.map((piso) => ({
        value: piso.id ? piso.id.toString() : piso.nombre,
        label: piso.nombre || `Piso ${piso.id}`,
        id: piso.id,
        sede: piso.sede || piso.sede_id || piso.sedeId,
        ...piso,
      }))
      setPisos(formattedPisos)
      if (!selectedPiso && formattedPisos.length > 0) {
        console.log("🎯 Seleccionando primer piso:", formattedPisos[0].value)
        setSelectedPiso(formattedPisos[0].value)
        setNewPosition((prev) => ({
          ...prev,
          piso: formattedPisos[0].value,
          sede: sedeId, // Forzar sede del usuario
        }))
      } else if (selectedPiso && formattedPisos.length > 0) {
        const pisoExists = formattedPisos.some((p) => p.value === selectedPiso)
        if (!pisoExists) {
          console.log("🔄 Piso seleccionado no existe en nueva sede, seleccionando primero:", formattedPisos[0].value)
          setSelectedPiso(formattedPisos[0].value)
          setNewPosition((prev) => ({
            ...prev,
            piso: formattedPisos[0].value,
            sede: sedeId, // Forzar sede del usuario
          }))
        }
      } else if (formattedPisos.length === 0) {
        console.log("❌ No hay pisos para esta sede")
        setSelectedPiso("")
        setNewPosition((prev) => ({
          ...prev,
          piso: "",
          sede: sedeId, // Mantener sede del usuario
        }))
      }
    } catch (error) {
      console.error("❌ Error al cargar pisos:", error)
      showNotification(`Error al cargar los pisos para la sede: ${error.message}`, "error")
      setPisos([])
      setSelectedPiso("")
      setNewPosition((prev) => ({
        ...prev,
        piso: "",
        sede: sedeId, // Mantener sede del usuario
      }))
    }
  }, [sedeId, selectedPiso])

  // Función para cargar datos de selectores FILTRADOS POR SEDE
  const fetchSelectorData = useCallback(async () => {
    try {
      if (!sedeId) return
      console.log("🔄 Cargando datos de selectores para sede:", sedeId)
      try {
        const dispositivosResponse = await axios.get(`${API_URL}api/dispositivos/?sede=${sedeId}`)
        let dispositivosData = []
        if (dispositivosResponse.data) {
          if (Array.isArray(dispositivosResponse.data)) {
            dispositivosData = dispositivosResponse.data
          } else if (dispositivosResponse.data.results && Array.isArray(dispositivosResponse.data.results)) {
            dispositivosData = dispositivosResponse.data.results
          } else if (dispositivosResponse.data.data && Array.isArray(dispositivosResponse.data.data)) {
            dispositivosData = dispositivosResponse.data.data
          }
        }
        // FILTRAR DISPOSITIVOS POR SEDE DEL USUARIO
        const filteredDispositivos = dispositivosData.filter(
          (device) => device && device.id && (device.sede === sedeId || device.sede === Number(sedeId)),
        )
        setAllDevices(filteredDispositivos)
        console.log("📱 Dispositivos cargados para sede:", filteredDispositivos.length)
      } catch (error) {
        console.error("❌ Error cargando dispositivos:", error)
        setAllDevices([])
      }
      try {
        const [serviciosResponse, sedesResponse] = await Promise.all([
          axios.get(`${API_URL}api/servicios/`),
          axios.get(`${API_URL}api/sedes/${sedeId}/`), // Cargar solo la sede del usuario
        ])
        setServicios(serviciosResponse.data || [])
        // Configurar solo la sede del usuario
        const sedeData = sedesResponse.data
        const sedeFormateada = {
          id: sedeData.id || sedeData.pk || sedeData.ID || sedeId,
          nombre: sedeData.nombre || sedeData.name || sedeData.Nombre || sedeNombre || `Sede ${sedeId}`,
        }
        setSedes([sedeFormateada])
        console.log("🏢 Sede cargada:", sedeFormateada)
        console.log("🔧 Servicios cargados:", serviciosResponse.data?.length || 0)
      } catch (error) {
        console.error("❌ Error cargando servicios/sede:", error)
        setServicios([])
        // Fallback con datos del contexto de autenticación
        setSedes([
          {
            id: sedeId,
            nombre: sedeNombre || `Sede ${sedeId}`,
          },
        ])
      }
    } catch (error) {
      console.error("❌ Error general en fetchSelectorData:", error)
      showNotification("Error al cargar datos del servidor", "error")
    }
  }, [sedeId, sedeNombre])

  // FUNCIÓN OPTIMIZADA PARA CARGAR SOLO POSICIONES DEL PISO Y SEDE SELECCIONADOS
  const fetchPositions = useCallback(
    async (specificPiso = null) => {
      try {
        if (!sedeId) {
          console.log("❌ No hay sede seleccionada, no se cargan posiciones")
          setPositions({})
          updateAssignedDevices({})
          return
        }
        const targetPiso = specificPiso || selectedPiso
        if (!targetPiso) {
          console.log("❌ No hay piso seleccionado, no se cargan posiciones")
          setPositions({})
          updateAssignedDevices({})
          return
        }
        console.log("🔄 Cargando posiciones para piso:", targetPiso, "y sede:", sedeId)
        setLoading(true)
        // FILTRAR POR PISO Y SEDE ESPECÍFICOS EN LA URL
        const url = `${API_URL}api/posiciones/?piso=${targetPiso}&sede=${sedeId}`
        let allPositions = []
        let nextUrl = url
        while (nextUrl) {
          console.log("📡 Obteniendo desde:", nextUrl)
          const response = await axios.get(nextUrl)
          let positionsData = []
          if (response.data && Array.isArray(response.data)) {
            positionsData = response.data
          } else if (response.data && Array.isArray(response.data.results)) {
            positionsData = response.data.results
            nextUrl = response.data.next
          } else {
            positionsData = []
            nextUrl = null
          }
          console.log(`📋 Posiciones obtenidas para piso ${targetPiso} y sede ${sedeId}:`, positionsData.length)
          allPositions = allPositions.concat(positionsData)
        }
        console.log(`✅ Total de posiciones cargadas:`, allPositions.length)
        // Procesamiento de posiciones específicas del piso y sede
        const positionsObj = allPositions.reduce((acc, pos) => {
          try {
            // VERIFICAR QUE LA POSICIÓN PERTENECE AL PISO Y SEDE CORRECTOS
            const posSedeId = pos.sede || pos.sede_id
            if (String(pos.piso) !== String(targetPiso) || (posSedeId && Number(posSedeId) !== Number(sedeId))) {
              console.log(`⚠️ Posición ${pos.id} no pertenece al piso ${targetPiso} o sede ${sedeId}, omitiendo`)
              return acc
            }
            console.log(
              `🔧 Procesando posición ID: ${pos.id}, Nombre: ${pos.nombre}, Piso: ${pos.piso}, Sede: ${posSedeId}`,
            )
            const normalizedPos = {
              ...pos,
              fila: Number.parseInt(pos.fila, 10) || 1,
              mergedCells: Array.isArray(pos.mergedCells)
                ? pos.mergedCells
                : [{ row: Number.parseInt(pos.fila, 10) || 1, col: pos.columna || "A" }],
              bordeDetalle:
                typeof pos.bordeDetalle === "object" && pos.bordeDetalle !== null
                  ? pos.bordeDetalle
                  : {
                      top: false,
                      right: false,
                      bottom: false,
                      left: false,
                      topDouble: false,
                      rightDouble: false,
                      bottomDouble: false,
                      leftDouble: false,
                    },
              dispositivos: Array.isArray(pos.dispositivos)
                ? pos.dispositivos.map((d) => (typeof d === "object" ? d.id : Number(d)))
                : pos.dispositivos
                  ? [typeof pos.dispositivos === "object" ? pos.dispositivos.id : Number(pos.dispositivos)]
                  : [],
              nombre: pos.nombre || "",
              tipo: pos.tipo || "",
              estado: pos.estado || "disponible",
              detalles: pos.detalles || "",
              color: pos.color || COLOR_DEFAULT,
              colorFuente: pos.colorFuente || "#000000",
              colorOriginal: pos.colorOriginal || "",
              borde: Boolean(pos.borde),
              bordeDoble: Boolean(pos.bordeDoble),
              piso: pos.piso,
              sede: sedeId, // Forzar sede del usuario
              sede_nombre: sedeNombre,
              servicio: pos.servicio || null,
            }
            return { ...acc, [pos.id]: normalizedPos }
          } catch (error) {
            console.error(`❌ Error procesando posición ${pos.id}:`, error)
            return acc
          }
        }, {})
        console.log("📊 Posiciones procesadas:", Object.keys(positionsObj).length)
        setPositions(positionsObj)
        updateAssignedDevices(positionsObj)
        console.log("✅ Posiciones cargadas y estado actualizado")
      } catch (error) {
        console.error("❌ Error al cargar las posiciones:", error)
        if (error.response) {
          console.error("Respuesta del servidor:", error.response.status, error.response.data)
        }
        showNotification("Error al cargar las posiciones", "error")
      } finally {
        setLoading(false)
      }
    },
    [selectedPiso, sedeId, sedeNombre],
  )

  const updateAssignedDevices = (positionsData) => {
    const assignedMap = {}
    Object.values(positionsData).forEach((position) => {
      if (position.dispositivos && position.dispositivos.length > 0) {
        const deviceIds = position.dispositivos.map((d) => (typeof d === "object" ? d.id : Number(d)))
        deviceIds.forEach((deviceId) => {
          assignedMap[deviceId] = position.id
        })
      }
    })
    setAssignedDevices(assignedMap)
  }

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type })
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "success" })
    }, 3000)
  }

  // useEffect hooks optimizados
  useEffect(() => {
    if (!sedeId) return
    console.log("🚀 Componente montado con sede:", sedeId)
    fetchSelectorData()
    fetchPisos()
  }, [sedeId, fetchSelectorData, fetchPisos])

  // CARGAR POSICIONES SOLO CUANDO CAMBIE EL PISO SELECCIONADO
  useEffect(() => {
    if (selectedPiso && pisos.length > 0 && sedeId) {
      console.log("🔄 Piso seleccionado cambió, cargando posiciones para:", selectedPiso)
      fetchPositions(selectedPiso)
    } else {
      console.log("🔄 No hay piso seleccionado o sede, limpiando posiciones")
      setPositions({})
      updateAssignedDevices({})
    }
  }, [selectedPiso, pisos.length, sedeId, fetchPositions])

  const getServiceColor = (serviceId) => {
    if (!serviceId) return COLOR_DEFAULT
    if (typeof serviceId === "object" && serviceId.color) {
      return serviceId.color
    }
    const serviceIdNum = typeof serviceId === "string" ? Number.parseInt(serviceId, 10) : serviceId
    const service = servicios.find((s) => {
      const sId = typeof s.id === "string" ? Number.parseInt(s.id, 10) : s.id
      return sId === serviceIdNum
    })
    return service && service.color ? service.color : COLOR_DEFAULT
  }

  const getServiceName = (serviceId) => {
    if (!serviceId) return ""
    if (typeof serviceId === "object" && serviceId.nombre) {
      return serviceId.nombre
    }
    const service = servicios.find((s) => s.id === Number(serviceId) || s.id === serviceId)
    return service ? service.nombre : ""
  }

  const getSedeName = (sedeId) => {
    if (!sedeId) return ""
    const sede = sedes.find((s) => s.id === Number(sedeId) || s.id === sedeId)
    return sede ? sede.nombre : ""
  }

  const getPisoName = (pisoValue) => {
    const piso = pisos.find((p) => p.value === pisoValue || p.id.toString() === pisoValue)
    return piso ? piso.label : pisoValue
  }

  const getAvailableDevices = (currentPositionId) => {
    // Solo dispositivos de la sede del usuario
    return allDevices.filter((device) => {
      const isSameSede = device.sede === sedeId || device.sede === Number(sedeId)
      const isAvailable = !assignedDevices[device.id] || assignedDevices[device.id] === currentPositionId
      return isSameSede && isAvailable
    })
  }

  // FILTRADO SIMPLIFICADO: Solo por piso actual (ya filtrado en fetchPositions)
  const filteredPositions = Object.values(positions).filter((pos) => {
    // Aplicar filtro de búsqueda
    const searchMatches =
      searchTerm === "" ||
      (pos.nombre && pos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pos.servicio &&
        typeof pos.servicio === "object" &&
        pos.servicio.nombre &&
        pos.servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (pos.servicio &&
        typeof pos.servicio === "string" &&
        getServiceName(pos.servicio).toLowerCase().includes(searchTerm.toLowerCase()))
    return searchMatches
  })

  console.log(`📊 Total posiciones filtradas: ${filteredPositions.length}`)

  // FUNCIÓN MEJORADA DE IMPORTACIÓN
  const importFromExcel = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    console.log("📁 Archivo seleccionado:", file.name, "Tamaño:", file.size, "Tipo:", file.type)
    setImportFile(null)
    setImportFileData(null)
    setImportFileName("")
    setImportTargetPiso("")
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const arrayBuffer = event.target.result
        console.log("📊 Archivo leído correctamente, tamaño del buffer:", arrayBuffer.byteLength)
        setImportFileData(arrayBuffer)
        setImportFileName(file.name)
        setConfirmAlert({
          show: true,
          message: `¿Estás seguro de que deseas importar posiciones desde el archivo "${file.name}" para la sede ${sedeNombre}?`,
          onConfirm: () => {
            console.log("✅ Usuario confirmó importación del archivo:", file.name)
            setIsImportModalOpen(true)
            setConfirmAlert({ ...confirmAlert, show: false })
          },
          onCancel: () => {
            console.log("❌ Usuario canceló importación")
            setImportFileData(null)
            setImportFileName("")
            setImportTargetPiso("")
            e.target.value = null
            setConfirmAlert({ ...confirmAlert, show: false })
          },
        })
      } catch (error) {
        console.error("❌ Error al leer el archivo:", error)
        showNotification("Error al leer el archivo seleccionado", "error")
        e.target.value = null
      }
    }
    reader.onerror = () => {
      console.error("❌ Error del FileReader")
      showNotification("Error al leer el archivo", "error")
      e.target.value = null
    }
    reader.readAsArrayBuffer(file)
  }

  // FUNCIÓN MEJORADA PARA PROCESAR EL ARCHIVO DE IMPORTACIÓN
  const processImportFile = async () => {
    if (!importFileData || !importFileName) {
      showNotification("Error: No hay archivo para procesar", "error")
      return
    }
    const targetPiso = importTargetPiso || selectedPiso
    if (!targetPiso) {
      showNotification("Error: Debe seleccionar un piso antes de importar.", "error")
      return
    }
    setLoading(true)
    setIsImportModalOpen(false)
    console.log("🚀 Iniciando procesamiento del archivo:", importFileName)
    console.log("🎯 Piso objetivo:", targetPiso, "Sede:", sedeId)
    showNotification(
      `Procesando archivo ${importFileName} para el piso ${getPisoName(targetPiso)} en ${sedeNombre}...`,
      "success",
    )
    try {
      if (allDevices.length === 0) {
        showNotification(
          "Error: No hay dispositivos disponibles en el sistema. Debe crear al menos un dispositivo antes de importar.",
          "error",
        )
        setLoading(false)
        return
      }
      const confirmAction = window.confirm(
        `¿Cómo desea proceder con la importación del archivo "${importFileName}" en el piso "${getPisoName(targetPiso)}" de la sede "${sedeNombre}"?\n\n` +
          "- Seleccione 'Aceptar' para actualizar las posiciones existentes y agregar las nuevas.\n" +
          "- Seleccione 'Cancelar' para cancelar el proceso de importación.",
      )
      if (!confirmAction) {
        setLoading(false)
        setImportFileData(null)
        setImportFileName("")
        setImportTargetPiso("")
        showNotification("Importación cancelada por el usuario", "success")
        return
      }
      // OBTENER POSICIONES EXISTENTES PARA EL PISO Y SEDE ESPECÍFICOS
      const existingPositions = Object.values(positions).filter(
        (pos) => String(pos.piso) === String(targetPiso) && Number(pos.sede) === Number(sedeId),
      )
      console.log("📋 Posiciones existentes en el piso y sede:", existingPositions.length)
      // PROCESAR EL ARCHIVO USANDO LOS DATOS GUARDADOS
      const data = new Uint8Array(importFileData)
      const workbook = XLSX.read(data, {
        type: "array",
        cellStyles: true,
        cellDates: true,
      })
      console.log("📊 Workbook cargado, hojas disponibles:", workbook.SheetNames)
      const sheetName = workbook.SheetNames[0]
      const worksheet = workbook.Sheets[sheetName]
      const range = XLSX.utils.decode_range(worksheet["!ref"])
      console.log("📐 Rango del worksheet:", range)
      const lastExcelColumn = XLSX.utils.encode_col(range.e.c)
      const currentLastColumn = columns[columns.length - 1]
      if (XLSX.utils.decode_col(lastExcelColumn) > XLSX.utils.decode_col(currentLastColumn)) {
        const newColumns = [...columns]
        let nextCol = getNextColumn(newColumns)
        while (XLSX.utils.decode_col(nextCol) <= XLSX.utils.decode_col(lastExcelColumn)) {
          newColumns.push(nextCol)
          nextCol = getNextColumn(newColumns)
        }
        setColumns(newColumns)
        showNotification(`Se han añadido ${newColumns.length - columns.length} columnas nuevas`, "success")
      }
      const mergedCellsInfo = worksheet["!merges"] || []
      const processedCells = {}
      const newPositions = {}
      let savedCount = 0
      let updatedCount = 0
      let errorCount = 0
      let skippedCount = 0
      // CREAR MAPA DE POSICIONES EXISTENTES ESPECÍFICO PARA EL PISO Y SEDE
      const existingPositionsMap = {}
      existingPositions.forEach((pos) => {
        pos.mergedCells.forEach((cell) => {
          const key = `${cell.row}-${cell.col}-${targetPiso}-${sedeId}`
          existingPositionsMap[key] = pos
        })
      })
      console.log("🗺️ Mapa de posiciones existentes creado:", Object.keys(existingPositionsMap).length)
      // Procesar celdas combinadas
      for (const mergeInfo of mergedCellsInfo) {
        const startRow = mergeInfo.s.r
        const startCol = mergeInfo.s.c
        const endRow = mergeInfo.e.r
        const endCol = mergeInfo.e.c
        const mainCellAddress = XLSX.utils.encode_cell({ r: startRow, c: startCol })
        const mainCell = worksheet[mainCellAddress]
        const cellValue = mainCell && mainCell.v !== undefined && mainCell.v !== null ? String(mainCell.v).trim() : ""
        const colorInfo = mainCell ? extractColor(mainCell) : { color: "#FFFFFF", originalColor: "FFFFFF" }
        const cellColor = cleanHexColor(colorInfo.color)
        const mergedCells = []
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            const actualRow = r + 1
            const colLetter = XLSX.utils.encode_col(c)
            mergedCells.push({ row: actualRow, col: colLetter })
            processedCells[`${actualRow}-${colLetter}`] = true
          }
        }
        const position = {
          nombre: cellValue,
          tipo: "",
          estado: "disponible",
          detalles: "",
          fila: startRow + 1,
          columna: XLSX.utils.encode_col(startCol),
          color: cellColor,
          colorFuente: getContrastColor(cellColor),
          colorOriginal: colorInfo.originalColor,
          piso: targetPiso,
          sede: sedeId, // FORZAR SEDE DEL USUARIO
          mergedCells: mergedCells,
          dispositivos: [],
          borde: false,
          bordeDoble: false,
          bordeDetalle: {
            top: false,
            right: false,
            bottom: false,
            left: false,
            topDouble: false,
            rightDouble: false,
            bottomDouble: false,
            leftDouble: false,
          },
        }
        if (servicios.length > 0) {
          const matchingService = servicios.find((s) => {
            const serviceColor = cleanHexColor(s.color)
            const positionColor = cleanHexColor(cellColor)
            return serviceColor.toLowerCase() === positionColor.toLowerCase()
          })
          if (matchingService) {
            position.servicio = matchingService.id
          }
        }
        const mainCellKey = `${position.fila}-${position.columna}-${targetPiso}-${sedeId}`
        const existingPosition = existingPositionsMap[mainCellKey]
        if (confirmAction && existingPosition) {
          try {
            const updatedPosition = {
              ...position,
              id: existingPosition.id,
              dispositivos: existingPosition.dispositivos,
              estado: existingPosition.estado,
              detalles: existingPosition.detalles || position.detalles,
              sede: sedeId, // FORZAR SEDE DEL USUARIO
            }
            console.log("🔄 Actualizando posición combinada:", updatedPosition.id, updatedPosition.nombre)
            const response = await axios.put(`${API_URL}api/posiciones/${existingPosition.id}/`, updatedPosition)
            if (response.status === 200) {
              newPositions[response.data.id] = response.data
              updatedCount++
            }
          } catch (error) {
            console.error("Error al actualizar posición combinada:", error)
            errorCount++
          }
        } else {
          try {
            console.log("➕ Creando nueva posición combinada:", position.nombre, "en piso", targetPiso, "sede", sedeId)
            const response = await axios.post(`${API_URL}api/posiciones/`, position)
            if (response.status === 201) {
              newPositions[response.data.id] = response.data
              savedCount++
            }
          } catch (error) {
            console.error("Error al guardar posición combinada:", error)
            errorCount++
          }
        }
      }
      // Procesar celdas individuales
      for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
          const actualRow = row + 1
          const colLetter = XLSX.utils.encode_col(col)
          if (processedCells[`${actualRow}-${colLetter}`]) {
            continue
          }
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
          const cell = worksheet[cellAddress]
          const cellValue = cell && cell.v !== undefined && cell.v !== null ? String(cell.v).trim() : ""
          const colorInfo = cell ? extractColor(cell) : { color: "#FFFFFF", originalColor: "FFFFFF" }
          const cellColor = cleanHexColor(colorInfo.color)
          if (cellValue === "") {
            skippedCount++
            continue
          }
          const position = {
            nombre: cellValue,
            tipo: "",
            estado: "disponible",
            detalles: "",
            fila: actualRow,
            columna: colLetter,
            color: cellColor,
            colorFuente: getContrastColor(cellColor),
            colorOriginal: colorInfo.originalColor,
            piso: targetPiso,
            sede: sedeId, // FORZAR SEDE DEL USUARIO
            mergedCells: [{ row: actualRow, col: colLetter }],
            dispositivos: [],
            borde: false,
            bordeDoble: false,
            bordeDetalle: {
              top: false,
              right: false,
              bottom: false,
              left: false,
              topDouble: false,
              rightDouble: false,
              bottomDouble: false,
              leftDouble: false,
            },
          }
          if (servicios.length > 0) {
            const matchingService = servicios.find((s) => {
              const serviceColor = cleanHexColor(s.color)
              const positionColor = cleanHexColor(cellColor)
              return serviceColor.toLowerCase() === positionColor.toLowerCase()
            })
            if (matchingService) {
              position.servicio = matchingService.id
            }
          }
          const cellKey = `${actualRow}-${colLetter}-${targetPiso}-${sedeId}`
          const existingPosition = existingPositionsMap[cellKey]
          if (confirmAction && existingPosition) {
            try {
              const updatedPosition = {
                ...position,
                id: existingPosition.id,
                dispositivos: existingPosition.dispositivos,
                estado: existingPosition.estado,
                detalles: existingPosition.detalles || position.detalles,
                sede: sedeId, // FORZAR SEDE DEL USUARIO
              }
              console.log("🔄 Actualizando posición individual:", updatedPosition.id, updatedPosition.nombre)
              const response = await axios.put(`${API_URL}api/posiciones/${existingPosition.id}/`, updatedPosition)
              if (response.status === 200) {
                newPositions[response.data.id] = response.data
                updatedCount++
              }
            } catch (error) {
              console.error("Error al actualizar posición individual:", error)
              errorCount++
            }
          } else {
            try {
              console.log(
                "➕ Creando nueva posición individual:",
                position.nombre,
                "en piso",
                targetPiso,
                "sede",
                sedeId,
              )
              const response = await axios.post(`${API_URL}api/posiciones/`, position)
              if (response.status === 201) {
                newPositions[response.data.id] = response.data
                savedCount++
                if (savedCount % 10 === 0) {
                  showNotification(`Importando... ${savedCount} posiciones guardadas`, "success")
                }
              }
            } catch (error) {
              console.error("Error al guardar posición individual:", error)
              errorCount++
            }
          }
        }
      }
      setPositions((prev) => {
        const updated = { ...prev, ...newPositions }
        updateAssignedDevices(updated)
        return updated
      })
      const resultMessage = `Importación de "${importFileName}" completada en piso "${getPisoName(targetPiso)}" de ${sedeNombre}: ${savedCount} posiciones nuevas, ${updatedCount} posiciones actualizadas, ${skippedCount} celdas vacías omitidas${
        errorCount > 0 ? `, ${errorCount} errores` : ""
      }`
      showNotification(resultMessage, errorCount > 0 ? "error" : "success")
      // RECARGAR SOLO LAS POSICIONES DEL PISO ACTUAL
      await fetchPositions(targetPiso)
    } catch (error) {
      console.error("❌ Error en processImportFile:", error)
      showNotification("Error al procesar el archivo Excel: " + (error.message || "Error desconocido"), "error")
    } finally {
      setLoading(false)
      setImportFileData(null)
      setImportFileName("")
      setImportTargetPiso("")
    }
  }

  // FUNCIÓN CORREGIDA DE EXPORTACIÓN
  const exportToExcel = () => {
    setConfirmAlert({
      show: true,
      message: `¿Estás seguro de que deseas exportar las posiciones de ${sedeNombre} a Excel?`,
      onConfirm: async () => {
        try {
          setLoading(true)
          showNotification("Preparando exportación...", "success")

          // USAR LA MISMA LÓGICA DE FILTRADO QUE filteredPositions
          const positionsArray = showAllPositions
            ? Object.values(positions).filter((pos) => {
                // Aplicar filtro de búsqueda si existe
                const searchMatches =
                  searchTerm === "" ||
                  (pos.nombre && pos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (pos.servicio &&
                    typeof pos.servicio === "object" &&
                    pos.servicio.nombre &&
                    pos.servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (pos.servicio &&
                    typeof pos.servicio === "string" &&
                    getServiceName(pos.servicio).toLowerCase().includes(searchTerm.toLowerCase()))
                return searchMatches
              })
            : Object.values(positions).filter((pos) => {
                // COMPARACIÓN CONSISTENTE CON CONVERSIÓN A STRING
                const pisoMatches = String(pos.piso) === String(selectedPiso)
                const searchMatches =
                  searchTerm === "" ||
                  (pos.nombre && pos.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (pos.servicio &&
                    typeof pos.servicio === "object" &&
                    pos.servicio.nombre &&
                    pos.servicio.nombre.toLowerCase().includes(searchTerm.toLowerCase())) ||
                  (pos.servicio &&
                    typeof pos.servicio === "string" &&
                    getServiceName(pos.servicio).toLowerCase().includes(searchTerm.toLowerCase()))
                return pisoMatches && searchMatches
              })

          console.log("🔍 Debug exportación:")
          console.log("- showAllPositions:", showAllPositions)
          console.log("- selectedPiso:", selectedPiso, typeof selectedPiso)
          console.log("- Total positions:", Object.keys(positions).length)
          console.log("- Positions array length:", positionsArray.length)
          console.log("- Search term:", searchTerm)

          if (positionsArray.length === 0) {
            const debugMessage = showAllPositions
              ? `No hay posiciones para exportar. Total en memoria: ${Object.keys(positions).length}`
              : `No hay posiciones para exportar en el piso "${getPisoName(selectedPiso)}". Total en memoria: ${Object.keys(positions).length}, Piso seleccionado: ${selectedPiso}`

            console.log("❌", debugMessage)
            showNotification(debugMessage, "error")
            setLoading(false)
            return
          }

          const exportData = positionsArray.map((pos) => {
            return {
              ...pos,
              dispositivos: Array.isArray(pos.dispositivos)
                ? pos.dispositivos.map((d) => (typeof d === "object" ? d.id : d)).join(", ")
                : pos.dispositivos,
              servicio: pos.servicio ? (typeof pos.servicio === "object" ? pos.servicio.id : pos.servicio) : "",
              sede: pos.sede ? (typeof pos.sede === "object" ? pos.sede.id : pos.sede) : "",
              mergedCellsText: JSON.stringify(pos.mergedCells),
              bordeDetalleText: JSON.stringify(pos.bordeDetalle),
            }
          })

          const worksheet = XLSX.utils.json_to_sheet(exportData)
          const range = XLSX.utils.decode_range(worksheet["!ref"])

          for (let R = range.s.r + 1; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C })
              const cell = worksheet[cellAddress]
              if (!cell) continue

              const position = exportData[R - 1]
              if (position) {
                if (!cell.s) cell.s = {}
                if (!cell.s.fill) cell.s.fill = {}
                if (!cell.s.font) cell.s.font = {}

                const colorHex = position.servicio
                  ? getServiceColor(position.servicio).replace("#", "")
                  : position.colorOriginal || position.color.replace("#", "")

                cell.s.fill = {
                  patternType: "solid",
                  fgColor: { rgb: colorHex },
                  bgColor: { rgb: colorHex },
                }

                cell.s.font.color = { rgb: position.colorFuente.replace("#", "") }
              }
            }
          }

          const merges = []
          positionsArray.forEach((pos) => {
            if (pos.mergedCells && pos.mergedCells.length > 1) {
              try {
                const cells = pos.mergedCells
                const rows = cells.map((c) => Number(c.row))
                const cols = cells.map((c) => XLSX.utils.decode_col(c.col))
                const startRow = Math.min(...rows) - 1
                const endRow = Math.max(...rows) - 1
                const startCol = Math.min(...cols)
                const endCol = Math.max(...cols)

                if (startRow >= 0 && startCol >= 0 && endRow >= startRow && endCol >= startCol) {
                  merges.push({
                    s: { r: startRow, c: startCol },
                    e: { r: endRow, c: endCol },
                  })
                }
              } catch (error) {
                console.error("Error al procesar celda combinada:", error, pos)
              }
            }
          })

          if (merges.length > 0) {
            worksheet["!merges"] = merges
          }

          const workbook = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(workbook, worksheet, "Posiciones")

          const timestamp = new Date().toISOString().replace(/[:.]/g, "-").substring(0, 19)
          const fileName = showAllPositions
            ? `Posiciones_${sedeNombre}_${timestamp}.xlsx`
            : `Posiciones_${sedeNombre}_${getPisoName(selectedPiso)}_${timestamp}.xlsx`

          const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
          const blob = new Blob([wbout], { type: "application/octet-stream" })
          const url = URL.createObjectURL(blob)
          const a = document.createElement("a")
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          setTimeout(() => {
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
          }, 0)

          showNotification(
            `Exportación completada: ${positionsArray.length} posiciones exportadas de ${sedeNombre}`,
            "success",
          )
        } catch (error) {
          console.error("❌ Error en exportación:", error)
          showNotification("Error al exportar las posiciones: " + (error.message || "Error desconocido"), "error")
        } finally {
          setLoading(false)
          setConfirmAlert({ ...confirmAlert, show: false })
        }
      },
      onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
    })
  }

  const savePosition = async () => {
    try {
      if (newPosition.dispositivos.length > 5) {
        showNotification("No se pueden asignar más de 5 dispositivos a una posición", "error")
        return
      }
      if (newPosition.id) {
        setConfirmAlert({
          show: true,
          message: "¿Estás seguro de que deseas guardar los cambios realizados?",
          onConfirm: async () => {
            try {
              await savePositionData()
            } finally {
              setConfirmAlert({ ...confirmAlert, show: false })
            }
          },
          onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
        })
      } else {
        await savePositionData()
      }
    } catch (error) {
      showNotification("Error al guardar la posición", "error")
    }
  }

  const savePositionData = async () => {
    try {
      const fila = Number.parseInt(newPosition.fila, 10)
      const normalizedDispositivos = Array.isArray(newPosition.dispositivos)
        ? newPosition.dispositivos
            .filter((d) => d !== null && d !== undefined)
            .map((d) => (typeof d === "object" ? d.id : Number(d)))
        : []
      const dataToSend = {
        nombre: newPosition.nombre || "",
        tipo: newPosition.tipo || "",
        estado: newPosition.estado || "disponible",
        detalles: newPosition.detalles || "",
        fila: fila,
        columna: newPosition.columna,
        color: newPosition.servicio ? getServiceColor(newPosition.servicio) : newPosition.color || COLOR_DEFAULT,
        colorFuente: newPosition.colorFuente || "#000000",
        colorOriginal: newPosition.colorOriginal || "",
        borde: Boolean(newPosition.borde),
        bordeDoble: Boolean(newPosition.bordeDoble),
        piso: newPosition.piso || (pisos.length > 0 ? pisos[0].value : ""),
        sede: sedeId, // FORZAR SEDE DEL USUARIO
        servicio: newPosition.servicio || null,
        dispositivos: normalizedDispositivos,
        bordeDetalle: {
          top: Boolean(newPosition.bordeDetalle?.top),
          right: Boolean(newPosition.bordeDetalle?.right),
          bottom: Boolean(newPosition.bordeDetalle?.bottom),
          left: Boolean(newPosition.bordeDetalle?.left),
          topDouble: Boolean(newPosition.bordeDetalle?.topDouble),
          rightDouble: Boolean(newPosition.bordeDetalle?.rightDouble),
          bottomDouble: Boolean(newPosition.bordeDetalle?.bottomDouble),
          leftDouble: Boolean(newPosition.bordeDetalle?.leftDouble),
        },
        mergedCells:
          Array.isArray(newPosition.mergedCells) && newPosition.mergedCells.length > 0
            ? newPosition.mergedCells.map((cell) => ({
                row: Number(cell.row),
                col: cell.col,
              }))
            : [{ row: fila, col: newPosition.columna }],
        no_crear_movimiento: true,
        no_validar_usuario: true,
      }
      if (newPosition.id && !isNaN(newPosition.id)) {
        dataToSend.id = newPosition.id
      }
      const method = newPosition.id ? "put" : "post"
      const url = newPosition.id ? `${API_URL}api/posiciones/${newPosition.id}/` : `${API_URL}api/posiciones/`
      await axios[method](url, dataToSend, {
        headers: {
          "Content-Type": "application/json",
        },
      })
      showNotification("Posición guardada correctamente")
      await fetchPositions(selectedPiso)
      setIsModalOpen(false)
      clearSelection()
    } catch (error) {
      let errorMessage = "Error al guardar la posición"
      if (error.response?.data) {
        if (typeof error.response.data === "object") {
          const validationErrors = Object.entries(error.response.data)
            .map(([field, errors]) => `${field}: ${Array.isArray(errors) ? errors.join(", ") : errors}`)
            .join("\n")
          errorMessage += `:\n${validationErrors}`
        } else {
          errorMessage += `: ${error.response.data}`
        }
      }
      showNotification(errorMessage, "error")
    }
  }

  const deletePosition = async (id) => {
    try {
      if (!id) {
        showNotification("Error: No se puede eliminar una posición sin ID", "error")
        return
      }
      setConfirmAlert({
        show: true,
        message: "¿Estás seguro de que deseas eliminar esta posición?",
        onConfirm: async () => {
          try {
            setLoading(true)
            const response = await axios.delete(`${API_URL}api/posiciones/${id}/`)
            if (response.status === 204 || response.status === 200) {
              showNotification("Posición eliminada correctamente")
              setPositions((prevPositions) => {
                const newPositions = { ...prevPositions }
                delete newPositions[id]
                updateAssignedDevices(newPositions)
                return newPositions
              })
              setIsModalOpen(false)
            } else {
              throw new Error(`Error al eliminar: código de estado ${response.status}`)
            }
          } catch (error) {
            let errorMessage = "Error al eliminar la posición"
            if (error.response?.data) {
              if (typeof error.response.data === "object") {
                errorMessage += ": " + JSON.stringify(error.response.data)
              } else {
                errorMessage += ": " + error.response.data
              }
            }
            showNotification(errorMessage, "error")
          } finally {
            setLoading(false)
            setConfirmAlert({ ...confirmAlert, show: false })
          }
        },
        onCancel: () => setConfirmAlert({ ...confirmAlert, show: false }),
      })
    } catch (error) {
      showNotification("Error al preparar la eliminación", "error")
    }
  }

  const handleCellMouseDown = (row, col) => {
    setIsSelecting(true)
    setSelectionStart({ row, col })
    setSelectionEnd({ row, col })
  }

  const handleCellMouseEnter = (row, col) => {
    if (isSelecting) {
      setSelectionEnd({ row, col })
    }
  }

  const handleCellMouseUp = () => {
    if (isSelecting) {
      handleCreatePosition()
    }
    setIsSelecting(false)
  }

  const clearSelection = () => {
    setSelectionStart(null)
    setSelectionEnd(null)
    setIsSelecting(false)
  }

  const getSelectedCells = () => {
    if (!selectionStart || !selectionEnd) return []
    const startRow = Math.min(selectionStart.row, selectionEnd.row)
    const endRow = Math.max(selectionStart.row, selectionEnd.row)
    const startColIndex = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    const endColIndex = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    const cells = []
    for (let r = startRow; r <= endRow; r++) {
      for (let c = startColIndex; c <= endColIndex; c++) {
        cells.push({ row: r, col: columns[c] })
      }
    }
    return cells
  }

  const isCellSelected = (row, col) => {
    if (!selectionStart || !selectionEnd) return false
    const startRow = Math.min(selectionStart.row, selectionEnd.row)
    const endRow = Math.max(selectionStart.row, selectionEnd.row)
    const startColIndex = Math.min(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    const endColIndex = Math.max(columns.indexOf(selectionStart.col), columns.indexOf(selectionEnd.col))
    return (
      row >= startRow && row <= endRow && columns.indexOf(col) >= startColIndex && columns.indexOf(col) <= endColIndex
    )
  }

  const isCellInMergedArea = (row, col, position) => {
    if (!position?.mergedCells?.length) return false
    return position.mergedCells.some((cell) => {
      return Number(cell.row) === Number(row) && cell.col === col
    })
  }

  const handleCreatePosition = () => {
    const selectedCells = getSelectedCells()
    if (selectedCells.length === 0) return
    const startCell = selectedCells[0]
    setNewPosition({
      id: null,
      nombre: "",
      tipo: "",
      estado: "disponible",
      detalles: "",
      fila: startCell.row,
      columna: startCell.col,
      color: COLOR_DEFAULT,
      colorFuente: "#000000",
      colorOriginal: "",
      borde: false,
      bordeDoble: false,
      bordeDetalle: {
        top: false,
        right: false,
        bottom: false,
        left: false,
        topDouble: false,
        rightDouble: false,
        bottomDouble: false,
        leftDouble: false,
      },
      piso: selectedPiso,
      sede: sedeId, // FORZAR SEDE DEL USUARIO
      servicio: "",
      dispositivos: [],
      mergedCells: selectedCells,
    })
    setIsModalOpen(true)
  }

  const getNextColumn = (currentColumns) => {
    const lastColumn = currentColumns[currentColumns.length - 1]
    if (lastColumn.length === 1) {
      return lastColumn === "Z" ? "AA" : String.fromCharCode(lastColumn.charCodeAt(0) + 1)
    } else {
      const firstChar = lastColumn[0]
      const secondChar = lastColumn[1]
      return secondChar === "Z"
        ? String.fromCharCode(firstChar.charCodeAt(0) + 1) + "A"
        : firstChar + String.fromCharCode(secondChar.charCodeAt(0) + 1)
    }
  }

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.1, 3))
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.1, 0.1))
  const handleResetZoom = () => setZoomLevel(1)

  const handleAddNewPosition = () => {
    setNewPosition({
      id: null,
      nombre: "",
      tipo: "",
      estado: "disponible",
      detalles: "",
      fila: 1,
      columna: "A",
      color: COLOR_DEFAULT,
      colorFuente: "#000000",
      colorOriginal: "",
      borde: false,
      bordeDoble: false,
      bordeDetalle: {
        top: false,
        right: false,
        bottom: false,
        left: false,
        topDouble: false,
        rightDouble: false,
        bottomDouble: false,
        leftDouble: false,
      },
      piso: selectedPiso,
      sede: sedeId, // FORZAR SEDE DEL USUARIO
      servicio: "",
      dispositivos: [],
      mergedCells: [],
    })
    setIsModalOpen(true)
  }

  const addDeviceToPosition = (deviceId) => {
    if (newPosition.dispositivos.length >= 5) {
      showNotification("No se pueden asignar más de 5 dispositivos a una posición", "error")
      return
    }
    if (assignedDevices[deviceId] && assignedDevices[deviceId] !== newPosition.id) {
      const positionWithDevice = Object.values(positions).find((p) => p.id === assignedDevices[deviceId])
      showNotification(
        `Este dispositivo ya está asignado a la posición ${positionWithDevice?.nombre || assignedDevices[deviceId]}`,
        "error",
      )
      return
    }
    if (!newPosition.dispositivos.includes(deviceId)) {
      setNewPosition({
        ...newPosition,
        dispositivos: [...newPosition.dispositivos, deviceId],
      })
    }
  }

  const removeDeviceFromPosition = (deviceId) => {
    setNewPosition({
      ...newPosition,
      dispositivos: newPosition.dispositivos.filter((d) => d !== deviceId),
    })
  }

  const filterDevices = (devices, searchTerm) => {
    if (!searchTerm) return devices
    return devices.filter((device) => {
      const deviceName = device.serial || device.nombre || device.modelo || `Dispositivo ${device.id}`
      return deviceName.toLowerCase().includes(searchTerm.toLowerCase())
    })
  }

  const getServiceStatistics = () => {
    const positionsToAnalyze = Object.values(positions).filter(
      (pos) => Number(pos.sede) === Number(sedeId) && (showAllPositions || pos.piso === selectedPiso),
    )
    const serviceGroups = {}
    const serviceColors = {}
    const serviceAvailability = {}
    serviceGroups["Sin servicio"] = 0
    serviceColors["Sin servicio"] = "#CCCCCC"
    serviceAvailability["Sin servicio"] = { disponible: 0, ocupado: 0, reservado: 0, inactivo: 0 }
    positionsToAnalyze.forEach((pos) => {
      const serviceName = pos.servicio
        ? typeof pos.servicio === "object"
          ? pos.servicio.nombre
          : getServiceName(pos.servicio)
        : "Sin servicio"
      if (!serviceGroups[serviceName]) {
        serviceGroups[serviceName] = 0
        serviceAvailability[serviceName] = { disponible: 0, ocupado: 0, reservado: 0, inactivo: 0 }
      }
      serviceGroups[serviceName]++
      if (!serviceColors[serviceName] && pos.servicio) {
        serviceColors[serviceName] = getServiceColor(pos.servicio)
      }
      if (pos.estado === "disponible") {
        serviceAvailability[serviceName].disponible++
      } else if (pos.estado === "ocupado") {
        serviceAvailability[serviceName].ocupado++
      } else if (pos.estado === "reservado") {
        serviceAvailability[serviceName].reservado++
      } else if (pos.estado === "inactivo") {
        serviceAvailability[serviceName].inactivo++
      }
    })
    return { serviceGroups, serviceColors, serviceAvailability }
  }

  const prepareChartData = () => {
    const { serviceGroups, serviceColors } = getServiceStatistics()
    const labels = Object.keys(serviceGroups)
    const data = Object.values(serviceGroups)
    const backgroundColor = labels.map((label) => serviceColors[label] || "#CCCCCC")
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor: backgroundColor.map((color) => (color === "#CCCCCC" ? "#999999" : color)),
          borderWidth: 1,
        },
      ],
    }
  }

  const renderStatisticsPanel = () => {
    const { serviceGroups, serviceAvailability } = getServiceStatistics()
    const chartData = prepareChartData()
    let totalPositions, totalDisponible, totalOcupado, totalReservado, totalInactivo
    if (selectedService) {
      totalPositions = serviceGroups[selectedService] || 0
      totalDisponible = serviceAvailability[selectedService]?.disponible || 0
      totalOcupado = serviceAvailability[selectedService]?.ocupado || 0
      totalReservado = serviceAvailability[selectedService]?.reservado || 0
      totalInactivo = serviceAvailability[selectedService]?.inactivo || 0
    } else {
      totalPositions = Object.values(serviceGroups).reduce((sum, count) => sum + count, 0)
      totalDisponible = Object.values(serviceAvailability).reduce((sum, status) => sum + status.disponible, 0)
      totalOcupado = Object.values(serviceAvailability).reduce((sum, status) => sum + status.ocupado, 0)
      totalReservado = Object.values(serviceAvailability).reduce((sum, status) => sum + status.reservado, 0)
      totalInactivo = Object.values(serviceAvailability).reduce((sum, status) => sum + status.inactivo, 0)
    }
    const statsContainerStyle = {
      marginBottom: "20px",
      backgroundColor: "var(--surface)",
      borderRadius: "var(--radius)",
      padding: "15px",
      boxShadow: "var(--shadow)",
      border: "1px solid var(--border)",
    }
    const statsTitleStyle = {
      fontSize: "1.2rem",
      fontWeight: "600",
      marginBottom: "15px",
      color: "var(--text)",
      textAlign: "center",
    }
    const statsContentStyle = {
      display: "flex",
      flexWrap: "wrap",
      gap: "20px",
    }
    const chartContainerStyle = {
      flex: "1",
      minWidth: "300px",
      height: "300px",
      position: "relative",
      className: "chart-container",
    }
    const summaryContainerStyle = {
      flex: "1",
      minWidth: "300px",
    }
    const summaryHeaderStyle = {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "15px",
      flexWrap: "wrap",
      gap: "10px",
    }
    const summaryTitleStyle = {
      fontSize: "1.1rem",
      fontWeight: "600",
      margin: "0",
      color: "var(--text)",
    }
    const serviceFilterStyle = {
      display: "flex",
      alignItems: "center",
      gap: "10px",
    }
    const serviceSelectStyle = {
      padding: "6px 10px",
      backgroundColor: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-sm)",
      color: "var(--text)",
      fontSize: "0.9rem",
    }
    const summaryCardsStyle = {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
      gap: "15px",
    }
    const cardBaseStyle = {
      backgroundColor: "var(--surface)",
      borderRadius: "var(--radius)",
      padding: "15px",
      textAlign: "center",
      boxShadow: "var(--shadow)",
      transition: "transform 0.2s",
    }
    const cardTitleStyle = {
      fontSize: "0.9rem",
      fontWeight: "500",
      margin: "0 0 10px 0",
      color: "var(--text-secondary)",
    }
    const cardValueStyle = {
      fontSize: "1.8rem",
      fontWeight: "700",
      marginBottom: "5px",
      color: "var(--text)",
    }
    const cardPercentageStyle = {
      fontSize: "0.9rem",
      color: "var(--text-secondary)",
    }
    return (
      <div style={statsContainerStyle}>
        <h2 style={statsTitleStyle}>
          {selectedService
            ? `Estadísticas de Posiciones: ${selectedService} - ${sedeNombre}`
            : `Estadísticas de Posiciones por Servicio - ${sedeNombre}`}
        </h2>
        <div style={statsContentStyle}>
          <div style={chartContainerStyle}>
            <Doughnut
              data={chartData}
              options={{
                plugins: {
                  legend: {
                    position: "right",
                    onHover: (event, legendItem, legend) => {
                      event.native.target.style.cursor = "pointer"
                    },
                    onLeave: (event, legendItem, legend) => {
                      event.native.target.style.cursor = "default"
                    },
                    labels: {
                      color: "#e9e9e9",
                      usePointStyle: true,
                      padding: 20,
                      font: {
                        size: 12,
                      },
                      generateLabels: (chart) => {
                        const data = chart.data
                        if (data.labels.length && data.datasets.length) {
                          const dataset = data.datasets[0]
                          const total = dataset.data.reduce((sum, value) => sum + value, 0)
                          return data.labels.map((label, i) => {
                            const value = dataset.data[i]
                            const percentage = Math.round((value / total) * 100)
                            const isHidden = isNaN(dataset.data[i]) || chart.getDatasetMeta(0).data[i].hidden
                            return {
                              text: `${label} (${percentage}%)`,
                              fillStyle: dataset.backgroundColor[i],
                              hidden: isHidden,
                              strokeStyle: isHidden ? "rgba(255, 255, 255, 0.5)" : dataset.borderColor[i],
                              lineWidth: isHidden ? 2 : dataset.borderWidth,
                              pointStyle: isHidden ? "rectRounded" : "circle",
                              lineCap: dataset.borderCapStyle,
                              lineDash: dataset.borderDash,
                              lineDashOffset: dataset.borderDashOffset,
                              lineJoin: dataset.borderJoinStyle,
                              rotation: dataset.rotation,
                              index: i,
                            }
                          })
                        }
                        return []
                      },
                    },
                  },
                  tooltip: {
                    callbacks: {
                      label: (context) => {
                        const label = context.label || ""
                        const value = context.raw || 0
                        const total = Object.values(serviceGroups).reduce((sum, count) => sum + count, 0)
                        const percentage = Math.round((value / total) * 100)
                        return `${label}: ${value} (${percentage}%)`
                      },
                    },
                  },
                  datalabels: {
                    display: true,
                    color: "#fff",
                    font: {
                      weight: "bold",
                      size: 12,
                    },
                    formatter: (value, ctx) => {
                      const total = Object.values(serviceGroups).reduce((sum, count) => sum + count, 0)
                      const percentage = Math.round((value / total) * 100)
                      return percentage > 5 ? `${percentage}%` : ""
                    },
                  },
                },
                maintainAspectRatio: false,
                cutout: "70%",
                onClick: (event, elements) => {
                  if (elements.length > 0) {
                    const clickedIndex = elements[0].index
                    const clickedService = Object.keys(serviceGroups)[clickedIndex]
                    setSelectedService((prevService) => (prevService === clickedService ? "" : clickedService))
                  }
                },
              }}
            />
          </div>
          <div style={summaryContainerStyle}>
            <div style={summaryHeaderStyle}>
              <h3 style={summaryTitleStyle}>
                {selectedService ? `Resumen: ${selectedService}` : "Resumen de Posiciones"}
              </h3>
              <div style={serviceFilterStyle}>
                <label style={{ color: "#e9e9e9" }}>Filtrar por servicio: </label>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  style={serviceSelectStyle}
                >
                  <option value="">Todos los servicios</option>
                  {Object.keys(serviceGroups).map((service) => (
                    <option key={service} value={service}>
                      {service}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div style={summaryCardsStyle}>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #6c63ff" }}>
                <h4 style={cardTitleStyle}>Total</h4>
                <div style={cardValueStyle}>{totalPositions}</div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #28a745" }}>
                <h4 style={cardTitleStyle}>Disponibles</h4>
                <div style={cardValueStyle}>{totalDisponible}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalDisponible / totalPositions) * 100) : 0}%
                </div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #ff4757" }}>
                <h4 style={cardTitleStyle}>Ocupadas</h4>
                <div style={cardValueStyle}>{totalOcupado}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalOcupado / totalPositions) * 100) : 0}%
                </div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #ffc107" }}>
                <h4 style={cardTitleStyle}>Reservadas</h4>
                <div style={cardValueStyle}>{totalReservado}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalReservado / totalPositions) * 100) : 0}%
                </div>
              </div>
              <div style={{ ...cardBaseStyle, borderLeft: "4px solid #8d99ae" }}>
                <h4 style={cardTitleStyle}>Inactivas</h4>
                <div style={cardValueStyle}>{totalInactivo}</div>
                <div style={cardPercentageStyle}>
                  {totalPositions > 0 ? Math.round((totalInactivo / totalPositions) * 100) : 0}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleEditPosition = (position) => {
    try {
      const positionCopy = { ...position }
      const normalizedPosition = {
        ...positionCopy,
        fila: Number.parseInt(positionCopy.fila, 10) || 1,
        dispositivos: Array.isArray(positionCopy.dispositivos)
          ? positionCopy.dispositivos.map((d) => (typeof d === "object" ? d.id : Number(d)))
          : positionCopy.dispositivos
            ? [positionCopy.dispositivos]
            : [],
        servicio: (() => {
          if (typeof positionCopy.servicio === "object" && positionCopy.servicio !== null) {
            return positionCopy.servicio.id || ""
          }
          if (Array.isArray(positionCopy.servicio) && positionCopy.servicio.length > 0) {
            return typeof positionCopy.servicio[0] === "object" ? positionCopy.servicio[0].id : positionCopy.servicio[0]
          }
          return positionCopy.servicio || ""
        })(),
        sede: sedeId, // FORZAR SEDE DEL USUARIO
        colorFuente: positionCopy.colorFuente || positionCopy.fontColor || "#000000",
        colorOriginal: positionCopy.colorOriginal || "",
        color: positionCopy.color || COLOR_DEFAULT,
        borde: Boolean(positionCopy.borde),
        bordeDoble: Boolean(positionCopy.bordeDoble),
        bordeDetalle:
          typeof positionCopy.bordeDetalle === "object" && positionCopy.bordeDetalle !== null
            ? {
                top: Boolean(positionCopy.bordeDetalle.top),
                right: Boolean(positionCopy.bordeDetalle.right),
                bottom: Boolean(positionCopy.bordeDetalle.bottom),
                left: Boolean(positionCopy.bordeDetalle.left),
                topDouble: Boolean(positionCopy.bordeDetalle.topDouble),
                rightDouble: Boolean(positionCopy.bordeDetalle.rightDouble),
                bottomDouble: Boolean(positionCopy.bordeDetalle.bottomDouble),
                leftDouble: Boolean(positionCopy.bordeDetalle.leftDouble),
              }
            : {
                top: false,
                right: false,
                bottom: false,
                left: false,
                topDouble: false,
                rightDouble: false,
                bottomDouble: false,
                leftDouble: false,
              },
        mergedCells:
          Array.isArray(positionCopy.mergedCells) && positionCopy.mergedCells.length > 0
            ? positionCopy.mergedCells.map((cell) => ({
                row: Number.parseInt(cell.row, 10) || Number.parseInt(positionCopy.fila, 10) || 1,
                col: cell.col || positionCopy.columna || "A",
              }))
            : [{ row: Number.parseInt(positionCopy.fila, 10) || 1, col: positionCopy.columna || "A" }],
      }
      setNewPosition(normalizedPosition)
      setIsModalOpen(true)
    } catch (error) {
      showNotification("Error al preparar la posición para editar", "error")
    }
  }

  const handleBorderChange = (side, isDouble = false) => {
    const borderKey = isDouble ? `${side}Double` : side
    const updates = {
      [borderKey]: !newPosition.bordeDetalle[borderKey],
    }
    if (isDouble && updates[borderKey] === true) {
      updates[side] = true
    }
    if (!isDouble && updates[borderKey] === false) {
      updates[`${side}Double`] = false
    }
    const hasDoubleBorder = Object.entries(newPosition.bordeDetalle)
      .filter(([key]) => key.includes("Double"))
      .some((key, value) => (key !== borderKey ? value : updates[borderKey]))
    setNewPosition({
      ...newPosition,
      bordeDetalle: {
        ...newPosition.bordeDetalle,
        ...updates,
      },
      borde: Object.values({
        ...newPosition.bordeDetalle,
        ...updates,
      }).some(Boolean),
      bordeDoble: hasDoubleBorder,
    })
  }

  // Función mejorada para renderizar celdas de la tabla
  const renderTableCell = (position, row, col, isSelected, isMainCell, colSpan, rowSpan) => {
    let backgroundColor
    if (isSelected) {
      backgroundColor = "rgba(108, 99, 255, 0.2)"
    } else if (position && position.servicio) {
      const serviceColor = getServiceColor(position.servicio)
      backgroundColor = serviceColor && serviceColor !== COLOR_DEFAULT ? serviceColor : position.color || COLOR_DEFAULT
    } else {
      backgroundColor = position?.color || COLOR_DEFAULT
    }
    const textColor = position?.colorFuente || position?.fontColor || getContrastColor(backgroundColor)
    const cellBorder = position ? "2px solid #333" : "1px solid var(--border)"
    return (
      <td
        key={`${row}-${col}`}
        colSpan={colSpan}
        rowSpan={rowSpan}
        onMouseDown={() => handleCellMouseDown(row, col)}
        onMouseEnter={() => handleCellMouseEnter(row, col)}
        onClick={() => position && handleEditPosition(position)}
        style={{
          backgroundColor,
          color: textColor,
          borderTop: position?.bordeDetalle?.topDouble
            ? "4px double black"
            : position?.bordeDetalle?.top
              ? "2px solid black"
              : cellBorder,
          borderBottom: position?.bordeDetalle?.bottomDouble
            ? "4px double black"
            : position?.bordeDetalle?.bottom
              ? "2px solid black"
              : cellBorder,
          borderLeft: position?.bordeDetalle?.leftDouble
            ? "4px double black"
            : position?.bordeDetalle?.left
              ? "2px solid black"
              : cellBorder,
          borderRight: position?.bordeDetalle?.rightDouble
            ? "4px double black"
            : position?.bordeDetalle?.right
              ? "2px solid black"
              : cellBorder,
          position: "relative",
          fontWeight: position?.fontWeight || "normal",
          fontSize: "0.8rem",
          minHeight: "30px",
          minWidth: "40px",
          padding: "4px",
          textAlign: "center",
          verticalAlign: "middle",
          cursor: position ? "pointer" : "default",
          outline: position ? "2px solid rgba(0, 0, 0, 0.5)" : "none",
          boxShadow: position ? "inset 0 0 3px rgba(0, 0, 0, 0.3)" : "none",
        }}
        className={`table-cell ${isSelected ? "selected" : ""} ${isMainCell ? "main-cell" : ""} ${position ? "has-position" : ""}`}
      >
        {position?.nombre || ""}
        {position && (
          <>
            <div
              className="status-indicator"
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                backgroundColor:
                  position.estado === "disponible"
                    ? "green"
                    : position.estado === "ocupado"
                      ? "red"
                      : position.estado === "reservado"
                        ? "orange"
                        : "gray",
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                border: "1px solid white",
              }}
            />
            {!position.servicio && (
              <div
                className="no-service-indicator"
                style={{
                  position: "absolute",
                  top: "2px",
                  left: "2px",
                  backgroundColor: "red",
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  border: "1px solid white",
                }}
                title="Sin servicio asignado"
              />
            )}
          </>
        )}
      </td>
    )
  }

  const renderAllPositionsTable = () => {
    const getDeviceName = (deviceId) => {
      const device = allDevices.find((d) => d.id === Number(deviceId) || d.id === deviceId)
      return device ? device.nombre || device.serial || `Dispositivo ${deviceId}` : `Dispositivo ${deviceId}`
    }
    return (
      <div className="all-positions-table">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Piso</th>
              <th>Fila</th>
              <th>Columna</th>
              <th>Estado</th>
              <th>Servicio</th>
              <th>Sede</th>
              <th>Dispositivos</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPositions.map((position) => (
              <tr key={position.id}>
                <td>{position.id}</td>
                <td>{position.nombre}</td>
                <td>{getPisoName(position.piso)}</td>
                <td>{position.fila}</td>
                <td>{position.columna}</td>
                <td>
                  <span
                    style={{
                      display: "inline-block",
                      width: "12px",
                      height: "12px",
                      borderRadius: "50%",
                      backgroundColor:
                        position.estado === "disponible"
                          ? "green"
                          : position.estado === "ocupado"
                            ? "red"
                            : position.estado === "reservado"
                              ? "orange"
                              : "gray",
                      marginRight: "5px",
                    }}
                  ></span>
                  {ESTADOS.find((e) => e.value === position.estado)?.label || position.estado}
                </td>
                <td>
                  {typeof position.servicio === "object"
                    ? position.servicio?.nombre
                    : getServiceName(position.servicio)}
                </td>
                <td>{sedeNombre}</td>
                <td>
                  {position.dispositivos && position.dispositivos.length > 0 ? (
                    <div style={{ maxWidth: "250px" }}>
                      {position.dispositivos.map((deviceId, index) => (
                        <div
                          key={index}
                          style={{
                            display: "inline-block",
                            backgroundColor: "#444",
                            color: "#fff",
                            padding: "2px 6px",
                            borderRadius: "4px",
                            margin: "2px",
                            fontSize: "0.8rem",
                          }}
                        >
                          {getDeviceName(deviceId)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span style={{ color: "#888" }}>Sin dispositivos</span>
                  )}
                </td>
                <td>
                  <button
                    className="action-button"
                    style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                    onClick={() => handleEditPosition(position)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const ConfirmAlert = ({ message, onConfirm, onCancel }) => {
    return (
      <div className="alert-overlay">
        <div className="modal-container confirm-container">
          <div className="confirm-modal">
            <p>{message}</p>
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

  const handlePisoChange = (pisoValue) => {
    console.log("🔄 Cambiando a piso:", pisoValue)
    setSelectedPiso(pisoValue)
  }

  // No mostrar nada si no hay sedeId
  if (!sedeId) {
    return (
      <div className="dashboard-container">
        <div className="controls-container">
          <p className="no-data-message">No se ha seleccionado una sede.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      <div className="controls-container">
        <div className="tabs">
          {pisos.length > 0 ? (
            pisos.map((piso) => (
              <button
                key={piso.value}
                className={`tab-button ${selectedPiso === piso.value ? "active" : ""}`}
                onClick={() => handlePisoChange(piso.value)}
              >
                {piso.label}
              </button>
            ))
          ) : (
            <div className="no-floors-message">No hay pisos disponibles para {sedeNombre}</div>
          )}
        </div>
        <div className="search-container">
          <div className="search-box">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          <button
            className="action-buttonn"
            onClick={handleAddNewPosition}
            disabled={!selectedPiso || pisos.length === 0}
          >
            <FaPlus /> Nueva Posición
          </button>
          <button className="action-buttonn" onClick={exportToExcel}>
            <FaUpload /> Exportar
          </button>
          <div className="import-container">
            <button className="action-buttonn" onClick={() => document.getElementById("import-excel").click()}>
              <FaDownload /> Importar
            </button>
            <input
              id="import-excel"
              type="file"
              accept=".xlsx,.xls"
              style={{ display: "none" }}
              onChange={importFromExcel}
            />
          </div>
          <div
            className="action-buttonn"
            style={{ marginLeft: "10px", display: "flex", alignItems: "center", flexWrap: "wrap", gap: "10px" }}
          >
            <button
              className={`action-buttonn ${viewMode === "plano" ? "active" : ""}`}
              onClick={() => setViewMode("plano")}
              title="Ver plano"
            >
              <FaTable /> Plano
            </button>
            <button
              className={`action-buttonn ${viewMode === "tabla" ? "active" : ""}`}
              onClick={() => setViewMode("tabla")}
              title="Ver tabla"
            >
              <FaList /> Tabla
            </button>
            <button
              className={`action-buttonn ${viewMode === "estadisticas" ? "active" : ""}`}
              onClick={() => setViewMode("estadisticas")}
              title="Estadísticas"
            >
              <FaChartPie /> Estadísticas
            </button>
            {viewMode === "estadisticas" && (
              <label style={{ display: "flex", alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={showAllPositions}
                  onChange={() => setShowAllPositions(!showAllPositions)}
                  style={{ marginRight: "5px" }}
                />
                Mostrar todas las posiciones
              </label>
            )}
          </div>
          <div className="action-buttonn">
            <div
              style={{
                padding: "6px 10px",
                backgroundColor: "#6c63ff",
                border: "none",
                borderRadius: "4px",
                color: "white",
                fontSize: "0.9rem",
              }}
            >
              {sedeNombre || `Sede ${sedeId}`}
            </div>
          </div>
        </div>
      </div>
      {viewMode === "estadisticas" && renderStatisticsPanel()}
      {viewMode === "plano" && (
        <>
          <div className="zoom-controls">
            <button className="zoom-button" onClick={handleZoomIn}>
              <FaSearchPlus />
            </button>
            <button className="zoom-button" onClick={handleZoomOut}>
              <FaSearchMinus />
            </button>
            <button className="zoom-button" onClick={handleResetZoom}>
              <FaUndo />
            </button>
            <span className="zoom-level">{Math.round(zoomLevel * 100)}%</span>
            <div className="divider"></div>
            <button className="control-button" onClick={() => setRows(rows + 1)}>
              <FaPlus className="mr-2" /> Agregar Fila
            </button>
            <button className="control-button" onClick={() => setColumns([...columns, getNextColumn(columns)])}>
              <FaPlus className="mr-2" /> Agregar Columna
            </button>
          </div>
          <div
            className="table-container"
            ref={tableContainerRef}
            onMouseLeave={() => setIsSelecting(false)}
            onMouseUp={handleCellMouseUp}
          >
            <table className="table" style={{ transform: `scale(${zoomLevel})`, transformOrigin: "top left" }}>
              <thead>
                <tr>
                  <th className="fixed-header"></th>
                  {columns.map((col) => (
                    <th key={col} className="column-header">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, i) => i + 1).map((row) => (
                  <tr key={row}>
                    <td className="row-header">{row}</td>
                    {columns.map((col) => {
                      const position = filteredPositions.find((pos) => {
                        return pos.fila === row && pos.columna === col
                      })
                      const isSelected = isCellSelected(row, col)
                      const mergedAreaPosition = filteredPositions.find((pos) => isCellInMergedArea(row, col, pos))
                      if (mergedAreaPosition) {
                        const isMainCell = mergedAreaPosition.mergedCells.some(
                          (cell) =>
                            cell.row === row &&
                            cell.col === col &&
                            mergedAreaPosition.fila === row &&
                            mergedAreaPosition.columna === col,
                        )
                        if (!isMainCell) {
                          return null
                        }
                        const rows = mergedAreaPosition.mergedCells.map((c) => Number(c.row))
                        const cols = mergedAreaPosition.mergedCells.map((c) => columns.indexOf(c.col))
                        const startRow = Math.min(...rows)
                        const endRow = Math.max(...rows)
                        const startColIndex = Math.min(...cols)
                        const endColIndex = Math.max(...cols)
                        const colSpan = endColIndex - startColIndex + 1
                        const rowSpan = endRow - startRow + 1
                        return renderTableCell(mergedAreaPosition, row, col, isSelected, true, colSpan, rowSpan)
                      }
                      return renderTableCell(position, row, col, isSelected, false, 1, 1)
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
      {viewMode === "tabla" && renderAllPositionsTable()}
      <div className={`notification ${notification.type}`} style={{ display: notification.show ? "block" : "none" }}>
        {notification.message}
      </div>
      {loading && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="loader"></div>
            <h1 className="h11">Cargando posiciones...</h1>
            <p className="pp">Por favor, espera mientras se procesan los datos.</p>
          </div>
        </div>
      )}
      {notification.show && (
        <div className="notification-overlay">
          <div className={`notification-modal ${notification.type}`}>
            <div className="notification-icon">
              {notification.type === "success" ? <FaCheck /> : <FaExclamationTriangle />}
            </div>
            <p>{notification.message}</p>
          </div>
        </div>
      )}
      {confirmAlert.show && (
        <ConfirmAlert
          message={confirmAlert.message}
          onConfirm={confirmAlert.onConfirm}
          onCancel={confirmAlert.onCancel}
        />
      )}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <button
              className="close-button"
              onClick={() => {
                setIsModalOpen(false)
                clearSelection()
              }}
            >
              <FaTimes />
            </button>
            <h2 className="h11">{newPosition.id ? "Editar Posición" : "Agregar Posición"}</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Id:</label>
                <input value={newPosition.id || ""} disabled={true} placeholder="Se asignará automáticamente" />
              </div>
              <div className="form-group">
                <label>Nombre:</label>
                <input
                  value={newPosition.nombre || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, nombre: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Tipo:</label>
                <input
                  value={newPosition.tipo || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, tipo: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Estado:</label>
                <div className="select-with-preview">
                  <select
                    value={newPosition.estado}
                    onChange={(e) => setNewPosition({ ...newPosition, estado: e.target.value })}
                  >
                    {ESTADOS.map((estado) => (
                      <option key={estado.value} value={estado.value}>
                        {estado.label}
                      </option>
                    ))}
                  </select>
                  <div
                    className="estado-preview"
                    style={{ backgroundColor: ESTADOS.find((e) => e.value === newPosition.estado)?.color }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Servicio:</label>
                <div className="select-with-preview">
                  <select
                    value={newPosition.servicio || ""}
                    onChange={(e) => setNewPosition({ ...newPosition, servicio: e.target.value })}
                  >
                    <option value="">Seleccione un servicio</option>
                    {servicios.map((servicio) => (
                      <option key={servicio.id} value={servicio.id}>
                        {servicio.nombre}
                      </option>
                    ))}
                  </select>
                  <div
                    className="color-preview"
                    style={{
                      backgroundColor: newPosition.servicio ? getServiceColor(newPosition.servicio) : COLOR_DEFAULT,
                    }}
                  />
                </div>
                {newPosition.servicio && (
                  <div className="text-muted">El color de la celda se determinará por el servicio seleccionado</div>
                )}
              </div>
              <div className="form-group">
                <label>Color de Texto:</label>
                <div className="select-with-preview">
                  <input
                    type="color"
                    value={newPosition.colorFuente}
                    onChange={(e) => setNewPosition({ ...newPosition, colorFuente: e.target.value })}
                    className="color-input"
                  />
                  <div className="color-preview" style={{ backgroundColor: newPosition.colorFuente }} />
                </div>
              </div>
              <div className="form-group">
                <label>Piso:</label>
                <select
                  value={newPosition.piso}
                  onChange={(e) => setNewPosition({ ...newPosition, piso: e.target.value })}
                  disabled={pisos.length === 0}
                >
                  {pisos.length > 0 ? (
                    pisos.map((piso) => (
                      <option key={piso.value} value={piso.value}>
                        {piso.label}
                      </option>
                    ))
                  ) : (
                    <option value="">No hay pisos disponibles</option>
                  )}
                </select>
              </div>
              <div className="form-group">
                <label>Sede:</label>
                <input
                  type="text"
                  value={sedeNombre || `Sede ${sedeId}`}
                  disabled
                  style={{ backgroundColor: "#f5f5f5", cursor: "not-allowed" }}
                />
              </div>
              <div className="form-group">
                <label>Fila:</label>
                <input
                  type="number"
                  value={newPosition.fila}
                  onChange={(e) => setNewPosition({ ...newPosition, fila: Number.parseInt(e.target.value) })}
                />
              </div>
              <div className="form-group">
                <label>Columna:</label>
                <input
                  value={newPosition.columna}
                  onChange={(e) => setNewPosition({ ...newPosition, columna: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label>Bordes:</label>
                <div className="border-controls">
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.top ? "active" : ""}`}
                      onClick={() => handleBorderChange("top")}
                    >
                      Superior
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.topDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("top", true)}
                    >
                      Doble
                    </button>
                  </div>
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.bottom ? "active" : ""}`}
                      onClick={() => handleBorderChange("bottom")}
                    >
                      Inferior
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.bottomDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("bottom", true)}
                    >
                      Doble
                    </button>
                  </div>
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.left ? "active" : ""}`}
                      onClick={() => handleBorderChange("left")}
                    >
                      Izquierdo
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.leftDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("left", true)}
                    >
                      Doble
                    </button>
                  </div>
                  <div className="border-control-group">
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.right ? "active" : ""}`}
                      onClick={() => handleBorderChange("right")}
                    >
                      Derecho
                    </button>
                    <button
                      type="button"
                      className={`border-button ${newPosition.bordeDetalle?.rightDouble ? "active" : ""}`}
                      onClick={() => handleBorderChange("right", true)}
                    >
                      Doble
                    </button>
                  </div>
                </div>
              </div>
              <div className="form-group full-width">
                <label>Dispositivos: ({newPosition.dispositivos.length}/5)</label>
                <div style={{ marginBottom: "10px" }}>
                  <div className="search-box" style={{ width: "100%" }}>
                    <FaSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar dispositivos..."
                      value={deviceSearchTerm}
                      onChange={(e) => setDeviceSearchTerm(e.target.value)}
                      className="search-input"
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                  <div style={{ flex: 1, border: "1px solid #444", borderRadius: "4px", overflow: "hidden" }}>
                    <div style={{ background: "#333", padding: "8px", borderBottom: "1px solid #444" }}>
                      <h4 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Dispositivos Disponibles</h4>
                    </div>
                    <div style={{ maxHeight: "200px", overflowY: "auto", background: "#222" }}>
                      {filterDevices(getAvailableDevices(newPosition.id), deviceSearchTerm).length === 0 ? (
                        <div style={{ padding: "10px", color: "#888", textAlign: "center" }}>
                          {deviceSearchTerm
                            ? "No se encontraron dispositivos con ese término"
                            : "No hay dispositivos disponibles"}
                        </div>
                      ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {filterDevices(getAvailableDevices(newPosition.id), deviceSearchTerm).map((dispositivo) => (
                            <li
                              key={dispositivo.id}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                padding: "8px 12px",
                                borderBottom: "1px solid #333",
                                background: newPosition.dispositivos.includes(dispositivo.id)
                                  ? "rgba(76, 175, 80, 0.1)"
                                  : "transparent",
                              }}
                            >
                              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                                {dispositivo.serial ||
                                  dispositivo.nombre ||
                                  dispositivo.modelo ||
                                  `Dispositivo ${dispositivo.id}`}
                              </span>
                              <button
                                type="button"
                                style={{
                                  backgroundColor: newPosition.dispositivos.length >= 5 ? "#555" : "transparent",
                                  border: "none",
                                  width: "24px",
                                  height: "24px",
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  cursor: newPosition.dispositivos.length >= 5 ? "not-allowed" : "pointer",
                                  fontWeight: "bold",
                                  fontSize: "16px",
                                  color: newPosition.dispositivos.length >= 5 ? "#888" : "#4CAF50",
                                }}
                                onClick={() => addDeviceToPosition(dispositivo.id)}
                                disabled={newPosition.dispositivos.length >= 5}
                                title={
                                  newPosition.dispositivos.length >= 5
                                    ? "Máximo 5 dispositivos permitidos"
                                    : "Agregar dispositivo"
                                }
                              >
                                +
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div style={{ flex: 1, border: "1px solid #444", borderRadius: "4px", overflow: "hidden" }}>
                    <div
                      style={{
                        background: "#333",
                        padding: "8px",
                        borderBottom: "1px solid #444",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <h4 style={{ margin: 0, fontSize: "14px", color: "#fff" }}>Dispositivos en Posición</h4>
                      <span
                        style={{
                          fontSize: "12px",
                          color: newPosition.dispositivos.length >= 5 ? "#ff4757" : "#fff",
                          fontWeight: newPosition.dispositivos.length >= 5 ? "bold" : "normal",
                        }}
                      >
                        {newPosition.dispositivos.length}/5
                      </span>
                    </div>
                    <div style={{ maxHeight: "200px", overflowY: "auto", background: "#222" }}>
                      {newPosition.dispositivos.length === 0 ? (
                        <div style={{ padding: "10px", color: "#888", textAlign: "center" }}>
                          No hay dispositivos seleccionados
                        </div>
                      ) : (
                        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                          {newPosition.dispositivos.map((id) => {
                            const device = allDevices.find((d) => d.id === id || d.id === Number(id))
                            return (
                              <li
                                key={id}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  padding: "8px 12px",
                                  borderBottom: "1px solid #333",
                                }}
                              >
                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {device
                                    ? device.serial || device.nombre || device.modelo || `Dispositivo ${id}`
                                    : `Dispositivo ${id}`}
                                </span>
                                <button
                                  type="button"
                                  style={{
                                    backgroundColor: "transparent",
                                    border: "none",
                                    width: "24px",
                                    height: "24px",
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    cursor: "pointer",
                                    fontWeight: "bold",
                                    fontSize: "16px",
                                    color: "#F44336",
                                  }}
                                  onClick={() => removeDeviceFromPosition(id)}
                                  title="Quitar dispositivo"
                                >
                                  ×
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="form-group full-width">
                <label>Detalles:</label>
                <textarea
                  value={newPosition.detalles || ""}
                  onChange={(e) => setNewPosition({ ...newPosition, detalles: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="form-group full-width">
                <label>Celdas Combinadas:</label>
                <div className="merged-cells-list">
                  {newPosition.mergedCells && newPosition.mergedCells.length > 0 ? (
                    <div className="merged-cells-grid">
                      {newPosition.mergedCells.map((cell, index) => (
                        <div key={index} className="merged-cell-item">
                          {cell.col}
                          {cell.row}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted">No hay celdas combinadas</div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-buttons">
              <button className="save-button" onClick={savePosition}>
                Guardar
              </button>
              {newPosition.id && (
                <button className="delete-button" onClick={() => deletePosition(newPosition.id)}>
                  Eliminar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {isImportModalOpen && (
        <div className="modal-overlay">
          <div className="modal" style={{ maxWidth: "500px" }}>
            <button
              className="close-button"
              onClick={() => {
                setIsImportModalOpen(false)
                setImportFileData(null)
                setImportFileName("")
                setImportTargetPiso("")
              }}
            >
              <FaTimes />
            </button>
            <h2 className="h11">Confirmar Importación</h2>
            <div style={{ marginBottom: "20px" }}>
              <div
                style={{
                  backgroundColor: "#f8f9fa",
                  border: "1px solid #dee2e6",
                  borderRadius: "4px",
                  padding: "15px",
                  marginBottom: "15px",
                }}
              >
                <h4 style={{ margin: "0 0 10px 0", color: "#495057" }}>Archivo seleccionado:</h4>
                <p
                  style={{
                    margin: "0",
                    fontWeight: "bold",
                    color: "#007bff",
                    wordBreak: "break-all",
                  }}
                >
                  📁 {importFileName}
                </p>
              </div>
              <div
                style={{
                  backgroundColor: "#e7f3ff",
                  border: "1px solid #b3d9ff",
                  borderRadius: "4px",
                  padding: "15px",
                  marginBottom: "15px",
                }}
              >
                <h4 style={{ margin: "0 0 10px 0", color: "#0066cc" }}>Sede:</h4>
                <p style={{ margin: "0", fontWeight: "bold", color: "#0066cc" }}>🏢 {sedeNombre || `Sede ${sedeId}`}</p>
              </div>
              <p style={{ marginBottom: "15px" }}>
                Seleccione el piso donde se importarán las posiciones de este archivo:
              </p>
              <select
                value={importTargetPiso || selectedPiso}
                onChange={(e) => setImportTargetPiso(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px",
                  marginTop: "10px",
                  borderRadius: "4px",
                  border: "2px solid #007bff",
                  backgroundColor: "#fff",
                  color: "#333",
                  fontSize: "16px",
                  fontWeight: "500",
                }}
                disabled={pisos.length === 0}
              >
                {pisos.length > 0 ? (
                  pisos.map((piso) => (
                    <option key={piso.value} value={piso.value}>
                      {piso.label}
                    </option>
                  ))
                ) : (
                  <option value="">No hay pisos disponibles</option>
                )}
              </select>
              {(importTargetPiso || selectedPiso) && (
                <div
                  style={{
                    marginTop: "15px",
                    padding: "10px",
                    backgroundColor: "#d4edda",
                    border: "1px solid #c3e6cb",
                    borderRadius: "4px",
                  }}
                >
                  <p style={{ margin: "0", color: "#155724" }}>
                    ✅ Las posiciones del archivo <strong>"{importFileName}"</strong> se importarán en el piso:{" "}
                    <strong>"{getPisoName(importTargetPiso || selectedPiso)}"</strong> de la sede{" "}
                    <strong>"{sedeNombre}"</strong>
                  </p>
                </div>
              )}
            </div>
            <div className="modal-buttons">
              <button
                className="save-button"
                onClick={processImportFile}
                disabled={!selectedPiso || pisos.length === 0}
                style={{
                  opacity: (selectedPiso || importTargetPiso) && pisos.length > 0 ? 1 : 0.5,
                  backgroundColor: "#28a745",
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                ✅ Confirmar Importación
              </button>
              <button
                className="delete-button"
                onClick={() => {
                  setIsImportModalOpen(false)
                  setImportFileData(null)
                  setImportFileName("")
                  setImportTargetPiso("")
                }}
                style={{
                  backgroundColor: "#dc3545",
                  padding: "12px 24px",
                  fontSize: "16px",
                  fontWeight: "600",
                }}
              >
                ❌ Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FloorPlan