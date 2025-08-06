import React, { useState } from 'react';
import { useAuth } from '../../components/auth';


const CeladorMovimiento = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState([
    { id: 1, device: 'Tablet 01', from: 'Aula 101', to: 'Laboratorio', date: '2023-06-05', status: 'Completado' },
    { id: 2, device: 'Portátil 03', from: 'Almacén', to: 'Oficina', date: '2023-06-04', status: 'Pendiente' }
  ]);

  return (
    <div className="page-container">
      <h2>Movimientos de Dispositivos - Sede: {user?.sedeNombre}</h2>
      
      <table className="movements-table">
        <thead>
          <tr>
            <th>Dispositivo</th>
            <th>Origen</th>
            <th>Destino</th>
            <th>Fecha</th>
            <th>Estado</th>
          </tr>
        </thead>
        <tbody>
          {movements.map(movement => (
            <tr key={movement.id}>
              <td>{movement.device}</td>
              <td>{movement.from}</td>
              <td>{movement.to}</td>
              <td>{movement.date}</td>
              <td>
                <span className={`status-badge ${movement.status.toLowerCase()}`}>
                  {movement.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <button className="btn-primary">Registrar Nuevo Movimiento</button>
    </div>
  );
};

export default CeladorMovimiento;