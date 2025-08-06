import React, { useState, useEffect } from 'react';
import { useAuth } from '../../components/auth';
import api from '../../services/api';

const CeladorDevices = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const response = await api.get(`devices/?sede_id=${user.sedeId}`);
        setDevices(response.data);
      } catch (error) {
        console.error('Error fetching devices:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDevices();
  }, [user.sedeId]);

  return (
    <div className="page-container">
      <h2>Dispositivos - Sede: {user?.sedeNombre}</h2>
      
      {loading ? (
        <p>Cargando dispositivos...</p>
      ) : (
        <div className="devices-grid">
          {devices.map(device => (
            <div key={device.id} className="device-card">
              <h4>{device.name}</h4>
              <p>Serial: {device.serial}</p>
              <p>Estado: {device.status}</p>
              <p>Ubicación: {device.location}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CeladorDevices;