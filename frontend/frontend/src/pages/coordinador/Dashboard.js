import React from 'react';
import CoordinadorSidebar from '../../components/CoordinadorSidebar';
import DashboardContent from '../../components/coordinador/Dashboardcard';
import Grafica from '../../components/coordinador/Grafica';
import DowntimeCharts from '../../components/coordinador/DowntimeCharts';
import InactivityHandler from '../../components/InactivityHandler';
import '../../styles/Dashboard.css';


const Dashboard = () => {




  return (
    <>
      <InactivityHandler />
      <CoordinadorSidebar />
      <div className="main-container">
        <div className="dashboard-container">
          <DashboardContent />
          <div className="chart-and-stats-container">
            <Grafica />
          </div>
          {/* Nuevo contenedor para DowntimeCharts y CustomLineChart */}
          <div className="charts-row">
            <DowntimeCharts />
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;