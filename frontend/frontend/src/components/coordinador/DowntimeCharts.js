/* eslint-disable react-hooks/exhaustive-deps */
"use client"

import { useState, useEffect } from "react"
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts"
import { FaShare } from "react-icons/fa"
import { useAuth } from "../auth"
import "../../styles/DowntimeCharts.css"

const MovimientosPorSede = () => {
  const { sedeId, sedeNombre } = useAuth()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [totalMovimientos, setTotalMovimientos] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)

  const COLORS = ["#8884d8"]

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!sedeId) {
          throw new Error("No se ha identificado la sede del usuario")
        }

        setLoading(true)
        setError(null)

        const response = await fetch(`http://localhost:8000/api/movimientos-por-sede/?sede=${sedeId}`, {
          method: "GET",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || `Error HTTP! Estado: ${response.status}`)
        }

        const result = await response.json()
        console.log("Datos completos de la API:", result)

        // Verificar si la respuesta tiene la estructura esperada
        if (!result) {
          throw new Error("Estructura de datos inesperada")
        }

        // Procesamiento de datos mejorado
        let movimientos = 0;
        let nombreSede = sedeNombre || 'Tu sede';

        // Caso 1: Si la API devuelve un array data
        if (Array.isArray(result.data)) {
          const sedeData = result.data.find(item => item.sede_id === sedeId || item.name === sedeNombre);
          if (sedeData) {
            movimientos = sedeData.value || 0;
            nombreSede = sedeData.name || nombreSede;
          }
        } 
        // Caso 2: Si la API devuelve un objeto directo
        else if (typeof result === 'object' && result.value !== undefined) {
          movimientos = result.value;
          if (result.name) nombreSede = result.name;
        }

        // Caso 3: Si la API devuelve total_movimientos
        if (result.total_movimientos !== undefined) {
          movimientos = result.total_movimientos;
        }

        console.log(`Movimientos para ${nombreSede}:`, movimientos);

        const processedData = [{
          name: nombreSede,
          value: movimientos,
          fill: COLORS[0],
        }]

        setData(processedData)
        setTotalMovimientos(movimientos)
        
      } catch (err) {
        console.error("Error en fetchData:", err)
        setError(err.message || "Error al cargar los datos")

        // Datos de ejemplo con valor 0 para mantener la consistencia
        const exampleData = [{
          name: sedeNombre || 'Tu sede',
          value: 0,
          fill: COLORS[0]
        }]
        setData(exampleData)
        setTotalMovimientos(0)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [sedeId, sedeNombre])

  const onPieEnter = (_, index) => {
    setActiveIndex(index)
  }

  const renderActiveShape = (props) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props
    const percent = totalMovimientos > 0 ? (value / totalMovimientos) : 0
    const percentValue = (percent * 100).toFixed(1)

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={outerRadius + 6}
          outerRadius={outerRadius + 10}
          fill={fill}
        />
        <text x={cx} y={cy - 20} dy={8} textAnchor="middle" fill="#fff" fontSize={16}>
          {payload.name}
        </text>
        <text x={cx} y={cy + 5} dy={8} textAnchor="middle" fill="#fff" fontSize={20} fontWeight="bold">
          {value}
        </text>
        <text x={cx} y={cy + 30} dy={8} textAnchor="middle" fill="#fff" fontSize={14}>
          {totalMovimientos > 0 ? `(${percentValue}%)` : "(0%)"}
        </text>
      </g>
    )
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180
    const radius = outerRadius * 1.35
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    const percentValue = (percent * 100).toFixed(0)

    return (
      <text
        x={x}
        y={y}
        fill="#61dafb"
        textAnchor={x > cx ? "start" : "end"}
        dominantBaseline="central"
        fontWeight="bold"
        fontSize={16}
      >
        {`${percentValue}%`}
      </text>
    )
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0]
      const percentage = totalMovimientos > 0 ? ((data.value / totalMovimientos) * 100).toFixed(1) : 0

      return (
        <div className="custom-tooltip">
          <p className="tooltip-title">{data.name}</p>
          <p className="tooltip-value">{`Total: ${data.value}`}</p>
          <p className="tooltip-percent">{`${percentage}%`}</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="downtime-charts-container">
        <h3>Movimientos en {sedeNombre || 'tu sede'}</h3>
        <div className="loading-indicator">
          <div className="loading-spinner"></div>
          <p>Cargando datos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="downtime-charts-container">
        <h3>Movimientos en {sedeNombre || 'tu sede'}</h3>
        <div className="error-message">
          <h4>Error al cargar los datos</h4>
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className="refresh-button">
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="downtime-charts-container">
      <h3>Movimientos en {sedeNombre || 'tu sede'}</h3>
      <div className="charts-wrapper">
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                onMouseEnter={onPieEnter}
                labelLine={true}
                label={renderCustomizedLabel}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="causes-list">
          {data.map((item, index) => (
            <div
              className={`cause-item ${index === activeIndex ? "active" : ""}`}
              key={index}
              onMouseEnter={() => setActiveIndex(index)}
            >
              <span className="dot" style={{ backgroundColor: item.fill || COLORS[index % COLORS.length] }}></span>
              <span className="cause-value">{item.value}</span>
              <span className="cause-label">{item.name}</span>
            </div>
          ))}
        </div>

        <div className="percentage-container">
          <div className="percentage-item">
            <FaShare className="percentage-icon" />
            <span className="percentage-value">{totalMovimientos} movimientos</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MovimientosPorSede