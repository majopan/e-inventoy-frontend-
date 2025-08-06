import React from 'react';
import { useAuth } from '../../components/auth';


const CeladorInventory = () => {
  const { user } = useAuth();

  return (
    <div className="page-container">
      <h2>Inventario - Sede: {user?.sedeNombre}</h2>
      
      <div className="inventory-list">
        <div className="inventory-item">
          <h4>Dispositivos asignados</h4>
          <p>Total: 25</p>
          <p>Disponibles: 18</p>
          <p>En reparación: 2</p>
        </div>
        
        <div className="inventory-item">
          <h4>Últimos movimientos</h4>
          <ul>
            <li>Traslado a laboratorio - 05/06/2023</li>
            <li>Asignación a profesor - 03/06/2023</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CeladorInventory;