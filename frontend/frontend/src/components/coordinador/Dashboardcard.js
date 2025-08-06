"use client"

import React, { useState, useEffect } from "react"
import {
  Smartphone,
  RefreshCw,
  CheckCircle,
  PenToolIcon as Tool,
  AlertTriangle,
  XCircle,
  ThumbsUp,
  Power,
} from "lucide-react"
import "../../styles/DashboardContent.css";

import { useAuth } from '../auth';

const DashboardContent = () => {
  const { sedeId, sedeNombre } = useAuth()
  const [cardsData, setCardsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorDashboard, setErrorDashboard] = useState(null)

  // Mapeo de iconos y colores según el tipo de tarjeta
  const iconosPorTipo = {
    "Total dispositivos": <Smartphone size={20} />,
    "Dispositivos en uso": <RefreshCw size={20} />,
    "Buen estado": <CheckCircle size={20} />,
    "Dispositivos disponibles": <ThumbsUp size={20} />,
    "En reparación": <Tool size={20} />,
    "Perdidos/robados": <XCircle size={20} />,
    "Mal estado": <AlertTriangle size={20} />,
    "Inhabilitados": <Power size={20} />,
  }

  const coloresPorTipo = {
    "Total dispositivos": "#4361ee",
    "Dispositivos en uso": "#3a86ff",
    "Buen estado": "#2ec4b6",
    "Dispositivos disponibles": "#38b000",
    "En reparación": "#ff9f1c",
    "Perdidos/robados": "#e71d36",
    "Mal estado": "#ff6b6b",
    "Inhabilitados": "#6c757d",
  }

  // Cargar datos del dashboard para la sede del usuario
  useEffect(() => {
    if (!sedeId) return

    const cargarDatosDashboard = async () => {
      setLoading(true)
      setErrorDashboard(null)
      
      try {
        const url = `http://localhost:8000/api/dashboard/?sede=${sedeId}`
        
        const respuesta = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
          },
        })

        if (!respuesta.ok) {
          throw new Error(`Error al obtener datos: ${respuesta.status}`)
        }

        const datos = await respuesta.json()
        
        if (datos.cardsData) {
          setCardsData(datos.cardsData)
        } else {
          throw new Error("Formato de datos incorrecto")
        }
      } catch (error) {
        console.error("Error al cargar dashboard:", error)
        setErrorDashboard(error.message)
        setCardsData([])
      } finally {
        setLoading(false)
      }
    }

    cargarDatosDashboard()
  }, [sedeId])

  return (
    <div className="dashboard-content">
      {/* Header con nombre de la sede */}
      <div className="dashboard-header">
        <h2>Dashboard - {sedeNombre || 'tu sede'}</h2>
      </div>

      {/* Contenedor de tarjetas */}
      <div className="cards-container">
        {loading ? (
          // Mostrar skeletons durante la carga
          Array(8).fill().map((_, index) => <TarjetaSkeleton key={index} />)
        ) : errorDashboard ? (
          // Mostrar error si falla la carga
          <div className="error-container">
            <p className="error-message">Error: {errorDashboard}</p>
            <button
              className="retry-button"
              onClick={() => window.location.reload()}
            >
              Reintentar
            </button>
          </div>
        ) : cardsData.length > 0 ? (
          // Mostrar tarjetas con datos
          cardsData.map((tarjeta) => (
            <div
              className="card"
              key={tarjeta.title}
              style={{ borderTop: `3px solid ${coloresPorTipo[tarjeta.title]}` }}
            >
              <div className="card-content">
                <div className="card-header">
                  <h5>{tarjeta.title}</h5>
                  <div 
                    className="card-icon"
                    style={{ backgroundColor: coloresPorTipo[tarjeta.title] }}
                  >
                    {iconosPorTipo[tarjeta.title]}
                  </div>
                </div>
                <h1>{tarjeta.value}</h1>
                <p>{tarjeta.date}</p>
              </div>
            </div>
          ))
        ) : (
          <p className="no-data-message">No hay datos disponibles para {sedeNombre || 'tu sede'}</p>
        )}
      </div>
    </div>
  )
}

// Componente Skeleton para loading
const TarjetaSkeleton = () => (
  <div className="card skeleton-card">
    <div className="card-content">
      <div className="card-header">
        <div className="skeleton-title"></div>
        <div className="skeleton-icon"></div>
      </div>
      <div className="skeleton-value"></div>
      <div className="skeleton-date"></div>
    </div>
  </div>
)

export default DashboardContent