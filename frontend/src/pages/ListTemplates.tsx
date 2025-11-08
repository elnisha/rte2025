import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

// Importamos el JSON local
import templatesData from "@/db/db.json"

interface Template {
  id: number
  name: string
  description: string
  fields: { id: number; label: string; type: string }[]
}

export default function ListTemplates() {
  const [templates, setTemplates] = useState<Template[]>([])

  // Cargar datos desde el JSON local al montar el componente
  useEffect(() => {
    setTemplates(templatesData)
  }, [])

  console.log(templates)

  return (
    <div className="flex flex-col items-center min-h-screen bg-white py-16 px-8">
      <h1 className="text-4xl font-bold text-slate-900 mb-12">Templates</h1>

      {/* Grid de templates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full max-w-6xl">
        {templates.map((template) => (
          <Card key={template.id} className="shadow-md hover:shadow-lg transition-all">
            <CardHeader>
              <CardTitle className="text-lg font-semibold uppercase text-slate-800">
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-500 text-sm mb-2">{template.description}</p>
              <p className="text-gray-400 text-xs">
                {template.fields.map((f) => f.label).join(", ")}
              </p>
            </CardContent>
            <CardFooter>
              <Button
                variant="default"
                className="bg-gradient-to-r from-orange-500 to-red-500 text-white w-full"
              >
                Check template
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Botón para crear nueva plantilla */}
      <div className="mt-16">
        <Link to="/dashboard/form-templates/create">
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-6 text-lg">
            Create New Template
          </Button>
        </Link>
      </div>
    </div>
  )
}
