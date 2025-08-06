"use client"
import { 
  FaHome, 
  FaPowerOff,
  FaServer,
  FaHistory,
  FaProjectDiagram, FaClipboardList,
  FaPeopleCarry, FaUserPlus, FaFileAlt, FaLayerGroup
} from "react-icons/fa"
import { MdInventory } from "react-icons/md"
import {BsHddNetwork } from "react-icons/bs"
import { Link, useLocation, useNavigate } from "react-router-dom"
import "../styles/SidebarMenu.css"

const CoordinadorSidebar = () => {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (path) =>
    location.pathname.startsWith(path) ? "menu-item active" : "menu-item"

  const handleLogout = () => {
    sessionStorage.clear()
    navigate("/")
    window.location.reload()
  }

  const menuItems = [
    { path: "/coordinador/dashboard", icon: <FaHome size={20} />, label: "Inicio" },
    { path: "/coordinador/inventory", icon: <MdInventory size={20} />, label: "Inventario" },
    { path: "/coordinador/planos", icon: <FaProjectDiagram size={20} />, label: "Planos" },
    { path: "/coordinador/devices", icon: <BsHddNetwork size={20} />, label: "Dispositivos" },
    { path: "/coordinador/GestionPisosSubpisos", icon: <FaLayerGroup size={20} />, label: "Pisos" },
    { path: "/coordinador/services", icon: <FaServer size={20} />, label: "Servicios" },
    { path: "/coordinador/history", icon: <FaHistory size={20} />, label: "Historial" },
    { path: "/coordinador/movimiento", icon: <FaPeopleCarry size={20} />, label: "Movimiento" },
    { path: "/coordinador/asignaciones", icon: <FaClipboardList size={20} />, label: "Asignaciones" },
    { path: "/coordinador/RegistroUsuarioExterno", icon: <FaUserPlus size={20} />, label: "Registro Usuario" },
    { path: "/coordinador/Historial-Ingreso-Salida", icon: <FaFileAlt size={20} />, label: "Historial Ingresos/Salidas" },
    { action: handleLogout, icon: <FaPowerOff size={20} />, label: "Salir" }
  ]

  return (
    <div className="sidebar">
      <div className="menu-items-container">
        {menuItems.map((item, index) => (
          item.action ? (
            <button 
              key={`action-${index}`} 
              className="menu-item" 
              onClick={item.action}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ) : (
            <Link key={item.path} to={item.path} className={isActive(item.path)}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        ))}
      </div>
    </div>
  )
}

export default CoordinadorSidebar