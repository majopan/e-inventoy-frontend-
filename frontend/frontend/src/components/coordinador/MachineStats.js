import React, { useState, useEffect } from 'react';
import '../../styles/MachineStats.css';
import { useAuth } from '../auth';

const MachineStats = ({ sedeId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:8000/api/estadisticas-sede/?sede=${sedeId}`, {
          headers: {
            "Authorization": `Bearer ${user.token}`
          }
        });
        
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        
        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [sedeId, user.token]);

  if (loading) return <div className="stat-card loading">Cargando...</div>;
  if (error) return <div className="stat-card error">Error: {error}</div>;

  return (
    <div className="stat-card">
      <div className="stat-item">
        <h5>Total Máquinas</h5>
        <h1>{stats?.total_maquinas || 0}</h1>
      </div>
      <div className="stat-item">
        <h5>Dispositivos Activos</h5>
        <h1>{stats?.dispositivos_activos || 0}</h1>
      </div>
      <div className="stat-item">
        <h5>Dispositivos Inactivos</h5>
        <h1>{stats?.dispositivos_inactivos || 0}</h1>
      </div>
    </div>
  );
};

export default MachineStats;