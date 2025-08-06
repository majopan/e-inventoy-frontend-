"use client"
import { FaHome, FaCogs, FaPowerOff, FaUserPlus, FaClipboardList, FaLayerGroup, FaFileAlt } from "react-icons/fa"
import { MdInventory, MdHistory } from "react-icons/md"
import { BsDiagram3 } from "react-icons/bs"
import { AiOutlineFileText } from "react-icons/ai"
import { IoIosDesktop } from "react-icons/io"
import { Link, useLocation, useNavigate } from "react-router-dom"
import "../../styles/SidebarMenu.css"

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
    { path: "/planos", icon: <BsDiagram3 size={20} />, label: "Planos" },
    { path: "/Devices", icon: <IoIosDesktop size={20} />, label: "Dispositivos" },
    { path: "/GestionPisosSubpisos", icon: <FaLayerGroup size={20} />, label: "Pisos" },
    { path: "/services", icon: <IoIosDesktop size={20} />, label: "Servicios" },
    { path: "/sedes", icon: <IoIosDesktop size={20} />, label: "Sedes" },
    { path: "/History", icon: <MdHistory size={20} />, label: "Historial" },
    { path: "/Movimiento", icon: <MdHistory size={20} />, label: "Movimiento" },
    { path: "/RegistroUsuarioExterno", icon: <FaUserPlus size={20} />, label: "Registro Usuario" },
    { path: "/asignaciones", icon: <FaClipboardList size={20} />, label: "Asignaciones" },
    { path: "/Historial-Ingreso-Salida", icon: <FaFileAlt size={20} />, label: "Historial Ingresos/Salidas" },

  ]

  return (
    <div className="sidebar">
      <div className="menu-items-container">
        {menuItems.map((item) => (
          <Link key={item.path} to={item.path} className={isActive(item.path)}>
            {item.icon}
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
      <div className="sidebar-footer">
        <div className="divider" />
        <button className="menu-item logout-button" onClick={handleLogout}>
          <FaPowerOff size={20} />
          <span>Salir</span>
        </button>
      </div>
    </div>
  )
}

export default SidebarMenu

