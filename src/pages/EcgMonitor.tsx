"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { useNavigate } from "react-router-dom"
import { Heart } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Header from "@/components/Header"
import Footer from "@/components/Footer"
import { Button } from "@/components/ui/button"

// Import Chart.js
import { Chart, registerables } from "chart.js"
Chart.register(...registerables)

const EcgMonitor = () => {
  const navigate = useNavigate()
  // Configuration
  const MAX_DATA_POINTS = 500
  const SAMPLE_RATE = 250 // Assumed sample rate in Hz
  const UPDATE_INTERVAL = 33// Update chart every 100ms to prevent too fast plotting

  // State variables for first ECG monitor
  const [connected, setConnected] = useState(false)
  const [ecgData, setEcgData] = useState<number[]>(Array(MAX_DATA_POINTS).fill(0))
  const [heartRate, setHeartRate] = useState<string>("--")
  const [prInterval, setPrInterval] = useState<string>("--")
  const [qrsDuration, setQrsDuration] = useState<string>("--")
  const [qtInterval, setQtInterval] = useState<string>("--")

  // State variables for second ECG monitor
  const [beatNumber, setBeatNumber] = useState<string>("0")
  const [beatClass, setBeatClass] = useState<string>("N/A")
  const [beatConfidence, setBeatConfidence] = useState<string>("0")
  const [dataPoints, setDataPoints] = useState<string>("0")
  const [secondConnected, setSecondConnected] = useState(false)

  // Refs
  const websocketRef = useRef<WebSocket | null>(null)
  const secondWebsocketRef = useRef<WebSocket | null>(null)
  const chartRef = useRef<HTMLCanvasElement | null>(null)
  const chartInstanceRef = useRef<Chart | null>(null)
  const secondChartRef = useRef<HTMLCanvasElement | null>(null)
  const secondChartInstanceRef = useRef<Chart | null>(null)
  const beatCountRef = useRef(0)
  const lastBeatTimeRef = useRef(0)
  const heartRatesRef = useRef<number[]>([])
  const dataBufferRef = useRef<number[]>([])
  const animationFrameRef = useRef<number | null>(null)
  const lastUpdateTimeRef = useRef<number>(0)

  const { toast } = useToast()

  // Initialize first chart
  useEffect(() => {
    if (chartRef.current) {
      const ctx = chartRef.current.getContext("2d")

      if (ctx) {
        // Destroy previous chart instance if it exists
        if (chartInstanceRef.current) {
          chartInstanceRef.current.destroy()
        }

        chartInstanceRef.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: Array(MAX_DATA_POINTS).fill(""),
            datasets: [
              {
                label: "ECG Signal",
                data: Array(MAX_DATA_POINTS).fill(0),
                borderColor: "rgb(75, 192, 192)",
                borderWidth: 1.5,
                fill: false,
                tension: 0,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: false, // Disable animation completely for better performance
            devicePixelRatio: 1, // Lower resolution for better performance
            scales: {
              x: {
                display: true,
                grid: {
                  display: false,
                },
                ticks: {
                  display: false
                },
              },
              y: {
                display: true,
                min: -0.2,
                max: 1.2,
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false, // Disable tooltips for performance
              },
            },
            elements: {
              line: {
                tension: 0, // Use straight lines for better performance
              },
            },
          },
        })
      }
    }

    // Cleanup function
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      disconnectWebSocket()
    }
  }, []) // Empty dependency array means this runs once on mount

  // Initialize second chart
  useEffect(() => {
    if (secondChartRef.current) {
      const ctx = secondChartRef.current.getContext("2d")

      if (ctx) {
        // Destroy previous chart instance if it exists
        if (secondChartInstanceRef.current) {
          secondChartInstanceRef.current.destroy()
        }

        secondChartInstanceRef.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: Array.from({ length: 200 }, (_, i) => i),
            datasets: [
              {
                label: "ECG Signal",
                data: [],
                borderColor: "rgb(75, 192, 192)",
                borderWidth: 1.5,
                fill: false,
                tension: 0.1,
                pointRadius: 0,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
              duration: 0, // Disable animation for better performance
            },
            devicePixelRatio: 1, // Lower resolution for better performance
            scales: {
              x: {
                display: true,
                title: {
                  display: true,
                  text: "Samples",
                  color: "#333",
                },
                grid: {
                  display: false,
                },
                ticks: {
                  display: false,
                  color: "#333",
                },
              },
              y: {
                display: true,
                title: {
                  display: true,
                  text: "Amplitude",
                  color: "#333",
                },
                grid: {
                  color: "rgba(0, 0, 0, 0.1)",
                },
                ticks: {
                  color: "#333",
                },
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: false, // Disable tooltips for performance
              },
            },
          },
        })
      }
    }

    // Cleanup function
    return () => {
      if (secondChartInstanceRef.current) {
        secondChartInstanceRef.current.destroy()
      }
      disconnectSecondWebSocket()
    }
  }, []) // Empty dependency array means this runs once on mount

  // Throttled update function for first chart
  const updateChartThrottled = useCallback(() => {
    if (!chartInstanceRef.current) return

    const currentTime = performance.now()
    if (currentTime - lastUpdateTimeRef.current < UPDATE_INTERVAL) {
      
      // Schedule next update
      animationFrameRef.current = requestAnimationFrame(updateChartThrottled)
      return
    }

    // Process data from buffer
    if (dataBufferRef.current.length > 0) {
      // Get the latest data point
      const latestDataPoint = dataBufferRef.current[dataBufferRef.current.length - 1]

      // Update ecgData state (without re-render)
      const newData = [...ecgData.slice(1), latestDataPoint]

      // Update chart
      if (chartInstanceRef.current) {
        chartInstanceRef.current.data.datasets[0].data = newData
        chartInstanceRef.current.update("none")
      }

      // Calculate metrics based on the latest data
      calculateEcgMetrics(newData)

      // Update state without triggering re-render
      setEcgData(newData)

      // Clear buffer after processing
      dataBufferRef.current = []
    }

    lastUpdateTimeRef.current = currentTime
    // Schedule next update
    animationFrameRef.current = requestAnimationFrame(updateChartThrottled)
  }, [ecgData])

  // Start the update loop when connected
  useEffect(() => {
    if (connected) {
      // Start the update loop
      animationFrameRef.current = requestAnimationFrame(updateChartThrottled)
    } else {
      // Stop the update loop
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [connected, updateChartThrottled])

  // Update second chart data
  const updateSecondChart = (newData: number[]) => {
    if (secondChartInstanceRef.current) {
      secondChartInstanceRef.current.data.datasets[0].data = newData
      // Ensure immediate update for the second chart
      secondChartInstanceRef.current.update()
    }
  }

  // Calculate ECG metrics (simplified version from HTML)
  const calculateEcgMetrics = (data: number[] = ecgData) => {
    // Detect R-peaks (simplified)
    const threshold = 0.5 // Threshold for R-peak detection
    const lastIndex = data.length - 1

    if (data[lastIndex] > threshold && data[lastIndex - 1] < threshold) {
      const currentTime = Date.now()

      if (lastBeatTimeRef.current > 0) {
        const interval = currentTime - lastBeatTimeRef.current
        const heartRate = Math.round(60000 / interval)

        // Store heart rates for averaging
        heartRatesRef.current.push(heartRate)
        if (heartRatesRef.current.length > 5) {
          heartRatesRef.current.shift()
        }

        // Calculate average heart rate
        const avgHeartRate = Math.round(heartRatesRef.current.reduce((a, b) => a + b, 0) / heartRatesRef.current.length)

        // Update displays
        setHeartRate(avgHeartRate.toString())

        // Simulated ECG intervals (these would normally be calculated from the signal)
        setPrInterval(Math.round(140 + Math.random() * 20).toString())
        setQrsDuration(Math.round(80 + Math.random() * 20).toString())
        setQtInterval(Math.round(380 + Math.random() * 40).toString())
      }

      lastBeatTimeRef.current = currentTime
      beatCountRef.current++
    }
  }

  // Connect to first WebSocket
  const connectWebSocket = () => {
    try {
      websocketRef.current = new WebSocket("ws://192.168.0.110:81")

      websocketRef.current.onopen = () => {
        setConnected(true)
        toast({
          title: "Connected",
          description: "Successfully connected to ECG monitor",
        })
        console.log("Connected to WebSocket server")

        // Clear any existing data
        dataBufferRef.current = []
        setEcgData(Array(MAX_DATA_POINTS).fill(0))
        if (chartInstanceRef.current) {
          chartInstanceRef.current.data.datasets[0].data = Array(MAX_DATA_POINTS).fill(0)
          chartInstanceRef.current.update("none")
        }
        
        // Also connect to the second WebSocket
        connectSecondWebSocket()
      }

      websocketRef.current.onclose = () => {
        setConnected(false)
        toast({
          title: "Disconnected",
          description: "Connection to ECG device lost",
          variant: "destructive",
        })

        // Reset values
        setHeartRate("--")
        setPrInterval("--")
        setQrsDuration("--")
        setQtInterval("--")

        console.log("WebSocket connection closed")
      }

      websocketRef.current.onerror = (error) => {
        console.error("WebSocket error:", error)
        toast({
          title: "Connection Error",
          description: "Failed to connect to ECG device",
          variant: "destructive",
        })
      }

      websocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Add to buffer instead of updating state directly
          dataBufferRef.current.push(data.value)

          // Limit buffer size to prevent memory issues
          if (dataBufferRef.current.length > MAX_DATA_POINTS) {
            dataBufferRef.current = dataBufferRef.current.slice(-MAX_DATA_POINTS)
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error)
        }
      }
    } catch (error) {
      console.error("Error setting up WebSocket:", error)
      toast({
        title: "Connection Error",
        description: "Failed to connect to ECG device",
        variant: "destructive",
      })
    }
  }

  // Connect to second WebSocket
  const connectSecondWebSocket = () => {
    try {
      secondWebsocketRef.current = new WebSocket("ws://localhost:8765")

      secondWebsocketRef.current.onopen = () => {
        setSecondConnected(true)
        console.log("Connected to second WebSocket server")
      }

      secondWebsocketRef.current.onclose = () => {
        setSecondConnected(false)
        console.log("Second WebSocket connection closed")
      }

      secondWebsocketRef.current.onerror = (error) => {
        console.error("Second WebSocket error:", error)
      }

      secondWebsocketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          // Update chart
          updateSecondChart(data.data)

          // Update beat information
          setBeatNumber(data.beat)
          setBeatClass(data.class)
          setBeatConfidence((data.confidence * 100).toFixed(1))
          setDataPoints(data.data_length)
        } catch (error) {
          console.error("Error parsing second WebSocket message:", error)
        }
      }
    } catch (error) {
      console.error("Error setting up second WebSocket:", error)
    }
  }

  // Disconnect from first WebSocket
  const disconnectWebSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close()
      websocketRef.current = null
    }

    setConnected(false)

    // Reset values
    setHeartRate("--")
    setPrInterval("--")
    setQrsDuration("--")
    setQtInterval("--")

    // Clear buffer
    dataBufferRef.current = []
    
    // Also disconnect the second WebSocket
    disconnectSecondWebSocket()
  }

  // Disconnect from second WebSocket
  const disconnectSecondWebSocket = () => {
    if (secondWebsocketRef.current) {
      secondWebsocketRef.current.close()
      secondWebsocketRef.current = null
    }

    setSecondConnected(false)
  }

  // Connect to second WebSocket on mount
  useEffect(() => {
    // No need to connect automatically, as this will be handled by the Connect button
    
    // Cleanup function
    return () => {
      disconnectWebSocket() // Disconnect both WebSockets on unmount
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-grow pt-20 pb-10 px-4 bg-[#f0f0f0]">
        {/* First ECG Monitor Section */}
        <div className="container mx-auto max-w-[1200px] bg-white p-5 rounded-[10px] shadow-lg mb-10">
          <h1 className="text-2xl font-bold text-[#333] text-center mb-6">Real-time ECG Monitor</h1>

          <div className="text-center mb-4">
            <div
              className={`font-bold inline-flex items-center gap-2 ${connected ? "text-[#5cb85c]" : "text-[#d9534f]"}`}
            >
              {connected ? "Connected to ECG and Analysis Systems" : "Systems Disconnected"}
            </div>
          </div>

          <div className="flex justify-center space-x-4 mb-6">
            <Button
              onClick={connectWebSocket}
              disabled={connected}
              className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white px-4 py-2 rounded"
            >
              Connect All Systems
            </Button>
            <Button
              onClick={disconnectWebSocket}
              disabled={!connected}
              variant="destructive"
              className="bg-[#d9534f] hover:bg-[#c9302c] text-white px-4 py-2 rounded"
            >
              Disconnect All
            </Button>
          </div>

          <div className="relative h-[400px] w-full mb-6 border border-gray-200 rounded-md bg-white">
            <canvas ref={chartRef}></canvas>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox
              label="Heart Rate"
              value={heartRate}
              unit="BPM"
              icon={<Heart className="h-6 w-6 text-[#d9534f]" />}
            />
            <StatBox label="PR Interval" value={prInterval} unit="ms" />
            <StatBox label="QRS Duration" value={qrsDuration} unit="ms" />
            <StatBox label="QT Interval" value={qtInterval} unit="ms" />
          </div>
        </div>

        {/* Second ECG Monitor Section */}
        <div className="container mx-auto max-w-[1200px] bg-white p-5 rounded-[10px] shadow-lg">
          <h2 className="text-2xl font-bold text-[#333] text-center mb-6">Beat Classification Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-3">
              <div className="h-[400px]">
                <canvas ref={secondChartRef}></canvas>
              </div>
            </div>

            <div className="md:col-span-1">
              <div className="bg-[#f8f8f8] border border-[#ddd] rounded-[5px] p-4 mb-4">
                <h4 className="text-lg font-semibold text-[#333] mb-3">Current Beat Analysis</h4>
                <p className="text-[#333] my-2">
                  Beat Number: <span className="font-bold text-[#d9534f]">{beatNumber}</span>
                </p>
                <p className="text-[#333] my-2">
                  Classification: <span className="font-bold text-[#d9534f]">{beatClass}</span>
                </p>
                <p className="text-[#333] my-2">
                  Confidence: <span className="font-bold text-[#d9534f]">{beatConfidence}</span>%
                </p>
              </div>

              <div className="bg-[#f8f8f8] border border-[#ddd] rounded-[5px] p-4">
                <h4 className="text-lg font-semibold text-[#333] mb-3">System Status</h4>
                <p className="text-[#333] my-2">
                  ECG Data: 
                  <span className={`font-bold ${connected ? "text-[#5cb85c]" : "text-[#d9534f]"}`}>
                    {connected ? " Connected" : " Disconnected"}
                  </span>
                </p>
                <p className="text-[#333] my-2">
                  Analysis System:
                  <span className={`font-bold ${secondConnected ? "text-[#5cb85c]" : "text-[#d9534f]"}`}>
                    {secondConnected ? " Connected" : " Disconnected"}
                  </span>
                </p>
                <p className="text-[#333] my-2">
                  Data Points: <span className="font-bold text-[#d9534f]">{dataPoints}</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center mt-6">
            <Button
              onClick={() => navigate("/reports", { 
                state: { heartClass: beatClass } 
              })}
              className="bg-[#5cb85c] hover:bg-[#4cae4c] text-white px-4 py-2 rounded"
            >
              Generate Report
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// Stat box component
const StatBox = ({
  label,
  value,
  unit,
  icon,
}: {
  label: string
  value: string
  unit: string
  icon?: React.ReactNode
}) => {
  return (
    <div className="bg-[#f8f8f8] border border-[#ddd] rounded-[5px] p-4 text-center">
      <div className="flex items-center justify-center gap-2 mb-1">
        {icon}
        <div>{label}</div>
      </div>
      <div className="text-2xl font-bold text-[#d9534f] my-2">{value}</div>
      <div className="text-sm text-gray-500">{unit}</div>
    </div>
  )
}

export default EcgMonitor