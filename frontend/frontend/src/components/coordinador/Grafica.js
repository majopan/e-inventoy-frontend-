"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { useAuth } from "../auth"

const GraficaDispositivos = () => {
  const { sedeId, sedeNombre } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!sedeId) {
          throw new Error("No se ha identificado la sede del usuario")
        }

        setLoading(true)
        setError(null)

        // Usamos el mismo endpoint que el dashboard
        const response = await fetch(`http://localhost:8000/api/dashboard/?sede=${sedeId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Error HTTP! Estado: ${response.status}`)
        }

        const result = await response.json()
        console.log("Datos API dashboard:", result)

        if (!result.cardsData) {
          throw new Error("Formato de datos incorrecto")
        }

        // Buscamos la tarjeta de "Total dispositivos" en los datos del dashboard
        const totalDispositivosCard = result.cardsData.find(
          card => card.title === "Total dispositivos"
        )

        const dispositivos = totalDispositivosCard ? totalDispositivosCard.value : 0

        setData([{
          nombre: sedeNombre || 'Tu sede',
          dispositivos: dispositivos,
          fill: "#4361ee", // Mismo color que en el dashboard
        }])

      } catch (err) {
        console.error("Error al obtener datos:", err)
        setError(err.message)
        setData([{
          nombre: sedeNombre || 'Tu sede',
          dispositivos: 0,
          fill: "#ff6b6b",
        }])
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sedeId, sedeNombre])

  if (loading) {
    return (
      <div className="loading-container">
        <h3>Cargando dispositivos para {sedeNombre || 'tu sede'}...</h3>
        <div className="loading-spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="error-container">
        <h3>Error al cargar datos para {sedeNombre || 'tu sede'}</h3>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    )
  }

  return (
    <div className="chart-container">
      <h3>Dispositivos en {sedeNombre || 'tu sede'}</h3>
      <div className="chart-wrapper">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.315)" />
            <XAxis 
              dataKey="nombre" 
              tick={{ fill: "#b8c2d8" }}
            />
            <YAxis 
              tick={{ fill: "#b8c2d8" }} 
              domain={[0, 'dataMax + 1']}
            />
            <Tooltip
              contentStyle={{
                background: "#222",
                border: "1px solid #4361ee",
                borderRadius: "4px",
                color: "#fff",
              }}
              formatter={(value) => [`${value} dispositivos`]}
              labelFormatter={() => sedeNombre || 'Tu sede'}
            />
            <Bar
              dataKey="dispositivos"
              fill="#4361ee"
              radius={[4, 4, 0, 0]}
              label={{
                position: "top",
                fill: "#b8c2d8",
                formatter: (value) => value === 0 ? "Sin dispositivos" : `${value} dispositivos`
              }}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default GraficaDispositivos