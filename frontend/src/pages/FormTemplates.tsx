import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useEffect } from "react"

export default function TemplatesPage() {
  const [db, setDb] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let mounted = true
    fetch("/db/db.json")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch db.json: ${res.status}`)
        return res.json()
      })
      .then((json) => {
        if (mounted) setDb(json)
      })
      .catch((err) => console.error("Error loading db.json:", err))

    return () => {
      mounted = false
    }
  }, [])

  const firstElement: unknown | undefined = db
    ? Array.isArray(db)
      ? db[0]
      : Object.values(db)[0]
    : undefined

  useEffect(() => {
    if (firstElement !== undefined) {
      console.log("First element from db:", firstElement)
    }
  }, [firstElement])

  const [fields, setFields] = useState([{ id: 1, label: "Field 1" }])

  const addField = () => {
    setFields([...fields, { id: fields.length + 1, label: `Field ${fields.length + 1}` }])
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-white px-8">
      <h1 className="text-4xl font-bold text-orange-500 mb-8">FireForm</h1>

      <div className="w-full max-w-3xl space-y-6">
        <h2 className="text-2xl font-bold">Template 1</h2>

        <div className="grid grid-cols-2 gap-4">
          <Input placeholder="template name" />
          <Input placeholder="upload document" type="file" />
        </div>

        {fields.map((field) => (
          <div key={field.id}>
            <Input placeholder={field.label} />
          </div>
        ))}

        <Button
          variant="outline"
          className="bg-orange-100 text-orange-700 hover:bg-orange-200"
          onClick={addField}
        >
          Add more
        </Button>

        <div className="flex justify-end">
          <Button className="bg-gradient-to-r from-orange-500 to-red-500 text-white">
            Save Template
          </Button>
        </div>
      </div>
    </div>
  )
}