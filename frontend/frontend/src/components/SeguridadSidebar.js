    /* eslint-disable no-unused-vars */
    "use client"
    import { FaHome, FaPowerOff, FaSignOutAlt } from "react-icons/fa"
    import { Link, useLocation, useNavigate } from "react-router-dom"
    import "../styles/SidebarMenu.css"
    import { FaHistory, FaPeopleArrows } from "react-icons/fa"

    const CeladorSidebar = () => {
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
        { path: "/seguridad/Historial-Ingreso-Salida", icon: <FaPeopleArrows size={20} />, label: "Historial Movimientos" },
        { action: handleLogout, icon: <FaSignOutAlt size={20} />, label: "Salir" }
        // Puedes agregar más items según lo que el celador deba ver
    ]

    return (
        <div className="sidebar">
        <div className="menu-items-container">
            {menuItems.map((item, index) => (
            item.action ? (
                <button 
                key={`logout-${index}`} 
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

    export default CeladorSidebar