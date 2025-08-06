/* eslint-disable react/jsx-pascal-case */
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet, 
  useLocation,
} from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Importación del contexto de autenticación
import { AuthProvider, useAuth } from "./components/auth";

// Componentes globales
import InactivityHandler from "./components/InactivityHandler";
import SidebarMenu from "./components/SidebarMenu";
import CeladorSidebar from "./components/CeladorSidebar";
import CoordinadorSidebar from "./components/CoordinadorSidebar";
import SeguridadSidebar from "./components/SeguridadSidebar";
import GestionPisosSubpisos from "./components/GestionPisosSubpisos";

// Páginas públicas
import Login from "./pages/login";
import ForgotPassword from "./components/ForgotPassword";
import ResetPassword from "./components/ResetPassword";

// Páginas para usuarios existentes (admin u otros)
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";

import Records from "./pages/Records";
import Movimiento from "./pages/Movimientos";
import History from "./pages/History";
import Services from "./pages/services";
import Sedes from "./pages/sedes";
import Devices from "./pages/Devices";
import Plans from "./pages/plans";

// Páginas específicas para el rol "coordinador"
import CoordDashboard from "./pages/coordinador/Dashboard";
import CoordInventory from "./pages/coordinador/Inventory";
import CoordSettings from "./pages/coordinador/Settings";
import CoordRecords from "./pages/coordinador/Records";
import CoordMovimiento from "./pages/coordinador/Movimientos";
import CoordHistory from "./pages/coordinador/History";
import CoordServices from "./pages/coordinador/services";
import CoordSedes from "./pages/coordinador/sedes";
import CoordDevices from "./pages/coordinador/Devices";
import CoordPlans from "./pages/coordinador/plans";
import CoorGestionPisosSubpisos from "./components/coordinador/GestionPisosSubpisos";
import CoorRegistroUsuarioExterno from "./pages/RegistroUsuarioExterno";
import CoorHistorialMovimientos from "./pages/seguridad/HistorialMovimientos";


// Páginas específicas para el rol "celador"
import CeladorAsignaciones from "./pages/celador/Asignaciones";
import CoorAsignaciones from "./pages/celador/Asignaciones";

import CeladorIngresos_Salidas from "./pages/celador/Ingresos_Salidas";

// Páginas específicas para el rol "seguridad"
import SeguridadHistorialMovimientos from "./pages/seguridad/HistorialMovimientos";
import CeladorRegistroUsuarioExterno from "./pages/RegistroUsuarioExterno";

// Componente que protege rutas para usuarios autenticados
const ProtectedRoute = () => {
  const { token } = useAuth();
  const location = useLocation();

  // Si no hay token, redirigir al login
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: "flex" }}>
      <SidebarMenu /> {/* Menú lateral visible en rutas protegidas */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet /> {/* Aquí se renderiza la página solicitada */}
      </div>
    </div>
  );
};

// Componente que protege rutas exclusivas del rol "coordinador"
const CoordinadorRoute = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  // Si no está autenticado o no es coordinador, redirigir
  if (!token || user?.role !== "coordinador") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: "flex" }}>
      <CoordinadorSidebar />
      {/* Puedes usar otro sidebar si es diferente para coordinadores */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </div>
    </div>
  );
};

// Componente que protege rutas exclusivas del rol "celador"
const CeladorRoute = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || user?.role !== "celador") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: "flex" }}>
      <CeladorSidebar />
      {/* Puedes reemplazar esto si el menú es diferente */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </div>
    </div>
  );
};
const SeguridadRoute = () => {
  const { token, user } = useAuth();
  const location = useLocation();

  if (!token || user?.role !== "seguridad") {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return (
    <div style={{ display: "flex" }}>
      <SeguridadSidebar />
      {/* Puedes reemplazar esto si el menú es diferente */}
      <div style={{ flex: 1, padding: "20px" }}>
        <Outlet />
      </div>
    </div>
  );
};

// Redirige según autenticación y rol del usuario
const RedirectIfAuthenticated = () => {
  const { token, user } = useAuth();

  if (!token) return <Login />;

  if (user?.role === "coordinador") {
    return <Navigate to="/coordinador/dashboard" replace />;
  }

  if (user?.role === "celador") {
    return <Navigate to="/celador/Ingresos_Salidas" replace />;
  }

  if (user?.role === "seguridad") {
    return <Navigate to="/seguridad/Historial-Ingreso-Salida" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Manejo de sesión inactiva */}
        <InactivityHandler />

        {/* Configuración de notificaciones toast */}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="colored"
        />

        <Routes>
          {/* Rutas públicas (sin autenticación) */}
          <Route path="/login" element={<RedirectIfAuthenticated />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Ruta raíz redirige al dashboard principal */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Rutas protegidas para usuarios normales */}
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<Inventory />} />

            <Route path="/services" element={<Services />} />
            <Route path="/sedes" element={<Sedes />} />
            <Route path="/records" element={<Records />} />
            <Route path="/history" element={<History />} />
            <Route path="/asignaciones" element={<CeladorAsignaciones />} />
            <Route path="/RegistroUsuarioExterno" element={<CeladorRegistroUsuarioExterno />} />
            <Route path="/movimiento" element={<Movimiento />} />
            <Route path="/devices" element={<Devices />} />
            <Route path="/planos" element={<Plans />} />
            <Route path="/ingresos_salidas" element={<CeladorIngresos_Salidas />} />
            <Route path="/Historial-Ingreso-Salida" element={<SeguridadHistorialMovimientos />} />
            <Route path="/GestionPisosSubpisos" element={<GestionPisosSubpisos />} />

          </Route>

          {/* Rutas exclusivas para usuarios con rol "coordinador" */}
          <Route element={<CoordinadorRoute />}>
            <Route path="/coordinador/dashboard" element={<CoordDashboard />} />
            <Route path="/coordinador/inventory" element={<CoordInventory />} />
            <Route path="/coordinador/settings" element={<CoordSettings />} />
            <Route path="/coordinador/services" element={<CoordServices />} />
            <Route path="/coordinador/sedes" element={<CoordSedes />} />
            <Route path="/coordinador/records" element={<CoordRecords />} />
            <Route path="/coordinador/history" element={<CoordHistory />} />
            <Route path="/coordinador/asignaciones" element={<CoorAsignaciones />} />
            <Route path="/coordinador/GestionPisosSubpisos" element={<CoorGestionPisosSubpisos />} />
            <Route path="/coordinador/RegistroUsuarioExterno" element={<CoorRegistroUsuarioExterno />} />
            <Route path="/coordinador/Historial-Ingreso-Salida" element={<CoorHistorialMovimientos />} />

            <Route
              path="/coordinador/movimiento"
              element={<CoordMovimiento />}
            />
            <Route path="/coordinador/devices" element={<CoordDevices />} />
            <Route path="/coordinador/planos" element={<CoordPlans />} />
          </Route>

          <Route element={<CeladorRoute />}>
            <Route path="/celador/ingresos_salidas" element={<CeladorIngresos_Salidas />} />
            {/* Agrega aquí más rutas si el celador necesita otras vistas */}
          </Route>

          <Route element={<SeguridadRoute />}>
            <Route path="/seguridad/Historial-Ingreso-Salida" element={<SeguridadHistorialMovimientos />} />
            {/* Agrega aquí más rutas si el celador necesita otras vistas */}
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;