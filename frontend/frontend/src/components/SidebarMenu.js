"use client"
import { 
  FaHome, 
  FaPowerOff, 
  FaUserPlus, 
  FaClipboardList, 
  FaExchangeAlt,
  FaBuilding,
  FaServer,
  FaUsers,
  FaHistory,
  FaProjectDiagram,
  FaBoxes,
  FaDesktop,
  FaUserCircle,
  FaSignInAlt,
  FaSignOutAlt,
  FaLayerGroup,
  FaFileAlt
} from "react-icons/fa"
import { MdInventory, MdMoveToInbox } from "react-icons/md"
import { Link, useLocation, useNavigate } from "react-router-dom"
import "../styles/SidebarMenu.css"

const SidebarMenu = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) => (location.pathname.startsWith(path) ? "menu-item active" : "menu-item")

  const handleLogout = () => {
    sessionStorage.clear()
    navigate("/")
    window.location.reload()
  }

  const menuItems = [
    { path: "/dashboard", icon: <FaHome size={20} />, label: "Inicio" },
    { path: "/inventory", icon: <MdInventory size={20} />, label: "Inventario" },
    { path: "/planos", icon: <FaProjectDiagram size={20} />, label: "Planos" },
    { path: "/Devices", icon: <FaDesktop size={20} />, label: "Dispositivos" },
    { path: "/Records", icon: <FaUserCircle size={20} />, label: "Usuarios" },
    { path: "/services", icon: <FaServer size={20} />, label: "Servicios" },
    { path: "/sedes", icon: <FaBuilding size={20} />, label: "Sedes" },
    { path: "/History", icon: <FaHistory size={20} />, label: "Historial" },
    { path: "/movimiento", icon: <MdMoveToInbox size={20} />, label: "Movimiento" },
    { path: "/asignaciones", icon: <FaClipboardList size={20} />, label: "Asignaciones" },
    { path: "/RegistroUsuarioExterno", icon: <FaUserPlus size={20} />, label: "Registro Usuario" },
    { path: "/ingresos_salidas", icon: <FaExchangeAlt size={20} />, label: "Ingresos/Salidas" },
    { path: "/GestionPisosSubpisos", icon: <FaLayerGroup size={20} />, label: "Pisos" },
    { path: "/Historial-Ingreso-Salida", icon: <FaFileAlt size={20} />, label: "Historial Ingresos/Salidas" },
    { path: "#logout", icon: <FaPowerOff size={20} />, label: "Salir", action: handleLogout }
  ]

  return (
    <div className="sidebar">
      <div className="menu-items-container">
        {menuItems.map((item) => (
          item.action ? (
            <button 
              key={item.path} 
              className="menu-item" 
              onClick={item.action}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ) : (
            <Link 
              key={item.path} 
              to={item.path} 
              className={isActive(item.path)}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        ))}
      </div>
    </div>
  )
}

export default SidebarMenu