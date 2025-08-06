import React from 'react';
import { useAuth } from '../../components/auth';

import { useNavigate } from 'react-router-dom';
import '../../styles/Dashboard.css';

const CeladorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="dashboard-container">
      <h1>Panel de Celador - Sede: {user?.sedeNombre}</h1>
      
      <div className="dashboard-grid">
        <div className="dashboard-card" onClick={() => navigate('/celador/inventory')}>
          <h3>Inventario</h3>
          <p>Gestión de dispositivos</p>
        </div>
        
        <div className="dashboard-card" onClick={() => navigate('/celador/movimiento')}>
          <h3>Movimientos</h3>
          <p>Registro de traslados</p>
        </div>
        
        <div className="dashboard-card" onClick={() => navigate('/celador/devices')}>
          <h3>Dispositivos</h3>
          <p>Listado de equipos</p>
        </div>
      </div>
    </div>
  );
};

export default CeladorDashboard;